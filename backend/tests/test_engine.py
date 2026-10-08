import pytest
from backend.app.optimization.distance import (
    haversine_km, road_distance_km, travel_time_minutes,
    time_to_minutes, minutes_to_time, DistanceMatrixCache
)
from backend.app.validators.route_validator import validate_route, validate_plan_global
from backend.app.optimization.baseline import run_baseline_optimizer
from backend.app.optimization.smart_greedy import run_smart_greedy_optimizer
from backend.app.optimization.two_opt import apply_two_opt_to_route

def test_haversine_and_road_distance():
    # Distance between two known points
    lat1, lon1 = 12.9716, 77.5946
    lat2, lon2 = 12.9716, 77.5946
    assert haversine_km(lat1, lon1, lat2, lon2) == 0.0
    assert road_distance_km(lat1, lon1, lat2, lon2) == 0.0

    # Non-zero distance with 1.3 road factor
    lat2 = 12.9816
    h = haversine_km(lat1, lon1, lat2, lon1)
    r = road_distance_km(lat1, lon1, lat2, lon1)
    assert round(h * 1.3, 2) == r

def test_travel_time():
    # 25 km at 25 km/h = 60 minutes
    assert travel_time_minutes(25.0, speed_kmh=25.0) == 60.0
    # 12.5 km at 25 km/h = 30 minutes
    assert travel_time_minutes(12.5, speed_kmh=25.0) == 30.0

def test_time_conversions():
    assert time_to_minutes("09:00") == 540
    assert time_to_minutes("13:30") == 810
    assert minutes_to_time(540) == "09:00"
    assert minutes_to_time(810) == "13:30"

def test_challenge_worked_example_regression():
    """
    Official Challenge Worked Example:
    E01: Home -> C001 -> C002 -> Home
    Distances:
    Home -> C001 = 0.97 km
    C001 -> C002 = 2.41 km
    C002 -> Home = 1.47 km
    Total: 4.85 km
    Priority: 88 + 41 = 129
    Score: 129 - 2 * 4.85 = 119.3
    """
    h_lat, h_lon = 12.9716, 77.5946
    c1_lat, c1_lon = 12.978278, 77.594600
    c2_lat, c2_lon = 12.961750, 77.597100

    d1 = road_distance_km(h_lat, h_lon, c1_lat, c1_lon)
    d2 = road_distance_km(c1_lat, c1_lon, c2_lat, c2_lon)
    d3 = road_distance_km(c2_lat, c2_lon, h_lat, h_lon)

    assert d1 == 0.97
    assert d2 == 2.41
    assert d3 == 1.47
    total_km = round(d1 + d2 + d3, 2)
    assert total_km == 4.85

    prio_total = 88.0 + 41.0
    assert prio_total == 129.0
    score = round(prio_total - 2.0 * total_km, 2)
    assert score == 119.3

def test_route_validator_max_km_violation():
    cache = DistanceMatrixCache()
    exec_data = {
        "id": "E01",
        "home_lat": 12.9716,
        "home_lon": 77.5946,
        "shift_start": "09:00",
        "shift_end": "18:00",
        "max_visits": 5,
        "max_km": 10.0  # Low max_km
    }
    # Customer far away
    stops = [{
        "customer_id": "C999",
        "lat": 13.5000,
        "lon": 77.5946,
        "window_start": "09:00",
        "window_end": "18:00",
        "service_min": 15,
        "priority_score": 10.0
    }]
    val = validate_route(exec_data, stops, cache)
    assert not val["valid"]
    assert any(v["type"] == "MAX_KM_EXCEEDED" for v in val["violations"])

def test_route_validator_time_window_violation():
    cache = DistanceMatrixCache()
    exec_data = {
        "id": "E01",
        "home_lat": 12.9716,
        "home_lon": 77.5946,
        "shift_start": "09:00",
        "shift_end": "18:00",
        "max_visits": 5,
        "max_km": 80.0
    }
    # Customer window already closed before arrival
    stops = [{
        "customer_id": "C999",
        "lat": 12.978278,
        "lon": 77.594600,
        "window_start": "08:00",
        "window_end": "08:30",  # Shift starts at 09:00, arrival is at ~09:02
        "service_min": 15,
        "priority_score": 10.0
    }]
    val = validate_route(exec_data, stops, cache)
    assert not val["valid"]
    assert any(v["type"] == "TIME_WINDOW_MISSED" for v in val["violations"])

def test_waiting_time_accounting():
    cache = DistanceMatrixCache()
    exec_data = {
        "id": "E01",
        "home_lat": 12.9716,
        "home_lon": 77.5946,
        "shift_start": "09:00",
        "shift_end": "18:00",
        "max_visits": 5,
        "max_km": 80.0
    }
    # Customer window starts at 10:00. Arrival at 09:02 -> 58 min waiting.
    stops = [{
        "customer_id": "C001",
        "lat": 12.978278,
        "lon": 77.594600,
        "window_start": "10:00",
        "window_end": "12:00",
        "service_min": 15,
        "priority_score": 10.0
    }]
    val = validate_route(exec_data, stops, cache)
    assert val["valid"]
    assert val["metrics"]["total_waiting_minutes"] > 0
    # Waiting does not increase distance
    assert val["metrics"]["total_km"] == 0.97 * 2

def test_optimizers_execution():
    cache = DistanceMatrixCache()
    execs = [
        {"id": "E01", "name": "E01", "home_lat": 12.9716, "home_lon": 77.5946, "shift_start": "08:30", "shift_end": "17:30", "max_visits": 5, "max_km": 60.0},
        {"id": "E02", "name": "E02", "home_lat": 12.9352, "home_lon": 77.6245, "shift_start": "09:00", "shift_end": "18:00", "max_visits": 5, "max_km": 60.0}
    ]
    custs = [
        {"id": "C001", "name": "C001", "lat": 12.978278, "lon": 77.594600, "window_start": "09:00", "window_end": "12:00", "service_min": 15, "priority_score": 88.0, "ptp_today": 1, "overdue_amount": 25000.0},
        {"id": "C002", "name": "C002", "lat": 12.961750, "lon": 77.597100, "window_start": "09:30", "window_end": "13:00", "service_min": 15, "priority_score": 41.0, "ptp_today": 1, "overdue_amount": 15000.0}
    ]

    base_sol = run_baseline_optimizer(execs, custs, cache)
    assert base_sol["customers_visited"] > 0
    assert base_sol["ptp_scheduled"] > 0

    smart_sol = run_smart_greedy_optimizer(execs, custs, cache)
    assert smart_sol["customers_visited"] >= base_sol["customers_visited"]
    assert smart_sol["ptp_scheduled"] == 2
