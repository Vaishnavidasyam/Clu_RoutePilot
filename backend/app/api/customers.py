from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.models import Customer, AuditLog
from backend.app.schemas.schemas import CustomerBase, CustomerResponse, ApiResponse
from backend.app.services.datetime_service import get_operational_date

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("", response_model=ApiResponse)
def list_customers(
    area: Optional[str] = None,
    ptp_today: Optional[int] = None,
    search: Optional[str] = None,
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    target_date = date or get_operational_date()
    query = db.query(Customer).filter(Customer.plan_date == target_date)
    if area:
        query = query.filter(Customer.area == area)
    if ptp_today is not None:
        query = query.filter(Customer.ptp_today == ptp_today)
    if search:
        s = f"%{search}%"
        query = query.filter((Customer.id.ilike(s)) | (Customer.name.ilike(s)) | (Customer.area.ilike(s)))

    customers = query.all()
    res = [
        {
            "id": c.id, "name": c.name, "area": c.area, "lat": c.lat, "lon": c.lon,
            "dpd": c.dpd, "overdue_amount": c.overdue_amount, "priority_score": c.priority_score,
            "ptp_today": c.ptp_today, "window_start": c.window_start, "window_end": c.window_end,
            "service_min": c.service_min, "status": c.status
        }
        for c in customers
    ]
    return ApiResponse(success=True, data=res)

@router.get("/{id}", response_model=ApiResponse)
def get_customer(id: str, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return ApiResponse(success=True, data={
        "id": c.id, "name": c.name, "area": c.area, "lat": c.lat, "lon": c.lon,
        "dpd": c.dpd, "overdue_amount": c.overdue_amount, "priority_score": c.priority_score,
        "ptp_today": c.ptp_today, "window_start": c.window_start, "window_end": c.window_end,
        "service_min": c.service_min, "status": c.status
    })

@router.post("", response_model=ApiResponse)
def create_customer(payload: CustomerBase, db: Session = Depends(get_db)):
    existing = db.query(Customer).filter(Customer.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Customer with ID {payload.id} already exists")

    cust = Customer(**payload.dict())
    db.add(cust)
    db.add(AuditLog(user_email="manager@routepilot.io", action="CREATE_CUSTOMER", entity_type="Customer", entity_id=cust.id))
    db.commit()
    db.refresh(cust)
    return ApiResponse(success=True, message=f"Customer {cust.id} created", data=payload.dict())

@router.put("/{id}", response_model=ApiResponse)
def update_customer(id: str, payload: CustomerBase, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.id == id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    for k, v in payload.dict().items():
        if k != "id":
            setattr(cust, k, v)

    db.add(AuditLog(user_email="manager@routepilot.io", action="UPDATE_CUSTOMER", entity_type="Customer", entity_id=id))
    db.commit()
    return ApiResponse(success=True, message=f"Customer {id} updated", data=payload.dict())

@router.delete("/{id}", response_model=ApiResponse)
def delete_customer(id: str, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.id == id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    db.delete(cust)
    db.add(AuditLog(user_email="manager@routepilot.io", action="DELETE_CUSTOMER", entity_type="Customer", entity_id=id))
    db.commit()
    return ApiResponse(success=True, message=f"Customer {id} removed")
