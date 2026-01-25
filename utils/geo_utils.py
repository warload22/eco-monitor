"""
Geographic utilities for spatial operations
Pure functions for geospatial calculations
"""
import math
from typing import Tuple, List, Dict


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Calculate distance between two points using Haversine formula
    
    Args:
        lat1: Latitude of first point
        lon1: Longitude of first point
        lat2: Latitude of second point
        lon2: Longitude of second point
        
    Returns:
        Distance in kilometers
    """
    # Earth radius in kilometers
    R = 6371.0
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Differences
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Haversine formula
    a = (
        math.sin(dlat / 2) ** 2 +
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def find_nearest_location(
    target_lat: float,
    target_lon: float,
    locations: List[Dict]
) -> Dict:
    """
    Find nearest location from a list of locations
    
    Args:
        target_lat: Target latitude
        target_lon: Target longitude
        locations: List of location dicts with 'latitude' and 'longitude' keys
        
    Returns:
        Nearest location dict with added 'distance' key
    """
    if not locations:
        return {}
    
    nearest = None
    min_distance = float('inf')
    
    for location in locations:
        distance = haversine_distance(
            target_lat,
            target_lon,
            location['latitude'],
            location['longitude']
        )
        
        if distance < min_distance:
            min_distance = distance
            nearest = location.copy()
            nearest['distance'] = round(distance, 2)
    
    return nearest


def get_bounding_box(
    center_lat: float,
    center_lon: float,
    radius_km: float
) -> Tuple[float, float, float, float]:
    """
    Calculate bounding box around a center point
    
    Args:
        center_lat: Center latitude
        center_lon: Center longitude
        radius_km: Radius in kilometers
        
    Returns:
        Tuple of (min_lat, min_lon, max_lat, max_lon)
    """
    # Approximate degrees per kilometer
    # 1 degree latitude ≈ 111 km
    # 1 degree longitude ≈ 111 km * cos(latitude)
    
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * math.cos(math.radians(center_lat)))
    
    min_lat = center_lat - lat_delta
    max_lat = center_lat + lat_delta
    min_lon = center_lon - lon_delta
    max_lon = center_lon + lon_delta
    
    return (min_lat, min_lon, max_lat, max_lon)


def point_in_polygon(
    point_lat: float,
    point_lon: float,
    polygon: List[Tuple[float, float]]
) -> bool:
    """
    Check if point is inside polygon using ray casting algorithm
    
    Args:
        point_lat: Point latitude
        point_lon: Point longitude
        polygon: List of (lat, lon) tuples defining polygon vertices
        
    Returns:
        True if point is inside polygon
    """
    if len(polygon) < 3:
        return False
    
    x, y = point_lon, point_lat
    n = len(polygon)
    inside = False
    
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    
    return inside


def create_geojson_point(
    latitude: float,
    longitude: float,
    properties: Dict
) -> Dict:
    """
    Create GeoJSON Point feature
    
    Args:
        latitude: Point latitude
        longitude: Point longitude
        properties: Properties dictionary
        
    Returns:
        GeoJSON Feature dict
    """
    return {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [longitude, latitude]
        },
        'properties': properties
    }


def moscow_districts() -> List[str]:
    """
    Get list of Moscow administrative districts
    
    Returns:
        List of district names
    """
    return [
        'Центральный',
        'Северный',
        'Северо-Восточный',
        'Восточный',
        'Юго-Восточный',
        'Южный',
        'Юго-Западный',
        'Западный',
        'Северо-Западный',
        'Зеленоградский',
        'Новомосковский',
        'Троицкий'
    ]
