from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.models import User, AuditLog, SystemSetting
from backend.app.schemas.schemas import UserCreate, ApiResponse
from backend.app.auth.auth_service import get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin & Audit"])

@router.get("/users", response_model=ApiResponse)
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    res = [
        {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "executive_id": u.executive_id, "is_active": u.is_active, "created_at": u.created_at.isoformat()}
        for u in users
    ]
    return ApiResponse(success=True, data=res)

@router.post("/users", response_model=ApiResponse)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    u = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        executive_id=payload.executive_id
    )
    db.add(u)
    db.add(AuditLog(user_email="admin@routepilot.io", action="CREATE_USER", entity_type="User", entity_id=u.email))
    db.commit()
    db.refresh(u)
    return ApiResponse(success=True, message=f"User {u.email} created", data={"id": u.id, "email": u.email, "role": u.role})

@router.put("/users/{id}/toggle-active", response_model=ApiResponse)
def toggle_user_active(id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = not u.is_active
    db.add(AuditLog(user_email="admin@routepilot.io", action="TOGGLE_USER_ACTIVE", entity_type="User", entity_id=str(u.id), details_json={"active": u.is_active}))
    db.commit()
    return ApiResponse(success=True, message=f"User active state set to {u.is_active}", data={"id": u.id, "is_active": u.is_active})

@router.get("/audit-logs", response_model=ApiResponse)
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    res = [
        {
            "id": l.id,
            "user_email": l.user_email,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details_json,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]
    return ApiResponse(success=True, data=res)

@router.get("/settings", response_model=ApiResponse)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSetting).all()
    res = {s.key: {"value": s.value, "description": s.description} for s in settings}
    return ApiResponse(success=True, data=res)

@router.post("/settings", response_model=ApiResponse)
def update_setting(key: str, value: str, db: Session = Depends(get_db)):
    st = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if st:
        st.value = value
    else:
        st = SystemSetting(key=key, value=value)
        db.add(st)
    db.add(AuditLog(user_email="admin@routepilot.io", action="UPDATE_SETTING", entity_type="SystemSetting", entity_id=key, details_json={"value": value}))
    db.commit()
    return ApiResponse(success=True, message=f"Setting {key} updated to {value}")
