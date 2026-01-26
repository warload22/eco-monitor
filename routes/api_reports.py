"""
API-блюпринт для отчетов (alias /api/reports)
Дублирует функционал отчетов в API-префиксе для тестирования и интеграций
"""
from flask import Blueprint
from routes import reports as reports_routes

bp = Blueprint('api_reports', __name__)


@bp.route('/summary', methods=['GET'])
def получить_сводную_статистику_api():
    """Alias для /reports/api/summary"""
    return reports_routes.получить_сводную_статистику()


@bp.route('/raw_data', methods=['GET'])
def получить_сырые_данные_api():
    """Alias для /reports/api/raw_data"""
    return reports_routes.получить_сырые_данные()
