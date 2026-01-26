"""
API-блюпринт для работы с погодными данными
Предоставляет эндпоинты для визуализации погодных слоев (тепловая карта, векторы ветра)
"""
from flask import Blueprint, jsonify, request, current_app
from typing import Dict, Any, List
import math

bp = Blueprint('weather', __name__)


def генерировать_тестовую_сетку_температуры(
    min_lat: float,
    max_lat: float,
    min_lon: float,
    max_lon: float,
    grid_size: int = 20
) -> List[Dict[str, Any]]:
    """
    Генерирует тестовую сетку температур с градиентом
    
    Args:
        min_lat: Минимальная широта
        max_lat: Максимальная широта
        min_lon: Минимальная долгота
        max_lon: Максимальная долгота
        grid_size: Размер сетки (количество точек по каждой оси)
        
    Returns:
        Список точек с координатами и значением температуры
    """
    точки = []
    
    # Шаги по широте и долготе
    lat_step = (max_lat - min_lat) / grid_size
    lon_step = (max_lon - min_lon) / grid_size
    
    # Генерируем сетку с градиентом температуры
    # Температура снижается с юго-запада на северо-восток
    for i in range(grid_size + 1):
        for j in range(grid_size + 1):
            lat = min_lat + i * lat_step
            lon = min_lon + j * lon_step
            
            # Создаем градиент: базовая температура + вариация
            # Используем нормализованные координаты (0..1)
            norm_lat = i / grid_size
            norm_lon = j / grid_size
            
            # Температура уменьшается при движении на север и восток
            base_temp = 20  # Базовая температура 20°C
            gradient = -10 * (norm_lat + norm_lon) / 2  # Градиент от -5 до 0
            
            # Добавляем небольшие "волны" для реалистичности
            wave = 3 * math.sin(norm_lat * math.pi * 2) * math.cos(norm_lon * math.pi * 2)
            
            temperature = base_temp + gradient + wave
            
            точки.append({
                'lat': round(lat, 5),
                'lon': round(lon, 5),
                'value': round(temperature, 2)
            })
    
    return точки


def генерировать_тестовые_векторы_ветра(
    min_lat: float,
    max_lat: float,
    min_lon: float,
    max_lon: float,
    grid_size: int = 10
) -> List[Dict[str, Any]]:
    """
    Генерирует тестовые векторы ветра
    
    Args:
        min_lat: Минимальная широта
        max_lat: Максимальная широта
        min_lon: Минимальная долгота
        max_lon: Максимальная долгота
        grid_size: Размер сетки (количество векторов по каждой оси)
        
    Returns:
        Список векторов с координатами, скоростью и направлением
    """
    векторы = []
    
    lat_step = (max_lat - min_lat) / grid_size
    lon_step = (max_lon - min_lon) / grid_size
    
    for i in range(grid_size + 1):
        for j in range(grid_size + 1):
            lat = min_lat + i * lat_step
            lon = min_lon + j * lon_step
            
            # Нормализованные координаты
            norm_lat = i / grid_size
            norm_lon = j / grid_size
            
            # Создаем вращательное поле ветра (имитация циклона)
            center_lat = 0.5
            center_lon = 0.5
            
            # Вектор от центра
            dx = norm_lon - center_lon
            dy = norm_lat - center_lat
            
            # Расстояние от центра
            distance = math.sqrt(dx**2 + dy**2)
            
            if distance < 0.01:
                # В центре штиль
                speed = 0
                direction = 0
            else:
                # Тангенциальное направление (вращение против часовой стрелки)
                direction = math.degrees(math.atan2(-dx, dy)) % 360
                
                # Скорость увеличивается с расстоянием, но затухает на периферии
                speed = 15 * distance * (1 - distance) * 2
            
            векторы.append({
                'lat': round(lat, 5),
                'lon': round(lon, 5),
                'speed': round(speed, 2),  # м/с
                'direction': round(direction, 1)  # градусы (0 = север)
            })
    
    return векторы


