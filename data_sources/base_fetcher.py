"""
Базовый модуль для всех сборщиков данных
Предоставляет общие утилиты для работы с внешними API и сохранения данных
"""
import logging
import requests
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import json

# Настройка логирования
logger = logging.getLogger(__name__)


def выполнить_запрос(
    url: str,
    params: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    method: str = 'GET',
    timeout: int = 30
) -> Optional[Dict[str, Any]]:
    """
    Выполнить HTTP запрос к внешнему API с обработкой ошибок
    
    Args:
        url: URL для запроса
        params: Параметры запроса (query string)
        headers: HTTP заголовки
        method: HTTP метод ('GET' или 'POST')
        timeout: Таймаут запроса в секундах
        
    Returns:
        Ответ сервера в формате JSON или None при ошибке
    """
    try:
        logger.debug(f"Запрос к API: {url}")
        logger.debug(f"Параметры: {params}")
        
        if method.upper() == 'GET':
            response = requests.get(
                url,
                params=params,
                headers=headers,
                timeout=timeout
            )
        elif method.upper() == 'POST':
            response = requests.post(
                url,
                json=params,
                headers=headers,
                timeout=timeout
            )
        else:
            logger.error(f"Неподдерживаемый HTTP метод: {method}")
            return None
        
        # Проверка статус-кода
        if response.status_code == 200:
            logger.debug(f"Успешный ответ от {url}")
            return response.json()
        elif response.status_code == 404:
            logger.warning(f"Ресурс не найден: {url}")
            return None
        elif response.status_code >= 500:
            logger.error(f"Ошибка сервера {response.status_code}: {url}")
            return None
        else:
            logger.warning(f"Неожиданный статус {response.status_code}: {url}")
            logger.warning(f"Ответ: {response.text[:200]}")
            return None
            
    except requests.exceptions.Timeout:
        logger.error(f"Таймаут при запросе к {url}")
        return None
    except requests.exceptions.ConnectionError:
        logger.error(f"Ошибка соединения с {url}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка при запросе к {url}: {e}")
        return None
    except json.JSONDecodeError:
        logger.error(f"Ошибка декодирования JSON ответа от {url}")
        return None
    except Exception as e:
        logger.error(f"Неожиданная ошибка при запросе к {url}: {e}")
        return None


def найти_parameter_id(
    название: str,
    категория: Optional[str] = None
) -> Optional[int]:
    """
    Найти ID параметра в БД по названию и категории
    
    Args:
        название: Название параметра (например, 'temperature', 'PM2.5')
        категория: Категория параметра (например, 'weather', 'air_quality')
        
    Returns:
        ID параметра или None если не найден
    """
    from database import execute_query
    
    if категория:
        запрос = """
            SELECT id FROM parameters
            WHERE name = %s AND category = %s
            LIMIT 1
        """
        результат = execute_query(запрос, (название, категория), fetch_one=True)
    else:
        запрос = """
            SELECT id FROM parameters
            WHERE name = %s
            LIMIT 1
        """
        результат = execute_query(запрос, (название,), fetch_one=True)
    
    if результат:
        return результат['id']
    
    logger.warning(f"Параметр не найден: {название} (категория: {категория})")
    return None


def найти_или_создать_источник(
    название: str,
    url: Optional[str] = None,
    описание: Optional[str] = None
) -> int:
    """
    Найти существующий источник данных или создать новый
    
    Args:
        название: Название источника (например, 'OpenWeatherMap API')
        url: URL источника
        описание: Описание источника
        
    Returns:
        ID источника данных
    """
    from database import execute_query
    
    # Проверяем, существует ли источник
    запрос_поиска = """
        SELECT id FROM data_sources
        WHERE name = %s
        LIMIT 1
    """
    
    существующий = execute_query(запрос_поиска, (название,), fetch_one=True)
    
    if существующий:
        return существующий['id']
    
    # Создаем новый источник
    запрос_создания = """
        INSERT INTO data_sources (name, url, description)
        VALUES (%s, %s, %s)
        RETURNING id
    """
    
    результат = execute_query(
        запрос_создания,
        (название, url, описание),
        fetch_one=True
    )
    
    logger.info(f"Создан новый источник данных: {название} (ID: {результат['id']})")
    return результат['id']


