"""
Блюпринт для формирования аналитических отчетов
Предоставляет API-эндпоинты и страницу для работы с отчетами
"""
from flask import Blueprint, jsonify, request, render_template, current_app
from pydantic import ValidationError, BaseModel, Field
from typing import Optional
from datetime import datetime
from utils.measurements_logic import (
    получить_статистику_по_параметру,
    получить_сырые_данные_для_отчета,
    получить_все_параметры
)

bp = Blueprint('reports', __name__)


class ПараметрыОтчета(BaseModel):
    """Схема валидации параметров для формирования отчета"""
    parameter_id: int = Field(..., gt=0, description="ID параметра")
    date_from: Optional[datetime] = Field(None, description="Начальная дата периода")
    date_to: Optional[datetime] = Field(None, description="Конечная дата периода")
    
    @classmethod
    def проверить_диапазон_дат(cls, date_from: Optional[datetime], date_to: Optional[datetime]):
        """Проверка корректности диапазона дат"""
        if date_from and date_to and date_to < date_from:
            raise ValueError('Конечная дата должна быть позже начальной')


@bp.route('/')
def index():
    """
    Отобразить страницу формирования отчетов
    
    Returns:
        HTML-страница с формой и контейнерами для отчета
    """
    return render_template('report.html')


@bp.route('/api/summary', methods=['GET'])
def получить_сводную_статистику():
    """
    Получить агрегированную статистику по параметру за период
    
    Query параметры:
        parameter_id: ID параметра (обязательный)
        date_from: Начальная дата в ISO формате (опционально)
        date_to: Конечная дата в ISO формате (опционально)
    
    Returns:
        JSON с агрегированной статистикой:
        {
            "parameter": "PM2.5",
            "unit": "мкг/м³",
            "safe_limit": 35.0,
            "period": {
                "date_from": "2026-01-01T00:00:00",
                "date_to": "2026-01-26T00:00:00"
            },
            "stats": {
                "count": 150,
                "avg": 15.2,
                "max": 42.1,
                "min": 5.5,
                "std_dev": 8.3
            }
        }
    """
    # Получаем параметры запроса
    parameter_id_str = request.args.get('parameter_id')
    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')
    
    # Проверка обязательного параметра
    if not parameter_id_str:
        return jsonify({
            'error': 'Отсутствует обязательный параметр parameter_id'
        }), 400
    
    try:
        # Преобразуем параметры
        parameter_id = int(parameter_id_str)
        date_from = datetime.fromisoformat(date_from_str) if date_from_str else None
        date_to = datetime.fromisoformat(date_to_str) if date_to_str else None
        
        # Валидируем через Pydantic
        параметры = ПараметрыОтчета(
            parameter_id=parameter_id,
            date_from=date_from,
            date_to=date_to
        )
        
        # Проверяем диапазон дат
        ПараметрыОтчета.проверить_диапазон_дат(date_from, date_to)
        
    except ValueError as e:
        return jsonify({
            'error': 'Некорректные параметры запроса',
            'details': str(e)
        }), 400
    except ValidationError as e:
        return jsonify({
            'error': 'Некорректные параметры запроса',
            'details': e.errors()
        }), 400
    
    try:
        # Получаем статистику через бизнес-логику
        статистика = получить_статистику_по_параметру(
            parameter_id=параметры.parameter_id,
            date_from=параметры.date_from,
            date_to=параметры.date_to
        )
        
        if not статистика:
            return jsonify({
                'error': 'Нет данных для указанного параметра и периода'
            }), 404
        
        return jsonify(статистика), 200
    
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении статистики: {e}")
        return jsonify({
            'error': 'Ошибка при формировании статистики'
        }), 500


@bp.route('/api/raw_data', methods=['GET'])
def получить_сырые_данные():
    """
    Получить сырые данные измерений для таблицы и экспорта
    
    Query параметры:
        parameter_id: ID параметра (обязательный)
        date_from: Начальная дата в ISO формате (опционально)
        date_to: Конечная дата в ISO формате (опционально)
        limit: Максимальное количество записей (по умолчанию 1000)
    
    Returns:
        JSON-массив с измерениями:
        [
            {
                "id": 1,
                "measured_at": "2026-01-26T10:30:00",
                "value": 15.2,
                "location_name": "Станция Красногорск",
                "latitude": 55.8215,
                "longitude": 37.3297,
                "district": "Красногорск",
                "parameter_name": "PM2.5",
                "unit": "мкг/м³",
                "is_safe": true
            },
            ...
        ]
    """
    # Получаем параметры запроса
    parameter_id_str = request.args.get('parameter_id')
    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')
    limit_str = request.args.get('limit', '1000')
    
    # Проверка обязательного параметра
    if not parameter_id_str:
        return jsonify({
            'error': 'Отсутствует обязательный параметр parameter_id'
        }), 400
    
    try:
        # Преобразуем параметры
        parameter_id = int(parameter_id_str)
        date_from = datetime.fromisoformat(date_from_str) if date_from_str else None
        date_to = datetime.fromisoformat(date_to_str) if date_to_str else None
        limit = min(int(limit_str), 10000)  # Ограничиваем максимум 10000 записей
        
        # Валидируем через Pydantic
        параметры = ПараметрыОтчета(
            parameter_id=parameter_id,
            date_from=date_from,
            date_to=date_to
        )
        
        # Проверяем диапазон дат
        ПараметрыОтчета.проверить_диапазон_дат(date_from, date_to)
        
    except ValueError as e:
        return jsonify({
            'error': 'Некорректные параметры запроса',
            'details': str(e)
        }), 400
    except ValidationError as e:
        return jsonify({
            'error': 'Некорректные параметры запроса',
            'details': e.errors()
        }), 400
    
    try:
        # Получаем сырые данные через бизнес-логику
        данные = получить_сырые_данные_для_отчета(
            parameter_id=параметры.parameter_id,
            date_from=параметры.date_from,
            date_to=параметры.date_to,
            limit=limit
        )
        
        return jsonify(данные), 200
    
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении сырых данных: {e}")
        return jsonify({
            'error': 'Ошибка при получении данных'
        }), 500
