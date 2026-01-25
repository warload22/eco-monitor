"""
Data models for EcoMonitor application
Defines the database schema and data structures
"""
from typing import Optional
from datetime import datetime


class Parameter:
    """Environmental parameter (e.g., PM2.5, NO2, CO2)"""
    
    def __init__(
        self,
        id: int,
        name: str,
        unit: str,
        description: Optional[str] = None,
        safe_limit: Optional[float] = None
    ):
        self.id = id
        self.name = name
        self.unit = unit
        self.description = description
        self.safe_limit = safe_limit


class Location:
    """Monitoring station location"""
    
    def __init__(
        self,
        id: int,
        name: str,
        latitude: float,
        longitude: float,
        address: Optional[str] = None,
        district: Optional[str] = None,
        is_active: bool = True
    ):
        self.id = id
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.address = address
        self.district = district
        self.is_active = is_active


class Measurement:
    """Environmental measurement record"""
    
    def __init__(
        self,
        id: int,
        location_id: int,
        parameter_id: int,
        value: float,
        measured_at: datetime,
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.location_id = location_id
        self.parameter_id = parameter_id
        self.value = value
        self.measured_at = measured_at
        self.created_at = created_at or datetime.utcnow()


# SQL schema for database initialization
SQL_SCHEMA = """
-- Parameters table
CREATE TABLE IF NOT EXISTS parameters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    safe_limit DECIMAL(10, 3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    address TEXT,
    district VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_coordinates UNIQUE (latitude, longitude)
);

-- Measurements table
CREATE TABLE IF NOT EXISTS measurements (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    parameter_id INTEGER NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    value DECIMAL(10, 3) NOT NULL,
    measured_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_value CHECK (value >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_measurements_location ON measurements(location_id);
CREATE INDEX IF NOT EXISTS idx_measurements_parameter ON measurements(parameter_id);
CREATE INDEX IF NOT EXISTS idx_measurements_measured_at ON measurements(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active) WHERE is_active = TRUE;

-- Sample data for Moscow region parameters
INSERT INTO parameters (name, unit, description, safe_limit) VALUES
    ('PM2.5', 'мкг/м³', 'Твердые частицы размером 2.5 микрон', 35.0),
    ('PM10', 'мкг/м³', 'Твердые частицы размером 10 микрон', 50.0),
    ('NO2', 'мкг/м³', 'Диоксид азота', 40.0),
    ('SO2', 'мкг/м³', 'Диоксид серы', 20.0),
    ('CO', 'мг/м³', 'Угарный газ', 5.0),
    ('O3', 'мкг/м³', 'Озон', 120.0)
ON CONFLICT (name) DO NOTHING;
"""
