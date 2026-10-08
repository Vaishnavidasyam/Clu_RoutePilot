from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(String(50), default="OPERATIONS_MANAGER")  # ADMIN, OPERATIONS_MANAGER, EXECUTIVE
    executive_id = Column(String(50), nullable=True)  # link to executive if role is EXECUTIVE
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

from backend.app.services.datetime_service import get_operational_date

class Executive(Base):
    __tablename__ = "executives"
    id = Column(String(50), primary_key=True)  # E01, E02...
    plan_date = Column(String(20), primary_key=True, default=get_operational_date, index=True)  # YYYY-MM-DD
    name = Column(String(120), nullable=False)
    home_lat = Column(Float, nullable=False)
    home_lon = Column(Float, nullable=False)
    shift_start = Column(String(10), nullable=False)  # "09:00"
    shift_end = Column(String(10), nullable=False)    # "18:00"
    max_visits = Column(Integer, nullable=False, default=15)
    max_km = Column(Float, nullable=False, default=80.0)
    status = Column(String(20), default="active")  # active, unavailable
    created_at = Column(DateTime, default=datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(String(50), primary_key=True)  # C001, C002...
    plan_date = Column(String(20), primary_key=True, default=get_operational_date, index=True)  # YYYY-MM-DD
    name = Column(String(120), nullable=True)
    area = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    dpd = Column(Integer, nullable=False, default=0)
    overdue_amount = Column(Float, nullable=False, default=0.0)
    priority_score = Column(Float, nullable=False, default=1.0)
    ptp_today = Column(Integer, nullable=False, default=0)  # 0 or 1
    window_start = Column(String(10), nullable=False)  # "09:00"
    window_end = Column(String(10), nullable=False)    # "13:00"
    service_min = Column(Integer, nullable=False, default=15)
    status = Column(String(20), default="pending")  # pending, visited, skipped, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

class DailySnapshot(Base):
    __tablename__ = "daily_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    plan_date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(120), default="System")
    executive_count = Column(Integer, default=0)
    customer_count = Column(Integer, default=0)
    ptp_count = Column(Integer, default=0)
    status = Column(String(30), default="draft")  # draft, validated, optimized, published
    data_source = Column(String(50), default="csv")  # csv, manual, api

    plans = relationship("Plan", back_populates="snapshot", cascade="all, delete-orphan")

class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("daily_snapshots.id"), nullable=False)
    name = Column(String(120), nullable=False)
    plan_date = Column(String(20), nullable=False, index=True)
    current_version = Column(Integer, default=1)
    status = Column(String(30), default="draft")  # draft, published
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    snapshot = relationship("DailySnapshot", back_populates="plans")
    versions = relationship("PlanVersion", back_populates="plan", cascade="all, delete-orphan")

class PlanVersion(Base):
    __tablename__ = "plan_versions"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    algorithm = Column(String(50), default="smart_greedy_two_opt")
    lambda_param = Column(Float, default=2.0)
    total_distance_km = Column(Float, default=0.0)
    total_priority_score = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)
    ptp_scheduled = Column(Integer, default=0)
    ptp_total = Column(Integer, default=0)
    ptp_coverage_pct = Column(Float, default=0.0)
    customers_visited = Column(Integer, default=0)
    customers_skipped = Column(Integer, default=0)
    constraint_violations_count = Column(Integer, default=0)
    runtime_ms = Column(Float, default=0.0)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("Plan", back_populates="versions")
    routes = relationship("Route", back_populates="version", cascade="all, delete-orphan")
    skipped_customers = relationship("SkippedCustomer", back_populates="version", cascade="all, delete-orphan")

class Route(Base):
    __tablename__ = "routes"
    id = Column(Integer, primary_key=True, index=True)
    plan_version_id = Column(Integer, ForeignKey("plan_versions.id"), nullable=False)
    executive_id = Column(String(50), nullable=False)
    executive_name = Column(String(120), nullable=True)
    home_lat = Column(Float, nullable=True)
    home_lon = Column(Float, nullable=True)
    shift_start = Column(String(10), nullable=True)
    shift_end = Column(String(10), nullable=True)
    total_km = Column(Float, default=0.0)
    total_travel_minutes = Column(Float, default=0.0)
    total_waiting_minutes = Column(Float, default=0.0)
    total_service_minutes = Column(Float, default=0.0)
    total_duration_minutes = Column(Float, default=0.0)
    visit_count = Column(Integer, default=0)
    return_time = Column(String(10), nullable=True)
    is_feasible = Column(Boolean, default=True)
    violations_json = Column(JSON, default=list)

    version = relationship("PlanVersion", back_populates="routes")
    stops = relationship("RouteStop", back_populates="route", cascade="all, delete-orphan", order_by="RouteStop.seq")

class RouteStop(Base):
    __tablename__ = "route_stops"
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    seq = Column(Integer, nullable=False)  # 1, 2, 3...
    customer_id = Column(String(50), nullable=False)
    customer_name = Column(String(120), nullable=True)
    area = Column(String(100), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    arrival_time = Column(String(10), nullable=False)
    waiting_min = Column(Float, default=0.0)
    service_start = Column(String(10), nullable=False)
    service_end = Column(String(10), nullable=False)
    departure_time = Column(String(10), nullable=False)
    km_from_prev = Column(Float, default=0.0)
    cumulative_km = Column(Float, default=0.0)
    priority_score = Column(Float, default=0.0)
    ptp_today = Column(Integer, default=0)
    overdue_amount = Column(Float, default=0.0)
    explainability_json = Column(JSON, default=dict)

    route = relationship("Route", back_populates="stops")

class SkippedCustomer(Base):
    __tablename__ = "skipped_customers"
    id = Column(Integer, primary_key=True, index=True)
    plan_version_id = Column(Integer, ForeignKey("plan_versions.id"), nullable=False)
    customer_id = Column(String(50), nullable=False)
    customer_name = Column(String(120), nullable=True)
    area = Column(String(100), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    ptp_today = Column(Integer, default=0)
    priority_score = Column(Float, default=0.0)
    overdue_amount = Column(Float, default=0.0)
    window_start = Column(String(10), nullable=True)
    window_end = Column(String(10), nullable=True)
    reason = Column(String(255), nullable=False)
    details_json = Column(JSON, default=dict)
    nearest_executive_id = Column(String(50), nullable=True)
    distance_to_nearest_km = Column(Float, default=0.0)

    version = relationship("PlanVersion", back_populates="skipped_customers")

class OptimizationRun(Base):
    __tablename__ = "optimization_runs"
    id = Column(String(50), primary_key=True)  # uuid string
    plan_id = Column(Integer, nullable=True)
    stage = Column(String(50), default="queued")
    progress_pct = Column(Integer, default=0)
    status = Column(String(30), default="queued")  # queued, running, completed, failed
    statistics_json = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(120), nullable=False, default="system@routepilot.io")
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
