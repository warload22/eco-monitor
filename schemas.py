"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class ParameterSchema(BaseModel):
    """Schema for environmental parameter"""
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    unit: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None
    safe_limit: Optional[float] = Field(None, ge=0)
    
    class Config:
        from_attributes = True


class LocationSchema(BaseModel):
    """Schema for monitoring location"""
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=200)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    district: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    
    class Config:
        from_attributes = True


class MeasurementSchema(BaseModel):
    """Schema for measurement record"""
    id: Optional[int] = None
    location_id: int = Field(..., gt=0)
    parameter_id: int = Field(..., gt=0)
    value: float = Field(..., ge=0)
    measured_at: datetime
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MeasurementCreateSchema(BaseModel):
    """Schema for creating new measurement"""
    location_id: int = Field(..., gt=0)
    parameter_id: int = Field(..., gt=0)
    value: float = Field(..., ge=0)
    measured_at: Optional[datetime] = None
    
    @field_validator('measured_at', mode='before')
    @classmethod
    def set_default_measured_at(cls, v):
        """Set current time if measured_at not provided"""
        return v or datetime.utcnow()


class MeasurementFilterSchema(BaseModel):
    """Schema for filtering measurements"""
    location_id: Optional[int] = Field(None, gt=0)
    parameter_id: Optional[int] = Field(None, gt=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(100, gt=0, le=1000)
    offset: int = Field(0, ge=0)
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, info):
        """Ensure end_date is after start_date"""
        if v and info.data.get('start_date') and v < info.data['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class GeoJsonFeatureSchema(BaseModel):
    """Schema for GeoJSON feature response"""
    type: str = "Feature"
    geometry: dict
    properties: dict


class ApiResponseSchema(BaseModel):
    """Generic API response schema"""
    success: bool = True
    data: Optional[dict | list] = None
    error: Optional[str] = None
    message: Optional[str] = None
