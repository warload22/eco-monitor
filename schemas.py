"""
Pydantic-схемы для валидации запросов/ответов
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class ParameterOut(BaseModel):
    """Схема для вывода параметра экологического мониторинга"""
    id: int
    name: str
    unit: str
    description: Optional[str] = None
    safe_limit: Optional[float] = None
    
    class Config:
        from_attributes = True


class MeasurementCreate(BaseModel):
    """Схема для создания нового измерения (принимает координаты напрямую)"""
    parameter_id: int = Field(..., gt=0, description="ID параметра")
    value: float = Field(..., ge=0, description="Значение измерения")
    latitude: float = Field(..., ge=-90, le=90, description="Широта")
    longitude: float = Field(..., ge=-180, le=180, description="Долгота")
    
    @field_validator('latitude', 'longitude')
    @classmethod
    def проверить_координаты(cls, v, info):
        """Проверка валидности координат"""
        field_name = info.field_name
        if field_name == 'latitude' and not (-90 <= v <= 90):
            raise ValueError('Широта должна быть в диапазоне от -90 до 90')
        if field_name == 'longitude' and not (-180 <= v <= 180):
            raise ValueError('Долгота должна быть в диапазоне от -180 до 180')
        return v


class MeasurementOut(BaseModel):
    """Схема для вывода измерения с полной информацией"""
    id: int
    parameter_id: int
    parameter_name: str  # Название параметра из связанной таблицы
    parameter_unit: str  # Единица измерения
    value: float
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    measured_at: datetime
    created_at: datetime
    safe_limit: Optional[float] = None
    
    class Config:
        from_attributes = True


class MeasurementFilterParams(BaseModel):
    """Схема для параметров фильтрации измерений"""
    parameter_id: Optional[int] = Field(None, gt=0, description="ID параметра для фильтрации")
    date_from: Optional[datetime] = Field(None, description="Начальная дата для фильтрации")
    date_to: Optional[datetime] = Field(None, description="Конечная дата для фильтрации")
    limit: int = Field(100, gt=0, le=1000, description="Максимальное количество результатов")
    offset: int = Field(0, ge=0, description="Смещение для пагинации")
    
    @field_validator('date_to')
    @classmethod
    def проверить_диапазон_дат(cls, v, info):
        """Проверка корректности диапазона дат"""
        if v and info.data.get('date_from') and v < info.data['date_from']:
            raise ValueError('Конечная дата должна быть позже начальной')
        return v


# Дополнительные схемы для совместимости с существующим кодом

class ParameterSchema(BaseModel):
    """Схема параметра (для внутреннего использования)"""
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    unit: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None
    safe_limit: Optional[float] = Field(None, ge=0)
    
    class Config:
        from_attributes = True


class LocationSchema(BaseModel):
    """Схема локации мониторинга"""
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=200)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    district: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    
    class Config:
        from_attributes = True


class GeoJsonFeatureSchema(BaseModel):
    """Схема для GeoJSON-фичи"""
    type: str = "Feature"
    geometry: dict
    properties: dict


class ApiResponseSchema(BaseModel):
    """Общая схема ответа API"""
    success: bool = True
    data: Optional[dict | list] = None
    error: Optional[str] = None
    message: Optional[str] = None
