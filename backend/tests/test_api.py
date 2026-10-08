import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.models import (
    Customer, Executive, DailySnapshot, Plan, PlanVersion,
    Route, RouteStop, SkippedCustomer, AuditLog
)

client = TestClient(app)

@pytest.fixture(autouse=True, scope="session")
def clean_db_after_tests():
    # Keep operational database intact
    yield

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_api_login():
    res = client.post("/api/auth/login", json={"email": "manager@routepilot.io", "password": "manager123"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role"] == "OPERATIONS_MANAGER"

def test_api_today_data():
    res = client.get("/api/data/today")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "customer_count" in data
    assert "executive_count" in data

def test_api_validation():
    res = client.get("/api/data/validation")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["blocking_error_count"] == 0

def test_api_demo_launch():
    res = client.post("/api/demo/launch")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    plan_id = data["data"]["plan_id"]

    # Verify plan retrieval
    plan_res = client.get(f"/api/plans/{plan_id}")
    assert plan_res.status_code == 200
    pdata = plan_res.json()["data"]
    assert pdata["metrics"]["ptp_scheduled"] > 0
    assert pdata["metrics"]["violations_count"] == 0

    # Verify CSV export
    csv_res = client.get(f"/api/plans/{plan_id}/export/csv")
    assert csv_res.status_code == 200
    assert "executive_id,seq,customer_id,arrival_time,km_from_prev,cumulative_km" in csv_res.text

def test_import_executives_excel_and_tab_csv():
    # Test file with tab delimiter, mixed CRLF/CR, and Excel time decimals
    raw_content = "id\thome_lat\thome_lon\tshift_start\tshift_end\tmax_visits\tmax_km\r\nE01\t17.4239\t78.4738\t0.354166667\t0.729166667\t15\t65\r\n"
    res = client.post(
        "/api/data/import/executives",
        files={"file": ("executives.csv", raw_content.encode("utf-8"), "text/csv")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["count"] == 1

    # Verify executive was saved with normalized 08:30 and 17:30
    today_res = client.get("/api/data/today")
    assert today_res.status_code == 200
    executives = today_res.json()["data"]["executives"]
    e01 = next(e for e in executives if e["id"] == "E01")
    assert e01["shift_start"] == "08:30"
    assert e01["shift_end"] == "17:30"
    assert e01["max_visits"] == 15
    assert e01["max_km"] == 65.0
