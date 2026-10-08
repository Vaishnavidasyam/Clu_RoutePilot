import re
from typing import List, Dict, Any, Tuple
from backend.app.optimization.distance import time_to_minutes

TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

def normalize_time_str(val: Any, default: str = "") -> str:
    if val is None:
        return default
    s = str(val).strip()
    if not s:
        return default

    try:
        f_val = float(s)
        if 0.0 <= f_val <= 1.0:
            total_minutes = int(round(f_val * 24 * 60))
            if total_minutes >= 1440:
                total_minutes = 1439
            hh = total_minutes // 60
            mm = total_minutes % 60
            return f"{hh:02d}:{mm:02d}"
        elif 1.0 < f_val < 24.0 and "." in s:
            total_minutes = int(round(f_val * 60))
            hh = min(23, total_minutes // 60)
            mm = total_minutes % 60
            return f"{hh:02d}:{mm:02d}"
    except (ValueError, TypeError):
        pass

    s_upper = s.upper()
    match_12h = re.match(r"^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$", s_upper)
    if match_12h:
        hour = int(match_12h.group(1))
        minute = int(match_12h.group(2) or 0)
        meridiem = match_12h.group(3)
        if meridiem == "PM" and hour < 12:
            hour += 12
        elif meridiem == "AM" and hour == 12:
            hour = 0
        return f"{hour:02d}:{minute:02d}"

    match_24h = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$", s_upper)
    if match_24h:
        hour = int(match_24h.group(1))
        minute = int(match_24h.group(2))
        return f"{hour:02d}:{minute:02d}"

    match_h = re.match(r"^(\d{1,2})$", s_upper)
    if match_h:
        hour = int(match_h.group(1))
        if 0 <= hour <= 23:
            return f"{hour:02d}:00"

    return s

def validate_executives_data(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], int]:
    """Validates list of executive records."""
    issues = []
    seen_ids = set()
    valid_count = 0

    for idx, row in enumerate(records):
        row_id = str(row.get("id", f"row_{idx+1}")).strip()
        row_issues = []

        if not row_id:
            row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "id", "message": f"Row {idx+1}: Executive ID is required."})
        elif row_id in seen_ids:
            row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "id", "message": f"Duplicate executive ID '{row_id}' found."})
        seen_ids.add(row_id)

        # Coordinate checks
        try:
            lat = float(row.get("home_lat", 0.0))
            if not (-90.0 <= lat <= 90.0):
                row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "home_lat", "message": f"home_lat {lat} must be between -90 and 90."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "home_lat", "message": "Invalid numeric value for home_lat."})

        try:
            lon = float(row.get("home_lon", 0.0))
            if not (-180.0 <= lon <= 180.0):
                row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "home_lon", "message": f"home_lon {lon} must be between -180 and 180."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "home_lon", "message": "Invalid numeric value for home_lon."})

        # Shift checks
        s_start = normalize_time_str(row.get("shift_start", ""))
        s_end = normalize_time_str(row.get("shift_end", ""))
        if not TIME_PATTERN.match(s_start):
            row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "shift_start", "message": f"shift_start '{s_start}' must be in HH:MM 24-hr format."})
        if not TIME_PATTERN.match(s_end):
            row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "shift_end", "message": f"shift_end '{s_end}' must be in HH:MM 24-hr format."})

        if TIME_PATTERN.match(s_start) and TIME_PATTERN.match(s_end):
            if time_to_minutes(s_end) <= time_to_minutes(s_start):
                row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "shift_end", "message": f"shift_end ({s_end}) must be strictly after shift_start ({s_start})."})

        # max_visits and max_km
        try:
            mv = int(row.get("max_visits", 15))
            if mv <= 0:
                row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "max_visits", "message": "max_visits must be greater than 0."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "max_visits", "message": "max_visits must be an integer."})

        try:
            mkm = float(row.get("max_km", 80.0))
            if mkm <= 0:
                row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "max_km", "message": "max_km must be greater than 0."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "EXECUTIVE", "record_id": row_id, "field": "max_km", "message": "max_km must be a number."})

        if not row_issues:
            valid_count += 1
        issues.extend(row_issues)

    return issues, records, valid_count

