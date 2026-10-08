from typing import Dict, List, Any, Optional
from backend.app.optimization.distance import (
    time_to_minutes, minutes_to_time, DistanceMatrixCache
)

def validate_route(
    exec_data: Dict[str, Any],
    stops: List[Dict[str, Any]],
    cache: DistanceMatrixCache
) -> Dict[str, Any]:
    """
    Validates a single executive's route against all official hard constraints:
    - Starts at Home
    - Returns to Home
    - Capacity: max_visits
    - Max distance: max_km
    - Time windows: arrival <= window_end, service_end <= window_end
    - Waiting time allowed if arrival < window_start
    - Return to Home <= shift_end
    - No duplicate visits within route
    """
    violations = []
    warnings = []

    exec_id = exec_data["id"]
    home_lat = float(exec_data["home_lat"])
    home_lon = float(exec_data["home_lon"])
    shift_start_m = time_to_minutes(exec_data["shift_start"])
    shift_end_m = time_to_minutes(exec_data["shift_end"])
    max_visits = int(exec_data.get("max_visits", 15))
    max_km = float(exec_data.get("max_km", 80.0))

    # Empty route is valid trivial route
    if not stops:
        return {
            "valid": True,
            "violations": [],
            "warnings": [],
            "metrics": {
                "total_km": 0.0,
                "total_travel_minutes": 0.0,
                "total_waiting_minutes": 0.0,
                "total_service_minutes": 0.0,
                "total_duration_minutes": 0.0,
                "visit_count": 0,
                "return_time": exec_data["shift_start"],
                "return_home_km": 0.0
            },
            "timeline": []
        }

    # Constraint 2: max_visits
    if len(stops) > max_visits:
        violations.append({
            "type": "MAX_VISITS_EXCEEDED",
            "executive_id": exec_id,
            "message": f"Executive {exec_id} assigned {len(stops)} visits, exceeding max {max_visits}."
        })

    # Constraint 13: Unique visits within route
    visited_ids = set()
    for s in stops:
        cid = s.get("customer_id") or s.get("id")
        if cid in visited_ids:
            violations.append({
                "type": "DUPLICATE_VISIT_IN_ROUTE",
                "executive_id": exec_id,
                "customer_id": cid,
                "message": f"Duplicate visit to customer {cid} in route {exec_id}."
            })
        visited_ids.add(cid)

    # Simulate route timeline starting from Home
    current_time_m = shift_start_m
    current_lat = home_lat
    current_lon = home_lon
    current_node_id = f"HOME_{exec_id}"
    total_km = 0.0
    total_travel_m = 0.0
    total_waiting_m = 0.0
    total_service_m = 0.0

    timeline = []

    for idx, stop in enumerate(stops):
        cid = stop.get("customer_id") or stop.get("id")
        c_lat = float(stop["lat"])
        c_lon = float(stop["lon"])
        w_start_m = time_to_minutes(stop["window_start"])
        w_end_m = time_to_minutes(stop["window_end"])
        svc_min = int(stop.get("service_min", 15))

        # Travel leg from current location to customer
        leg_km = cache.get_distance(current_node_id, current_lat, current_lon, cid, c_lat, c_lon)
        leg_time_m = cache.get_travel_time(current_node_id, current_lat, current_lon, cid, c_lat, c_lon)

        total_km += leg_km
        total_travel_m += leg_time_m
        arrival_m = current_time_m + leg_time_m

        # Constraint 6 & 7: Arrival vs Window
        waiting_m = 0.0
        if arrival_m < w_start_m:
            waiting_m = w_start_m - arrival_m
            service_start_m = w_start_m
        else:
            service_start_m = arrival_m

        if arrival_m > w_end_m:
            violations.append({
                "type": "TIME_WINDOW_MISSED",
                "executive_id": exec_id,
                "customer_id": cid,
                "message": f"Arrival at {minutes_to_time(arrival_m)} is after window end {stop['window_end']}."
            })

        # Service completion
        service_end_m = service_start_m + svc_min
        departure_m = service_end_m

        # Constraint 9: Service must finish within window
        if service_end_m > w_end_m:
            violations.append({
                "type": "SERVICE_EXCEEDS_WINDOW",
                "executive_id": exec_id,
                "customer_id": cid,
                "message": f"Service finishes at {minutes_to_time(service_end_m)}, exceeding window end {stop['window_end']}."
            })

        total_waiting_m += waiting_m
        total_service_m += svc_min

        timeline.append({
            "seq": idx + 1,
            "customer_id": cid,
            "customer_name": stop.get("customer_name") or stop.get("name", cid),
            "area": stop.get("area", ""),
            "lat": c_lat,
            "lon": c_lon,
            "arrival_time": minutes_to_time(arrival_m),
            "arrival_minutes": round(arrival_m, 2),
            "waiting_min": round(waiting_m, 2),
            "service_start": minutes_to_time(service_start_m),
            "service_end": minutes_to_time(service_end_m),
            "departure_time": minutes_to_time(departure_m),
            "departure_minutes": round(departure_m, 2),
            "km_from_prev": round(leg_km, 2),
            "cumulative_km": round(total_km, 2),
            "priority_score": float(stop.get("priority_score", 1.0)),
            "ptp_today": int(stop.get("ptp_today", 0)),
            "overdue_amount": float(stop.get("overdue_amount", 0.0)),
            "window_start": stop["window_start"],
            "window_end": stop["window_end"],
            "service_min": svc_min
        })

        # Advance state
        current_time_m = departure_m
        current_lat = c_lat
        current_lon = c_lon
        current_node_id = cid

    # Return to Home leg (Constraint 4)
    home_leg_km = cache.get_distance(current_node_id, current_lat, current_lon, f"HOME_{exec_id}", home_lat, home_lon)
    home_leg_time_m = cache.get_travel_time(current_node_id, current_lat, current_lon, f"HOME_{exec_id}", home_lat, home_lon)

    total_km += home_leg_km
    total_travel_m += home_leg_time_m
    return_home_m = current_time_m + home_leg_time_m

    # Constraint 5: max_km
    if total_km > max_km + 1e-4:
        violations.append({
            "type": "MAX_KM_EXCEEDED",
            "executive_id": exec_id,
            "message": f"Total route distance {total_km:.2f} km exceeds maximum {max_km:.2f} km by {total_km - max_km:.2f} km."
        })
    elif total_km > max_km * 0.90:
        warnings.append({
            "type": "NEAR_MAX_KM",
            "executive_id": exec_id,
            "message": f"Route distance {total_km:.2f} km is at {total_km / max_km * 100:.1f}% of capacity."
        })

    # Constraint 10: Return home before shift_end
    if return_home_m > shift_end_m + 1e-4:
        violations.append({
            "type": "SHIFT_END_EXCEEDED",
            "executive_id": exec_id,
            "message": f"Return time {minutes_to_time(return_home_m)} is after shift end {exec_data['shift_end']}."
        })

    total_duration_m = return_home_m - shift_start_m

    return {
        "valid": len(violations) == 0,
        "violations": violations,
        "warnings": warnings,
        "metrics": {
            "total_km": round(total_km, 2),
            "total_travel_minutes": round(total_travel_m, 2),
            "total_waiting_minutes": round(total_waiting_m, 2),
            "total_service_minutes": round(total_service_m, 2),
            "total_duration_minutes": round(total_duration_m, 2),
            "visit_count": len(stops),
            "return_time": minutes_to_time(return_home_m),
            "return_home_km": round(home_leg_km, 2)
        },
        "timeline": timeline
    }

