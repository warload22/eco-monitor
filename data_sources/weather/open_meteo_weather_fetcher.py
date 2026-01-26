"""
Сборщик погодных данных из Open-Meteo Weather API
Получает актуальные метеоданные для сетки точек Московского региона (25 точек)
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from data_sources.base_fetcher import (
    выполнить_запрос,
    сохранить_измерения,
    логировать_результат,
    валидировать_координаты
)
from config import Config

logger = logging.getLogger(__name__)


# Маппинг названий параметров API -> названия в нашей БД
PARAMETER_MAPPING = {
    'temperature_2m': 'temperature',
    'relative_humidity_2m': 'humidity',
    'wind_speed_10m': 'wind_speed',
    'wind_direction_10m': 'wind_direction',
    'precipitation': 'precipitation',
    'surface_pressure': 'pressure'
}

# Маппинг единиц измерения
UNIT_MAPPING = {
    'temperature_2m': '°C',
    'relative_humidity_2m': '%',
    'wind_speed_10m': 'м/с',
    'wind_direction_10m': '°',
    'precipitation': 'мм',
    'surface_pressure': 'гПа'
}


def получить_последнее_значение(
    временной_ряд: List[Optional[float]],
    временные_метки: List[str]
) -> Tuple[Optional[float], Optional[datetime]]:
    """
    Извлечь последнее не-null значение из временного ряда
    
    Args:
        временной_ряд: Список значений (может содержать None)
        временные_метки: Список временных меток в формате ISO8601
        
    Returns:
        Кортеж (значение, временная метка) или (None, None) если данных нет
    """
    if not временной_ряд or not временные_метки:
        return None, None
    
    if len(временной_ряд) != len(временные_метки):
        logger.warning("Длина временного ряда не совпадает с длиной временных меток")
        return None, None
    
    # Ищем последнее не-null значение
    for значение, временная_метка in reversed(list(zip(временной_ряд, временные_метки))):
        if значение is not None:
            try:
                # Парсим временную метку
                dt = datetime.fromisoformat(временная_метка.replace('Z', '+00:00'))
                return значение, dt
            except (ValueError, AttributeError) as e:
                logger.warning(f"Ошибка парсинга временной метки {временная_метка}: {e}")
                continue
    
    return None, None


def нормализовать_значение(значение: float, параметр: str, db_param: str) -> float:
    """
    Нормализовать значение параметра для соответствия ограничениям БД
    
    Args:
        значение: Исходное значение
        параметр: Название параметра (из API)
        db_param: Название параметра в БД
        
    Returns:
        Нормализованное значение
    """
    исходное_значение = значение
    
    # Температура может быть отрицательной - это нормально
    if параметр == 'temperature_2m':
        pass  # Температура может быть любой
    
    # Направление ветра должно быть в диапазоне 0-360
    elif параметр == 'wind_direction_10m':
        # Если значение отрицательное, добавляем 360
        while значение < 0:
            значение += 360
        # Если значение больше 360, вычитаем 360
        while значение >= 360:
            значение -= 360
    
    # Для всех остальных параметров - не должно быть отрицательных значений
    elif значение < 0:
        logger.warning(f"Отрицательное значение для {db_param} ({параметр}): {значение}, установлено в 0")
        значение = 0
    
    if исходное_значение != значение:
        logger.debug(f"Нормализация {db_param}: {исходное_значение} -> {значение}")
    
    return значение


def распарсить_погодный_ответ_для_точки(
    hourly_data: Dict[str, Any],
    широта: float,
    долгота: float,
    название_точки: str,
    location_index: int = 0
) -> List[Dict[str, Any]]:
    """
    Преобразовать hourly данные для одной точки в наш формат
    
    Args:
        hourly_data: Данные hourly из ответа API
        широта: Широта точки
        долгота: Долгота точки  
        название_точки: Название точки для идентификации
        location_index: Индекс точки в массиве (для multi-location запросов)
        
    Returns:
        Список словарей с данными измерений
    """
    результат = []
    
    if 'time' not in hourly_data:
        logger.error("В hourly данных отсутствует ключ 'time'")
        return результат
    
    временные_метки = hourly_data['time']
    
    # Обрабатываем каждый погодный параметр
    for api_param, db_param in PARAMETER_MAPPING.items():
        if api_param not in hourly_data:
            logger.warning(f"Параметр {api_param} отсутствует в ответе API для точки {название_точки}")
            continue
        
        временной_ряд = hourly_data[api_param]
        значение, временная_метка = получить_последнее_значение(
            временной_ряд,
            временные_метки
        )
        
        if значение is None or временная_метка is None:
            logger.warning(f"Не удалось получить значение для параметра {api_param} в точке {название_точки}")
            continue
        
        # Нормализуем значение
        нормализованное_значение = нормализовать_значение(значение, api_param, db_param)
        
        # Создаем запись в нашем формате
        измерение = {
            'parameter_name': db_param,
            'category': 'погода',
            'value': нормализованное_значение,
            'unit': UNIT_MAPPING[api_param],
            'latitude': широта,
            'longitude': долгота,
            'timestamp': временная_метка,
            'external_id': f'open_meteo_{название_точки.replace(" ", "_").lower()}',
            'station_name': название_точки
        }
        
        результат.append(измерение)
    
    return результат


def распарсить_мульти_ответ(
    ответ_json: List[Dict[str, Any]],
    grid_points: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Распарсить ответ от мульти-location запроса Open-Meteo API
    
    Args:
        ответ_json: Массив ответов от API (по одному на каждую точку)
        grid_points: Список точек из конфигурации
        
    Returns:
        Список всех измерений со всех точек
    """
    все_измерения = []
    
    for idx, (ответ_точки, точка) in enumerate(zip(ответ_json, grid_points)):
        if 'hourly' not in ответ_точки:
            logger.warning(f"Нет hourly данных для точки {точка['name']}")
            continue
        
        измерения_точки = распарсить_погодный_ответ_для_точки(
            hourly_data=ответ_точки['hourly'],
            широта=точка['lat'],
            долгота=точка['lon'],
            название_точки=точка['name'],
            location_index=idx
        )
        
        все_измерения.extend(измерения_точки)
        logger.debug(f"Точка {точка['name']}: получено {len(измерения_точки)} измерений")
    
    return все_измерения


