from typing import List, Dict, Any
from backend.app.optimization.distance import DistanceMatrixCache
from backend.app.validators.route_validator import validate_route

def apply_two_opt_to_route(
    e_data: Dict[str, Any],
    stops: List[Dict[str, Any]],
    cache: DistanceMatrixCache
) -> List[Dict[str, Any]]:
    """
    Applies 2-opt intra-route edge swap improvements.
    Only accepts swaps that:
    1. Strictly maintain route feasibility (checked by validate_route).
    2. Strictly decrease total route km.
    """
    if len(stops) < 3:
        return stops

    best_stops = list(stops)
    best_val = validate_route(e_data, best_stops, cache)
    if not best_val["valid"]:
        return stops
    best_km = best_val["metrics"]["total_km"]

    improved = True
    iterations = 0
    max_iterations = 50  # Prevent infinite loops

    while improved and iterations < max_iterations:
        improved = False
        iterations += 1

        n = len(best_stops)
        for i in range(n - 1):
            for j in range(i + 1, n):
                # 2-opt reversal: reverse the slice between i and j
                new_stops = best_stops[:i] + list(reversed(best_stops[i:j+1])) + best_stops[j+1:]
                val = validate_route(e_data, new_stops, cache)

                if val["valid"]:
                    new_km = val["metrics"]["total_km"]
                    # Strictly decrease distance (with small epsilon tolerance)
                    if new_km < best_km - 0.05:
                        best_km = new_km
                        best_stops = new_stops
                        improved = True
                        break
            if improved:
                break

    return best_stops

def run_two_opt_improvement(
    executives: List[Dict[str, Any]],
    solution: Dict[str, Any],
    cache: DistanceMatrixCache,
    lambda_param: float = 2.0
) -> Dict[str, Any]:
    """
    Takes an initial feasible solution (e.g. from Smart Greedy) and applies 2-opt
    local search across all routes to minimize distance without violating any hard constraints.
    """
    routes = solution["routes"]
    exec_map = {e["id"]: e for e in executives}

    improved_routes = {}
    total_km = 0.0
    total_priority = 0.0
    visited_count = 0

    for e in executives:
        eid = e["id"]
        route_info = routes.get(eid, {})
        curr_timeline = route_info.get("timeline", [])
        if not curr_timeline:
            improved_routes[eid] = route_info
            continue

        # Extract stop items
        stops_to_optimize = [
            {
                "customer_id": s["customer_id"],
                "customer_name": s.get("customer_name"),
                "area": s.get("area"),
                "lat": s["lat"],
                "lon": s["lon"],
                "window_start": s["window_start"],
                "window_end": s["window_end"],
                "service_min": s["service_min"],
                "priority_score": s["priority_score"],
                "ptp_today": s["ptp_today"],
                "overdue_amount": s["overdue_amount"],
                "explainability_json": s.get("explainability_json", {})
            }
            for s in curr_timeline
        ]

        optimized_stops = apply_two_opt_to_route(e, stops_to_optimize, cache)
        res = validate_route(e, optimized_stops, cache)

        timeline = res["timeline"]
        # Retain original explainability
        stop_map = {s["customer_id"]: s.get("explainability_json", {}) for s in stops_to_optimize}
        for st in timeline:
            cid = st["customer_id"]
            if cid in stop_map and not st.get("explainability_json"):
                st["explainability_json"] = stop_map[cid]

        improved_routes[eid] = {
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
            "timeline": timeline
        }
        total_km += res["metrics"]["total_km"]
        visited_count += len(optimized_stops)
        for s in optimized_stops:
            total_priority += float(s.get("priority_score", 1.0))

    total_km = round(total_km, 2)
    total_priority = round(total_priority, 2)
    score = round(total_priority - lambda_param * total_km, 2)

    return {
        "algorithm": "smart_greedy_two_opt",
        "lambda_param": lambda_param,
        "total_distance_km": total_km,
        "total_priority_score": total_priority,
        "total_score": score,
        "customers_visited": visited_count,
        "customers_skipped": solution["customers_skipped"],
        "ptp_total": solution["ptp_total"],
        "ptp_scheduled": solution["ptp_scheduled"],
        "ptp_coverage_pct": solution["ptp_coverage_pct"],
        "routes": improved_routes,
        "skipped": solution.get("skipped", [])
    }
