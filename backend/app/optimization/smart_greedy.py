from typing import List, Dict, Any, Tuple, Optional
from backend.app.optimization.distance import (
    DistanceMatrixCache, time_to_minutes
)
from backend.app.validators.route_validator import validate_route

def evaluate_insertion(
    e_data: Dict[str, Any],
    current_stops: List[Dict[str, Any]],
    candidate: Dict[str, Any],
    pos: int,
    cache: DistanceMatrixCache,
    current_km: float
) -> Tuple[bool, float, Optional[Dict[str, Any]]]:
    candidate_stops = current_stops[:pos] + [candidate] + current_stops[pos:]
    val = validate_route(e_data, candidate_stops, cache)
    if not val["valid"]:
        return False, float("inf"), None
    new_km = val["metrics"]["total_km"]
    delta_km = max(0.0, new_km - current_km)
    return True, delta_km, val

def run_smart_greedy_optimizer(
    executives: List[Dict[str, Any]],
    customers: List[Dict[str, Any]],
    cache: DistanceMatrixCache,
    lambda_param: float = 2.0
) -> Dict[str, Any]:
    exec_map = {e["id"]: e for e in executives}
    routes_by_exec: Dict[str, List[Dict[str, Any]]] = {e["id"]: [] for e in executives}
    routes_km: Dict[str, float] = {e["id"]: 0.0 for e in executives}

    ptp_customers = [c for c in customers if int(c.get("ptp_today", 0)) == 1]
    non_ptp_customers = [c for c in customers if int(c.get("ptp_today", 0)) == 0]

    ptp_sorted = sorted(
        ptp_customers,
        key=lambda c: (-float(c.get("priority_score", 1.0)), time_to_minutes(c["window_start"]))
    )

    non_ptp_sorted = sorted(
        non_ptp_customers,
        key=lambda c: (-float(c.get("priority_score", 1.0)), time_to_minutes(c["window_start"]))
    )

    scheduled_customer_ids = set()
    skipped: List[Dict[str, Any]] = []
    assignment_rationales: Dict[str, Dict[str, Any]] = {}

    def try_schedule_customer(cust: Dict[str, Any], is_ptp: bool) -> bool:
        cid = cust.get("customer_id") or cust.get("id")
        c_prio = float(cust.get("priority_score", 1.0))
        c_lat = float(cust["lat"])
        c_lon = float(cust["lon"])

        best_score = -float("inf")
        best_exec = None
        best_pos = None
        best_delta_km = float("inf")
        best_val = None

        rejection_reasons = []

        for e in executives:
            eid = e["id"]
            curr_stops = routes_by_exec[eid]
            max_v = int(e.get("max_visits", 15))
            if len(curr_stops) >= max_v:
                rejection_reasons.append(f"{eid}: Capacity reached ({max_v} visits)")
                continue

            curr_km = routes_km[eid]

            for pos in range(len(curr_stops) + 1):
                feasible, delta_km, val = evaluate_insertion(e, curr_stops, cust, pos, cache, curr_km)
                if feasible:
                    if is_ptp:
                        score = 10000.0 - (delta_km * lambda_param)
                    else:
                        score = c_prio - (lambda_param * delta_km)

                    if score > best_score:
                        best_score = score
                        best_exec = eid
                        best_pos = pos
                        best_delta_km = delta_km
                        best_val = val

        accept = False
        if best_exec is not None:
            if is_ptp:
                accept = True
            elif best_score > 0.0 or best_delta_km <= 15.0:
                accept = True

        if accept and best_exec is not None and best_pos is not None:
            routes_by_exec[best_exec].insert(best_pos, cust)
            routes_km[best_exec] = best_val["metrics"]["total_km"]
            scheduled_customer_ids.add(cid)

            assignment_rationales[cid] = {
                "assigned_executive": best_exec,
                "position": best_pos + 1,
                "incremental_km": round(best_delta_km, 2),
                "is_ptp": is_ptp,
                "reason": (
                    f"Assigned to {best_exec} (pos {best_pos+1}): "
                    f"{'Must-visit PTP today. ' if is_ptp else ''}"
                    f"Feasible within shift {exec_map[best_exec]['shift_start']}–{exec_map[best_exec]['shift_end']}, "
                    f"satisfies [{cust['window_start']}–{cust['window_end']}] window, "
                    f"minimal detour of +{best_delta_km:.2f} km."
                )
            }
            return True
        else:
            exec_distances = [
                (cache.get_distance(f"HOME_{e['id']}", float(e["home_lat"]), float(e["home_lon"]), cid, c_lat, c_lon), e["id"])
                for e in executives
            ]
            exec_distances.sort(key=lambda x: x[0])
            nearest_d, nearest_eid = exec_distances[0]

            primary_reason = "No feasible time window or shift capacity across all executives"
            if rejection_reasons:
                if any("Capacity" in r for r in rejection_reasons) and len(rejection_reasons) == len(executives):
                    primary_reason = "All available executives reached max visit capacity"

            skipped.append({
                "customer_id": cid,
                "customer_name": cust.get("customer_name") or cust.get("name", cid),
                "area": cust.get("area", ""),
                "lat": c_lat,
                "lon": c_lon,
                "ptp_today": 1 if is_ptp else 0,
                "priority_score": c_prio,
                "overdue_amount": float(cust.get("overdue_amount", 0.0)),
                "window_start": cust["window_start"],
                "window_end": cust["window_end"],
                "reason": primary_reason,
                "details": {"checks": rejection_reasons[:3]},
                "nearest_executive_id": nearest_eid,
                "distance_to_nearest_km": nearest_d
            })
            return False

    for cust in ptp_sorted:
        try_schedule_customer(cust, is_ptp=True)

    for cust in non_ptp_sorted:
        try_schedule_customer(cust, is_ptp=False)

    final_routes = {}
    total_km = 0.0
    total_priority = 0.0
    visited_count = 0

    for e in executives:
        eid = e["id"]
        stops = routes_by_exec[eid]
        res = validate_route(e, stops, cache)

        timeline = res["timeline"]
        for st in timeline:
            cid = st["customer_id"]
            if cid in assignment_rationales:
                st["explainability_json"] = assignment_rationales[cid]

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
            "timeline": timeline
        }
        total_km += res["metrics"]["total_km"]
        visited_count += len(stops)
        for s in stops:
            total_priority += float(s.get("priority_score", 1.0))

    total_km = round(total_km, 2)
    total_priority = round(total_priority, 2)
    score = round(total_priority - lambda_param * total_km, 2)

    ptp_total = len(ptp_customers)
    ptp_visited = sum(1 for cid in scheduled_customer_ids if any((c.get("customer_id") or c.get("id")) == cid for c in ptp_customers))

    return {
        "algorithm": "smart_greedy",
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
