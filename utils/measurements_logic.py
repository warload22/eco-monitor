"""
Бизнес-логика для работы с измерениями
Чистые функции для работы с данными измерений экологического мониторинга
"""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from database import execute_query, get_db
import psycopg


def найти_или_создать_локацию(
    latitude: float,
    longitude: float,
    название: Optional[str] = None
) -> int:
    """
    Найти существующую локацию по координатам или создать новую
    
    Args:
        latitude: Широта
        longitude: Долгота
        название: Название локации (опционально)
        
    Returns:
        ID локации
    """
    # Округляем координаты до 5 знаков для поиска (~1 метр точности)
    lat_округлено = round(latitude, 5)
    lon_округлено = round(longitude, 5)
    
    # Проверяем, существует ли локация с такими координатами
    запрос_поиска = """
        SELECT id FROM locations
        WHERE ROUND(latitude::numeric, 5) = %s
        AND ROUND(longitude::numeric, 5) = %s
        LIMIT 1
    """
    
    существующая = execute_query(
        запрос_поиска,
        (lat_округлено, lon_округлено),
        fetch_one=True
    )
    
    if существующая:
        return существующая['id']
    
    # Создаем новую локацию
    имя_локации = название or f"Точка ({lat_округлено}, {lon_округлено})"
    
    запрос_создания = """
        INSERT INTO locations (name, latitude, longitude, is_active)
        VALUES (%s, %s, %s, TRUE)
        RETURNING id
    """
    
    результат = execute_query(
        запрос_создания,
        (имя_локации, latitude, longitude),
        fetch_one=True
    )
    
    return результат['id']


def создать_измерение(
    parameter_id: int,
    value: float,
    latitude: float,
    longitude: float
) -> Dict[str, Any]:
    """
    Создать новое измерение
    
    Args:
        parameter_id: ID параметра
        value: Значение измерения
        latitude: Широта
        longitude: Долгота
        
    Returns:
        Словарь с данными созданного измерения
    """
    # Находим или создаем локацию
    location_id = найти_или_создать_локацию(latitude, longitude)
    
    # Создаем измерение
    запрос = """
        INSERT INTO measurements (location_id, parameter_id, value, measured_at)
        VALUES (%s, %s, %s, %s)
        RETURNING id, created_at
    """
    
    текущее_время = datetime.utcnow()
    
    результат = execute_query(
        запрос,
        (location_id, parameter_id, value, текущее_время),
        fetch_one=True
    )
    
    return {
        'id': результат['id'],
        'parameter_id': parameter_id,
        'value': value,
        'latitude': latitude,
        'longitude': longitude,
        'measured_at': текущее_время,
        'created_at': результат['created_at']
    }