@bp.route('/map-grid', methods=['GET'])
def получить_сетку_температуры():
    """
    Получить сетку температур для тепловой карты из реальных данных
    
    Параметры запроса:
        parameter: Параметр (например, 'temperature', 'humidity')
        min_lat: Минимальная широта (по умолчанию для Москвы)
        max_lat: Максимальная широта
        min_lon: Минимальная долгота
        max_lon: Максимальная долгота
        grid_size: Размер сетки (по умолчанию 20)
    
    Returns:
        JSON с массивом точек сетки
    """
    try:
        from database import get_db
        
        # Параметры по умолчанию для Московского региона
        параметр = request.args.get('parameter', 'temperature')
        min_lat = float(request.args.get('min_lat', 55.55))
        max_lat = float(request.args.get('max_lat', 55.95))
        min_lon = float(request.args.get('min_lon', 37.35))
        max_lon = float(request.args.get('max_lon', 37.85))
        grid_size = int(request.args.get('grid_size', 20))
        
        # Валидация
        if grid_size < 5 or grid_size > 50:
            return jsonify({'error': 'Размер сетки должен быть от 5 до 50'}), 400
        
        # Получаем реальные данные из БД
        conn = get_db()
        cursor = conn.cursor()
        
        # Запрос последних измерений температуры в заданной области
        query = """
            SELECT DISTINCT ON (l.id)
                l.latitude, 
                l.longitude, 
                m.value,
                p.unit
            FROM measurements m
            JOIN parameters p ON m.parameter_id = p.id
            JOIN locations l ON m.location_id = l.id
            WHERE p.name = %s
                AND l.latitude BETWEEN %s AND %s
                AND l.longitude BETWEEN %s AND %s
            ORDER BY l.id, m.measured_at DESC
        """
        
        cursor.execute(query, (параметр, min_lat, max_lat, min_lon, max_lon))
        результаты = cursor.fetchall()
        cursor.close()
        
        # Формируем точки для ответа
        точки = []
        единица = '°C'
        
        # ИСПРАВЛЕНО: cursor возвращает словари (dict_row), а не кортежи!
        for row in результаты:
            точки.append({
                'lat': float(row['latitude']),
                'lon': float(row['longitude']),
                'value': float(row['value'])
            })
            if row['unit']:
                единица = row['unit']
        
        # Если данных нет, возвращаем пустой массив
        if not точки:
            return jsonify({
                'parameter': параметр,
                'parameter_ru': 'Температура воздуха',
                'unit': единица,
                'bounds': {
                    'min_lat': min_lat,
                    'max_lat': max_lat,
                    'min_lon': min_lon,
                    'max_lon': max_lon
                },
                'grid_size': grid_size,
                'data': [],
                'count': 0,
                'note': 'Нет данных в заданной области'
            }), 200
        
        return jsonify({
            'parameter': параметр,
            'parameter_ru': 'Температура воздуха',
            'unit': единица,
            'bounds': {
                'min_lat': min_lat,
                'max_lat': max_lat,
                'min_lon': min_lon,
                'max_lon': max_lon
            },
            'grid_size': grid_size,
            'data': точки,
            'count': len(точки),
            'note': 'Реальные данные из Open-Meteo API'
        }), 200
    
    except ValueError as e:
        return jsonify({'error': f'Некорректные параметры: {str(e)}'}), 400
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении сетки температуры: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500


