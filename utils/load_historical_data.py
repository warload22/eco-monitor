"""
Скрипт для загрузки исторических данных за последние 3 месяца

Использует:
1. Open-Meteo Historical Weather API для погодных данных (реальные данные)
2. Генерацию правдоподобных данных для качества воздуха (тестовые данные)
"""
import logging
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any
import time

# Добавляем корень проекта в путь для импорта модулей
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_sources.base_fetcher import выполнить_запрос, сохранить_измерения
from config import Config
import random

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# === ЧАСТЬ 1: ЗАГРУЗКА ИСТОРИЧЕСКИХ ПОГОДНЫХ ДАННЫХ ===

def загрузить_историю_погоды(
    дата_начала: datetime,
    дата_конца: datetime,
    точки: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Загрузить исторические погодные данные из Open-Meteo Historical Weather API
    
    Args:
        дата_начала: Начальная дата периода
        дата_конца: Конечная дата периода
        точки: Список точек для загрузки данных
        
    Returns:
        Словарь с результатами загрузки
    """
    logger.info("=" * 70)
    logger.info("ЗАГРУЗКА ИСТОРИЧЕСКИХ ПОГОДНЫХ ДАННЫХ")
    logger.info(f"Период: {дата_начала.date()} - {дата_конца.date()}")
    logger.info(f"Точек: {len(точки)}")
    logger.info("=" * 70)
    
    base_url = "https://archive-api.open-meteo.com/v1/archive"
    
    # Параметры для запроса (те же, что используем в текущем сборщике)
    параметры_api = [
        'temperature_2m',
        'relative_humidity_2m',
        'wind_speed_10m',
        'wind_direction_10m',
        'precipitation',
        'surface_pressure'
    ]
    
    # Маппинг параметров
    parameter_mapping = {
        'temperature_2m': 'temperature',
        'relative_humidity_2m': 'humidity',
        'wind_speed_10m': 'wind_speed',
        'wind_direction_10m': 'wind_direction',
        'precipitation': 'precipitation',
        'surface_pressure': 'pressure'
    }
    
    unit_mapping = {
        'temperature_2m': '°C',
        'relative_humidity_2m': '%',
        'wind_speed_10m': 'м/с',
        'wind_direction_10m': '°',
        'precipitation': 'мм',
        'surface_pressure': 'гПа'
    }
    
    все_измерения = []
    
    # Загружаем данные для каждой точки отдельно (чтобы не превысить лимиты API)
    for idx, точка in enumerate(точки, 1):
        logger.info(f"Загрузка данных для точки {idx}/{len(точки)}: {точка['name']}")
        
        query_params = {
            'latitude': точка['lat'],
            'longitude': точка['lon'],
            'start_date': дата_начала.strftime('%Y-%m-%d'),
            'end_date': дата_конца.strftime('%Y-%m-%d'),
            'hourly': ','.join(параметры_api),
            'timezone': 'Europe/Moscow'
        }
        
        try:
            ответ = выполнить_запрос(
                url=base_url,
                params=query_params,
                timeout=30
            )
            
            if not ответ or 'hourly' not in ответ:
                logger.warning(f"Нет данных для точки {точка['name']}")
                continue
            
            hourly_data = ответ['hourly']
            временные_метки = hourly_data.get('time', [])
            
            if not временные_метки:
                logger.warning(f"Нет временных меток для точки {точка['name']}")
                continue
            
            # Обрабатываем каждый параметр
            for api_param, db_param in parameter_mapping.items():
                if api_param not in hourly_data:
                    continue
                
                значения = hourly_data[api_param]
                
                # Создаём измерения для каждого временного интервала
                # Берём каждые 6 часов, чтобы не перегружать БД
                for i in range(0, len(временные_метки), 6):
                    if i >= len(значения) or значения[i] is None:
                        continue
                    
                    try:
                        dt = datetime.fromisoformat(временные_метки[i].replace('Z', '+00:00'))
                        значение = float(значения[i])
                        
                        # Нормализация для wind_direction
                        if api_param == 'wind_direction_10m':
                            while значение < 0:
                                значение += 360
                            while значение >= 360:
                                значение -= 360
                        # Не допускаем отрицательные значения (кроме температуры)
                        elif api_param != 'temperature_2m' and значение < 0:
                            значение = 0
                        
                        измерение = {
                            'parameter_name': db_param,
                            'category': 'погода',
                            'value': значение,
                            'unit': unit_mapping[api_param],
                            'latitude': точка['lat'],
                            'longitude': точка['lon'],
                            'timestamp': dt,
                            'external_id': f'hist_weather_{точка["name"].replace(" ", "_").lower()}',
                            'station_name': точка['name']
                        }
                        
                        все_измерения.append(измерение)
                    
                    except (ValueError, TypeError) as e:
                        logger.debug(f"Ошибка обработки данных: {e}")
                        continue
            
            logger.info(f"  ✓ Обработано {len([m for m in все_измерения if m['latitude'] == точка['lat']])} измерений")
            
            # Небольшая задержка, чтобы не перегружать API
            time.sleep(0.5)
        
        except Exception as e:
            logger.error(f"Ошибка загрузки данных для точки {точка['name']}: {e}")
            continue
    
    logger.info(f"\nВсего получено погодных измерений: {len(все_измерения)}")
    
    return {
        'измерения': все_измерения,
        'источник': 'Open-Meteo Historical Weather API',
        'url': 'https://open-meteo.com/en/docs/historical-weather-api'
    }


# === ЧАСТЬ 2: ГЕНЕРАЦИЯ ИСТОРИЧЕСКИХ ДАННЫХ КАЧЕСТВА ВОЗДУХА ===

def генерировать_историю_качества_воздуха(
    дата_начала: datetime,
    дата_конца: datetime,
    широта: float,
    долгота: float
) -> Dict[str, Any]:
    """
    Сгенерировать правдоподобные исторические данные качества воздуха
    
    Args:
        дата_начала: Начальная дата периода
        дата_конца: Конечная дата периода
        широта: Широта точки измерения
        долгота: Долгота точки измерения
        
    Returns:
        Словарь с результатами генерации
    """
    logger.info("=" * 70)
    logger.info("ГЕНЕРАЦИЯ ИСТОРИЧЕСКИХ ДАННЫХ КАЧЕСТВА ВОЗДУХА")
    logger.info(f"Период: {дата_начала.date()} - {дата_конца.date()}")
    logger.info("=" * 70)
    
    # Параметры качества воздуха с их типичными диапазонами для Москвы
    параметры = {
        'PM2.5': {'min': 5, 'max': 45, 'mean': 20, 'std': 10, 'unit': 'мкг/м³'},
        'PM10': {'min': 10, 'max': 80, 'mean': 35, 'std': 15, 'unit': 'мкг/м³'},
        'NO2': {'min': 10, 'max': 60, 'mean': 30, 'std': 12, 'unit': 'мкг/м³'},
        'SO2': {'min': 2, 'max': 25, 'mean': 8, 'std': 5, 'unit': 'мкг/м³'},
        'CO': {'min': 0.3, 'max': 2.5, 'mean': 1.0, 'std': 0.5, 'unit': 'мг/м³'},
        'O3': {'min': 20, 'max': 140, 'mean': 60, 'std': 25, 'unit': 'мкг/м³'},
    }
    
    все_измерения = []
    
    # Генерируем данные с интервалом 6 часов
    текущая_дата = дата_начала
    интервал = timedelta(hours=6)
    
    # Инициализация "предыдущих значений" для создания временной корреляции
    предыдущие_значения = {
        param: config['mean'] for param, config in параметры.items()
    }
    
    while текущая_дата <= дата_конца:
        for param, config in параметры.items():
            # Генерируем значение с учётом предыдущего (временная корреляция)
            # 70% от предыдущего + 30% случайного с нормальным распределением
            случайное = random.gauss(config['mean'], config['std'])
            значение = 0.7 * предыдущие_значения[param] + 0.3 * случайное
            
            # Ограничиваем диапазоном
            значение = max(config['min'], min(config['max'], значение))
            
            # Добавляем сезонные и суточные вариации
            # Зимой (декабрь-февраль) больше загрязнение от отопления
            месяц = текущая_дата.month
            if месяц in [12, 1, 2]:
                значение *= 1.2
            # Летом (июнь-август) меньше загрязнение
            elif месяц in [6, 7, 8]:
                значение *= 0.85
            
            # Утренние и вечерние часы пик (больше трафика)
            час = текущая_дата.hour
            if час in [7, 8, 9, 18, 19, 20]:
                значение *= 1.15
            # Ночью меньше загрязнение
            elif час in [0, 1, 2, 3, 4, 5]:
                значение *= 0.85
            
            # Округляем до разумной точности
            значение = round(значение, 2)
            
            # Сохраняем для следующей итерации
            предыдущие_значения[param] = значение
            
            измерение = {
                'parameter_name': param,
                'category': 'качество_воздуха',
                'value': значение,
                'unit': config['unit'],
                'latitude': широта,
                'longitude': долгота,
                'timestamp': текущая_дата,
                'external_id': 'generated_air_quality_moscow',
                'station_name': 'Москва (сгенерированные данные)'
            }
            
            все_измерения.append(измерение)
        
        текущая_дата += интервал
    
    logger.info(f"Сгенерировано измерений качества воздуха: {len(все_измерения)}")
    
    return {
        'измерения': все_измерения,
        'источник': 'Сгенерированные данные (на основе статистики)',
        'url': None
    }


# === ГЛАВНАЯ ФУНКЦИЯ ===

def main():
    """Основная функция скрипта"""
    logger.info("\n" + "=" * 70)
    logger.info("ЗАГРУЗКА ИСТОРИЧЕСКИХ ДАННЫХ ЗА ПОСЛЕДНИЕ 3 МЕСЯЦА")
    logger.info("=" * 70)
    
    # Определяем период (последние 3 месяца от сегодняшнего дня)
    дата_конца = datetime.now()
    дата_начала = дата_конца - timedelta(days=90)
    
    logger.info(f"Период: {дата_начала.date()} - {дата_конца.date()}")
    logger.info(f"Количество дней: 90")
    
    # Получаем точки из конфигурации
    точки_погоды = Config.WEATHER_CONFIG['open_meteo'].get('grid_points', [])
    
    if not точки_погоды:
        logger.warning("Нет точек в конфигурации! Используем центр Москвы")
        точки_погоды = [{
            'name': 'Москва (центр)',
            'lat': 55.7558,
            'lon': 37.6173
        }]
    
    результаты = []
    
    # ШАГИ 1: Загрузка погодных данных
    try:
        результат_погоды = загрузить_историю_погоды(
            дата_начала,
            дата_конца,
            точки_погоды
        )
        
        if результат_погоды['измерения']:
            logger.info("\nСохранение погодных данных в БД...")
            сохранено, ошибки = сохранить_измерения(
                результат_погоды['измерения'],
                название_источника=результат_погоды['источник'],
                url_источника=результат_погоды['url']
            )
            
            результаты.append({
                'тип': 'Погода',
                'получено': len(результат_погоды['измерения']),
                'сохранено': сохранено,
                'ошибок': len(ошибки)
            })
            
            logger.info(f"✓ Сохранено погодных измерений: {сохранено}")
            if ошибки:
                logger.warning(f"⚠ Ошибок при сохранении: {len(ошибки)}")
    
    except Exception as e:
        logger.error(f"Ошибка загрузки погодных данных: {e}")
        результаты.append({
            'тип': 'Погода',
            'получено': 0,
            'сохранено': 0,
            'ошибок': 1
        })
    
    # ШАГ 2: Генерация данных качества воздуха
    try:
        результат_воздуха = генерировать_историю_качества_воздуха(
            дата_начала,
            дата_конца,
            широта=55.7558,  # Центр Москвы
            долгота=37.6173
        )
        
        if результат_воздуха['измерения']:
            logger.info("\nСохранение данных качества воздуха в БД...")
            сохранено, ошибки = сохранить_измерения(
                результат_воздуха['измерения'],
                название_источника=результат_воздуха['источник'],
                url_источника=результат_воздуха['url']
            )
            
            результаты.append({
                'тип': 'Качество воздуха',
                'получено': len(результат_воздуха['измерения']),
                'сохранено': сохранено,
                'ошибок': len(ошибки)
            })
            
            logger.info(f"✓ Сохранено измерений качества воздуха: {сохранено}")
            if ошибки:
                logger.warning(f"⚠ Ошибок при сохранении: {len(ошибки)}")
    
    except Exception as e:
        logger.error(f"Ошибка генерации данных качества воздуха: {e}")
        результаты.append({
            'тип': 'Качество воздуха',
            'получено': 0,
            'сохранено': 0,
            'ошибок': 1
        })
    
    # ИТОГОВЫЙ ОТЧЁТ
    logger.info("\n" + "=" * 70)
    logger.info("ИТОГОВЫЙ ОТЧЁТ")
    logger.info("=" * 70)
    
    for результат in результаты:
        logger.info(f"\n{результат['тип']}:")
        logger.info(f"  Получено:  {результат['получено']:,}")
        logger.info(f"  Сохранено: {результат['сохранено']:,}")
        logger.info(f"  Ошибок:    {результат['ошибок']}")
    
    всего_получено = sum(r['получено'] for r in результаты)
    всего_сохранено = sum(r['сохранено'] for r in результаты)
    всего_ошибок = sum(r['ошибок'] for r in результаты)
    
    logger.info("\n" + "-" * 70)
    logger.info(f"ИТОГО:")
    logger.info(f"  Получено:  {всего_получено:,} измерений")
    logger.info(f"  Сохранено: {всего_сохранено:,} измерений")
    logger.info(f"  Ошибок:    {всего_ошибок}")
    logger.info("=" * 70)
    
    if всего_сохранено > 0:
        logger.info("\n✅ ЗАГРУЗКА ЗАВЕРШЕНА УСПЕШНО!")
        logger.info("\nПроверьте данные в БД:")
        logger.info("  SELECT category, COUNT(*) FROM measurements")
        logger.info("  JOIN parameters ON measurements.parameter_id = parameters.id")
        logger.info("  GROUP BY category;")
        return 0
    else:
        logger.error("\n❌ НЕ УДАЛОСЬ ЗАГРУЗИТЬ ДАННЫЕ")
        return 1


if __name__ == '__main__':
    try:
        from app import create_app
        app = create_app()
        
        with app.app_context():
            exit_code = main()
            sys.exit(exit_code)
    
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
