import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.datetime_service import get_operational_date

client = TestClient(app)

def test_multi_dataset_dynamic_behavior():
    target_date = get_operational_date()

    # =========================================================================
    # Test A: 1 Executive + 1 Customer
    # =========================================================================
    exec_csv_1 = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km,status\nE01,Single Rider,17.3850,78.4867,09:00,18:00,10,50.0,active\n"
    cust_csv_1 = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\nC001,Sole Merchant,Banjara Hills,17.4156,78.4352,30,15000,85,1,10:00,14:00,15\n"

    # Import Dataset 1
    res = client.post(f"/api/data/import/executives?date={target_date}", files={"file": ("executives.csv", exec_csv_1.encode(), "text/csv")})
    assert res.status_code == 200, res.text
    assert res.json()["data"]["count"] == 1

    res = client.post(f"/api/data/import/customers?date={target_date}", files={"file": ("customers.csv", cust_csv_1.encode(), "text/csv")})
    assert res.status_code == 200, res.text
    assert res.json()["data"]["count"] == 1

    # Check /api/data/today reflects EXACTLY 1 and 1
    res = client.get(f"/api/data/today?date={target_date}")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["executive_count"] == 1, f"Expected 1, got {data['executive_count']}"
    assert data["customer_count"] == 1, f"Expected 1, got {data['customer_count']}"
    assert data["ptp_count"] == 1

    # Run optimization for Dataset 1
    res = client.post("/api/optimization/run", json={"operational_date": target_date, "algorithm": "smart_greedy_two_opt", "lambda_param": 2.0})
    assert res.status_code == 200
    run_id = res.json()["data"]["run_id"]

    # Poll until completed
    import time
    for _ in range(50):
        res = client.get(f"/api/optimization/{run_id}/status")
        if res.json()["data"]["status"] == "completed":
            break
        time.sleep(0.1)

    assert res.json()["data"]["status"] == "completed"
    plan_id = res.json()["data"]["plan_id"]
    res = client.get(f"/api/plans/{plan_id}")
    plan_data = res.json()["data"]
    assert plan_data["metrics"]["customers_visited"] == 1
    assert len(plan_data["routes"]) == 1

    # =========================================================================
    # Test B: 3 Executives + 25 Customers (Re-import completely replaces without ghost records)
    # =========================================================================
    exec_csv_2 = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km,status\n"
    for i in range(1, 4):
        exec_csv_2 += f"E{i:02d},Rep {i},17.3850,78.4867,09:00,18:00,15,65.0,active\n"

    cust_csv_2 = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\n"
    for i in range(1, 26):
        ptp = 1 if i <= 10 else 0
        cust_csv_2 += f"C{i:03d},Account {i},Hitech City,17.4435,78.3772,40,25000,75,{ptp},09:30,17:30,15\n"

    res = client.post(f"/api/data/import/executives?date={target_date}", files={"file": ("executives.csv", exec_csv_2.encode(), "text/csv")})
    assert res.status_code == 200
    assert res.json()["data"]["count"] == 3

    res = client.post(f"/api/data/import/customers?date={target_date}", files={"file": ("customers.csv", cust_csv_2.encode(), "text/csv")})
    assert res.status_code == 200
    assert res.json()["data"]["count"] == 25

    # Check /api/data/today reflects EXACTLY 3 and 25 (ZERO ghost records from earlier)
    res = client.get(f"/api/data/today?date={target_date}")
    data = res.json()["data"]
    assert data["executive_count"] == 3, f"Expected 3, got {data['executive_count']}"
    assert data["customer_count"] == 25, f"Expected 25, got {data['customer_count']}"
    assert data["ptp_count"] == 10

    # =========================================================================
    # Test C: 6 Executives + 200 Customers (Scalability & Dynamic Metrics)
    # =========================================================================
    exec_csv_3 = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km,status\n"
    for i in range(1, 7):
        exec_csv_3 += f"E{i:02d},Rep {i},17.3850,78.4867,08:30,17:30,35,80.0,active\n"

    areas = ["Gachibowli", "Madhapur", "Hitech City", "Banjara Hills", "Secunderabad", "Kukatpally"]
    cust_csv_3 = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\n"
    for i in range(1, 201):
        area = areas[i % len(areas)]
        ptp = 1 if i % 4 == 0 else 0
        cust_csv_3 += f"C{i:03d},Client {i},{area},17.4435,78.3772,30,50000,80,{ptp},09:00,18:00,15\n"

    res = client.post(f"/api/data/import/executives?date={target_date}", files={"file": ("executives.csv", exec_csv_3.encode(), "text/csv")})
    assert res.status_code == 200
    assert res.json()["data"]["count"] == 6

    res = client.post(f"/api/data/import/customers?date={target_date}", files={"file": ("customers.csv", cust_csv_3.encode(), "text/csv")})
    assert res.status_code == 200
    assert res.json()["data"]["count"] == 200

    # Check /api/data/today reflects EXACTLY 6 and 200
    res = client.get(f"/api/data/today?date={target_date}")
    data = res.json()["data"]
    assert data["executive_count"] == 6
    assert data["customer_count"] == 200
    assert data["ptp_count"] == 50

    # Run optimization for 200 customers
    res = client.post("/api/optimization/run", json={"operational_date": target_date, "algorithm": "smart_greedy_two_opt", "lambda_param": 2.0})
    assert res.status_code == 200
    run_id = res.json()["data"]["run_id"]

    for _ in range(100):
        res = client.get(f"/api/optimization/{run_id}/status")
        if res.json()["data"]["status"] == "completed":
            break
        time.sleep(0.1)

    assert res.json()["data"]["status"] == "completed"
    plan_id = res.json()["data"]["plan_id"]

    res = client.get(f"/api/plans/{plan_id}")
    plan_data = res.json()["data"]
    # Total assigned + skipped must equal exactly 200
    m = plan_data["metrics"]
    assert m["customers_visited"] + m["customers_skipped"] == 200
    assert m["ptp_scheduled"] <= 50

    # Check analytics reflects this plan dynamically
    res_analytics = client.get("/api/analytics/summary")
    assert res_analytics.status_code == 200
    kpis = res_analytics.json()["data"]["kpis"]
    assert kpis["visits_total"] == 200
    assert kpis["priority_total"] == 50

    # =========================================================================
    # Test D: Date Isolation (Importing for another date does not contaminate today)
    # =========================================================================
    future_date = "2026-10-15"
    exec_csv_future = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km,status\nE99,Future Rep,17.3850,78.4867,09:00,18:00,15,65.0,active\n"
    res = client.post(f"/api/data/import/executives?date={future_date}", files={"file": ("executives.csv", exec_csv_future.encode(), "text/csv")})
    assert res.status_code == 200

    # Target date is still 6 executives
    res_today = client.get(f"/api/data/today?date={target_date}")
    assert res_today.json()["data"]["executive_count"] == 6

    # Future date has 1 executive
    res_future = client.get(f"/api/data/today?date={future_date}")
    assert res_future.json()["data"]["executive_count"] == 1
