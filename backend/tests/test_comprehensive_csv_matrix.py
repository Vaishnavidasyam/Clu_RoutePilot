import time
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.datetime_service import get_operational_date

client = TestClient(app)

def wait_for_optimization(run_id: str, timeout_sec: int = 15):
    start = time.time()
    while time.time() - start < timeout_sec:
        res = client.get(f"/api/optimization/{run_id}/status")
        assert res.status_code == 200
        data = res.json()["data"]
        if data["status"] in ("completed", "failed"):
            return data
        time.sleep(0.1)
    raise TimeoutError(f"Optimization {run_id} timed out after {timeout_sec}s")


def test_scenario_1_1exec_1cust():
    """TEST 1: 1 executive, 1 customer with distinct realistic coordinates"""
    target_date = "2026-10-18"
    exec_csv = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km\nE01,Vikram Singh,17.4239,78.4738,08:30,17:30,15,65.0\n"
    cust_csv = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\nC001,Northgate,Gachibowli,17.4401,78.3489,45,34500,88,1,09:00,12:00,15\n"

    r_ex = client.post(f"/api/data/import/executives?date={target_date}", files={"file": ("exec.csv", exec_csv.encode(), "text/csv")})
    assert r_ex.status_code == 200 and r_ex.json()["data"]["count"] == 1

    r_cu = client.post(f"/api/data/import/customers?date={target_date}", files={"file": ("cust.csv", cust_csv.encode(), "text/csv")})
    assert r_cu.status_code == 200 and r_cu.json()["data"]["count"] == 1

    r_run = client.post("/api/optimization/run", json={"operational_date": target_date, "algorithm": "smart_greedy_two_opt"})
    assert r_run.status_code == 200
    status = wait_for_optimization(r_run.json()["data"]["run_id"])
    assert status["status"] == "completed"

    r_plan = client.get(f"/api/plans/{status['plan_id']}")
    p = r_plan.json()["data"]
    assert p["metrics"]["customers_visited"] == 1
    assert p["metrics"]["ptp_scheduled"] == 1
    assert len(p["routes"]) == 1

    route = p["routes"]["E01"]
    assert route["home_lat"] == 17.4239
    assert route["home_lon"] == 78.4738
    assert route["metrics"]["total_km"] > 0.0  # Must be strictly > 0 km
    assert len(route["timeline"]) == 1
    stop = route["timeline"][0]
    assert stop["customer_id"] == "C001"
    assert stop["seq"] == 1
    assert stop["lat"] == 17.4401
    assert stop["lon"] == 78.3489
    assert stop["service_min"] == 15


def test_scenario_2_3exec_25cust():
    """TEST 2: 3 executives, 25 customers across Hyderabad localities"""
    target_date = "2026-10-19"
    exec_csv = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km\n"
    exec_csv += "E01,Rep 1,17.4239,78.4738,08:30,17:30,10,65.0\n"
    exec_csv += "E02,Rep 2,17.4400,78.3480,09:00,18:00,10,65.0\n"
    exec_csv += "E03,Rep 3,17.4150,78.4350,08:30,17:30,10,65.0\n"

    cust_csv = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\n"
    for i in range(1, 26):
        lat = 17.4100 + (i * 0.003)
        lon = 78.3500 + (i * 0.004)
        ptp = 1 if i <= 10 else 0
        cust_csv += f"C{i:03d},Account {i},Area {i},{lat:.4f},{lon:.4f},30,25000,75,{ptp},09:00,18:00,15\n"

    client.post(f"/api/data/import/executives?date={target_date}", files={"file": ("exec.csv", exec_csv.encode(), "text/csv")})
    client.post(f"/api/data/import/customers?date={target_date}", files={"file": ("cust.csv", cust_csv.encode(), "text/csv")})

    r_run = client.post("/api/optimization/run", json={"operational_date": target_date, "algorithm": "smart_greedy_two_opt"})
    status = wait_for_optimization(r_run.json()["data"]["run_id"])
    assert status["status"] == "completed"

    p = client.get(f"/api/plans/{status['plan_id']}").json()["data"]
    assert len(p["routes"]) == 3
    assert set(p["routes"].keys()) == {"E01", "E02", "E03"}
    assert p["metrics"]["customers_visited"] + p["metrics"]["customers_skipped"] == 25
    assert p["metrics"]["total_distance_km"] > 0.0
    for eid, r in p["routes"].items():
        assert r["home_lat"] in (17.4239, 17.4400, 17.4150)
        for idx, stop in enumerate(r["timeline"]):
            assert stop["seq"] == idx + 1
            assert stop["lat"] > 0.0 and stop["lon"] > 0.0


