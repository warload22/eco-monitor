"""
Data validation utilities
Pure functions for validating environmental data
"""
from typing import Optional, Tuple
from datetime import datetime


def is_valid_coordinate(latitude: float, longitude: float) -> bool:
    """
    Validate geographic coordinates
    
    Args:
        latitude: Latitude value
        longitude: Longitude value
        
    Returns:
        True if coordinates are valid
    """
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


def is_valid_measurement_value(value: float, parameter_name: str) -> bool:
    """
    Validate measurement value based on parameter type
    
    Args:
        value: Measurement value
        parameter_name: Name of the parameter
        
    Returns:
        True if value is valid
    """
    if value < 0:
        return False
    
    # Define reasonable max limits for each parameter
    max_limits = {
        'PM2.5': 1000,
        'PM10': 2000,
        'NO2': 1000,
        'SO2': 1000,
        'CO': 100,
        'O3': 500
    }
    
    max_limit = max_limits.get(parameter_name, 10000)
    return value <= max_limit


def is_within_moscow_region(latitude: float, longitude: float) -> bool:
    """
    Check if coordinates are within Moscow region boundaries
    Approximate bounding box for Moscow and Moscow Oblast
    
    Args:
        latitude: Latitude value
        longitude: Longitude value
        
    Returns:
        True if coordinates are within Moscow region
    """
    # Approximate boundaries for Moscow region
    MIN_LAT, MAX_LAT = 54.5, 56.5
    MIN_LON, MAX_LON = 35.0, 40.0
    
    return MIN_LAT <= latitude <= MAX_LAT and MIN_LON <= longitude <= MAX_LON


def validate_date_range(
    start_date: Optional[datetime],
    end_date: Optional[datetime]
) -> Tuple[bool, Optional[str]]:
    """
    Validate date range for queries
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not start_date and not end_date:
        return True, None
    
    if start_date and end_date:
        if start_date > end_date:
            return False, "Start date must be before end date"
        
        # Check if range is reasonable (not more than 1 year)
        days_diff = (end_date - start_date).days
        if days_diff > 365:
            return False, "Date range cannot exceed 365 days"
    
    if start_date:
        if start_date > datetime.utcnow():
            return False, "Start date cannot be in the future"
    
    if end_date:
        if end_date > datetime.utcnow():
            return False, "End date cannot be in the future"
    
    return True, None


def sanitize_search_term(term: str) -> str:
    """
    Sanitize user input for search queries
    
    Args:
        term: Search term
        
    Returns:
        Sanitized search term
    """
    if not term:
        return ""
    
    # Remove potentially dangerous characters
    dangerous_chars = ['%', '_', ';', '--', '/*', '*/', 'xp_', 'sp_']
    sanitized = term.strip()
    
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    
    return sanitized[:100]  # Limit length


def calculate_aqi_level(value: float, safe_limit: Optional[float]) -> str:
    """
    Calculate Air Quality Index level based on value and safe limit
    
    Args:
        value: Measured value
        safe_limit: Safe limit for the parameter
        
    Returns:
        AQI level: "Хорошо", "Умеренно", "Нездорово", "Опасно"
    """
    if not safe_limit:
        return "Неизвестно"
    
    ratio = value / safe_limit
    
    if ratio <= 0.5:
        return "Хорошо"
    elif ratio <= 1.0:
        return "Умеренно"
    elif ratio <= 2.0:
        return "Нездорово"
    else:
        return "Опасно"
