import math
from typing import Dict, Tuple, List, Any

EARTH_RADIUS_KM = 6371.0
ROAD_CORRECTION_FACTOR = 1.3
AVG_SPEED_KMH = 25.0

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance in kilometers using the Haversine formula."""
    if lat1 == lat2 and lon1 == lon2:
        return 0.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return EARTH_RADIUS_KM * c

def road_distance_km(lat1: float, lon1: float, lat2: float, lon2: float, factor: float = ROAD_CORRECTION_FACTOR) -> float:
    """Road distance using Haversine * 1.3 correction factor, rounded to 2 decimal places."""
    h = haversine_km(lat1, lon1, lat2, lon2)
    return round(h * factor, 2)

def travel_time_minutes(dist_km: float, speed_kmh: float = AVG_SPEED_KMH) -> float:
    """Travel time: dist_km / 25 * 60 minutes."""
    if dist_km <= 0.0:
        return 0.0
    return round((dist_km / speed_kmh) * 60.0, 2)

def time_to_minutes(t_str: str) -> int:
    """Convert 'HH:MM' string to integer minutes from 00:00."""
    try:
        parts = t_str.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0

def minutes_to_time(m: float) -> str:
    """Convert minutes from 00:00 back to 'HH:MM' string."""
    m_int = int(round(m))
    hh = (m_int // 60) % 24
    mm = m_int % 60
    return f"{hh:02d}:{mm:02d}"

class DistanceMatrixCache:
    """Cache for pairwise road distances and travel times between nodes."""
    def __init__(self, road_factor: float = ROAD_CORRECTION_FACTOR, speed_kmh: float = AVG_SPEED_KMH):
        self.road_factor = road_factor
        self.speed_kmh = speed_kmh
        self.dist_cache: Dict[Tuple[str, str], float] = {}
        self.time_cache: Dict[Tuple[str, str], float] = {}

    def get_distance(self, id1: str, lat1: float, lon1: float, id2: str, lat2: float, lon2: float) -> float:
        if id1 == id2:
            return 0.0
        key = (id1, id2)
        if key in self.dist_cache:
            return self.dist_cache[key]
        d = road_distance_km(lat1, lon1, lat2, lon2, self.road_factor)
        self.dist_cache[key] = d
        self.dist_cache[(id2, id1)] = d
        return d

    def get_travel_time(self, id1: str, lat1: float, lon1: float, id2: str, lat2: float, lon2: float) -> float:
        if id1 == id2:
            return 0.0
        key = (id1, id2)
        if key in self.time_cache:
            return self.time_cache[key]
        d = self.get_distance(id1, lat1, lon1, id2, lat2, lon2)
        t = travel_time_minutes(d, self.speed_kmh)
        self.time_cache[key] = t
        self.time_cache[(id2, id1)] = t
        return t