def test_scenario_3_6exec_60cust():
    """TEST 3: 6 executives, 60 customers"""
    target_date = "2026-10-20"
    exec_csv = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km\n"
    for i in range(1, 7):
        exec_csv += f"E{i:02d},Rep {i},17.4200,78.4700,08:30,17:30,15,80.0\n"

    cust_csv = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\n"
    for i in range(1, 61):
        lat = 17.4000 + ((i % 10) * 0.008)
        lon = 78.3400 + ((i // 10) * 0.015)
        cust_csv += f"C{i:03d},Client {i},Secunderabad,{lat:.4f},{lon:.4f},40,30000,80,0,09:00,18:00,15\n"

    client.post(f"/api/data/import/executives?date={target_date}", files={"file": ("exec.csv", exec_csv.encode(), "text/csv")})
    client.post(f"/api/data/import/customers?date={target_date}", files={"file": ("cust.csv", cust_csv.encode(), "text/csv")})

    r_run = client.post("/api/optimization/run", json={"operational_date": target_date, "algorithm": "smart_greedy_two_opt"})
    status = wait_for_optimization(r_run.json()["data"]["run_id"])
    assert status["status"] == "completed"

    p = client.get(f"/api/plans/{status['plan_id']}").json()["data"]
    assert len(p["routes"]) == 6
    assert p["metrics"]["customers_visited"] + p["metrics"]["customers_skipped"] == 60
    assert p["metrics"]["total_distance_km"] > 0.0


def test_scenario_4_mandatory_dataset_switch():
    """MANDATORY ACCEPTANCE TEST: Import 200 cust / 6 exec -> then switch to 25 cust / 3 exec without code change"""
    cycle_date = "2026-10-21"
    from backend.app.database.session import SessionLocal
    from backend.app.models.models import Plan, Executive, Customer
    _db = SessionLocal()
    for _p in _db.query(Plan).filter(Plan.plan_date == cycle_date).all():
        _db.delete(_p)
    _db.query(Executive).filter(Executive.plan_date == cycle_date).delete()
    _db.query(Customer).filter(Customer.plan_date == cycle_date).delete()
    _db.commit()
    _db.close()

    # 1. First dataset: 6 execs, 200 customers
    exec_csv_large = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km\n"
    for i in range(1, 7):
        exec_csv_large += f"E{i:02d},Senior Exec {i},17.4200,78.4700,08:30,17:30,40,90.0\n"

    cust_csv_large = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\n"
    for i in range(1, 201):
        lat = 17.3800 + ((i % 20) * 0.004)
        lon = 78.3600 + ((i // 20) * 0.010)
        ptp = 1 if i % 5 == 0 else 0
        cust_csv_large += f"C{i:03d},Trader {i},Gachibowli,{lat:.4f},{lon:.4f},35,45000,85,{ptp},09:00,18:00,15\n"

    client.post(f"/api/data/import/executives?date={cycle_date}", files={"file": ("exec.csv", exec_csv_large.encode(), "text/csv")})
    client.post(f"/api/data/import/customers?date={cycle_date}", files={"file": ("cust.csv", cust_csv_large.encode(), "text/csv")})

    r1 = client.post("/api/optimization/run", json={"operational_date": cycle_date, "algorithm": "smart_greedy_two_opt"})
    s1 = wait_for_optimization(r1.json()["data"]["run_id"])
    p1 = client.get(f"/api/plans/{s1['plan_id']}").json()["data"]

    # Verify first plan reflects exactly 6 execs & 200 customers
    assert len(p1["routes"]) == 6
    assert p1["metrics"]["customers_visited"] + p1["metrics"]["customers_skipped"] == 200
    assert p1["metrics"]["total_distance_km"] > 0.0

    # 2. Second dataset: 3 execs, 25 customers (REPLACES cycle_date completely)
    exec_csv_small = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km\n"
    for i in range(1, 4):
        exec_csv_small += f"E{i:02d},Junior Rep {i},17.4350,78.4500,09:00,18:00,15,60.0\n"

    cust_csv_small = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\n"
    for i in range(1, 26):
        lat = 17.4400 + (i * 0.002)
        lon = 78.3800 + (i * 0.003)
        cust_csv_small += f"C{i:03d},Small Client {i},Madhapur,{lat:.4f},{lon:.4f},20,15000,70,0,10:00,17:00,15\n"

    client.post(f"/api/data/import/executives?date={cycle_date}", files={"file": ("exec.csv", exec_csv_small.encode(), "text/csv")})
    client.post(f"/api/data/import/customers?date={cycle_date}", files={"file": ("cust.csv", cust_csv_small.encode(), "text/csv")})

    # Verify /api/data/today reflects EXACTLY 3 and 25
    today_res = client.get(f"/api/data/today?date={cycle_date}").json()["data"]
    assert today_res["executive_count"] == 3
    assert today_res["customer_count"] == 25

    # Run optimization for second dataset
    r2 = client.post("/api/optimization/run", json={"operational_date": cycle_date, "algorithm": "smart_greedy_two_opt"})
    s2 = wait_for_optimization(r2.json()["data"]["run_id"])
    p2 = client.get(f"/api/plans/{s2['plan_id']}").json()["data"]

    # Verify second plan has ONLY 3 executives and ONLY 25 customers
    assert len(p2["routes"]) == 3
    assert set(p2["routes"].keys()) == {"E01", "E02", "E03"}
    # Old executives E04-E06 must NOT exist in current routes
    assert "E04" not in p2["routes"]
    assert "E05" not in p2["routes"]
    assert "E06" not in p2["routes"]

    assert p2["metrics"]["customers_visited"] + p2["metrics"]["customers_skipped"] == 25
    assert p2["metrics"]["total_distance_km"] > 0.0

    # Old plan 1 is still available in history via version=1
    hist_p1 = client.get(f"/api/plans/{s1['plan_id']}?version=1").json()["data"]
    assert len(hist_p1["routes"]) == 6


def test_scenario_5_many_ptp_customers():
    """TEST 5: 100% PTP customers - optimizer must prioritize and cover them"""
    target_date = "2026-10-22"
    exec_csv = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km\n"
    exec_csv += "E01,PTP Exec 1,17.4400,78.3800,08:30,17:30,15,80.0\n"
    exec_csv += "E02,PTP Exec 2,17.4200,78.4400,08:30,17:30,15,80.0\n"

    cust_csv = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\n"
    for i in range(1, 21):
        lat = 17.4300 + (i * 0.002)
        lon = 78.3900 + (i * 0.002)
        cust_csv += f"C{i:03d},Must Visit {i},Hitech City,{lat:.4f},{lon:.4f},60,50000,95,1,09:00,17:00,15\n"

    client.post(f"/api/data/import/executives?date={target_date}", files={"file": ("exec.csv", exec_csv.encode(), "text/csv")})
    client.post(f"/api/data/import/customers?date={target_date}", files={"file": ("cust.csv", cust_csv.encode(), "text/csv")})

    r = client.post("/api/optimization/run", json={"operational_date": target_date, "algorithm": "smart_greedy_two_opt"})
    status = wait_for_optimization(r.json()["data"]["run_id"])
    p = client.get(f"/api/plans/{status['plan_id']}").json()["data"]
    # All 20 are PTP and fit within 30 visit capacity -> 100% PTP scheduled
    assert p["metrics"]["ptp_scheduled"] == 20
    assert p["metrics"]["ptp_total"] == 20
    assert p["metrics"]["ptp_coverage_pct"] == 100.0


def test_scenario_6_tight_windows_and_exceptions():
    """TEST 6: Tight/conflicting time windows generate mathematically valid exceptions without crashing"""
    target_date = "2026-10-23"
    exec_csv = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km\nE01,Tight Exec,17.4200,78.4700,09:00,12:00,10,50.0\n"
    # Customers with identical narrow windows 09:00-09:15 that cannot all be served by 1 rep
    cust_csv = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\n"
    for i in range(1, 6):
        lat = 17.4200 + (i * 0.02)
        cust_csv += f"C{i:03d},Narrow {i},Zone,{lat:.4f},78.4700,40,20000,80,0,09:00,09:20,20\n"

    client.post(f"/api/data/import/executives?date={target_date}", files={"file": ("exec.csv", exec_csv.encode(), "text/csv")})
    client.post(f"/api/data/import/customers?date={target_date}", files={"file": ("cust.csv", cust_csv.encode(), "text/csv")})

    r = client.post("/api/optimization/run", json={"operational_date": target_date, "algorithm": "smart_greedy_two_opt"})
    status = wait_for_optimization(r.json()["data"]["run_id"])
    p = client.get(f"/api/plans/{status['plan_id']}").json()["data"]
    # At least some customers must be safely skipped due to window conflicts
    assert p["metrics"]["customers_skipped"] > 0
    assert p["metrics"]["customers_visited"] + p["metrics"]["customers_skipped"] == 5
    assert len(p["skipped"]) > 0


def test_scenario_7_low_capacity_constraints():
    """TEST 7: Low max_visits (e.g. max 3 per rep) strictly enforces capacity constraint"""
    target_date = "2026-10-24"
    exec_csv = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km\n"
    exec_csv += "E01,Capped Exec 1,17.4200,78.4700,08:30,17:30,3,70.0\n"
    exec_csv += "E02,Capped Exec 2,17.4300,78.4500,08:30,17:30,3,70.0\n"

    cust_csv = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\n"
    for i in range(1, 11):
        cust_csv += f"C{i:03d},Cust {i},Area,17.4250,78.4600,30,15000,75,0,09:00,17:00,15\n"

    client.post(f"/api/data/import/executives?date={target_date}", files={"file": ("exec.csv", exec_csv.encode(), "text/csv")})
    client.post(f"/api/data/import/customers?date={target_date}", files={"file": ("cust.csv", cust_csv.encode(), "text/csv")})

    r = client.post("/api/optimization/run", json={"operational_date": target_date, "algorithm": "smart_greedy_two_opt"})
    status = wait_for_optimization(r.json()["data"]["run_id"])
    p = client.get(f"/api/plans/{status['plan_id']}").json()["data"]

    # Each executive must NOT exceed 3 visits
    for eid, r in p["routes"].items():
        assert len(r["timeline"]) <= 3
    assert p["metrics"]["customers_visited"] <= 6
    assert p["metrics"]["customers_skipped"] >= 4
