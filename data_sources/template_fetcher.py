"""
ШАБЛОН МОДУЛЯ СБОРЩИКА ДАННЫХ
Используйте этот файл как основу для создания новых модулей-адаптеров

Каждый модуль должен:
1. Реализовать функцию получить_данные()
2. Использовать функции из base_fetcher для HTTP запросов и сохранения данных
3. Преобразовать специфичный формат API в единый формат словаря
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from data_sources.base_fetcher import (
    выполнить_запрос,
    сохранить_измерения,
    логировать_результат,
    валидировать_координаты,
    валидировать_значение
)

logger = logging.getLogger(__name__)

# =============================================================================
# КОНФИГУРАЦИЯ
# =============================================================================

# Эти значения должны браться из config.py или переменных окружения
API_BASE_URL = "https://api.example.com/v1"
API_KEY = "your_api_key_here"  # В реальности берем из os.getenv() или config
ИСТОЧНИК_НАЗВАНИЕ = "Example Weather API"


# =============================================================================
# ГЛАВНАЯ ФУНКЦИЯ СБОРЩИКА
# =============================================================================

def получить_данные() -> Dict[str, Any]:
    """
    Основная функция для получения данных от внешнего API
    Эта функция вызывается планировщиком или вручную
    
    Returns:
        Словарь с результатами:
        {
            'получено': int,
            'сохранено': int,
            'ошибки': List[str]
        }
    """
    logger.info(f"Запуск сборщика: {ИСТОЧНИК_НАЗВАНИЕ}")
    
    # Шаг 1: Получить сырые данные от API
    сырые_данные = получить_сырые_данные_от_api()
    
    if not сырые_данные:
        logger.error("Не удалось получить данные от API")
        логировать_результат(ИСТОЧНИК_НАЗВАНИЕ, 0, 0, ["Ошибка получения данных от API"])
        return {
            'получено': 0,
            'сохранено': 0,
            'ошибки': ["Ошибка получения данных от API"]
        }
    
    # Шаг 2: Преобразовать данные в единый формат
    измерения = преобразовать_данные(сырые_данные)
    
    if not измерения:
        logger.warning("После преобразования данных получен пустой список")
        логировать_результат(ИСТОЧНИК_НАЗВАНИЕ, 0, 0, ["Нет данных после преобразования"])
        return {
            'получено': 0,
            'сохранено': 0,
            'ошибки': ["Нет данных после преобразования"]
        }
    
    # Шаг 3: Сохранить данные в БД
    сохранено, ошибки = сохранить_измерения(
        измерения,
        ИСТОЧНИК_НАЗВАНИЕ,
        API_BASE_URL
    )
    
    # Шаг 4: Залогировать результаты
    логировать_результат(
        ИСТОЧНИК_НАЗВАНИЕ,
        len(измерения),
        сохранено,
        ошибки
    )
    
    return {
        'получено': len(измерения),
        'сохранено': сохранено,
        'ошибки': ошибки
    }


# =============================================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# =============================================================================

def получить_сырые_данные_от_api() -> Optional[Dict[str, Any]]:
    """
    Выполнить запрос к внешнему API и получить сырые данные
    
    Returns:
        Словарь с ответом API или None при ошибке
    """
    # Пример: получаем данные с нескольких станций мониторинга
    endpoint = f"{API_BASE_URL}/measurements"
    
    params = {
        'api_key': API_KEY,
        'region': 'moscow',  # Параметры зависят от конкретного API
        'parameters': 'temperature,humidity,pressure'
    }
    
    headers = {
        'Accept': 'application/json',
        'User-Agent': 'EcoMonitor/1.0'
    }
    
    # Используем функцию из base_fetcher
    ответ = выполнить_запрос(
        url=endpoint,
        params=params,
        headers=headers,
        timeout=30
    )
    
    return ответ


def преобразовать_данные(сырые_данные: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Преобразовать специфичный формат API в единый формат измерений
    
    Args:
        сырые_данные: Данные от API в его специфичном формате
        
    Returns:
        Список словарей в едином формате для сохранения
    """
    измерения = []
    
    # ПРИМЕР структуры ответа API:
    # {
    #     "stations": [
    #         {
    #             "id": "station_123",
    #             "name": "Москва Центр",
    #             "lat": 55.7558,
    #             "lon": 37.6176,
    #             "measurements": [
    #                 {"param": "temperature", "value": 15.5, "unit": "°C", "time": "2024-01-26T12:00:00Z"},
    #                 {"param": "humidity", "value": 65, "unit": "%", "time": "2024-01-26T12:00:00Z"}
    #             ]
    #         }
    #     ]
    # }
    
    try:
        станции = сырые_данные.get('stations', [])
        
        for станция in станции:
            station_id = станция.get('id')
            station_name = станция.get('name')
            lat = станция.get('lat')
            lon = станция.get('lon')
            
            # Валидация координат
            if not валидировать_координаты(lat, lon):
                logger.warning(f"Пропускаем станцию {station_id} из-за невалидных координат")
                continue
            
            for measurement in станция.get('measurements', []):
                param_name = measurement.get('param')
                value = measurement.get('value')
                
                # Валидация значения
                if not валидировать_значение(value, param_name):
                    continue
                
                # Маппинг названий параметров API -> наши названия в БД
                mapped_param = маппинг_параметров(param_name)
                if not mapped_param:
                    logger.debug(f"Параметр {param_name} не поддерживается, пропускаем")
                    continue
                
                # Создаем запись в едином формате
                измерение = {
                    'parameter_name': mapped_param['name'],
                    'category': mapped_param['category'],
                    'value': float(value),
                    'unit': measurement.get('unit', ''),
                    'latitude': float(lat),
                    'longitude': float(lon),
                    'timestamp': datetime.fromisoformat(measurement.get('time', datetime.utcnow().isoformat())),
                    'external_id': station_id,
                    'station_name': station_name
                }
                
                измерения.append(измерение)
        
        logger.info(f"Преобразовано {len(измерения)} измерений из {len(станции)} станций")
        
    except Exception as e:
        logger.error(f"Ошибка при преобразовании данных: {e}")
        return []
    
    return измерения


