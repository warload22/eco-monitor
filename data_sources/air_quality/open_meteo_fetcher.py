"""
Сборщик данных о качестве воздуха из Open-Meteo API
Получает данные о загрязнителях воздуха для Москвы
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
    'pm10': 'PM10',
    'pm2_5': 'PM2.5',
    'carbon_monoxide': 'CO',
    'nitrogen_dioxide': 'NO2',
    'sulphur_dioxide': 'SO2',
    'ozone': 'O3'
}

# Маппинг единиц измерения API -> наши единицы
UNIT_MAPPING = {
    'pm10': 'мкг/м³',
    'pm2_5': 'мкг/м³',
    'carbon_monoxide': 'мг/м³',  # API возвращает µg/m³, нужно конвертировать
    'nitrogen_dioxide': 'мкг/м³',
    'sulphur_dioxide': 'мкг/м³',
    'ozone': 'мкг/м³'
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


def конвертировать_единицы(значение: float, параметр: str) -> float:
    """
    Конвертировать единицы измерения из формата API в наш формат
    
    Args:
        значение: Значение параметра из API
        параметр: Название параметра (из API)
        
    Returns:
        Сконвертированное значение
    """
    # CO в API возвращается в µg/m³, нам нужно в мг/м³
    if параметр == 'carbon_monoxide':
        return значение / 1000.0  # µg/m³ -> мг/м³
    
    return значение


def распарсить_ответ(
    ответ_json: Dict[str, Any],
    широта: float,
    долгота: float
) -> List[Dict[str, Any]]:
    """
    Преобразовать JSON ответ от Open-Meteo API в наш единый формат
    
    Args:
        ответ_json: JSON ответ от API
        широта: Широта точки измерения
        долгота: Долгота точки измерения
        
    Returns:
        Список словарей с данными измерений в нашем формате
    """
    результат = []
    
    # Проверка структуры ответа
    if 'hourly' not in ответ_json:
        logger.error("В ответе API отсутствует ключ 'hourly'")
        return результат
    
    hourly_data = ответ_json['hourly']
    
    if 'time' not in hourly_data:
        logger.error("В hourly данных отсутствует ключ 'time'")
        return результат
    
    временные_метки = hourly_data['time']
    
    # Обрабатываем каждый параметр
    for api_param, db_param in PARAMETER_MAPPING.items():
        if api_param not in hourly_data:
            logger.warning(f"Параметр {api_param} отсутствует в ответе API")
            continue
        
        временной_ряд = hourly_data[api_param]
        значение, временная_метка = получить_последнее_значение(
            временной_ряд,
            временные_метки
        )
        
        if значение is None or временная_метка is None:
            logger.warning(f"Не удалось получить значение для параметра {api_param}")
            continue
        
        # Конвертируем единицы если необходимо
        сконвертированное_значение = конвертировать_единицы(значение, api_param)
        
        # Создаем запись в нашем формате
        измерение = {
            'parameter_name': db_param,
            'category': 'качество_воздуха',
            'value': сконвертированное_значение,
            'unit': UNIT_MAPPING[api_param],
            'latitude': широта,
            'longitude': долгота,
            'timestamp': временная_метка,
            'external_id': 'open_meteo_moscow'
        }
        
        результат.append(измерение)
        logger.debug(
            f"Добавлено измерение: {db_param} = {сконвертированное_значение:.2f} "
            f"{UNIT_MAPPING[api_param]} на {временная_метка}"
        )
    
    return результат


def собрать_данные_о_качестве_воздуха() -> Dict[str, Any]:
    """
    Собрать данные о качестве воздуха из Open-Meteo API для Москвы
    
    Returns:
        Словарь с результатами сбора данных:
        {
            'получено': int - количество полученных параметров,
            'сохранено': int - количество сохраненных записей,
            'ошибки': List[str] - список ошибок
        }
    """
    logger.info("Начало сбора данных о качестве воздуха из Open-Meteo API")
    
    # Получаем конфигурацию
    конфиг = Config.AIR_QUALITY_CONFIG['open_meteo']
    base_url = конфиг['base_url']
    широта = конфиг['latitude']
    долгота = конфиг['longitude']
    параметры_api = конфиг['params']
    timeout = конфиг['timeout']
    
    # Валидация координат
    if not валидировать_координаты(широта, долгота):
        ошибка = f"Невалидные координаты: {широта}, {долгота}"
        logger.error(ошибка)
        return {
            'получено': 0,
            'сохранено': 0,
            'ошибки': [ошибка]
        }
    
    # Формируем параметры запроса
    query_params = {
        'latitude': широта,
        'longitude': долгота,
        'hourly': ','.join(параметры_api),
        'timezone': 'auto'
    }
    
    logger.info(f"Запрос данных для координат: {широта}, {долгота}")
    logger.debug(f"URL: {base_url}")
    logger.debug(f"Параметры: {query_params}")
    
    # Выполняем запрос к API
    ответ = выполнить_запрос(
        url=base_url,
        params=query_params,
        timeout=timeout
    )
    
    if not ответ:
        ошибка = "Не удалось получить ответ от Open-Meteo API"
        logger.error(ошибка)
        return {
            'получено': 0,
            'сохранено': 0,
            'ошибки': [ошибка]
        }
    
    # Парсим ответ
    список_измерений = распарсить_ответ(ответ, широта, долгота)
    
    if not список_измерений:
        ошибка = "Не удалось распарсить данные из ответа API"
        logger.warning(ошибка)
        return {
            'получено': 0,
            'сохранено': 0,
            'ошибки': [ошибка]
        }
    
    logger.info(f"Получено {len(список_измерений)} измерений из API")
    
    # Сохраняем в базу данных
    сохранено, ошибки = сохранить_измерения(
        список_измерений,
        название_источника='Open-Meteo Air Quality API',
        url_источника='https://open-meteo.com/en/docs/air-quality-api'
    )
    
    # Логируем результат
    логировать_результат(
        источник='Open-Meteo Air Quality',
        получено=len(список_измерений),
        сохранено=сохранено,
        ошибки=ошибки if ошибки else None
    )
    
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
    результат = собрать_данные_о_качестве_воздуха()
    
    print("\n" + "=" * 60)
    print("РЕЗУЛЬТАТ СБОРА ДАННЫХ")
    print("=" * 60)
    print(f"Получено записей: {результат['получено']}")
    print(f"Сохранено записей: {результат['сохранено']}")
    print(f"Ошибок: {len(результат['ошибки'])}")
    
    if результат['ошибки']:
        print("\nОшибки:")
        for ошибка in результат['ошибки']:
            print(f"  - {ошибка}")
    
    print("=" * 60)
