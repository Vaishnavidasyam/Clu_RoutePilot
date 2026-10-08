import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.models import User, Executive, Route, Plan, PlanVersion, AuditLog
from backend.app.schemas.schemas import LoginRequest, TokenResponse, ApiResponse
from backend.app.auth.auth_service import verify_password, get_password_hash, create_access_token, get_current_user_optional
from backend.app.services.datetime_service import get_operational_date

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.get("/demo-executives", response_model=ApiResponse)
def get_demo_executives(db: Session = Depends(get_db)):
    """
    Returns active field executives for the operational date,
    derived dynamically from the uploaded CSV dataset.
    """
    target_date = get_operational_date()
    execs = db.query(Executive).filter(
        Executive.plan_date == target_date,
        Executive.status == "active"
    ).order_by(Executive.id.asc()).all()

    if not execs:
        # Fallback to any active executives if target_date has no specific roster
        execs = db.query(Executive).filter(Executive.status == "active").order_by(Executive.id.asc()).all()

    # Get latest plan for target_date to count assigned stops
    latest_plan = db.query(Plan).filter(Plan.plan_date == target_date).order_by(Plan.id.desc()).first()
    stops_count_map = {}
    if latest_plan:
        ver = db.query(PlanVersion).filter(
            PlanVersion.plan_id == latest_plan.id,
            PlanVersion.version_number == latest_plan.current_version
        ).first()
        if ver:
            routes = db.query(Route).filter(Route.plan_version_id == ver.id).all()
            for r in routes:
                stops_count_map[r.executive_id] = r.visit_count

    data = [
        {
            "id": e.id,
            "name": e.name,
            "shift_start": e.shift_start,
            "shift_end": e.shift_end,
            "home_lat": e.home_lat,
            "home_lon": e.home_lon,
            "max_visits": e.max_visits,
            "max_km": e.max_km,
            "status": e.status,
            "email": f"{e.id.lower()}@routepilot.io",
            "stops_count": stops_count_map.get(e.id, 0),
        }
        for e in execs
    ]
    return ApiResponse(success=True, data=data)

@router.post("/login", response_model=ApiResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    raw_ident = creds.email.strip()
    lower_ident = raw_ident.lower()
    target_date = get_operational_date()

    # Check if this is an executive login (e.g. "E01", "e02@routepilot.io", "executive@routepilot.io")
    prefix = lower_ident.split('@')[0] if '@' in lower_ident else lower_ident
    is_exec_identifier = bool(re.match(r'^e\d+$', prefix) or prefix == 'executive')

    if is_exec_identifier:
        # Resolve target executive ID
        target_exec_id = None
        if re.match(r'^e\d+$', prefix):
            target_exec_id = prefix.upper()
        elif prefix == 'executive':
            existing_user = db.query(User).filter(User.email == creds.email).first()
            if existing_user and existing_user.executive_id:
                target_exec_id = existing_user.executive_id
            else:
                first_exec = db.query(Executive).filter(
                    Executive.plan_date == target_date,
                    Executive.status == "active"
                ).order_by(Executive.id.asc()).first()
                if first_exec:
                    target_exec_id = first_exec.id

        # STRICT AUTHORIZATION: Must be included in active operational roster for target_date
        exec_record = db.query(Executive).filter(
            Executive.id == target_exec_id,
            Executive.plan_date == target_date
        ).first()

        if not exec_record:
            # Check if exists in any other date or doesn't exist at all
            any_date_exec = db.query(Executive).filter(Executive.id == target_exec_id).first()
            if any_date_exec:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Executive {target_exec_id} is not included in today's active roster ({target_date}). Only executives included by the Operations Manager or Admin have system access."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Executive '{target_exec_id or raw_ident}' not found in the uploaded operational dataset."
                )

        # Validate password (support standard demo 'exec123' or configured user password)
        exec_email = f"{exec_record.id.lower()}@routepilot.io"
        user = db.query(User).filter((User.email == exec_email) | (User.executive_id == exec_record.id)).first()

        password_valid = False
        if creds.password == "exec123":
            password_valid = True
        elif user and verify_password(creds.password, user.hashed_password):
            password_valid = True

        if not password_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password for field executive account"
            )

        # Ensure user record exists & is synchronized with the imported executive
        if not user:
            user = User(
                email=exec_email,
                hashed_password=get_password_hash("exec123"),
                full_name=exec_record.name,
                role="EXECUTIVE",
                executive_id=exec_record.id,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.executive_id = exec_record.id
            user.full_name = exec_record.name
            user.role = "EXECUTIVE"
            db.commit()

        token = create_access_token(data={
            "sub": user.email,
            "role": "EXECUTIVE",
            "id": user.id,
            "executive_id": exec_record.id
        })

        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            action="EXECUTIVE_LOGIN",
            entity_type="Executive",
            entity_id=exec_record.id
        )
        db.add(audit)
        db.commit()

        return ApiResponse(
            success=True,
            message=f"Login successful for {exec_record.id}",
            data={
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": exec_record.name,
                    "role": "EXECUTIVE",
                    "executive_id": exec_record.id
                }
            }
        )

    # Standard Manager / Admin login
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    # If user role is EXECUTIVE, enforce active roster check
    if user.role == "EXECUTIVE":
        if not user.executive_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: No executive ID linked to this account."
            )
        active_exec = db.query(Executive).filter(
            Executive.id == user.executive_id,
            Executive.plan_date == target_date
        ).first()
        if not active_exec:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Executive {user.executive_id} is not included in today's active roster ({target_date})."
            )

    token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id, "executive_id": user.executive_id})

    # Log audit
    audit = AuditLog(user_id=user.id, user_email=user.email, action="USER_LOGIN", entity_type="User", entity_id=str(user.id))
    db.add(audit)
    db.commit()

    return ApiResponse(
        success=True,
        message="Login successful",
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "executive_id": user.executive_id
            }
        }
    )

@router.post("/logout", response_model=ApiResponse)
def logout(current_user: dict = Depends(get_current_user_optional)):
    return ApiResponse(success=True, message="Successfully logged out")

@router.get("/me", response_model=ApiResponse)
def get_me(current_user: dict = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.email == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ApiResponse(
        success=True,
        data={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "executive_id": user.executive_id
        }
    )