@bp.route('/wind-vectors', methods=['GET'])
def получить_векторы_ветра():
    """
    Получить векторное поле ветра из реальных данных
    
    Параметры запроса:
        min_lat: Минимальная широта (по умолчанию для Москвы)
        max_lat: Максимальная широта
        min_lon: Минимальная долгота
        max_lon: Максимальная долгота
        grid_size: Размер сетки (по умолчанию 10)
    
    Returns:
        JSON с массивом векторов ветра
    """
    try:
        from database import get_db
        
        # Параметры по умолчанию для Московского региона
        min_lat = float(request.args.get('min_lat', 55.55))
        max_lat = float(request.args.get('max_lat', 55.95))
        min_lon = float(request.args.get('min_lon', 37.35))
        max_lon = float(request.args.get('max_lon', 37.85))
        grid_size = int(request.args.get('grid_size', 10))
        
        # Валидация
        if grid_size < 5 or grid_size > 30:
            return jsonify({'error': 'Размер сетки должен быть от 5 до 30'}), 400
        
        # Получаем реальные данные из БД
        conn = get_db()
        cursor = conn.cursor()
        
        # Запрос последних измерений скорости и направления ветра
        query = """
            WITH latest_measurements AS (
                SELECT DISTINCT ON (l.id, p.name)
                    l.id as location_id,
                    l.latitude, 
                    l.longitude,
                    p.name as parameter_name,
                    m.value,
                    m.measured_at
                FROM measurements m
                JOIN parameters p ON m.parameter_id = p.id
                JOIN locations l ON m.location_id = l.id
                WHERE p.name IN ('wind_speed', 'wind_direction')
                    AND l.latitude BETWEEN %s AND %s
                    AND l.longitude BETWEEN %s AND %s
                ORDER BY l.id, p.name, m.measured_at DESC
            )
            SELECT 
                location_id,
                latitude,
                longitude,
                MAX(CASE WHEN parameter_name = 'wind_speed' THEN value END) as speed,
                MAX(CASE WHEN parameter_name = 'wind_direction' THEN value END) as direction
            FROM latest_measurements
            GROUP BY location_id, latitude, longitude
            HAVING MAX(CASE WHEN parameter_name = 'wind_speed' THEN value END) IS NOT NULL
                AND MAX(CASE WHEN parameter_name = 'wind_direction' THEN value END) IS NOT NULL
        """
        
        cursor.execute(query, (min_lat, max_lat, min_lon, max_lon))
        результаты = cursor.fetchall()
        cursor.close()
        
        # Формируем векторы для ответа
        векторы = []
        
        # ИСПРАВЛЕНО: cursor возвращает словари (dict_row), а не кортежи!
        for row in результаты:
            векторы.append({
                'lat': float(row['latitude']),
                'lon': float(row['longitude']),
                'speed': float(row['speed']),
                'direction': float(row['direction'])
            })
        
        # Если данных нет, возвращаем пустой массив
        if not векторы:
            return jsonify({
                'parameter': 'wind',
                'parameter_ru': 'Ветер',
                'speed_unit': 'м/с',
                'direction_unit': 'градусы',
                'bounds': {
                    'min_lat': min_lat,
                    'max_lat': max_lat,
                    'min_lon': min_lon,
                    'max_lon': max_lon
                },
                'grid_size': grid_size,
                'data': [],
                'count': 0,
                'note': 'Нет данных в заданной области'
            }), 200
        
        return jsonify({
            'parameter': 'wind',
            'parameter_ru': 'Ветер',
            'speed_unit': 'м/с',
            'direction_unit': 'градусы',
            'bounds': {
                'min_lat': min_lat,
                'max_lat': max_lat,
                'min_lon': min_lon,
                'max_lon': max_lon
            },
            'grid_size': grid_size,
            'data': векторы,
            'count': len(векторы),
            'note': 'Реальные данные из Open-Meteo API'
        }), 200
    
    except ValueError as e:
        return jsonify({'error': f'Некорректные параметры: {str(e)}'}), 400
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении векторов ветра: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500


