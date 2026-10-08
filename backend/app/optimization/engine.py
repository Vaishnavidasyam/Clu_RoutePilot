import time
from typing import Dict, List, Any, Callable, Optional
from backend.app.optimization.distance import DistanceMatrixCache
from backend.app.optimization.baseline import run_baseline_optimizer
from backend.app.optimization.smart_greedy import run_smart_greedy_optimizer
from backend.app.optimization.two_opt import run_two_opt_improvement
from backend.app.validators.route_validator import validate_plan_global

def optimize_problem(
    executives: List[Dict[str, Any]],
    customers: List[Dict[str, Any]],
    algorithm: str = "smart_greedy_two_opt",
    lambda_param: float = 2.0,
    road_factor: float = 1.3,
    speed_kmh: float = 25.0,
    progress_callback: Optional[Callable[[str, int, Dict[str, Any]], None]] = None
) -> Dict[str, Any]:
    """
    Executes end-to-end route optimization with real live stage updates and baseline comparison.
    """
    start_time = time.time()

    def update_stage(stage: str, progress: int, stats: Optional[Dict[str, Any]] = None):
        if progress_callback:
            progress_callback(stage, progress, stats or {})

    # Stage 1: Loading & Setup
    update_stage("loading", 10, {"executives_count": len(executives), "customers_count": len(customers)})

    # Stage 2: Distance Matrix precomputation & caching
    update_stage("distance_matrix", 25, {"status": "Precomputing pairwise distances and travel times"})
    cache = DistanceMatrixCache(road_factor=road_factor, speed_kmh=speed_kmh)

    # Stage 3: Always run Baseline for exact comparison
    update_stage("baseline_computation", 40, {"status": "Running baseline (ID order sequential assignment)"})
    baseline_result = run_baseline_optimizer(executives, customers, cache, lambda_param=lambda_param)

    # Stage 4: Run Target Optimizer
    update_stage("routing", 60, {"status": f"Running {algorithm} with PTP priority & time-window constraints"})
    if algorithm == "baseline":
        active_result = baseline_result
    else:
        smart_greedy_sol = run_smart_greedy_optimizer(executives, customers, cache, lambda_param=lambda_param)
        if algorithm == "smart_greedy_two_opt" or algorithm == "two_opt":
            update_stage("two_opt_improvement", 80, {"status": "Applying 2-opt edge swap local search"})
            active_result = run_two_opt_improvement(executives, smart_greedy_sol, cache, lambda_param=lambda_param)
        else:
            active_result = smart_greedy_sol

    # Stage 5: Global Validation
    update_stage("validation", 90, {"status": "Validating all 13 hard constraints"})
    active_routes_by_exec = {
        eid: [
            {
                "customer_id": s["customer_id"],
                "lat": s["lat"],
                "lon": s["lon"],
                "window_start": s["window_start"],
                "window_end": s["window_end"],
                "service_min": s["service_min"]
            }
            for s in r_info.get("timeline", [])
        ]
        for eid, r_info in active_result["routes"].items()
    }
    global_val = validate_plan_global(executives, active_routes_by_exec, customers, cache)

    runtime_ms = round((time.time() - start_time) * 1000, 2)

    # Stage 6: Calculate Comparison Metrics
    update_stage("metrics", 95, {"status": "Computing comparative KPI metrics"})

    exec_kms = [r["metrics"]["total_km"] for r in active_result["routes"].values() if r["metrics"]["visit_count"] > 0]
    workload_spread = round(max(exec_kms) - min(exec_kms), 2) if exec_kms else 0.0

    avg_km_per_visit = round(
        active_result["total_distance_km"] / max(active_result["customers_visited"], 1), 2
    )

    # True improvements vs baseline
    dist_saved_km = round(baseline_result["total_distance_km"] - active_result["total_distance_km"], 2)
    dist_improvement_pct = round(
        (dist_saved_km / max(baseline_result["total_distance_km"], 0.01)) * 100.0, 1
    ) if baseline_result["total_distance_km"] > 0 else 0.0

    prio_gain = round(active_result["total_priority_score"] - baseline_result["total_priority_score"], 2)
    prio_improvement_pct = round(
        (prio_gain / max(baseline_result["total_priority_score"], 0.01)) * 100.0, 1
    ) if baseline_result["total_priority_score"] > 0 else 0.0

    score_improvement_pct = round(
        ((active_result["total_score"] - baseline_result["total_score"]) / max(abs(baseline_result["total_score"]), 0.01)) * 100.0, 1
    ) if baseline_result["total_score"] != 0 else 0.0

    comparison = {
        "baseline": {
            "total_distance_km": baseline_result["total_distance_km"],
            "total_priority_score": baseline_result["total_priority_score"],
            "total_score": baseline_result["total_score"],
            "customers_visited": baseline_result["customers_visited"],
            "customers_skipped": baseline_result["customers_skipped"],
            "ptp_scheduled": baseline_result["ptp_scheduled"],
            "ptp_total": baseline_result["ptp_total"],
            "ptp_coverage_pct": baseline_result["ptp_coverage_pct"],
            "violations_count": 0
        },
        "optimized": {
            "total_distance_km": active_result["total_distance_km"],
            "total_priority_score": active_result["total_priority_score"],
            "total_score": active_result["total_score"],
            "customers_visited": active_result["customers_visited"],
            "customers_skipped": active_result["customers_skipped"],
            "ptp_scheduled": active_result["ptp_scheduled"],
            "ptp_total": active_result["ptp_total"],
            "ptp_coverage_pct": active_result["ptp_coverage_pct"],
            "violations_count": len(global_val["violations"])
        },
        "diff": {
            "distance_saved_km": dist_saved_km,
            "distance_saved_pct": dist_improvement_pct,
            "priority_gain": prio_gain,
            "priority_gain_pct": prio_improvement_pct,
            "score_gain": round(active_result["total_score"] - baseline_result["total_score"], 2),
            "score_gain_pct": score_improvement_pct,
            "ptp_scheduled_diff": active_result["ptp_scheduled"] - baseline_result["ptp_scheduled"]
        }
    }

    metrics = {
        "total_distance_km": active_result["total_distance_km"],
        "total_priority_score": active_result["total_priority_score"],
        "total_score": active_result["total_score"],
        "customers_visited": active_result["customers_visited"],
        "customers_skipped": active_result["customers_skipped"],
        "ptp_total": active_result["ptp_total"],
        "ptp_scheduled": active_result["ptp_scheduled"],
        "ptp_coverage_pct": active_result["ptp_coverage_pct"],
        "avg_km_per_visit": avg_km_per_visit,
        "workload_spread_km": workload_spread,
        "runtime_ms": runtime_ms,
        "violations_count": len(global_val["violations"]),
        "warnings_count": len(global_val["warnings"])
    }

    final_payload = {
        "algorithm": active_result["algorithm"],
        "lambda_param": lambda_param,
        "metrics": metrics,
        "comparison": comparison,
        "routes": active_result["routes"],
        "skipped": active_result["skipped"],
        "baseline_routes": baseline_result["routes"],
        "validation": global_val
    }

    update_stage("completed", 100, {"status": "Optimization completed successfully", "score": active_result["total_score"]})

    return final_payload