def validate_customers_data(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], int]:
    """Validates list of customer records."""
    issues = []
    seen_ids = set()
    valid_count = 0
    empty_area_ids = []

    for idx, row in enumerate(records):
        row_id = str(row.get("id", f"row_{idx+1}")).strip()
        row_issues = []

        if not row_id:
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "id", "message": f"Row {idx+1}: Customer ID is required."})
        elif row_id in seen_ids:
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "id", "message": f"Duplicate customer ID '{row_id}' found."})
        seen_ids.add(row_id)

        area = str(row.get("area", "")).strip()
        if not area:
            empty_area_ids.append(row_id)

        # Coordinates
        try:
            lat = float(row.get("lat", 0.0))
            if not (-90.0 <= lat <= 90.0):
                row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "lat", "message": f"lat {lat} must be between -90 and 90."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "lat", "message": "Invalid numeric value for lat."})

        try:
            lon = float(row.get("lon", 0.0))
            if not (-180.0 <= lon <= 180.0):
                row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "lon", "message": f"lon {lon} must be between -180 and 180."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "lon", "message": "Invalid numeric value for lon."})

        # Overdue and priority
        try:
            amt = float(row.get("overdue_amount", 0.0))
            if amt < 0:
                row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "overdue_amount", "message": "overdue_amount cannot be negative."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "overdue_amount", "message": "overdue_amount must be numeric."})

        try:
            prio = float(row.get("priority_score", 1.0))
            if prio < 0:
                row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "priority_score", "message": "priority_score cannot be negative."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "priority_score", "message": "priority_score must be numeric."})

        # PTP
        try:
            ptp = int(row.get("ptp_today", 0))
            if ptp not in (0, 1):
                row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "ptp_today", "message": "ptp_today must be 0 or 1."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "ptp_today", "message": "ptp_today must be 0 or 1."})

        # Time windows and service min
        w_start = normalize_time_str(row.get("window_start", ""))
        w_end = normalize_time_str(row.get("window_end", ""))
        if not TIME_PATTERN.match(w_start):
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "window_start", "message": f"window_start '{w_start}' must be in HH:MM format."})
        if not TIME_PATTERN.match(w_end):
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "window_end", "message": f"window_end '{w_end}' must be in HH:MM format."})

        try:
            s_min = int(row.get("service_min", 15))
            if s_min <= 0:
                row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "service_min", "message": "service_min must be positive."})
        except Exception:
            row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "service_min", "message": "service_min must be integer."})
            s_min = 15

        if TIME_PATTERN.match(w_start) and TIME_PATTERN.match(w_end):
            w_start_m = time_to_minutes(w_start)
            w_end_m = time_to_minutes(w_end)
            if w_end_m < w_start_m:
                row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "window_end", "message": f"window_end ({w_end}) is before window_start ({w_start})."})
            elif (w_end_m - w_start_m) < s_min:
                row_issues.append({"type": "ERROR", "category": "CUSTOMER", "record_id": row_id, "field": "window_end", "message": f"Time window duration ({w_end_m - w_start_m}m) is less than required service_min ({s_min}m)."})

        if not row_issues:
            valid_count += 1
        issues.extend(row_issues)

    if empty_area_ids:
        if len(empty_area_ids) <= 3:
            for rid in empty_area_ids:
                issues.append({"type": "WARNING", "category": "CUSTOMER", "record_id": rid, "field": "area", "message": f"Customer {rid} has empty area string (coordinates used directly).", "fixable": True})
        else:
            issues.append({
                "type": "WARNING",
                "category": "CUSTOMER",
                "record_id": f"{len(empty_area_ids)} Accounts",
                "field": "area",
                "message": f"{len(empty_area_ids)} customers have empty area strings; geographic coordinates will be used directly for planning.",
                "fixable": True
            })

    return issues, records, valid_count
