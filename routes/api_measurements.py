"""
API-блюпринт для работы с данными измерений
Предоставляет JSON-эндпоинты для взаимодействия с фронтендом
"""
from flask import Blueprint, jsonify, request, current_app
from pydantic import ValidationError
from schemas import (
    MeasurementCreate,
    MeasurementOut,
    MeasurementFilterParams,
    ParameterOut
)
from utils.measurements_logic import (
    создать_измерение,
    получить_измерения_с_фильтрами,
    получить_все_параметры,
    преобразовать_в_geojson
)
from typing import Dict, Any

bp = Blueprint('api_measurements', __name__)


@bp.route('/measurements', methods=['GET'])
def получить_измерения():
    """
    Получить измерения с опциональными фильтрами
    Возвращает данные в формате GeoJSON для OpenLayers
    
    Параметры запроса:
        parameter_id: Фильтр по ID параметра
        location_id: Фильтр по ID локации (станции мониторинга)
        date_from: Фильтр по начальной дате (ISO формат)
        date_to: Фильтр по конечной дате (ISO формат)
        limit: Максимум результатов (по умолчанию 100, макс 1000)
        offset: Смещение для пагинации (по умолчанию 0)
    
    Returns:
        JSON-ответ с GeoJSON FeatureCollection
    """
    # Защита от пустых параметров: если передан пустой параметр, игнорируем его
    try:
        параметры_фильтра = MeasurementFilterParams(
            parameter_id=request.args.get('parameter_id') or None,
            location_id=request.args.get('location_id') or None,
            date_from=request.args.get('date_from') or None,
            date_to=request.args.get('date_to') or None,
            limit=request.args.get('limit', 100),
            offset=request.args.get('offset', 0)
        )
    except ValidationError as e:
        return jsonify({
            'error': 'Некорректные параметры запроса',
            'details': e.errors()
        }), 400
    
    try:
        # Получаем измерения из БД через бизнес-логику
        измерения = получить_измерения_с_фильтрами(
            parameter_id=параметры_фильтра.parameter_id,
            location_id=параметры_фильтра.location_id,
            date_from=параметры_фильтра.date_from,
            date_to=параметры_фильтра.date_to,
            limit=параметры_фильтра.limit,
            offset=параметры_фильтра.offset
        )
        
        # Преобразуем в GeoJSON
        geojson = преобразовать_в_geojson(измерения)
        
        return jsonify(geojson), 200
    
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении измерений: {e}")
        return jsonify({'error': 'Ошибка базы данных'}), 500


@bp.route('/measurements', methods=['POST'])
def создать_новое_измерение():
    """
    Создать новую запись измерения
    
    Тело запроса:
        JSON с полями: parameter_id, value, latitude, longitude
        Поле timestamp проставляется автоматически сервером
    
    Returns:
        JSON-ответ с данными созданного измерения и статусом 201
    """
    if not request.is_json:
        return jsonify({'error': 'Content-Type должен быть application/json'}), 400
    
    try:
        # Валидируем данные запроса через Pydantic
        данные_измерения = MeasurementCreate(**request.get_json())
    except ValidationError as e:
        return jsonify({
            'error': 'Некорректные данные',
            'details': e.errors()
        }), 400
    
    try:
        # Создаем измерение через бизнес-логику
        результат = создать_измерение(
            parameter_id=данные_измерения.parameter_id,
            value=данные_измерения.value,
            latitude=данные_измерения.latitude,
            longitude=данные_измерения.longitude,
            source_id=данные_измерения.source_id,
            extra_data=данные_измерения.extra_data
        )
        
        return jsonify({
            'success': True,
            'data': результат,
            'message': 'Измерение успешно создано'
        }), 201
    
    except Exception as e:
        current_app.logger.error(f"Ошибка при создании измерения: {e}")
        return jsonify({'error': 'Не удалось создать измерение'}), 500


@bp.route('/parameters', methods=['GET'])
def получить_параметры():
    """
    Получить список всех параметров экологического мониторинга
    Используется для заполнения выпадающего списка на фронтенде
    
    Returns:
        JSON-массив с параметрами (id, name, unit)
    """
    try:
        параметры = получить_все_параметры()
        return jsonify(параметры), 200
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении параметров: {e}")
        return jsonify({'error': 'Ошибка базы данных'}), 500


@bp.route('/locations', methods=['GET'])
def получить_локации():
    """
    Получить все активные точки мониторинга
    
    Returns:
        JSON-массив с локациями
    """
    from database import execute_query
    
    запрос = """
        SELECT id, name, latitude, longitude, address, district, is_active
        FROM locations
        WHERE is_active = TRUE
        ORDER BY name
    """
    
    try:
        результаты = execute_query(запрос)
        return jsonify(результаты or []), 200
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении локаций: {e}")
        return jsonify({'error': 'Ошибка базы данных'}), 500
