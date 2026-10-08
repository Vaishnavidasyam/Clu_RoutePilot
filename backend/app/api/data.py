import io
import csv
import re
from datetime import datetime
from typing import Optional, Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.models import Executive, Customer, DailySnapshot, AuditLog, Plan
from backend.app.schemas.schemas import ApiResponse, DataValidationReport
from backend.app.validators.data_validator import validate_executives_data, validate_customers_data
from backend.app.auth.auth_service import get_current_user_optional
from backend.app.services.datetime_service import get_operational_date

router = APIRouter(prefix="/api/data", tags=["Data Management"])

def decode_csv_bytes(content: bytes) -> str:
    """Safely decode CSV bytes trying utf-8-sig, utf-8, latin-1, cp1252."""
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            return content.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return content.decode("utf-8", errors="replace")

def clean_str(val: Any, default: str = "") -> str:
    if val is None:
        return default
    s = str(val).strip()
    return s if s else default

def clean_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    s = str(val).strip()
    if not s:
        return default
    s = re.sub(r"[₹$£€\s,]|INR|Rs\.?", "", s, flags=re.IGNORECASE)
    try:
        return float(s)
    except (ValueError, TypeError):
        return default

def clean_int(val: Any, default: int = 0) -> int:
    if val is None:
        return default
    s = str(val).strip()
    if not s:
        return default
    s = re.sub(r"[₹$£€\s,]|INR|Rs\.?", "", s, flags=re.IGNORECASE)
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return default

def clean_ptp(val: Any) -> int:
    if val is None:
        return 0
    s = str(val).strip().lower()
    return 1 if s in ("1", "true", "yes", "y", "ptp", "t") else 0

def normalize_time_str(val: Any, default: str = "09:00") -> str:
    if val is None:
        return default
    s = str(val).strip()
    if not s:
        return default

    # Check if value is an Excel time fraction (e.g. 0.354166667) or decimal hours (e.g. 8.5)
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

HYDERABAD_AREAS_GEO = {
    "gachibowli": (17.4401, 78.3489),
    "madhapur": (17.4483, 78.3915),
    "hitech city": (17.4435, 78.3772),
    "whitefields": (17.4520, 78.3680),
    "kondapur": (17.4645, 78.3582),
    "banjara hills": (17.4156, 78.4352),
    "jubilee hills": (17.4325, 78.4070),
    "kukatpally": (17.4948, 78.3996),
    "kphb": (17.4930, 78.3950),
    "secunderabad": (17.4399, 78.4983),
    "begumpet": (17.4447, 78.4664),
    "ameerpet": (17.4375, 78.4482),
    "somajiguda": (17.4260, 78.4550),
    "panjagutta": (17.4255, 78.4505),
    "charminar": (17.3616, 78.4747),
    "koti": (17.3850, 78.4867),
    "abids": (17.3910, 78.4780),
    "dilsukhnagar": (17.3685, 78.5316),
    "lb nagar": (17.3457, 78.5522),
    "uppal": (17.4018, 78.5602),
    "mehdipatnam": (17.3916, 78.4405),
    "attapur": (17.3620, 78.4320),
    "miyapur": (17.4968, 78.3565),
    "chandanagar": (17.4912, 78.3267),
    "alwal": (17.5020, 78.5080),
    "malkajgiri": (17.4500, 78.5280),
    "tarnaka": (17.4280, 78.5320),
    "nacharam": (17.4310, 78.5640),
    "bowenpally": (17.4720, 78.4880),
    "sainikpuri": (17.4890, 78.5480),
}

