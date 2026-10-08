from typing import List, Dict, Any, Tuple
from backend.app.optimization.distance import DistanceMatrixCache
from backend.app.validators.route_validator import validate_route

def run_baseline_optimizer(
    executives: List[Dict[str, Any]],
    customers: List[Dict[str, Any]],
    cache: DistanceMatrixCache,
    lambda_param: float = 2.0
) -> Dict[str, Any]:
    """
    Baseline Algorithm:
    - Sort customers by ID
    - Assign each customer to the nearest feasible executive
    - Strictly enforce max visits, max km, time windows, and shift return home
    - Record skipped customers with reason
    """
    sorted_customers = sorted(customers, key=lambda c: str(c.get("customer_id") or c.get("id")))

    routes_by_exec: Dict[str, List[Dict[str, Any]]] = {e["id"]: [] for e in executives}
    exec_map = {e["id"]: e for e in executives}
    skipped: List[Dict[str, Any]] = []

    for cust in sorted_customers:
        cid = cust.get("customer_id") or cust.get("id")
        c_lat = float(cust["lat"])
        c_lon = float(cust["lon"])

        # Find nearest executive home
        exec_distances = []
        for e in executives:
            d = cache.get_distance(f"HOME_{e['id']}", float(e["home_lat"]), float(e["home_lon"]), cid, c_lat, c_lon)
            exec_distances.append((d, e["id"]))
        exec_distances.sort(key=lambda x: x[0])

        assigned = False
        reasons = []

        for dist_to_home, eid in exec_distances:
            e_data = exec_map[eid]
            current_stops = routes_by_exec[eid]

            candidate_stops = current_stops + [cust]
            val = validate_route(e_data, candidate_stops, cache)

            if val["valid"]:
                routes_by_exec[eid].append(cust)
                assigned = True
                break
            else:
                v_types = [v["type"] for v in val["violations"]]
                reasons.append(f"{eid}: {', '.join(v_types)}")

        if not assigned:
            nearest_d, nearest_eid = exec_distances[0]
            skipped.append({
                "customer_id": cid,
                "customer_name": cust.get("customer_name") or cust.get("name", cid),
                "area": cust.get("area", ""),
                "lat": c_lat,
                "lon": c_lon,
                "ptp_today": int(cust.get("ptp_today", 0)),
                "priority_score": float(cust.get("priority_score", 1.0)),
                "overdue_amount": float(cust.get("overdue_amount", 0.0)),
                "window_start": cust["window_start"],
                "window_end": cust["window_end"],
                "reason": "No feasible executive slot in baseline sequential order",
                "details": {"checks": reasons[:3]},
                "nearest_executive_id": nearest_eid,
                "distance_to_nearest_km": nearest_d
            })

    final_routes = {}
    total_km = 0.0
    total_priority = 0.0
    visited_count = 0

    for e in executives:
        eid = e["id"]
        stops = routes_by_exec[eid]
        res = validate_route(e, stops, cache)
        final_routes[eid] = {
            "executive_id": eid,
            "executive_name": e.get("name", eid),
            "home_lat": float(e["home_lat"]),
            "home_lon": float(e["home_lon"]),
            "start_lat": float(e["home_lat"]),
            "start_lon": float(e["home_lon"]),
            "shift_start": str(e.get("shift_start", "08:30")),
            "shift_end": str(e.get("shift_end", "17:30")),
            "valid": res["valid"],
            "violations": res["violations"],
            "metrics": res["metrics"],
            "timeline": res["timeline"]
        }
        total_km += res["metrics"]["total_km"]
        visited_count += len(stops)
        for s in stops:
            total_priority += float(s.get("priority_score", 1.0))

    total_km = round(total_km, 2)
    total_priority = round(total_priority, 2)
    score = round(total_priority - lambda_param * total_km, 2)

    ptp_total = sum(1 for c in customers if int(c.get("ptp_today", 0)) == 1)
    ptp_visited = sum(1 for stops in routes_by_exec.values() for s in stops if int(s.get("ptp_today", 0)) == 1)

    return {
        "algorithm": "baseline",
        "lambda_param": lambda_param,
        "total_distance_km": total_km,
        "total_priority_score": total_priority,
        "total_score": score,
        "customers_visited": visited_count,
        "customers_skipped": len(skipped),
        "ptp_total": ptp_total,
        "ptp_scheduled": ptp_visited,
        "ptp_coverage_pct": round(ptp_visited / max(ptp_total, 1) * 100.0, 2),
        "routes": final_routes,
        "skipped": skipped
    }
