"""
Модуль сборщиков данных из внешних источников
Provides unified interface for fetching environmental data from various APIs
"""
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def запустить_все_сборщики() -> Dict[str, Any]:
    """
    Запустить все активные сборщики данных
    
    Returns:
        Словарь с результатами работы каждого сборщика
        {
            'источник_1': {'получено': 100, 'сохранено': 95, 'ошибки': []},
            'источник_2': {'получено': 50, 'сохранено': 50, 'ошибки': []}
        }
    """
    результаты = {}
    
    logger.info("Запуск всех сборщиков данных...")
    
    # Запускаем сборщик качества воздуха
    try:
        from data_sources.air_quality.open_meteo_fetcher import собрать_данные_о_качестве_воздуха
        
        logger.info("Запуск сборщика качества воздуха (Open-Meteo)...")
        результаты['open_meteo_air_quality'] = собрать_данные_о_качестве_воздуха()
        
    except Exception as e:
        logger.error(f"Ошибка при запуске сборщика Open-Meteo Air Quality: {e}")
        результаты['open_meteo_air_quality'] = {
            'получено': 0,
            'сохранено': 0,
            'ошибки': [str(e)]
        }
    
    # Запускаем сборщик погоды
    try:
        from data_sources.weather.open_meteo_weather_fetcher import собрать_погодные_данные
        
        logger.info("Запуск сборщика погоды (Open-Meteo)...")
        результаты['open_meteo_weather'] = собрать_погодные_данные()
        
    except Exception as e:
        logger.error(f"Ошибка при запуске сборщика Open-Meteo Weather: {e}")
        результаты['open_meteo_weather'] = {
            'получено': 0,
            'сохранено': 0,
            'ошибки': [str(e)]
        }
    
    logger.info("Все сборщики завершены")
    return результаты


def запустить_сборщик(имя_модуля: str) -> Dict[str, Any]:
    """
    Запустить конкретный сборщик данных
    
    Args:
        имя_модуля: Название модуля ('air_quality', 'weather', 'open_meteo_air', 'open_meteo_weather' и т.д.)
        
    Returns:
        Результат работы сборщика
    """
    logger.info(f"Запуск сборщика: {имя_модуля}")
    
    результат = {
        'получено': 0,
        'сохранено': 0,
        'ошибки': []
    }
    
    try:
        if имя_модуля == 'air_quality' or имя_модуля == 'open_meteo_air':
            from data_sources.air_quality.open_meteo_fetcher import собрать_данные_о_качестве_воздуха
            результат = собрать_данные_о_качестве_воздуха()
        elif имя_модуля == 'weather' or имя_модуля == 'open_meteo_weather':
            from data_sources.weather.open_meteo_weather_fetcher import собрать_погодные_данные
            результат = собрать_погодные_данные()
        else:
            ошибка = f"Неизвестный модуль сборщика: {имя_модуля}"
            logger.error(ошибка)
            результат['ошибки'].append(ошибка)
            
    except Exception as e:
        ошибка = f"Ошибка при запуске сборщика {имя_модуля}: {e}"
        logger.error(ошибка, exc_info=True)
        результат['ошибки'].append(ошибка)
    
    return результат
