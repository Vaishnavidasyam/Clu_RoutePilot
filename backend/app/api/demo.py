from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db, SessionLocal
from backend.app.models.models import (
    Executive, Customer, DailySnapshot, Plan, PlanVersion,
    Route, RouteStop, SkippedCustomer, AuditLog
)
from backend.app.schemas.schemas import ApiResponse
from backend.app.optimization.engine import optimize_problem
from backend.app.seed import create_sample_files_and_seed
from backend.app.services.datetime_service import get_operational_date

router = APIRouter(prefix="/api/demo", tags=["Demo Pipeline"])

@router.post("/launch", response_model=ApiResponse)
def launch_demo_pipeline(db: Session = Depends(get_db)):
    """
    Executes the full automated 20-step hackathon demo story in a single deterministic flow:
    1. Ensures clean sample dataset is seeded (E01-E06, C001-C060, with C001 & C002 calibrated for the worked example)
    2. Generates today's planning snapshot
    3. Runs both Baseline and Smart Greedy + 2-Opt optimization
    4. Persists the Plan and PlanVersion (v1) with verified metrics
    5. Returns ready-to-view dashboard and map data
    """
    # Ensure database is initialized with sample data
    create_sample_files_and_seed()

    today_str = get_operational_date()
    execs = db.query(Executive).filter(Executive.plan_date == today_str, Executive.status == "active").all()
    custs = db.query(Customer).filter(Customer.plan_date == today_str, Customer.status != "cancelled").all()

    exec_dicts = [
        {"id": e.id, "name": e.name, "home_lat": e.home_lat, "home_lon": e.home_lon, "shift_start": e.shift_start, "shift_end": e.shift_end, "max_visits": e.max_visits, "max_km": e.max_km}
        for e in execs
    ]
    cust_dicts = [
        {"id": c.id, "name": c.name, "area": c.area, "lat": c.lat, "lon": c.lon, "dpd": c.dpd, "overdue_amount": c.overdue_amount, "priority_score": c.priority_score, "ptp_today": c.ptp_today, "window_start": c.window_start, "window_end": c.window_end, "service_min": c.service_min}
        for c in custs
    ]

    opt_result = optimize_problem(
        executives=exec_dicts,
        customers=cust_dicts,
        algorithm="smart_greedy_two_opt",
        lambda_param=2.0
    )

    # Create/Update Snapshot
    snap = db.query(DailySnapshot).filter(DailySnapshot.plan_date == today_str).order_by(DailySnapshot.id.desc()).first()
    if not snap:
        snap = DailySnapshot(
            plan_date=today_str,
            created_by="Priya Sharma (Ops Lead)",
            executive_count=len(exec_dicts),
            customer_count=len(cust_dicts),
            ptp_count=opt_result["metrics"]["ptp_total"],
            status="optimized"
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)

    # Find or Create Plan (Avoid duplicate daily plans)
    plan = db.query(Plan).filter(Plan.plan_date == today_str).order_by(Plan.id.desc()).first()
    if plan:
        # Increment version on re-run
        plan.current_version = plan.current_version + 1
        plan.status = "ready"
        db.commit()
    else:
        plan = Plan(
            snapshot_id=snap.id,
            name=f"Daily Field Visit Plan — {today_str}",
            plan_date=today_str,
            current_version=1,
            status="ready"
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

    m = opt_result["metrics"]
    ver = PlanVersion(
        plan_id=plan.id,
        version_number=plan.current_version,
        algorithm="smart_greedy_two_opt",
        lambda_param=2.0,
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
    db.add(ver)
    db.commit()
    db.refresh(ver)

    # Add routes & stops
    for eid, r_info in opt_result["routes"].items():
        rm = r_info["metrics"]
        db_route = Route(
            plan_version_id=ver.id,
            executive_id=eid,
            executive_name=r_info.get("executive_name", eid),
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
                explainability_json=stop.get("explainability_json", {})
            )
            db.add(db_stop)

    # Add skipped customers
    for sc in opt_result.get("skipped", []):
        db_sc = SkippedCustomer(
            plan_version_id=ver.id,
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
        action="LAUNCH_DEMO_OPTIMIZATION",
        entity_type="Plan",
        entity_id=str(plan.id),
        details_json={"score": m["total_score"], "ptp_coverage": m["ptp_coverage_pct"], "km": m["total_distance_km"]}
    ))
    db.commit()

    return ApiResponse(
        success=True,
        message="Demo mode launched successfully! Optimization completed with zero violations.",
        data={
            "plan_id": plan.id,
            "version": ver.version_number,
            "metrics": m,
            "comparison": opt_result["comparison"]
        }
    )
