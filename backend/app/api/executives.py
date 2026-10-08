from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.models import Executive, AuditLog
from backend.app.schemas.schemas import ExecutiveBase, ApiResponse
from backend.app.services.datetime_service import get_operational_date

router = APIRouter(prefix="/api/executives", tags=["Executives"])

@router.get("", response_model=ApiResponse)
def list_executives(status: Optional[str] = None, date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    target_date = date or get_operational_date()
    query = db.query(Executive).filter(Executive.plan_date == target_date)
    if status:
        query = query.filter(Executive.status == status)
    execs = query.all()
    res = [
        {
            "id": e.id, "name": e.name, "home_lat": e.home_lat, "home_lon": e.home_lon,
            "shift_start": e.shift_start, "shift_end": e.shift_end,
            "max_visits": e.max_visits, "max_km": e.max_km, "status": e.status
        }
        for e in execs
    ]
    return ApiResponse(success=True, data=res)

@router.get("/{id}", response_model=ApiResponse)
def get_executive(id: str, db: Session = Depends(get_db)):
    e = db.query(Executive).filter(Executive.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Executive not found")
    return ApiResponse(success=True, data={
        "id": e.id, "name": e.name, "home_lat": e.home_lat, "home_lon": e.home_lon,
        "shift_start": e.shift_start, "shift_end": e.shift_end,
        "max_visits": e.max_visits, "max_km": e.max_km, "status": e.status
    })

@router.post("", response_model=ApiResponse)
def create_executive(payload: ExecutiveBase, db: Session = Depends(get_db)):
    existing = db.query(Executive).filter(Executive.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Executive {payload.id} already exists")

    exc = Executive(**payload.dict())
    db.add(exc)
    db.add(AuditLog(user_email="manager@routepilot.io", action="CREATE_EXECUTIVE", entity_type="Executive", entity_id=exc.id))
    db.commit()
    db.refresh(exc)
    return ApiResponse(success=True, message=f"Executive {exc.id} created", data=payload.dict())

@router.put("/{id}", response_model=ApiResponse)
def update_executive(id: str, payload: ExecutiveBase, db: Session = Depends(get_db)):
    exc = db.query(Executive).filter(Executive.id == id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Executive not found")

    for k, v in payload.dict().items():
        if k != "id":
            setattr(exc, k, v)

    db.add(AuditLog(user_email="manager@routepilot.io", action="UPDATE_EXECUTIVE", entity_type="Executive", entity_id=id))
    db.commit()
    return ApiResponse(success=True, message=f"Executive {id} updated", data=payload.dict())