def собрать_погодные_данные() -> Dict[str, Any]:
    """
    Собрать погодные данные из Open-Meteo Weather API для сетки точек Москвы
    
    Open-Meteo поддерживает запрос нескольких координат через массивы:
    latitude=55.75,55.85,55.65&longitude=37.6,37.6,37.6
    
    Returns:
        Словарь с результатами сбора данных:
        {
            'получено': int - количество полученных параметров,
            'сохранено': int - количество сохраненных записей,
            'ошибки': List[str] - список ошибок
        }
    """
    logger.info("=" * 60)
    logger.info("Начало сбора погодных данных из Open-Meteo Weather API")
    logger.info("Режим: СЕТКА ТОЧЕК (grid mode)")
    logger.info("=" * 60)
    
    # Получаем конфигурацию
    конфиг = Config.WEATHER_CONFIG['open_meteo']
    base_url = конфиг['base_url']
    параметры_api = конфиг['params']
    timezone = конфиг['timezone']
    timeout = конфиг['timeout']
    grid_points = конфиг.get('grid_points', [])
    
    if not grid_points:
        ошибка = "Не задана сетка точек (grid_points) в конфигурации"
        logger.error(ошибка)
        return {
            'получено': 0,
            'сохранено': 0,
            'ошибки': [ошибка]
        }
    
    logger.info(f"Количество точек в сетке: {len(grid_points)}")
    
    # Валидируем все координаты
    валидные_точки = []
    for точка in grid_points:
        if валидировать_координаты(точка['lat'], точка['lon']):
            валидные_точки.append(точка)
        else:
            logger.warning(f"Невалидные координаты для точки {точка['name']}: {точка['lat']}, {точка['lon']}")
    
    if not валидные_точки:
        ошибка = "Нет валидных точек для запроса"
        logger.error(ошибка)
        return {
            'получено': 0,
            'сохранено': 0,
            'ошибки': [ошибка]
        }
    
    # Формируем параметры запроса с множественными координатами
    # Open-Meteo принимает массивы координат через запятую
    latitudes = ','.join(str(точка['lat']) for точка in валидные_точки)
    longitudes = ','.join(str(точка['lon']) for точка in валидные_точки)
    
    query_params = {
        'latitude': latitudes,
        'longitude': longitudes,
        'hourly': ','.join(параметры_api),
        'timezone': timezone
    }
    
    logger.info(f"Запрос погодных данных для {len(валидные_точки)} точек")
    logger.debug(f"Широты: {latitudes}")
    logger.debug(f"Долготы: {longitudes}")
    
    # Выполняем запрос к API
    ответ = выполнить_запрос(
        url=base_url,
        params=query_params,
        timeout=timeout
    )
    
    if not ответ:
        ошибка = "Не удалось получить ответ от Open-Meteo Weather API"
        logger.error(ошибка)
        return {
            'получено': 0,
            'сохранено': 0,
            'ошибки': [ошибка]
        }
    
    # Open-Meteo возвращает массив если несколько точек, или объект если одна
    if isinstance(ответ, list):
        # Множество точек - массив ответов
        список_измерений = распарсить_мульти_ответ(ответ, валидные_точки)
    else:
        # Одна точка - один объект (fallback для совместимости)
        if 'hourly' in ответ:
            список_измерений = распарсить_погодный_ответ_для_точки(
                hourly_data=ответ['hourly'],
                широта=валидные_точки[0]['lat'],
                долгота=валидные_точки[0]['lon'],
                название_точки=валидные_точки[0]['name']
            )
        else:
            список_измерений = []
    
    if not список_измерений:
        ошибка = "Не удалось распарсить данные из ответа API"
        logger.warning(ошибка)
        return {
            'получено': 0,
            'сохранено': 0,
            'ошибки': [ошибка]
        }
    
    # Статистика по точкам
    точек_с_данными = len(set(
        (изм['latitude'], изм['longitude']) for изм in список_измерений
    ))
    
    logger.info(f"Получено {len(список_измерений)} измерений из {точек_с_данными} точек")
    
    # Сохраняем в базу данных
    сохранено, ошибки = сохранить_измерения(
        список_измерений,
        название_источника='Open-Meteo Weather API',
        url_источника='https://open-meteo.com/en/docs'
    )
    
    # Логируем результат
    логировать_результат(
        источник='Open-Meteo Weather (Grid)',
        получено=len(список_измерений),
        сохранено=сохранено,
        ошибки=ошибки if ошибки else None
    )
    
    logger.info("=" * 60)
    logger.info(f"ИТОГО: {len(список_измерений)} измерений, {сохранено} сохранено, {len(ошибки)} ошибок")
    logger.info("=" * 60)
    
    return {
        'получено': len(список_измерений),
        'сохранено': сохранено,
        'ошибки': ошибки
    }


if __name__ == '__main__':
    # Настройка логирования для отладки
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Запуск сбора данных
    результат = собрать_погодные_данные()
    
    print("\n" + "=" * 60)
    print("РЕЗУЛЬТАТ СБОРА ПОГОДНЫХ ДАННЫХ (СЕТКА)")
    print("=" * 60)
    print(f"Получено записей: {результат['получено']}")
    print(f"Сохранено записей: {результат['сохранено']}")
    print(f"Ошибок: {len(результат['ошибки'])}")
    
    if результат['ошибки']:
        print("\nОшибки:")
        for ошибка in результат['ошибки']:
            print(f"  - {ошибка}")
    
    print("=" * 60)
