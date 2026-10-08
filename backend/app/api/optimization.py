import uuid
import threading
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy.orm import Session
from backend.app.database.session import get_db, SessionLocal
from backend.app.models.models import (
    Executive, Customer, DailySnapshot, Plan, PlanVersion,
    Route, RouteStop, SkippedCustomer, OptimizationRun, AuditLog
)
from backend.app.schemas.schemas import OptimizationRunRequest, ReoptimizeRequest, ApiResponse
from backend.app.optimization.engine import optimize_problem
from backend.app.services.export_service import generate_plan_csv, generate_skipped_csv, generate_metrics_csv
from backend.app.services.datetime_service import get_operational_date, get_ist_now

router = APIRouter(prefix="/api", tags=["Planning & Optimization"])

# In-memory store for active job progress tracking
JOB_TRACKER: Dict[str, Dict[str, Any]] = {}

def execute_optimization_worker(
    run_id: str,
    executives: list,
    customers: list,
    algorithm: str,
    lambda_param: float,
    plan_id: Optional[int] = None,
    version_num: int = 1,
    operational_date: Optional[str] = None
):
    db = SessionLocal()
    try:
        def progress_callback(stage: str, progress: int, stats: dict):
            JOB_TRACKER[run_id] = {
                "run_id": run_id,
                "stage": stage,
                "progress_pct": min(95, progress),
                "status": "running",
                "statistics": stats
            }
            run_record = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
            if run_record:
                run_record.stage = stage
                run_record.progress_pct = min(95, progress)
                run_record.statistics_json = stats
                db.commit()

        opt_result = optimize_problem(
            executives=executives,
            customers=customers,
            algorithm=algorithm,
            lambda_param=lambda_param,
            progress_callback=progress_callback
        )

        today_str = operational_date or get_operational_date()
        snapshot = db.query(DailySnapshot).filter(DailySnapshot.plan_date == today_str).order_by(DailySnapshot.id.desc()).first()
        if not snapshot:
            snapshot = DailySnapshot(
                plan_date=today_str,
                created_by="Optimization Engine",
                executive_count=len(executives),
                customer_count=len(customers),
                ptp_count=opt_result["metrics"]["ptp_total"],
                status="optimized"
            )
            db.add(snapshot)
            db.commit()
            db.refresh(snapshot)

        # Plan record (Ensure exactly one daily plan per date; increment version on re-runs)
        if not plan_id:
            existing_plan = db.query(Plan).filter(Plan.plan_date == today_str).order_by(Plan.id.desc()).first()
            if existing_plan:
                plan = existing_plan
                version_num = plan.current_version + 1
                plan.current_version = version_num
                target_plan_id = plan.id
            else:
                plan = Plan(
                    snapshot_id=snapshot.id,
                    name=f"Daily Field Visit Plan — {today_str}",
                    plan_date=today_str,
                    current_version=1,
                    status="ready"
                )
                db.add(plan)
                db.commit()
                db.refresh(plan)
                target_plan_id = plan.id
                version_num = 1
        else:
            plan = db.query(Plan).filter(Plan.id == plan_id).first()
            plan.current_version = version_num
            target_plan_id = plan.id

        # PlanVersion record
        m = opt_result["metrics"]
        version = PlanVersion(
            plan_id=target_plan_id,
            version_number=version_num,
            algorithm=algorithm,
            lambda_param=lambda_param,
            total_distance_km=m["total_distance_km"],
            total_priority_score=m["total_priority_score"],
            total_score=m["total_score"],
            ptp_scheduled=m["ptp_scheduled"],
            ptp_total=m["ptp_total"],
            ptp_coverage_pct=m["ptp_coverage_pct"],
            customers_visited=m["customers_visited"],
            customers_skipped=m["customers_skipped"],
            constraint_violations_count=m["violations_count"],
            runtime_ms=m["runtime_ms"],
            is_published=False
        )
        db.add(version)
        db.commit()
        db.refresh(version)

        # Route and RouteStop records
        for eid, r_info in opt_result["routes"].items():
            rm = r_info["metrics"]
            db_route = Route(
                plan_version_id=version.id,
                executive_id=eid,
                executive_name=r_info.get("executive_name", eid),
                home_lat=r_info.get("home_lat"),
                home_lon=r_info.get("home_lon"),
                shift_start=r_info.get("shift_start", "08:30"),
                shift_end=r_info.get("shift_end", "17:30"),
                total_km=rm["total_km"],
                total_travel_minutes=rm["total_travel_minutes"],
                total_waiting_minutes=rm["total_waiting_minutes"],
                total_service_minutes=rm["total_service_minutes"],
                total_duration_minutes=rm["total_duration_minutes"],
                visit_count=rm["visit_count"],
                return_time=rm["return_time"],
                is_feasible=r_info["valid"],
                violations_json=r_info["violations"]
            )
            db.add(db_route)
            db.commit()
            db.refresh(db_route)

            for stop in r_info.get("timeline", []):
                exp = stop.get("explainability_json") or {}
                exp["window_start"] = stop.get("window_start", "09:00")
                exp["window_end"] = stop.get("window_end", "18:00")
                exp["service_min"] = stop.get("service_min", 15)
                db_stop = RouteStop(
                    route_id=db_route.id,
                    seq=stop["seq"],
                    customer_id=stop["customer_id"],
                    customer_name=stop.get("customer_name"),
                    area=stop.get("area"),
                    lat=stop["lat"],
                    lon=stop["lon"],
                    arrival_time=stop["arrival_time"],
                    waiting_min=stop["waiting_min"],
                    service_start=stop["service_start"],
                    service_end=stop["service_end"],
                    departure_time=stop["departure_time"],
                    km_from_prev=stop["km_from_prev"],
                    cumulative_km=stop["cumulative_km"],
                    priority_score=stop["priority_score"],
                    ptp_today=stop["ptp_today"],
                    overdue_amount=stop["overdue_amount"],
                    explainability_json=exp
                )
                db.add(db_stop)

        # SkippedCustomer records
        for sc in opt_result.get("skipped", []):
            db_sc = SkippedCustomer(
                plan_version_id=version.id,
                customer_id=sc["customer_id"],
                customer_name=sc.get("customer_name"),
                area=sc.get("area"),
                lat=sc["lat"],
                lon=sc["lon"],
                ptp_today=sc["ptp_today"],
                priority_score=sc["priority_score"],
                overdue_amount=sc["overdue_amount"],
                window_start=sc.get("window_start"),
                window_end=sc.get("window_end"),
                reason=sc["reason"],
                details_json=sc.get("details", {}),
                nearest_executive_id=sc.get("nearest_executive_id"),
                distance_to_nearest_km=sc.get("distance_to_nearest_km", 0.0)
            )
            db.add(db_sc)

        db.add(AuditLog(
            user_email="manager@routepilot.io",
            action=f"OPTIMIZATION_COMPLETE_V{version_num}",
            entity_type="PlanVersion",
            entity_id=str(version.id),
            details_json={"score": m["total_score"], "algorithm": algorithm, "km": m["total_distance_km"]}
        ))
        db.commit()

        run_record = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
        if run_record:
            run_record.status = "completed"
            run_record.progress_pct = 100
            run_record.stage = "completed"
            run_record.plan_id = target_plan_id
            run_record.completed_at = datetime.utcnow()
            db.commit()

        JOB_TRACKER[run_id]["plan_id"] = target_plan_id
        JOB_TRACKER[run_id]["version_id"] = version.id
        JOB_TRACKER[run_id]["result"] = opt_result
        JOB_TRACKER[run_id]["progress_pct"] = 100
        JOB_TRACKER[run_id]["stage"] = "completed"
        JOB_TRACKER[run_id]["status"] = "completed"

    except Exception as exc:
        db.rollback()
        JOB_TRACKER[run_id] = {
            "run_id": run_id,
            "stage": "failed",
            "progress_pct": 0,
            "status": "failed",
            "error_message": str(exc)
        }
        run_record = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
        if run_record:
            run_record.status = "failed"
            run_record.error_message = str(exc)
            db.commit()
    finally:
        db.close()