def resolve_customer_coordinates(area: str, lat_val: Any, lon_val: Any, idx: int) -> tuple[float, float]:
    # 1. If explicit coordinates are provided in CSV, use them directly as source of truth
    if lat_val is not None and lon_val is not None and str(lat_val).strip() != "" and str(lon_val).strip() != "":
        try:
            lat = float(str(lat_val).strip())
            lon = float(str(lon_val).strip())
            if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                return round(lat, 6), round(lon, 6)
        except (ValueError, TypeError):
            pass

    # 2. Fallback only if coordinates were completely omitted from CSV: match known locality
    area_norm = re.sub(r"[^a-z0-9]", "", str(area or "").lower())
    for name, (base_lat, base_lon) in HYDERABAD_AREAS_GEO.items():
        clean_name = re.sub(r"[^a-z0-9]", "", name)
        if clean_name in area_norm or (len(area_norm) >= 4 and area_norm in clean_name):
            lat_off = (((idx * 7) % 23) - 11) * 0.0015
            lon_off = (((idx * 13) % 23) - 11) * 0.0015
            return round(base_lat + lat_off, 6), round(base_lon + lon_off, 6)

    # 3. Fallback spatial dispersion
    lat_off = (((idx * 7) % 29) - 14) * 0.003
    lon_off = (((idx * 11) % 29) - 14) * 0.003
    return round(17.3850 + lat_off, 6), round(78.4867 + lon_off, 6)

def resolve_executive_coordinates(lat_val: Any, lon_val: Any, idx: int) -> tuple[float, float]:
    # 1. If explicit coordinates are provided in CSV, use them directly as source of truth
    if lat_val is not None and lon_val is not None and str(lat_val).strip() != "" and str(lon_val).strip() != "":
        try:
            lat = float(str(lat_val).strip())
            lon = float(str(lon_val).strip())
            if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                return round(lat, 6), round(lon, 6)
        except (ValueError, TypeError):
            pass

    # 2. Fallback only if missing
    lat_off = (((idx * 5) % 17) - 8) * 0.0025
    lon_off = (((idx * 11) % 17) - 8) * 0.0025
    return round(17.4239 + lat_off, 6), round(78.4738 + lon_off, 6)

def parse_csv_rows(decoded: str) -> tuple[List[Dict[str, Any]], List[str]]:
    """
    Robust CSV parser:
    1. Normalizes all line endings (CRLF, CR -> LF) to prevent 'new-line character seen in unquoted field'.
    2. Auto-detects delimiters (tab '\\t', semicolon ';', comma ',').
    3. Trims whitespace from column headers and values.
    """
    clean_decoded = decoded.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not clean_decoded:
        return [], []

    lines = [line.strip() for line in clean_decoded.split("\n") if line.strip()]
    if not lines:
        return [], []
    first_line = lines[0]
    tab_count = first_line.count("\t")
    semi_count = first_line.count(";")
    comma_count = first_line.count(",")
    pipe_count = first_line.count("|")

    if tab_count > 0 and tab_count >= comma_count:
        delim = "\t"
    elif pipe_count > 0 and pipe_count >= comma_count:
        delim = "|"
    elif semi_count > 0 and semi_count >= comma_count:
        delim = ";"
    elif comma_count > 0:
        delim = ","
    else:
        delim = None  # Whitespace separated

    if delim:
        reader = csv.DictReader(io.StringIO(clean_decoded, newline=""), delimiter=delim)
        fieldnames = [f.strip() for f in (reader.fieldnames or []) if f is not None]
        rows = []
        for r in reader:
            if not r:
                continue
            cleaned = {}
            for k, v in r.items():
                if k is not None:
                    cleaned[k.strip()] = v.strip() if isinstance(v, str) else v
            if cleaned and any(v not in (None, "") for v in cleaned.values()):
                rows.append(cleaned)
        return rows, fieldnames
    else:
        # Multi-space / whitespace separated
        fieldnames = [f.strip() for f in re.split(r"\s+", first_line) if f.strip()]
        rows = []
        for line in lines[1:]:
            parts = [p.strip() for p in re.split(r"\s+", line) if p.strip()]
            if not parts:
                continue
            row = {fieldnames[i]: parts[i] for i in range(min(len(fieldnames), len(parts)))}
            if row and any(v not in (None, "") for v in row.values()):
                rows.append(row)
        return rows, fieldnames

