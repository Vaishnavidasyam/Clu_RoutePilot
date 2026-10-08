import os
import csv
import math
import random
from datetime import datetime
from backend.app.database.session import engine, SessionLocal, Base
from backend.app.models.models import (
    User, Executive, Customer, DailySnapshot, Plan, PlanVersion,
    Route, RouteStop, SkippedCustomer, SystemSetting, AuditLog
)
from backend.app.auth.auth_service import get_password_hash
from backend.app.optimization.distance import road_distance_km
from backend.app.services.datetime_service import get_operational_date

def seed_users(db=None):
    """Seed default users and system settings only without inserting operational data."""
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    # 1. Default Users (Admin, Manager, Executive)
    users_data = [
        {"email": "admin@routepilot.io", "password": "admin123", "full_name": "Dev Admin", "role": "ADMIN", "executive_id": None},
        {"email": "manager@routepilot.io", "password": "manager123", "full_name": "Priya Sharma (Ops Lead)", "role": "OPERATIONS_MANAGER", "executive_id": None},
        {"email": "executive@routepilot.io", "password": "exec123", "full_name": "Vikram Singh (E01)", "role": "EXECUTIVE", "executive_id": "E01"},
    ]

    for u in users_data:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            db_user = User(
                email=u["email"],
                hashed_password=get_password_hash(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                executive_id=u["executive_id"]
            )
            db.add(db_user)

    # 2. System Settings
    settings_data = [
        ("default_lambda", "2.0", "Weight coefficient for total travel distance in objective function"),
        ("avg_speed_kmh", "25.0", "Average city travel speed in km/h for urban collection routes"),
        ("road_factor", "1.3", "Correction multiplier applied to Haversine distance for road approximation"),
        ("ptp_mandatory", "true", "Always prioritize PTP (promise to pay) customers ahead of optional visits"),
        ("allow_waiting", "true", "Permit early arrival waiting at customer locations within working hours")
    ]
    for key, val, desc in settings_data:
        st = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not st:
            db.add(SystemSetting(key=key, value=val, description=desc))

    db.commit()
    if close_db:
        db.close()

def create_sample_files_and_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    seed_users(db)

    # 2. Executive records (Hyderabad locations)
    executives_data = [
        {"id": "E01", "name": "Vikram Singh", "home_lat": 17.4239, "home_lon": 78.4738, "shift_start": "08:30", "shift_end": "17:30", "max_visits": 15, "max_km": 65.0, "status": "active"},
        {"id": "E02", "name": "Rajesh Kumar", "home_lat": 17.4401, "home_lon": 78.3489, "shift_start": "09:00", "shift_end": "18:00", "max_visits": 15, "max_km": 70.0, "status": "active"},
        {"id": "E03", "name": "Ananya Sen", "home_lat": 17.4399, "home_lon": 78.4983, "shift_start": "08:30", "shift_end": "17:30", "max_visits": 14, "max_km": 60.0, "status": "active"},
        {"id": "E04", "name": "Karthik Raja", "home_lat": 17.4156, "home_lon": 78.4352, "shift_start": "09:00", "shift_end": "18:00", "max_visits": 16, "max_km": 75.0, "status": "active"},
        {"id": "E05", "name": "Deepak Verma", "home_lat": 17.4948, "home_lon": 78.3996, "shift_start": "09:00", "shift_end": "18:00", "max_visits": 14, "max_km": 60.0, "status": "active"},
        {"id": "E06", "name": "Suresh Nair", "home_lat": 17.3916, "home_lon": 78.4400, "shift_start": "08:30", "shift_end": "17:30", "max_visits": 15, "max_km": 70.0, "status": "active"},
    ]

    today_str = get_operational_date()
    db.query(Executive).filter(Executive.plan_date == today_str).delete()
    for ed in executives_data:
        ed_copy = {**ed, "plan_date": today_str}
        db.add(Executive(**ed_copy))

    # 3. Hyderabad customers (C001..C010)
    customers_data = [
        {
            "id": "C001", "name": "Northgate Traders", "area": "Gachibowli",
            "lat": 17.4401, "lon": 78.3489, "dpd": 45, "overdue_amount": 34500.0,
            "priority_score": 88.0, "ptp_today": 1, "window_start": "09:00", "window_end": "12:00", "service_min": 15
        },
        {
            "id": "C002", "name": "Harbor Point Retail", "area": "Madhapur",
            "lat": 17.4483, "lon": 78.3915, "dpd": 62, "overdue_amount": 21800.0,
            "priority_score": 41.0, "ptp_today": 1, "window_start": "09:30", "window_end": "13:00", "service_min": 15
        },
        {
            "id": "C003", "name": "Civic Plaza Pharmacy", "area": "Hitech City",
            "lat": 17.4435, "lon": 78.3772, "dpd": 30, "overdue_amount": 18200.0,
            "priority_score": 75.0, "ptp_today": 1, "window_start": "10:00", "window_end": "13:30", "service_min": 20
        },
        {
            "id": "C004", "name": "Eastfield Auto Components", "area": "Banjara Hills",
            "lat": 17.4156, "lon": 78.4352, "dpd": 85, "overdue_amount": 62000.0,
            "priority_score": 92.0, "ptp_today": 1, "window_start": "11:00", "window_end": "15:00", "service_min": 20
        },
        {
            "id": "C005", "name": "Apex Electronics Depot", "area": "Jubilee Hills",
            "lat": 17.4325, "lon": 78.4070, "dpd": 15, "overdue_amount": 12500.0,
            "priority_score": 45.0, "ptp_today": 0, "window_start": "09:30", "window_end": "14:00", "service_min": 15
        },
        {
            "id": "C006", "name": "Metro Garments Ltd", "area": "Kukatpally",
            "lat": 17.4948, "lon": 78.3996, "dpd": 90, "overdue_amount": 78000.0,
            "priority_score": 95.0, "ptp_today": 1, "window_start": "10:30", "window_end": "14:30", "service_min": 25
        },
        {
            "id": "C007", "name": "Greenfield Agro Supply", "area": "Secunderabad",
            "lat": 17.4399, "lon": 78.4983, "dpd": 25, "overdue_amount": 14000.0,
            "priority_score": 50.0, "ptp_today": 0, "window_start": "13:00", "window_end": "17:00", "service_min": 15
        },
        {
            "id": "C008", "name": "Sunrise Medical Stores", "area": "Begumpet",
            "lat": 17.4447, "lon": 78.4664, "dpd": 40, "overdue_amount": 29000.0,
            "priority_score": 68.0, "ptp_today": 1, "window_start": "13:30", "window_end": "17:00", "service_min": 15
        },
        {
            "id": "C009", "name": "Zenith Hardware & Tools", "area": "Ameerpet",
            "lat": 17.4375, "lon": 78.4482, "dpd": 10, "overdue_amount": 8500.0,
            "priority_score": 35.0, "ptp_today": 0, "window_start": "14:00", "window_end": "17:30", "service_min": 15
        },
        {
            "id": "C010", "name": "Blueline Logistics Hub", "area": "Mehdipatnam",
            "lat": 17.3916, "lon": 78.4400, "dpd": 120, "overdue_amount": 95000.0,
            "priority_score": 98.0, "ptp_today": 1, "window_start": "10:00", "window_end": "15:00", "service_min": 30
        }
    ]

    # Generate additional realistic accounts around Hyderabad collection clusters
    areas = [
        ("Gachibowli", 17.4401, 78.3489),
        ("Madhapur", 17.4483, 78.3915),
        ("Hitech City", 17.4435, 78.3772),
        ("Banjara Hills", 17.4156, 78.4352),
        ("Jubilee Hills", 17.4325, 78.4070),
        ("Kukatpally", 17.4948, 78.3996),
        ("Secunderabad", 17.4399, 78.4983),
        ("Begumpet", 17.4447, 78.4664),
        ("Ameerpet", 17.4375, 78.4482),
        ("Mehdipatnam", 17.3916, 78.4400)
    ]
    random.seed(42)

    for i in range(11, 61):
        cid = f"C{i:03d}"
        area_name, a_lat, a_lon = random.choice(areas)
        offset_lat = (random.random() - 0.5) * 0.03
        offset_lon = (random.random() - 0.5) * 0.03
        dpd = random.choice([15, 30, 45, 60, 90, 120, 180])
        amt = round(random.uniform(5000, 120000), 2)
        ptp = 1 if random.random() < 0.35 else 0
        prio = round(min(100.0, (dpd * 0.4) + (amt / 2500.0) + (30 if ptp else 0)), 1)
        w_start_h = random.choice([9, 10, 11, 13, 14])
        w_end_h = w_start_h + random.choice([3, 4, 5])
        svc = random.choice([15, 20, 25])

        customers_data.append({
            "id": cid,
            "name": f"Account {cid} - {area_name}",
            "area": area_name,
            "lat": round(a_lat + offset_lat, 6),
            "lon": round(a_lon + offset_lon, 6),
            "dpd": dpd,
            "overdue_amount": amt,
            "priority_score": prio,
            "ptp_today": ptp,
            "window_start": f"{w_start_h:02d}:00",
            "window_end": f"{w_end_h:02d}:00",
            "service_min": svc
        })

    db.query(Customer).filter(Customer.plan_date == today_str).delete()
    for cd in customers_data:
        cd_copy = {**cd, "plan_date": today_str}
        db.add(Customer(**cd_copy))

    # 4. Write CSV sample files
    os.makedirs("data/sample", exist_ok=True)

    with open("data/sample/executives.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "name", "home_lat", "home_lon", "shift_start", "shift_end", "max_visits", "max_km", "status"])
        for e in executives_data:
            writer.writerow([e["id"], e["name"], e["home_lat"], e["home_lon"], e["shift_start"], e["shift_end"], e["max_visits"], e["max_km"], e["status"]])

    with open("data/sample/customers.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "name", "area", "lat", "lon", "dpd", "overdue_amount", "priority_score", "ptp_today", "window_start", "window_end", "service_min"])
        for c in customers_data:
            writer.writerow([c["id"], c["name"], c["area"], c["lat"], c["lon"], c["dpd"], c["overdue_amount"], c["priority_score"], c["ptp_today"], c["window_start"], c["window_end"], c["service_min"]])

    # 5. Create Default Settings
    settings_data = [
        ("default_lambda", "2.0", "Weight coefficient for total travel distance in objective function"),
        ("avg_speed_kmh", "25.0", "Average city travel speed in km/h for urban collection routes"),
        ("road_factor", "1.3", "Correction multiplier applied to Haversine distance for road approximation"),
        ("ptp_mandatory", "true", "Always prioritize PTP (promise to pay) customers ahead of optional visits"),
        ("allow_waiting", "true", "Permit early arrival waiting at customer locations within working hours")
    ]
    for key, val, desc in settings_data:
        st = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not st:
            db.add(SystemSetting(key=key, value=val, description=desc))

    # 6. Create Initial Snapshot for today
    today_str = get_operational_date()
    snap = db.query(DailySnapshot).filter(DailySnapshot.plan_date == today_str).first()
    if not snap:
        ptp_c = sum(1 for c in customers_data if c["ptp_today"] == 1)
        snap = DailySnapshot(
            plan_date=today_str,
            created_by="Priya Sharma (Ops Lead)",
            executive_count=len(executives_data),
            customer_count=len(customers_data),
            ptp_count=ptp_c,
            status="ready",
            data_source="csv"
        )
        db.add(snap)

    db.commit()
    db.close()
    print("Seeding completed successfully! Default admin, manager, executive, sample data and CSV files created.")

if __name__ == "__main__":
    create_sample_files_and_seed()