@router.post("/optimization/run", response_model=ApiResponse)
def start_optimization(payload: OptimizationRunRequest, db: Session = Depends(get_db)):
    target_date = payload.operational_date or payload.plan_date or get_operational_date()
    execs = db.query(Executive).filter(Executive.plan_date == target_date, Executive.status == "active").all()
    custs = db.query(Customer).filter(Customer.plan_date == target_date, Customer.status != "cancelled").all()

    if not execs:
        raise HTTPException(status_code=400, detail=f"No active executives found for operational date {target_date}. Please import executives.csv first.")
    if not custs:
        raise HTTPException(status_code=400, detail=f"No active customers found for operational date {target_date}. Please import customers.csv first.")

    exec_dicts = [
        {"id": e.id, "name": e.name, "home_lat": e.home_lat, "home_lon": e.home_lon, "shift_start": e.shift_start, "shift_end": e.shift_end, "max_visits": e.max_visits, "max_km": e.max_km}
        for e in execs
    ]
    cust_dicts = [
        {"id": c.id, "name": c.name, "area": c.area, "lat": c.lat, "lon": c.lon, "dpd": c.dpd, "overdue_amount": c.overdue_amount, "priority_score": c.priority_score, "ptp_today": c.ptp_today, "window_start": c.window_start, "window_end": c.window_end, "service_min": c.service_min}
        for c in custs
    ]

    run_id = f"opt_{uuid.uuid4().hex[:12]}"
    run_rec = OptimizationRun(
        id=run_id,
        stage="queued",
        progress_pct=5,
        status="running"
    )
    db.add(run_rec)
    db.commit()

    JOB_TRACKER[run_id] = {
        "run_id": run_id,
        "stage": "queued",
        "progress_pct": 5,
        "status": "running"
    }

    target_date = payload.operational_date or payload.plan_date or get_operational_date()
    # Start background worker thread
    thread = threading.Thread(
        target=execute_optimization_worker,
        args=(run_id, exec_dicts, cust_dicts, payload.algorithm, payload.lambda_param, None, 1, target_date)
    )
    thread.daemon = True
    thread.start()

    return ApiResponse(
        success=True,
        message="Optimization job started",
        data={"run_id": run_id, "status": "running"}
    )