def parse_tabular_file(content: bytes, filename: str = "") -> tuple[List[Dict[str, Any]], List[str]]:
    """
    Parses both XLSX Excel workbooks and delimiter-separated CSV/TSV text files.
    """
    # Check if file is XLSX (ZIP header PK\x03\x04 or .xlsx extension)
    if content.startswith(b"PK\x03\x04") or (filename and filename.lower().endswith((".xlsx", ".xlsm"))):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            sheet = wb.active
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                return [], []
            headers = [str(c).strip() for c in rows[0] if c is not None]
            parsed_rows = []
            for r in rows[1:]:
                if not any(c is not None and str(c).strip() != "" for c in r):
                    continue
                row_dict = {}
                for idx, h in enumerate(headers):
                    if idx < len(r):
                        row_dict[h] = r[idx]
                parsed_rows.append(row_dict)
            return parsed_rows, headers
        except Exception:
            pass

    # Fallback to standard CSV decoding
    decoded = decode_csv_bytes(content)
    return parse_csv_rows(decoded)

def get_field_val(row: dict, keys: list, default: Any = None) -> Any:
    """Finds first matching key ignoring case, spaces, and underscores."""
    for k in keys:
        if k in row and row[k] is not None and str(row[k]).strip() != "":
            return row[k]
    normalized_row = {
        re.sub(r"[\s_\-]+", "", str(k).lower()): v
        for k, v in row.items() if k is not None
    }
    for k in keys:
        norm_k = re.sub(r"[\s_\-]+", "", k.lower())
        if norm_k in normalized_row and normalized_row[norm_k] is not None and str(normalized_row[norm_k]).strip() != "":
            return normalized_row[norm_k]
    return default