def сохранить_измерения(
    список_измерений: List[Dict[str, Any]],
    название_источника: str,
    url_источника: Optional[str] = None
) -> Tuple[int, List[str]]:
    """
    Сохранить список измерений в базу данных
    
    Args:
        список_измерений: Список словарей с данными измерений
            Каждый словарь должен содержать:
            - parameter_name: str - название параметра
            - category: str - категория параметра
            - value: float - значение
            - unit: str - единица измерения (для логирования)
            - latitude: float - широта
            - longitude: float - долгота
            - timestamp: datetime - время измерения (опционально)
            - external_id: str - внешний идентификатор станции (опционально)
        название_источника: Название источника данных
        url_источника: URL источника (опционально)
        
    Returns:
        Кортеж (количество сохраненных записей, список ошибок)
    """
    from utils.measurements_logic import создать_измерение
    
    if not список_измерений:
        logger.warning("Получен пустой список измерений")
        return 0, []
    
    # Находим или создаем источник данных
    source_id = найти_или_создать_источник(
        название_источника,
        url_источника,
        f"Внешний источник данных: {название_источника}"
    )
    
    сохранено = 0
    ошибки = []
    
    for idx, измерение in enumerate(список_измерений):
        try:
            # Валидация обязательных полей
            обязательные_поля = ['parameter_name', 'category', 'value', 'latitude', 'longitude']
            отсутствующие = [поле for поле in обязательные_поля if поле not in измерение]
            
            if отсутствующие:
                ошибка = f"Измерение {idx}: отсутствуют поля {отсутствующие}"
                logger.warning(ошибка)
                ошибки.append(ошибка)
                continue
            
            # Находим parameter_id
            parameter_id = найти_parameter_id(
                измерение['parameter_name'],
                измерение['category']
            )
            
            if not parameter_id:
                ошибка = f"Измерение {idx}: параметр '{измерение['parameter_name']}' не найден в БД"
                logger.warning(ошибка)
                ошибки.append(ошибка)
                continue
            
            # Подготовка дополнительных данных
            extra_data = {}
            if 'external_id' in измерение:
                extra_data['external_id'] = измерение['external_id']
            if 'station_name' in измерение:
                extra_data['station_name'] = измерение['station_name']
            # Можно добавить любые другие метаданные
            for ключ in ['wind_speed', 'wind_direction', 'humidity', 'pressure']:
                if ключ in измерение:
                    extra_data[ключ] = измерение[ключ]
            
            # Название локации/станции (если указано)
            название_локации = измерение.get('station_name')
            
            # Создаем измерение
            создать_измерение(
                parameter_id=parameter_id,
                value=float(измерение['value']),
                latitude=float(измерение['latitude']),
                longitude=float(измерение['longitude']),
                source_id=source_id,
                extra_data=extra_data if extra_data else None,
                название_локации=название_локации
            )
            
            сохранено += 1
            
        except ValueError as e:
            ошибка = f"Измерение {idx}: ошибка преобразования данных - {e}"
            logger.error(ошибка)
            ошибки.append(ошибка)
        except Exception as e:
            ошибка = f"Измерение {idx}: неожиданная ошибка - {e}"
            logger.error(ошибка)
            ошибки.append(ошибка)
    
    logger.info(f"Сохранено {сохранено} из {len(список_измерений)} измерений от источника '{название_источника}'")
    
    return сохранено, ошибки


def логировать_результат(
    источник: str,
    получено: int,
    сохранено: int,
    ошибки: Optional[List[str]] = None
) -> None:
    """
    Записать результат работы сборщика в лог
    
    Args:
        источник: Название источника данных
        получено: Количество полученных записей
        сохранено: Количество сохраненных записей
        ошибки: Список сообщений об ошибках
    """
    время_запуска = datetime.utcnow().isoformat()
    
    logger.info("=" * 60)
    logger.info(f"ОТЧЕТ О СБОРЕ ДАННЫХ")
    logger.info(f"Время: {время_запуска}")
    logger.info(f"Источник: {источник}")
    logger.info(f"Получено записей: {получено}")
    logger.info(f"Сохранено записей: {сохранено}")
    
    if ошибки:
        logger.info(f"Ошибок: {len(ошибки)}")
        logger.info("Детали ошибок:")
        for ошибка in ошибки[:10]:  # Показываем первые 10 ошибок
            logger.info(f"  - {ошибка}")
        if len(ошибки) > 10:
            logger.info(f"  ... и еще {len(ошибки) - 10} ошибок")
    else:
        logger.info("Ошибок: 0")
    
    успешность = (сохранено / получено * 100) if получено > 0 else 0
    logger.info(f"Успешность: {успешность:.1f}%")
    logger.info("=" * 60)


def валидировать_координаты(latitude: float, longitude: float) -> bool:
    """
    Проверить валидность координат
    
    Args:
        latitude: Широта
        longitude: Долгота
        
    Returns:
        True если координаты валидны
    """
    if not (-90 <= latitude <= 90):
        logger.warning(f"Невалидная широта: {latitude}")
        return False
    
    if not (-180 <= longitude <= 180):
        logger.warning(f"Невалидная долгота: {longitude}")
        return False
    
    return True


def валидировать_значение(value: Any, название_параметра: str) -> bool:
    """
    Проверить валидность значения измерения
    
    Args:
        value: Значение для проверки
        название_параметра: Название параметра (для логирования)
        
    Returns:
        True если значение валидно
    """
    try:
        значение = float(value)
        
        if значение < 0:
            logger.warning(f"Отрицательное значение для {название_параметра}: {значение}")
            return False
        
        # Проверка на разумные пределы (защита от явно ошибочных данных)
        if значение > 1e6:  # Например, 1 миллион
            logger.warning(f"Подозрительно большое значение для {название_параметра}: {значение}")
            return False
        
        return True
        
    except (ValueError, TypeError):
        logger.warning(f"Невозможно преобразовать значение в число: {value}")
        return False