def validate_plan_global(
    executives: List[Dict[str, Any]],
    routes_by_exec: Dict[str, List[Dict[str, Any]]],
    all_customers: List[Dict[str, Any]],
    cache: DistanceMatrixCache
) -> Dict[str, Any]:
    global_violations = []
    global_warnings = []
    visited_customer_ids = {}

    route_results = {}
    for exec_data in executives:
        eid = exec_data["id"]
        stops = routes_by_exec.get(eid, [])
        res = validate_route(exec_data, stops, cache)
        route_results[eid] = res

        if not res["valid"]:
            global_violations.extend(res["violations"])
        global_warnings.extend(res["warnings"])

        for s in stops:
            cid = s.get("customer_id") or s.get("id")
            if cid in visited_customer_ids:
                global_violations.append({
                    "type": "GLOBAL_DUPLICATE_VISIT",
                    "customer_id": cid,
                    "message": f"Customer {cid} is assigned to both {visited_customer_ids[cid]} and {eid}."
                })
            visited_customer_ids[cid] = eid

    ptp_customers = [c for c in all_customers if int(c.get("ptp_today", 0)) == 1]
    scheduled_ptp = [c for c in ptp_customers if (c.get("customer_id") or c.get("id")) in visited_customer_ids]
    unscheduled_ptp = [c for c in ptp_customers if (c.get("customer_id") or c.get("id")) not in visited_customer_ids]

    if unscheduled_ptp:
        global_warnings.append({
            "type": "UNSCHEDULED_PTP",
            "message": f"{len(unscheduled_ptp)} of {len(ptp_customers)} PTP customers could not be scheduled.",
            "customer_ids": [c.get("customer_id") or c.get("id") for c in unscheduled_ptp]
        })

    return {
        "valid": len(global_violations) == 0,
        "violations": global_violations,
        "warnings": global_warnings,
        "routes": route_results,
        "visited_customer_ids": list(visited_customer_ids.keys()),
        "ptp_total": len(ptp_customers),
        "ptp_scheduled": len(scheduled_ptp),
        "ptp_coverage_pct": round(len(scheduled_ptp) / max(len(ptp_customers), 1) * 100.0, 2)
    }