def маппинг_параметров(api_param_name: str) -> Optional[Dict[str, str]]:
    """
    Преобразовать название параметра из API в наше внутреннее название
    
    Args:
        api_param_name: Название параметра в API
        
    Returns:
        Словарь с 'name' и 'category' или None если параметр не поддерживается
    """
    # Таблица соответствия: название в API -> наше название + категория
    маппинг = {
        'temperature': {'name': 'temperature', 'category': 'weather'},
        'temp': {'name': 'temperature', 'category': 'weather'},
        'humidity': {'name': 'humidity', 'category': 'weather'},
        'pressure': {'name': 'pressure', 'category': 'weather'},
        'pm25': {'name': 'PM2.5', 'category': 'air_quality'},
        'pm2.5': {'name': 'PM2.5', 'category': 'air_quality'},
        'pm10': {'name': 'PM10', 'category': 'air_quality'},
        'no2': {'name': 'NO2', 'category': 'air_quality'},
        'so2': {'name': 'SO2', 'category': 'air_quality'},
        'co': {'name': 'CO', 'category': 'air_quality'},
        'o3': {'name': 'O3', 'category': 'air_quality'}
    }
    
    return маппинг.get(api_param_name.lower())


# =============================================================================
# ПРИМЕР ИСПОЛЬЗОВАНИЯ
# =============================================================================

if __name__ == '__main__':
    """
    Запуск сборщика напрямую для тестирования
    """
    # Настройка логирования
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Запуск сборщика
    результат = получить_данные()
    
    print("\nРезультат работы сборщика:")
    print(f"Получено: {результат['получено']}")
    print(f"Сохранено: {результат['сохранено']}")
    print(f"Ошибок: {len(результат['ошибки'])}")
