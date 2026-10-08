"""
RoutePilot Centralized DateTime & Operational Calendar Service
Authoritative backend source for Asia/Kolkata (IST / UTC+05:30) date & time.
"""
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from typing import Optional, Dict, Any

IST_TIMEZONE = ZoneInfo("Asia/Kolkata")
IST_LABEL = "IST"
LOCATION_CONTEXT = "Hyderabad, Telangana, India"

def get_ist_now() -> datetime:
    """Returns the current timezone-aware datetime in Asia/Kolkata (IST)."""
    return datetime.now(IST_TIMEZONE)

def get_current_date() -> str:
    """Returns the current operational date string in YYYY-MM-DD format (IST)."""
    return get_ist_now().strftime("%Y-%m-%d")

def get_current_time_24h() -> str:
    """Returns current time string in 24h format HH:MM:SS (IST)."""
    return get_ist_now().strftime("%H:%M:%S")

def get_current_time_12h() -> str:
    """Returns current time string in 12h AM/PM format (IST), e.g. '08:30 AM'."""
    return get_ist_now().strftime("%I:%M %p")

def get_operational_date() -> str:
    """Returns current operational date (YYYY-MM-DD). Rolls over at 00:00:00 IST."""
    return get_current_date()

def format_date_ist(d: Optional[Any] = None) -> str:
    """Formats a date or ISO string to standard 'DD MMM YYYY' in IST."""
    if d is None:
        return get_ist_now().strftime("%d %b %Y")
    if isinstance(d, (datetime, date)):
        return d.strftime("%d %b %Y")
    try:
        clean = str(d).split("T")[0]
        parsed = datetime.strptime(clean, "%Y-%m-%d")
        return parsed.strftime("%d %b %Y")
    except Exception:
        return str(d)

def get_system_time_payload() -> Dict[str, Any]:
    """Provides authoritative system date/time payload for API consumption."""
    now = get_ist_now()
    return {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "time_12h": now.strftime("%I:%M %p"),
        "datetime": now.isoformat(),
        "formatted_date": now.strftime("%d %b %Y"),
        "day_name": now.strftime("%A"),
        "formatted_date_with_day": now.strftime("%A, %d %b %Y"),
        "timezone": "Asia/Kolkata",
        "timezoneLabel": IST_LABEL,
        "location": LOCATION_CONTEXT
    }