def получить_измерения_с_фильтрами(
    parameter_id: Optional[int] = None,
    location_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Получить список измерений с применением фильтров
    
    Args:
        parameter_id: Фильтр по ID параметра
        location_id: Фильтр по ID локации
        date_from: Фильтр по начальной дате
        date_to: Фильтр по конечной дате
        limit: Максимальное количество результатов
        offset: Смещение для пагинации
        
    Returns:
        Список словарей с данными измерений
    """
    запрос = """
        SELECT 
            m.id,
            m.parameter_id,
            m.location_id,
            m.value,
            m.measured_at,
            m.created_at,
            l.latitude,
            l.longitude,
            l.name as location_name,
            l.district,
            p.name as parameter_name,
            p.unit as parameter_unit,
            p.safe_limit
        FROM measurements m
        JOIN locations l ON m.location_id = l.id
        JOIN parameters p ON m.parameter_id = p.id
        WHERE l.is_active = TRUE
    """
    
    параметры = []
    
    if parameter_id:
        запрос += " AND m.parameter_id = %s"
        параметры.append(parameter_id)
    
    if location_id:
        запрос += " AND m.location_id = %s"
        параметры.append(location_id)
    
    if date_from:
        запрос += " AND m.measured_at >= %s"
        параметры.append(date_from)
    
    if date_to:
        запрос += " AND m.measured_at <= %s"
        параметры.append(date_to)
    
    запрос += " ORDER BY m.measured_at DESC LIMIT %s OFFSET %s"
    параметры.extend([limit, offset])
    
    результаты = execute_query(запрос, tuple(параметры))
    
    # Преобразуем результаты в нужный формат
    измерения = []
    for строка in результаты:
        измерения.append({
            'id': строка['id'],
            'parameter_id': строка['parameter_id'],
            'location_id': строка['location_id'],
            'parameter_name': строка['parameter_name'],
            'parameter_unit': строка['parameter_unit'],
            'value': float(строка['value']),
            'latitude': float(строка['latitude']),
            'longitude': float(строка['longitude']),
            'location_name': строка['location_name'],
            'district': строка.get('district'),
            'measured_at': строка['measured_at'],
            'created_at': строка['created_at'],
            'safe_limit': float(строка['safe_limit']) if строка['safe_limit'] else None
        })
    
    return измерения


def получить_все_параметры() -> List[Dict[str, Any]]:
    """
    Получить список всех доступных параметров мониторинга
    
    Returns:
        Список словарей с данными параметров
    """
    запрос = """
        SELECT id, name, unit, description, safe_limit
        FROM parameters
        ORDER BY name
    """
    
    результаты = execute_query(запрос)
    
    return [
        {
            'id': строка['id'],
            'name': строка['name'],
            'unit': строка['unit'],
            'description': строка['description'],
            'safe_limit': float(строка['safe_limit']) if строка['safe_limit'] else None
        }
        for строка in результаты
    ]


def получить_статистику_по_параметру(
    parameter_id: int,
    location_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None
) -> Optional[Dict[str, Any]]:
    """
    Получить агрегированную статистику по параметру за период
    
    Args:
        parameter_id: ID параметра
        location_id: ID станции мониторинга (опционально)
        date_from: Начальная дата периода
        date_to: Конечная дата периода
        
    Returns:
        Словарь со статистикой (avg, max, min, count) или None
    """
    запрос = """
        SELECT 
            p.name as parameter_name,
            p.unit as parameter_unit,
            p.safe_limit,
            l.name as location_name,
            COUNT(m.id) as count,
            AVG(m.value) as avg_value,
            MAX(m.value) as max_value,
            MIN(m.value) as min_value,
            STDDEV(m.value) as std_dev
        FROM measurements m
        JOIN parameters p ON m.parameter_id = p.id
        JOIN locations l ON m.location_id = l.id
        WHERE m.parameter_id = %s
        AND l.is_active = TRUE
    """
    
    параметры = [parameter_id]
    
    if location_id:
        запрос += " AND m.location_id = %s"
        параметры.append(location_id)
    
    if date_from:
        запрос += " AND m.measured_at >= %s"
        параметры.append(date_from)
    
    if date_to:
        запрос += " AND m.measured_at <= %s"
        параметры.append(date_to)
    
    запрос += " GROUP BY p.id, p.name, p.unit, p.safe_limit, l.name"
    
    результат = execute_query(запрос, tuple(параметры), fetch_one=True)
    
    if not результат or результат['count'] == 0:
        return None
    
    return {
        'parameter': результат['parameter_name'],
        'unit': результат['parameter_unit'],
        'safe_limit': float(результат['safe_limit']) if результат['safe_limit'] else None,
        'location_name': результат['location_name'] if location_id else None,
        'period': {
            'date_from': date_from.isoformat() if date_from else None,
            'date_to': date_to.isoformat() if date_to else None
        },
        'stats': {
            'count': результат['count'],
            'avg': round(float(результат['avg_value']), 2),
            'max': round(float(результат['max_value']), 2),
            'min': round(float(результат['min_value']), 2),
            'std_dev': round(float(результат['std_dev']), 2) if результат['std_dev'] else None
        }
    }


def получить_сырые_данные_для_отчета(
    parameter_id: int,
    location_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 1000
) -> List[Dict[str, Any]]:
    """
    Получить сырые данные измерений для формирования отчета
    
    Args:
        parameter_id: ID параметра
        location_id: ID станции мониторинга (опционально)
        date_from: Начальная дата периода
        date_to: Конечная дата периода
        limit: Максимальное количество записей
        
    Returns:
        Список словарей с данными измерений в табличном формате
    """
    запрос = """
        SELECT 
            m.id,
            m.measured_at,
            m.value,
            l.name as location_name,
            l.latitude,
            l.longitude,
            l.district,
            p.name as parameter_name,
            p.unit,
            p.safe_limit
        FROM measurements m
        JOIN locations l ON m.location_id = l.id
        JOIN parameters p ON m.parameter_id = p.id
        WHERE m.parameter_id = %s
        AND l.is_active = TRUE
    """
    
    параметры = [parameter_id]
    
    if location_id:
        запрос += " AND m.location_id = %s"
        параметры.append(location_id)
    
    if date_from:
        запрос += " AND m.measured_at >= %s"
        параметры.append(date_from)
    
    if date_to:
        запрос += " AND m.measured_at <= %s"
        параметры.append(date_to)
    
    запрос += " ORDER BY m.measured_at DESC LIMIT %s"
    параметры.append(limit)
    
    результаты = execute_query(запрос, tuple(параметры))
    
    данные = []
    for строка in результаты:
        значение = float(строка['value'])
        безопасно = (
            значение <= float(строка['safe_limit'])
            if строка['safe_limit'] is not None
            else True
        )
        
        данные.append({
            'id': строка['id'],
            'measured_at': строка['measured_at'].isoformat(),
            'value': значение,
            'location_name': строка['location_name'],
            'latitude': float(строка['latitude']),
            'longitude': float(строка['longitude']),
            'district': строка.get('district'),
            'parameter_name': строка['parameter_name'],
            'unit': строка['unit'],
            'is_safe': безопасно
        })
    
    return данные


def преобразовать_в_geojson(измерения: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Преобразовать список измерений в формат GeoJSON
    
    Args:
        измерения: Список измерений
        
    Returns:
        GeoJSON FeatureCollection
    """
    features = []
    
    for изм in измерения:
        безопасно = (
            изм['value'] <= изм['safe_limit']
            if изм['safe_limit'] is not None
            else True
        )
        
        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [изм['longitude'], изм['latitude']]
            },
            'properties': {
                'id': изм['id'],
                'parameter_id': изм['parameter_id'],
                'location_id': изм['location_id'],
                'parameter_name': изм['parameter_name'],
                'unit': изм['parameter_unit'],
                'value': изм['value'],
                'location_name': изм['location_name'],
                'district': изм.get('district'),
                'safe_limit': изм['safe_limit'],
                'is_safe': безопасно,
                'measured_at': изм['measured_at'].isoformat(),
                'created_at': изм['created_at'].isoformat()
            }
        }
        features.append(feature)
    
    return {
        'type': 'FeatureCollection',
        'features': features
    }
