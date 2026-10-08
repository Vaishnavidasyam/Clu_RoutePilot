from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "OPERATIONS_MANAGER"
    executive_id: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    executive_id: Optional[str] = None
    is_active: bool

class ExecutiveBase(BaseModel):
    id: str
    plan_date: Optional[str] = None
    name: str
    home_lat: float
    home_lon: float
    shift_start: str
    shift_end: str
    max_visits: int = 15
    max_km: float = 80.0
    status: str = "active"

class ExecutiveResponse(ExecutiveBase):
    model_config = {"from_attributes": True}

class CustomerBase(BaseModel):
    id: str
    plan_date: Optional[str] = None
    name: Optional[str] = None
    area: str
    lat: float
    lon: float
    dpd: int = 0
    overdue_amount: float = 0.0
    priority_score: float = 1.0
    ptp_today: int = 0
    window_start: str
    window_end: str
    service_min: int = 15
    status: str = "pending"

class CustomerResponse(CustomerBase):
    model_config = {"from_attributes": True}

class OptimizationRunRequest(BaseModel):
    snapshot_id: Optional[int] = None
    plan_date: Optional[str] = None
    operational_date: Optional[str] = None
    algorithm: str = "smart_greedy_two_opt"  # baseline, greedy, smart_greedy, smart_greedy_two_opt
    lambda_param: float = 2.0
    avg_speed_kmh: float = 25.0
    road_factor: float = 1.3
    allow_waiting: bool = True
    ptp_first: bool = True

class ReoptimizeRequest(BaseModel):
    lambda_param: Optional[float] = 2.0
    algorithm: Optional[str] = "smart_greedy_two_opt"
    removed_customer_ids: Optional[List[str]] = []
    unavailable_executive_ids: Optional[List[str]] = []
    scenario_description: Optional[str] = None

class ValidationItem(BaseModel):
    type: str  # ERROR, WARNING, VALID
    category: str
    record_id: Optional[str] = None
    field: Optional[str] = None
    message: str
    fixable: bool = False

class DataValidationReport(BaseModel):
    is_valid: bool
    blocking_error_count: int
    warning_count: int
    executive_valid_count: int
    customer_valid_count: int
    issues: List[ValidationItem]

class VisitOutcomeRequest(BaseModel):
    outcome_type: str = "payment_collected"  # payment_collected, ptp_confirmed, customer_unavailable, rescheduled, dispute
    amount_collected: Optional[float] = 0.0
    notes: Optional[str] = None
    next_ptp_date: Optional[str] = None
    contact_person: Optional[str] = None

class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    error: Optional[Dict[str, Any]] = None