@router.get("/optimization/{run_id}/status", response_model=ApiResponse)
def get_optimization_status(run_id: str, db: Session = Depends(get_db)):
    if run_id in JOB_TRACKER:
        info = JOB_TRACKER[run_id]
        return ApiResponse(success=True, data=info)

    rec = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Optimization run not found")

    return ApiResponse(
        success=True,
        data={
            "run_id": rec.id,
            "stage": rec.stage,
            "progress_pct": rec.progress_pct,
            "status": rec.status,
            "statistics": rec.statistics_json,
            "plan_id": rec.plan_id,
            "error_message": rec.error_message
        }
    )

@router.get("/plans", response_model=ApiResponse)
def list_plans(
    plan_date: Optional[str] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    target_date = None
    if isinstance(plan_date, str) and plan_date:
        target_date = plan_date
    elif isinstance(date, str) and date:
        target_date = date

    query = db.query(Plan)
    if target_date:
        query = query.filter(Plan.plan_date == target_date)
    plans = query.order_by(Plan.plan_date.desc(), Plan.id.desc()).all()
    res = []
    seen_dates = set()
    for p in plans:
        all_vers = db.query(PlanVersion).filter(PlanVersion.plan_id == p.id).order_by(PlanVersion.version_number.desc()).all()
        latest_ver = all_vers[0] if all_vers else None
        
        # Format Plan Code
        date_clean = (p.plan_date or "2026-10-06").replace("-", "")
        plan_code = f"PLAN-{date_clean}-{p.id:03d}"

        # Versions breakdown
        versions_summary = [
            {
                "version_number": v.version_number,
                "is_published": v.is_published,
                "status": "PUBLISHED" if v.is_published else ("LATEST" if v.version_number == p.current_version else "SUPERSEDED"),
                "visits": v.customers_visited,
                "distance_km": round(v.total_distance_km, 1),
                "ptp_coverage_pct": round(v.ptp_coverage_pct, 1),
                "created_at": v.created_at.strftime("%H:%M") if v.created_at else "09:00",
                "strategy": "Balanced Planning" if v.lambda_param == 2.0 else f"λ={v.lambda_param}"
            }
            for v in all_vers
        ]

        res.append({
            "id": p.id,
            "code": plan_code,
            "name": p.name,
            "plan_date": p.plan_date,
            "current_version": p.current_version,
            "status": "PUBLISHED" if (latest_ver and latest_ver.is_published) else ("READY FOR REVIEW" if p.status in ("ready", "draft") else p.status.upper()),
            "created_at": p.created_at.strftime("%H:%M") if p.created_at else "08:42",
            "created_by": "Priya Sharma (Ops Manager)",
            "strategy": "Balanced Planning",
            "versions_count": len(all_vers),
            "versions": versions_summary,
            "latest_metrics": {
                "total_distance_km": round(latest_ver.total_distance_km, 1) if latest_ver else 0.0,
                "total_score": round(latest_ver.total_score, 1) if latest_ver else 0.0,
                "customers_visited": latest_ver.customers_visited if latest_ver else 0,
                "ptp_coverage_pct": round(latest_ver.ptp_coverage_pct, 1) if latest_ver else 0.0,
                "ptp_scheduled": latest_ver.ptp_scheduled if latest_ver else 0,
                "ptp_total": latest_ver.ptp_total if latest_ver else 0,
                "violations_count": latest_ver.constraint_violations_count if latest_ver else 0
            } if latest_ver else None
        })
    return ApiResponse(success=True, data=res)

@router.get("/plans/{id}", response_model=ApiResponse)
def get_plan_details(id: int, version: Optional[int] = None, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    ver_num = version or plan.current_version
    ver = db.query(PlanVersion).filter(PlanVersion.plan_id == id, PlanVersion.version_number == ver_num).first()
    if not ver:
        raise HTTPException(status_code=404, detail=f"Plan version {ver_num} not found")

    # Fetch routes and stops
    routes = db.query(Route).filter(Route.plan_version_id == ver.id).all()
    routes_data = {}
    for r in routes:
        home_lat = r.home_lat
        home_lon = r.home_lon
        shift_start = r.shift_start
        shift_end = r.shift_end
        if home_lat is None or home_lon is None or not shift_start or not shift_end:
            exec_record = db.query(Executive).filter(Executive.id == r.executive_id, Executive.plan_date == plan.plan_date).first()
            if exec_record:
                home_lat = home_lat if home_lat is not None else exec_record.home_lat
                home_lon = home_lon if home_lon is not None else exec_record.home_lon
                shift_start = shift_start or exec_record.shift_start
                shift_end = shift_end or exec_record.shift_end

        stops = db.query(RouteStop).filter(RouteStop.route_id == r.id).order_by(RouteStop.seq.asc()).all()
        stop_ids = [str(s.id) for s in stops]

        # Fetch real-time visit status logs for executive replication
        stop_status_map = {}
        stop_outcome_map = {}
        if stop_ids:
            logs = db.query(AuditLog).filter(
                AuditLog.entity_type == "RouteStop",
                AuditLog.entity_id.in_(stop_ids)
            ).order_by(AuditLog.created_at.asc()).all()
            for lg in logs:
                sid = int(lg.entity_id)
                if lg.action == "VISIT_STARTED":
                    stop_status_map[sid] = "in_progress"
                elif lg.action == "VISIT_COMPLETED":
                    stop_status_map[sid] = "completed"
                    stop_outcome_map[sid] = lg.details_json or {}
                elif lg.action == "VISIT_FAILED":
                    stop_status_map[sid] = "failed"
                    stop_outcome_map[sid] = lg.details_json or {}

        routes_data[r.executive_id] = {
            "executive_id": r.executive_id,
            "executive_name": r.executive_name,
            "home_lat": home_lat,
            "home_lon": home_lon,
            "start_lat": home_lat,
            "start_lon": home_lon,
            "shift_start": shift_start or "08:30",
            "shift_end": shift_end or "17:30",
            "valid": r.is_feasible,
            "violations": r.violations_json,
            "metrics": {
                "total_km": r.total_km,
                "total_travel_minutes": r.total_travel_minutes,
                "total_waiting_minutes": r.total_waiting_minutes,
                "total_service_minutes": r.total_service_minutes,
                "total_duration_minutes": r.total_duration_minutes,
                "visit_count": r.visit_count,
                "return_time": r.return_time
            },
            "timeline": [
                {
                    "stop_id": s.id,
                    "seq": s.seq,
                    "customer_id": s.customer_id,
                    "customer_name": s.customer_name,
                    "area": s.area,
                    "lat": s.lat,
                    "lon": s.lon,
                    "arrival_time": s.arrival_time,
                    "waiting_min": s.waiting_min,
                    "service_start": s.service_start,
                    "service_end": s.service_end,
                    "departure_time": s.departure_time,
                    "km_from_prev": s.km_from_prev,
                    "cumulative_km": s.cumulative_km,
                    "priority_score": s.priority_score,
                    "ptp_today": s.ptp_today,
                    "overdue_amount": s.overdue_amount,
                    "explainability_json": s.explainability_json,
                    "window_start": (s.explainability_json or {}).get("window_start") or "09:00",
                    "window_end": (s.explainability_json or {}).get("window_end") or "18:00",
                    "service_min": (s.explainability_json or {}).get("service_min") or 15,
                    "status": stop_status_map.get(s.id, "pending"),
                    "outcome": stop_outcome_map.get(s.id)
                }
                for s in stops
            ]
        }

    # Fetch skipped customers
    skipped = db.query(SkippedCustomer).filter(SkippedCustomer.plan_version_id == ver.id).all()
    skipped_data = [
        {
            "customer_id": sc.customer_id,
            "customer_name": sc.customer_name,
            "area": sc.area,
            "lat": sc.lat,
            "lon": sc.lon,
            "ptp_today": sc.ptp_today,
            "priority_score": sc.priority_score,
            "overdue_amount": sc.overdue_amount,
            "window_start": sc.window_start,
            "window_end": sc.window_end,
            "reason": sc.reason,
            "details": sc.details_json,
            "nearest_executive_id": sc.nearest_executive_id,
            "distance_to_nearest_km": sc.distance_to_nearest_km
        }
        for sc in skipped
    ]

    all_versions = db.query(PlanVersion).filter(PlanVersion.plan_id == id).order_by(PlanVersion.version_number).all()

    res = {
        "id": plan.id,
        "name": plan.name,
        "plan_date": plan.plan_date,
        "current_version": plan.current_version,
        "selected_version": ver.version_number,
        "status": plan.status,
        "is_published": ver.is_published,
        "algorithm": ver.algorithm,
        "lambda_param": ver.lambda_param,
        "versions": [{"version_number": v.version_number, "score": v.total_score, "km": v.total_distance_km, "created_at": v.created_at.isoformat()} for v in all_versions],
        "metrics": {
            "total_distance_km": ver.total_distance_km,
            "total_priority_score": ver.total_priority_score,
            "total_score": ver.total_score,
            "ptp_scheduled": ver.ptp_scheduled,
            "ptp_total": ver.ptp_total,
            "ptp_coverage_pct": ver.ptp_coverage_pct,
            "customers_visited": ver.customers_visited,
            "customers_skipped": ver.customers_skipped,
            "violations_count": ver.constraint_violations_count,
            "runtime_ms": ver.runtime_ms
        },
        "routes": routes_data,
        "skipped": skipped_data,
        "skipped_customers": skipped_data
    }
    return ApiResponse(success=True, data=res)

@router.post("/plans/{id}/reoptimize", response_model=ApiResponse)
def reoptimize_plan(id: int, payload: ReoptimizeRequest, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    new_version_num = plan.current_version + 1

    execs = db.query(Executive).filter(Executive.plan_date == plan.plan_date).all()
    if payload.unavailable_executive_ids:
        execs = [e for e in execs if e.id not in payload.unavailable_executive_ids and e.status == "active"]
    else:
        execs = [e for e in execs if e.status == "active"]

    custs = db.query(Customer).filter(Customer.plan_date == plan.plan_date, Customer.status != "cancelled").all()
    if payload.removed_customer_ids:
        custs = [c for c in custs if c.id not in payload.removed_customer_ids]

    exec_dicts = [
        {"id": e.id, "name": e.name, "home_lat": e.home_lat, "home_lon": e.home_lon, "shift_start": e.shift_start, "shift_end": e.shift_end, "max_visits": e.max_visits, "max_km": e.max_km}
        for e in execs
    ]
    cust_dicts = [
        {"id": c.id, "name": c.name, "area": c.area, "lat": c.lat, "lon": c.lon, "dpd": c.dpd, "overdue_amount": c.overdue_amount, "priority_score": c.priority_score, "ptp_today": c.ptp_today, "window_start": c.window_start, "window_end": c.window_end, "service_min": c.service_min}
        for c in custs
    ]

    run_id = f"reopt_{uuid.uuid4().hex[:12]}"
    run_rec = OptimizationRun(id=run_id, stage="queued", progress_pct=10, status="running", plan_id=plan.id)
    db.add(run_rec)
    db.commit()

    JOB_TRACKER[run_id] = {"run_id": run_id, "stage": "queued", "progress_pct": 10, "status": "running"}

    thread = threading.Thread(
        target=execute_optimization_worker,
        args=(run_id, exec_dicts, cust_dicts, payload.algorithm or "smart_greedy_two_opt", payload.lambda_param or 2.0, plan.id, new_version_num, plan.plan_date)
    )
    thread.daemon = True
    thread.start()

    return ApiResponse(
        success=True,
        message=f"Re-optimization started for version {new_version_num}",
        data={"run_id": run_id, "plan_id": plan.id, "new_version": new_version_num}
    )

@router.post("/plans/{id}/publish", response_model=ApiResponse)
def publish_plan(id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    ver = db.query(PlanVersion).filter(PlanVersion.plan_id == id, PlanVersion.version_number == plan.current_version).first()
    if not ver:
        raise HTTPException(status_code=404, detail="Current plan version not found")

    # Pre-flight check: hard constraint violations must be 0
    if ver.constraint_violations_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot publish plan with {ver.constraint_violations_count} hard constraint violations."
        )

    plan.status = "published"
    ver.is_published = True

    db.add(AuditLog(
        user_email="manager@routepilot.io",
        action="PUBLISH_PLAN",
        entity_type="Plan",
        entity_id=str(plan.id),
        details_json={"version": ver.version_number, "score": ver.total_score, "km": ver.total_distance_km}
    ))
    db.commit()

    return ApiResponse(
        success=True,
        message=f"Plan {id} (v{ver.version_number}) has been published! Dispatched to all field executives.",
        data={"plan_id": plan.id, "version": ver.version_number, "status": "published"}
    )

@router.get("/plans/{id}/export/csv")
def export_plan_csv(id: int, db: Session = Depends(get_db)):
    plan_resp = get_plan_details(id, None, db)
    p = plan_resp.data
    csv_str = generate_plan_csv(p)
    filename = f"RoutePilot_Daily_Field_Plan_{p['plan_date']}.csv"
    
    db.add(AuditLog(
        user_email="manager@routepilot.io",
        action="EXPORT_REPORT_CSV",
        entity_type="Plan",
        entity_id=str(id),
        details_json={"report": "Daily Field Plan", "file": filename, "format": "CSV"}
    ))
    db.commit()

    return PlainTextResponse(
        csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/plans/{id}/export/skipped")
def export_skipped_csv(id: int, db: Session = Depends(get_db)):
    plan_resp = get_plan_details(id, None, db)
    p = plan_resp.data
    csv_str = generate_skipped_csv(p)
    filename = f"RoutePilot_Exceptions_{p['plan_date']}.csv"

    db.add(AuditLog(
        user_email="manager@routepilot.io",
        action="EXPORT_REPORT_CSV",
        entity_type="Plan",
        entity_id=str(id),
        details_json={"report": "Exceptions Report", "file": filename, "format": "CSV"}
    ))
    db.commit()

    return PlainTextResponse(
        csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/plans/{id}/export/metrics")
def export_metrics_csv(id: int, db: Session = Depends(get_db)):
    plan_resp = get_plan_details(id, None, db)
    p = plan_resp.data
    csv_str = generate_metrics_csv(p)
    filename = f"RoutePilot_Performance_Summary_{p['plan_date']}.csv"

    db.add(AuditLog(
        user_email="manager@routepilot.io",
        action="EXPORT_REPORT_CSV",
        entity_type="Plan",
        entity_id=str(id),
        details_json={"report": "Performance Summary", "file": filename, "format": "CSV"}
    ))
    db.commit()

    return PlainTextResponse(
        csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/plans/{id}/export/json")
def export_plan_json(id: int, db: Session = Depends(get_db)):
    plan_resp = get_plan_details(id, None, db)
    p = plan_resp.data
    filename = f"RoutePilot_Route_Data_{p['plan_date']}.json"

    db.add(AuditLog(
        user_email="manager@routepilot.io",
        action="EXPORT_REPORT_JSON",
        entity_type="Plan",
        entity_id=str(id),
        details_json={"report": "Advanced Route Data", "file": filename, "format": "JSON"}
    ))
    db.commit()

    return JSONResponse(
        content=p,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