@bp.route('/current', methods=['GET'])
def получить_текущую_погоду():
    """
    Получить текущие погодные данные для всех активных локаций Москвы
    
    Сначала пытается получить реальные данные из БД.
    Если данных нет - генерирует тестовые для демонстрации.
    
    Returns:
        JSON с массивом точек погодных данных
    """
    try:
        from database import get_db
        from datetime import datetime, timedelta
        import random
        
        данные = []
        используется_реальные_данные = False
        
        # Пробуем получить реальные данные из БД
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            # Получаем последние измерения температуры и ветра для каждой локации
            query = """
                WITH latest_weather AS (
                    SELECT DISTINCT ON (l.id, p.name)
                        l.id as location_id,
                        l.name as location_name,
                        l.latitude,
                        l.longitude,
                        l.district,
                        p.name as parameter_name,
                        m.value,
                        m.measured_at
                    FROM measurements m
                    JOIN locations l ON m.location_id = l.id
                    JOIN parameters p ON m.parameter_id = p.id
                    WHERE l.is_active = TRUE
                        AND p.name IN ('temperature', 'wind_speed', 'wind_direction')
                        AND m.measured_at > NOW() - INTERVAL '24 hours'
                    ORDER BY l.id, p.name, m.measured_at DESC
                )
                SELECT 
                    location_id,
                    location_name,
                    latitude,
                    longitude,
                    district,
                    MAX(CASE WHEN parameter_name = 'temperature' THEN value END) as temperature,
                    MAX(CASE WHEN parameter_name = 'wind_speed' THEN value END) as wind_speed,
                    MAX(CASE WHEN parameter_name = 'wind_direction' THEN value END) as wind_direction,
                    MAX(measured_at) as timestamp
                FROM latest_weather
                GROUP BY location_id, location_name, latitude, longitude, district
                HAVING MAX(CASE WHEN parameter_name = 'temperature' THEN value END) IS NOT NULL
            """
            
            cursor.execute(query)
            результаты = cursor.fetchall()
            cursor.close()
            
            for row in результаты:
                данные.append({
                    'name': row['location_name'],
                    'district': row['district'],
                    'lat': float(row['latitude']),
                    'lon': float(row['longitude']),
                    'temperature': float(row['temperature']) if row['temperature'] else None,
                    'wind_speed': float(row['wind_speed']) if row['wind_speed'] else 3.0,
                    'wind_direction': float(row['wind_direction']) if row['wind_direction'] else 270.0,
                    'timestamp': row['timestamp'].isoformat() + 'Z' if row['timestamp'] else None
                })
            
            if len(данные) >= 1:
                используется_реальные_данные = True
                current_app.logger.info(f"Загружено {len(данные)} точек реальных погодных данных")
                
        except Exception as db_error:
            current_app.logger.warning(f"Не удалось получить данные из БД: {db_error}")
        
        # Если реальных данных нет - генерируем тестовые
        if not используется_реальные_данные:
            current_app.logger.info("Используются тестовые данные погоды")
            
            # Базовая температура (зима - январь)
            base_temp = 1.0
            base_wind_direction = 265  # Западный ветер
            base_wind_speed = 4.0
            
            # 10 точек по Москве
            точки_москвы = [
                {'name': 'Центр (Кремль)', 'district': 'Центральный', 'lat': 55.7520, 'lon': 37.6175, 'offset': 0.5},
                {'name': 'ВДНХ', 'district': 'Северо-Восточный', 'lat': 55.8284, 'lon': 37.6385, 'offset': -1.2},
                {'name': 'Царицыно', 'district': 'Южный', 'lat': 55.6194, 'lon': 37.6862, 'offset': 0.8},
                {'name': 'Крылатское', 'district': 'Западный', 'lat': 55.7579, 'lon': 37.4087, 'offset': -0.3},
                {'name': 'Измайлово', 'district': 'Восточный', 'lat': 55.7887, 'lon': 37.7948, 'offset': -0.8},
                {'name': 'Строгино', 'district': 'Северо-Западный', 'lat': 55.8045, 'lon': 37.4024, 'offset': -1.5},
                {'name': 'Медведково', 'district': 'Северо-Восточный', 'lat': 55.8815, 'lon': 37.6590, 'offset': -1.8},
                {'name': 'Тёплый Стан', 'district': 'Юго-Западный', 'lat': 55.6180, 'lon': 37.5030, 'offset': 0.3},
                {'name': 'Марьино', 'district': 'Юго-Восточный', 'lat': 55.6500, 'lon': 37.7440, 'offset': 0.6},
                {'name': 'Внуково', 'district': 'Западный', 'lat': 55.5910, 'lon': 37.2615, 'offset': -2.0},
            ]
            
            timestamp = datetime.utcnow().isoformat() + 'Z'
            
            for точка in точки_москвы:
                temperature = round(base_temp + точка['offset'] + random.uniform(-0.5, 0.5), 1)
                wind_speed = round(max(0.5, base_wind_speed + random.uniform(-1.5, 1.5)), 1)
                wind_direction = round((base_wind_direction + random.uniform(-25, 25)) % 360)
                
                данные.append({
                    'name': точка['name'],
                    'district': точка['district'],
                    'lat': точка['lat'],
                    'lon': точка['lon'],
                    'temperature': temperature,
                    'wind_speed': wind_speed,
                    'wind_direction': wind_direction,
                    'timestamp': timestamp
                })
        
        return jsonify({
            'count': len(данные),
            'data': данные,
            'units': {
                'temperature': '°C',
                'wind_speed': 'м/с',
                'wind_direction': 'градусы'
            },
            'source': 'database' if используется_реальные_данные else 'demo',
            'note': 'Реальные данные из БД' if используется_реальные_данные else 'Демонстрационные данные для 10 точек Москвы'
        }), 200
    
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении текущей погоды: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500
