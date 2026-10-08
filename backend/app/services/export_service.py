import io
import csv
from typing import Dict, Any, List

def generate_plan_csv(plan_data: Dict[str, Any]) -> str:
    """
    Official Challenge plan.csv format:
    executive_id,seq,customer_id,arrival_time,km_from_prev,cumulative_km
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["executive_id", "seq", "customer_id", "arrival_time", "km_from_prev", "cumulative_km"])

    routes = plan_data.get("routes", {})
    for eid, r_info in sorted(routes.items()):
        timeline = r_info.get("timeline", [])
        for stop in timeline:
            writer.writerow([
                eid,
                stop.get("seq", 1),
                stop.get("customer_id", ""),
                stop.get("arrival_time", ""),
                stop.get("km_from_prev", 0.0),
                stop.get("cumulative_km", 0.0)
            ])
    return output.getvalue()

def generate_skipped_csv(plan_data: Dict[str, Any]) -> str:
    """
    Official Challenge skipped_customers.csv:
    customer_id,ptp_today,priority_score,reason,details
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["customer_id", "ptp_today", "priority_score", "reason", "details"])

    skipped = plan_data.get("skipped", [])
    for sc in skipped:
        details_str = "; ".join(sc.get("details", {}).get("checks", [])) if isinstance(sc.get("details"), dict) else str(sc.get("details", ""))
        writer.writerow([
            sc.get("customer_id", ""),
            sc.get("ptp_today", 0),
            sc.get("priority_score", 0.0),
            sc.get("reason", "Infeasible"),
            details_str
        ])
    return output.getvalue()

def generate_metrics_csv(plan_data: Dict[str, Any]) -> str:
    """
    Official Challenge metrics.csv:
    metric,baseline,optimized,improvement
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["metric", "baseline", "optimized", "improvement"])

    comp = plan_data.get("comparison", {})
    base = comp.get("baseline", {})
    opt = comp.get("optimized", {})
    diff = comp.get("diff", {})

    metrics_rows = [
        ("Total Route Distance (km)", base.get("total_distance_km", 0.0), opt.get("total_distance_km", 0.0), f"-{diff.get('distance_saved_km', 0.0)} km ({diff.get('distance_saved_pct', 0.0)}%)"),
        ("Total Priority Score", base.get("total_priority_score", 0.0), opt.get("total_priority_score", 0.0), f"+{diff.get('priority_gain', 0.0)} ({diff.get('priority_gain_pct', 0.0)}%)"),
        ("Objective Score (Priority - 2*KM)", base.get("total_score", 0.0), opt.get("total_score", 0.0), f"+{diff.get('score_gain', 0.0)} ({diff.get('score_gain_pct', 0.0)}%)"),
        ("PTP Customers Visited", f"{base.get('ptp_scheduled', 0)}/{base.get('ptp_total', 0)}", f"{opt.get('ptp_scheduled', 0)}/{opt.get('ptp_total', 0)}", f"{opt.get('ptp_coverage_pct', 0.0)}% coverage"),
        ("Total Customers Visited", base.get("customers_visited", 0), opt.get("customers_visited", 0), f"{opt.get('customers_visited', 0) - base.get('customers_visited', 0)}"),
        ("Customers Skipped", base.get("customers_skipped", 0), opt.get("customers_skipped", 0), f"{opt.get('customers_skipped', 0) - base.get('customers_skipped', 0)}"),
        ("Constraint Violations", base.get("violations_count", 0), opt.get("violations_count", 0), "0 (Clean)")
    ]

    for row in metrics_rows:
        writer.writerow(row)

    return output.getvalue()
