from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.models import Plan, PlanVersion, Route, RouteStop, Executive, AuditLog
from backend.app.schemas.schemas import ApiResponse, VisitOutcomeRequest

# inside router ...
from backend.app.auth.auth_service import get_current_user_optional

router = APIRouter(prefix="/api/executive", tags=["Executive Mobile Portal"])

@router.get("/today", response_model=ApiResponse)
def get_executive_today_route(
    executive_id: Optional[str] = "E01",
    current_user: Optional[dict] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    target_eid = executive_id
    if current_user and current_user.get("executive_id"):
        target_eid = current_user["executive_id"]

    exc = db.query(Executive).filter(Executive.id == target_eid).first()
    if not exc:
        first_exc = db.query(Executive).order_by(Executive.id.asc()).first()
        if first_exc:
            exc = first_exc
            target_eid = first_exc.id
        else:
            return ApiResponse(success=True, data=None, message="No executives found.")

    # Find latest published or active plan
    plan = db.query(Plan).order_by(Plan.id.desc()).first()
    if not plan:
        return ApiResponse(success=True, data=None, message="No route plan available for today yet.")

    ver = db.query(PlanVersion).filter(PlanVersion.plan_id == plan.id, PlanVersion.version_number == plan.current_version).first()
    if not ver:
        return ApiResponse(success=True, data=None, message="No version available for today.")

    route = db.query(Route).filter(Route.plan_version_id == ver.id, Route.executive_id == target_eid).first()
    if not route:
        return ApiResponse(success=True, data=None, message=f"No route assigned to {target_eid} for today.")

    stops = db.query(RouteStop).filter(RouteStop.route_id == route.id).order_by(RouteStop.seq).all()
    stop_ids = [str(s.id) for s in stops]

    # Fetch any logs for these stops
    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == "RouteStop",
        AuditLog.entity_id.in_(stop_ids)
    ).order_by(AuditLog.created_at.asc()).all()

    stop_status_map = {}
    stop_outcome_map = {}
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

    timeline = [
        {
            "seq": s.seq,
            "stop_id": s.id,
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
            "status": stop_status_map.get(s.id, "pending"),
            "outcome": stop_outcome_map.get(s.id),
            "navigation_url": f"https://www.google.com/maps/dir/?api=1&destination={s.lat},{s.lon}"
        }
        for s in stops
    ]

    return ApiResponse(
        success=True,
        data={
            "executive": {
                "id": exc.id,
                "name": exc.name,
                "home_lat": exc.home_lat,
                "home_lon": exc.home_lon,
                "shift_start": exc.shift_start,
                "shift_end": exc.shift_end,
                "max_visits": exc.max_visits,
                "max_km": exc.max_km,
                "status": exc.status
            },
            "route": {
                "id": route.id,
                "plan_version": ver.version_number,
                "total_km": route.total_km,
                "total_duration_minutes": route.total_duration_minutes,
                "visit_count": route.visit_count,
                "return_time": route.return_time
            },
            "stops": timeline
        }
    )

@router.post("/visits/{id}/start", response_model=ApiResponse)
def start_visit(id: int, db: Session = Depends(get_db)):
    stop = db.query(RouteStop).filter(RouteStop.id == id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Visit stop not found")
    db.add(AuditLog(user_email="executive@routepilot.io", action="VISIT_STARTED", entity_type="RouteStop", entity_id=str(id)))
    db.commit()
    return ApiResponse(success=True, message=f"Visit {id} for customer {stop.customer_id} started")

@router.post("/visits/{id}/complete", response_model=ApiResponse)
def complete_visit(id: int, payload: Optional[VisitOutcomeRequest] = None, db: Session = Depends(get_db)):
    stop = db.query(RouteStop).filter(RouteStop.id == id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Visit stop not found")
    details = payload.dict() if payload else {"outcome_type": "completed"}
    db.add(AuditLog(
        user_email="executive@routepilot.io",
        action="VISIT_COMPLETED",
        entity_type="RouteStop",
        entity_id=str(id),
        details_json=details
    ))
    db.commit()
    return ApiResponse(success=True, message=f"Visit {id} for customer {stop.customer_id} completed successfully")

@router.post("/visits/{id}/failed", response_model=ApiResponse)
def failed_visit(id: int, reason: Optional[str] = "Customer unavailable", payload: Optional[VisitOutcomeRequest] = None, db: Session = Depends(get_db)):
    stop = db.query(RouteStop).filter(RouteStop.id == id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Visit stop not found")
    details = payload.dict() if payload else {"reason": reason}
    if reason and "reason" not in details:
        details["reason"] = reason
    db.add(AuditLog(
        user_email="executive@routepilot.io",
        action="VISIT_FAILED",
        entity_type="RouteStop",
        entity_id=str(id),
        details_json=details
    ))
    db.commit()
    return ApiResponse(success=True, message=f"Visit {id} logged as failed: {reason}")