@router.get("/today", response_model=ApiResponse)
def get_today_data(date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    today_str = date or get_operational_date()
    executives = db.query(Executive).filter(Executive.plan_date == today_str).all()
    customers = db.query(Customer).filter(Customer.plan_date == today_str).all()
    snapshot = db.query(DailySnapshot).filter(DailySnapshot.plan_date == today_str).order_by(DailySnapshot.id.desc()).first()

    exec_list = [
        {
            "id": e.id, "name": e.name, "home_lat": e.home_lat, "home_lon": e.home_lon,
            "shift_start": e.shift_start, "shift_end": e.shift_end,
            "max_visits": e.max_visits, "max_km": e.max_km, "status": e.status
        }
        for e in executives
    ]
    cust_list = [
        {
            "id": c.id, "name": c.name, "area": c.area, "lat": c.lat, "lon": c.lon,
            "dpd": c.dpd, "overdue_amount": c.overdue_amount, "priority_score": c.priority_score,
            "ptp_today": c.ptp_today, "window_start": c.window_start, "window_end": c.window_end,
            "service_min": c.service_min, "status": c.status
        }
        for c in customers
    ]

    return ApiResponse(
        success=True,
        data={
            "plan_date": today_str,
            "snapshot": {
                "id": snapshot.id if snapshot else None,
                "status": snapshot.status if snapshot else ("ready" if (exec_list and cust_list) else "empty"),
                "created_at": snapshot.created_at.isoformat() if snapshot else None,
                "data_source": snapshot.data_source if snapshot else "csv"
            } if snapshot else None,
            "executive_count": len(exec_list),
            "customer_count": len(cust_list),
            "ptp_count": sum(1 for c in cust_list if c["ptp_today"] == 1),
            "total_overdue": sum(c["overdue_amount"] for c in cust_list),
            "executives": exec_list,
            "customers": cust_list
        }
    )

@router.get("/validation", response_model=ApiResponse)
def run_data_validation(date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    target_date = date or get_operational_date()
    execs = db.query(Executive).filter(Executive.plan_date == target_date).all()
    custs = db.query(Customer).filter(Customer.plan_date == target_date).all()

    exec_dicts = [
        {"id": e.id, "name": e.name, "home_lat": e.home_lat, "home_lon": e.home_lon, "shift_start": e.shift_start, "shift_end": e.shift_end, "max_visits": e.max_visits, "max_km": e.max_km}
        for e in execs
    ]
    cust_dicts = [
        {"id": c.id, "name": c.name, "area": c.area, "lat": c.lat, "lon": c.lon, "dpd": c.dpd, "overdue_amount": c.overdue_amount, "priority_score": c.priority_score, "ptp_today": c.ptp_today, "window_start": c.window_start, "window_end": c.window_end, "service_min": c.service_min}
        for c in custs
    ]

    e_issues, _, e_valid = validate_executives_data(exec_dicts)
    c_issues, _, c_valid = validate_customers_data(cust_dicts)

    all_issues = e_issues + c_issues
    errors = [i for i in all_issues if i["type"] == "ERROR"]
    warnings = [i for i in all_issues if i["type"] == "WARNING"]

    report = {
        "is_valid": len(errors) == 0,
        "blocking_error_count": len(errors),
        "warning_count": len(warnings),
        "executive_valid_count": e_valid,
        "customer_valid_count": c_valid,
        "executive_total": len(execs),
        "customer_total": len(custs),
        "issues": all_issues
    }
    return ApiResponse(success=True, data=report)

@router.post("/snapshot", response_model=ApiResponse)
def create_snapshot(date: Optional[str] = Query(None), db: Session = Depends(get_db), current_user: Optional[dict] = Depends(get_current_user_optional)):
    today_str = date or get_operational_date()
    exec_c = db.query(Executive).filter(Executive.plan_date == today_str, Executive.status == "active").count()
    cust_c = db.query(Customer).filter(Customer.plan_date == today_str).count()
    ptp_c = db.query(Customer).filter(Customer.plan_date == today_str, Customer.ptp_today == 1).count()

    user_name = current_user.get("sub", "Operations Lead") if current_user else "Operations Lead"

    snap = DailySnapshot(
        plan_date=today_str,
        created_by=user_name,
        executive_count=exec_c,
        customer_count=cust_c,
        ptp_count=ptp_c,
        status="validated",
        data_source="csv"
    )
    db.add(snap)
    db.add(AuditLog(user_email=user_name, action="CREATE_DAILY_SNAPSHOT", entity_type="DailySnapshot", entity_id=today_str))
    db.commit()
    db.refresh(snap)

    return ApiResponse(
        success=True,
        message=f"Snapshot created for {today_str} ({cust_c} customers, {exec_c} executives)",
        data={"snapshot_id": snap.id, "plan_date": snap.plan_date, "status": snap.status}
    )

@router.post("/import/executives", response_model=ApiResponse)
async def import_executives_csv(file: UploadFile = File(...), date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        if not content:
            return ApiResponse(
                success=False,
                error={"code": "EMPTY_FILE", "message": "Uploaded file is empty. Please upload a valid CSV."}
            )
        raw_rows, fieldnames = parse_tabular_file(content, file.filename or "")
        if not fieldnames:
            return ApiResponse(
                success=False,
                error={"code": "INVALID_FILE", "message": "No valid headers found in uploaded file (supports CSV and XLSX)."}
            )

        target_date = date or get_operational_date()

        records = []
        for idx, row in enumerate(raw_rows):
            if not row or not any(v is not None and str(v).strip() != "" for v in row.values()):
                continue
            exec_id = clean_str(get_field_val(row, ["id", "executive_id", "exec_id", "agent_id", "rider_id"]), f"E{idx+1:02d}")
            exec_lat, exec_lon = resolve_executive_coordinates(
                get_field_val(row, ["home_lat", "depot_lat", "start_lat", "lat", "latitude"]),
                get_field_val(row, ["home_lon", "depot_lon", "start_lon", "lon", "lng", "longitude"]),
                idx
            )
            records.append({
                "id": exec_id,
                "plan_date": target_date,
                "name": clean_str(get_field_val(row, ["name", "executive_name", "agent_name", "full_name"]), exec_id),
                "home_lat": exec_lat,
                "home_lon": exec_lon,
                "shift_start": normalize_time_str(get_field_val(row, ["shift_start", "start_time", "work_start"]), "08:30"),
                "shift_end": normalize_time_str(get_field_val(row, ["shift_end", "end_time", "work_end"]), "17:30"),
                "max_visits": clean_int(get_field_val(row, ["max_visits", "visit_limit", "capacity"]), 15),
                "max_km": clean_float(get_field_val(row, ["max_km", "km_limit", "distance_limit"]), 80.0),
                "status": clean_str(get_field_val(row, ["status", "active", "state"]), "active").lower()
            })

        if not records:
            return ApiResponse(
                success=False,
                error={"code": "NO_RECORDS", "message": "No data rows found in CSV file."}
            )

        issues, _, valid_count = validate_executives_data(records)
        blocking_errors = [i for i in issues if i["type"] == "ERROR"]
        if blocking_errors:
            return ApiResponse(
                success=False,
                error={"code": "VALIDATION_FAILED", "message": f"{len(blocking_errors)} blocking validation errors found.", "details": blocking_errors},
                data={"records_parsed": len(records), "valid_count": valid_count, "issues": issues}
            )

        # Clear existing executives for this target operational date to prevent ghost/stale records
        db.query(Executive).filter(Executive.plan_date == target_date).delete()

        # Insert new records
        for r in records:
            db.add(Executive(**r))

        # Update or create DailySnapshot
        cust_count = db.query(Customer).filter(Customer.plan_date == target_date).count()
        ptp_count = db.query(Customer).filter(Customer.plan_date == target_date, Customer.ptp_today == 1).count()
        snap = db.query(DailySnapshot).filter(DailySnapshot.plan_date == target_date).order_by(DailySnapshot.id.desc()).first()
        if snap:
            snap.executive_count = len(records)
            snap.customer_count = cust_count
            snap.ptp_count = ptp_count
            snap.status = "ready"
        else:
            snap = DailySnapshot(
                plan_date=target_date,
                created_by="CSV Import",
                executive_count=len(records),
                customer_count=cust_count,
                ptp_count=ptp_count,
                status="ready",
                data_source="csv"
            )
            db.add(snap)

        db.commit()
        return ApiResponse(
            success=True,
            message=f"Successfully imported and updated {len(records)} executives for {target_date}",
            data={"count": len(records), "valid_count": valid_count, "plan_date": target_date}
        )
    except Exception as exc:
        db.rollback()
        return ApiResponse(
            success=False,
            error={"code": "IMPORT_ERROR", "message": f"Failed to import executives CSV: {str(exc)}"}
        )

@router.post("/import/customers", response_model=ApiResponse)
async def import_customers_csv(file: UploadFile = File(...), date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        if not content:
            return ApiResponse(
                success=False,
                error={"code": "EMPTY_FILE", "message": "Uploaded file is empty. Please upload a valid CSV."}
            )
        raw_rows, fieldnames = parse_tabular_file(content, file.filename or "")
        if not fieldnames:
            return ApiResponse(
                success=False,
                error={"code": "INVALID_FILE", "message": "No valid headers found in uploaded file (supports CSV and XLSX)."}
            )

        target_date = date or get_operational_date()

        records = []
        for idx, row in enumerate(raw_rows):
            if not row or not any(v is not None and str(v).strip() != "" for v in row.values()):
                continue
            cust_id = clean_str(get_field_val(row, ["id", "customer_id", "cust_id", "account_id"]), f"C{idx+1:03d}")
            c_area = clean_str(get_field_val(row, ["area", "locality", "location", "region", "zone"]), "")
            c_lat, c_lon = resolve_customer_coordinates(
                c_area,
                get_field_val(row, ["lat", "latitude", "coord_lat"]),
                get_field_val(row, ["lon", "lng", "longitude", "coord_lon"]),
                idx
            )
            records.append({
                "id": cust_id,
                "plan_date": target_date,
                "name": clean_str(get_field_val(row, ["name", "customer_name", "cust_name"]), cust_id),
                "area": c_area,
                "lat": c_lat,
                "lon": c_lon,
                "dpd": clean_int(get_field_val(row, ["dpd", "days_past_due", "overdue_days"]), 0),
                "overdue_amount": clean_float(get_field_val(row, ["overdue_amount", "overdue", "amount", "balance", "due_amount"]), 0.0),
                "priority_score": clean_float(get_field_val(row, ["priority_score", "priority", "score"]), 1.0),
                "ptp_today": clean_ptp(get_field_val(row, ["ptp_today", "ptp", "ptp_flag", "is_ptp"])),
                "window_start": normalize_time_str(get_field_val(row, ["window_start", "start_time", "preferred_start"]), "09:00"),
                "window_end": normalize_time_str(get_field_val(row, ["window_end", "end_time", "preferred_end"]), "18:00"),
                "service_min": clean_int(get_field_val(row, ["service_min", "duration", "service_time", "visit_duration"]), 15),
                "status": "pending"
            })

        if not records:
            return ApiResponse(
                success=False,
                error={"code": "NO_RECORDS", "message": "No data rows found in CSV file."}
            )

        issues, _, valid_count = validate_customers_data(records)
        blocking_errors = [i for i in issues if i["type"] == "ERROR"]
        if blocking_errors:
            return ApiResponse(
                success=False,
                error={"code": "VALIDATION_FAILED", "message": f"{len(blocking_errors)} blocking validation errors found.", "details": blocking_errors},
                data={"records_parsed": len(records), "valid_count": valid_count, "issues": issues}
            )

        # Clear existing customers for this target operational date to prevent ghost/stale records
        db.query(Customer).filter(Customer.plan_date == target_date).delete()

        # Insert new records
        for r in records:
            db.add(Customer(**r))

        # Update or create DailySnapshot
        exec_count = db.query(Executive).filter(Executive.plan_date == target_date).count()
        ptp_count = sum(1 for r in records if r.get("ptp_today") == 1)
        snap = db.query(DailySnapshot).filter(DailySnapshot.plan_date == target_date).order_by(DailySnapshot.id.desc()).first()
        if snap:
            snap.customer_count = len(records)
            snap.ptp_count = ptp_count
            snap.executive_count = exec_count
            snap.status = "ready"
        else:
            snap = DailySnapshot(
                plan_date=target_date,
                created_by="CSV Import",
                executive_count=exec_count,
                customer_count=len(records),
                ptp_count=ptp_count,
                status="ready",
                data_source="csv"
            )
            db.add(snap)

        db.commit()
        return ApiResponse(
            success=True,
            message=f"Successfully imported and updated {len(records)} customers for {target_date}",
            data={"count": len(records), "valid_count": valid_count, "plan_date": target_date}
        )
    except Exception as exc:
        db.rollback()
        return ApiResponse(
            success=False,
            error={"code": "IMPORT_ERROR", "message": f"Failed to import customers CSV: {str(exc)}"}
        )

@router.get("/sample/executives.csv")
def download_sample_executives():
    try:
        with open("data/sample/executives.csv", "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        content = "id,name,home_lat,home_lon,shift_start,shift_end,max_visits,max_km,status\nE01,Vikram Singh,17.4239,78.4738,08:30,17:30,15,65.0,active\n"
    return PlainTextResponse(content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=sample_executives.csv"})

@router.get("/sample/customers.csv")
def download_sample_customers():
    try:
        with open("data/sample/customers.csv", "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        content = "id,name,area,lat,lon,dpd,overdue_amount,priority_score,ptp_today,window_start,window_end,service_min\nC001,Northgate Traders,Gachibowli,17.4401,78.3489,45,34500,88,1,09:00,12:00,15\n"
    return PlainTextResponse(content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=sample_customers.csv"})
