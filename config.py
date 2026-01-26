"""
Configuration module for EcoMonitor application
Loads settings from environment variables
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration class"""
    
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    PORT = int(os.getenv('FLASK_PORT', 5000))
    
    # Database settings
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 5432))
    DB_NAME = os.getenv('DB_NAME', 'ecomonitor')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    
    # SQLAlchemy settings
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = DEBUG
    
    # Application settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    JSON_AS_ASCII = False  # Support Cyrillic characters in JSON
    JSONIFY_PRETTYPRINT_REGULAR = DEBUG
    
    # Data sources configuration
    # Конфигурация внешних источников данных
    DATA_SOURCES_CONFIG = {
        'openweathermap': {
            'enabled': os.getenv('OPENWEATHERMAP_ENABLED', 'False').lower() == 'true',
            'api_key': os.getenv('OPENWEATHERMAP_API_KEY', ''),
            'base_url': 'https://api.openweathermap.org/data/2.5',
            'timeout': 30
        },
        'iqair': {
            'enabled': os.getenv('IQAIR_ENABLED', 'False').lower() == 'true',
            'api_key': os.getenv('IQAIR_API_KEY', ''),
            'base_url': 'https://api.airvisual.com/v2',
            'timeout': 30
        },
        'gismeteo': {
            'enabled': os.getenv('GISMETEO_ENABLED', 'False').lower() == 'true',
            'api_key': os.getenv('GISMETEO_API_KEY', ''),
            'base_url': 'https://api.gismeteo.net/v2',
            'timeout': 30
        },
        # Добавляйте новые источники здесь
    }
    
    # Air Quality Sources Configuration
    # Конфигурация источников данных о качестве воздуха
    AIR_QUALITY_CONFIG = {
        'open_meteo': {
            'base_url': 'https://air-quality-api.open-meteo.com/v1/air-quality',
            'latitude': 55.7558,  # Москва
            'longitude': 37.6176,  # Москва
            'params': ['pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide', 
                      'sulphur_dioxide', 'ozone'],
            'timeout': 30
        }
    }
    
    # Weather Sources Configuration
    # Конфигурация источников погодных данных
    WEATHER_CONFIG = {
        'open_meteo': {
            'base_url': 'https://api.open-meteo.com/v1/forecast',
            'params': ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 
                      'wind_direction_10m', 'precipitation', 'surface_pressure'],
            'timezone': 'Europe/Moscow',
            'timeout': 30,
            
            # Сетка точек для Московского региона (5x5 = 25 точек)
            # Покрывает область примерно 50x40 км
            'grid_points': [
                # Северный ряд
                {'lat': 55.92, 'lon': 37.35, 'name': 'Химки'},
                {'lat': 55.92, 'lon': 37.52, 'name': 'Долгопрудный'},
                {'lat': 55.92, 'lon': 37.68, 'name': 'Мытищи'},
                {'lat': 55.92, 'lon': 37.85, 'name': 'Королёв'},
                {'lat': 55.92, 'lon': 38.00, 'name': 'Щёлково'},
                
                # Северо-центральный ряд  
                {'lat': 55.82, 'lon': 37.35, 'name': 'Строгино'},
                {'lat': 55.82, 'lon': 37.52, 'name': 'Тушино'},
                {'lat': 55.82, 'lon': 37.68, 'name': 'ВДНХ'},
                {'lat': 55.82, 'lon': 37.85, 'name': 'Сокольники'},
                {'lat': 55.82, 'lon': 38.00, 'name': 'Измайлово'},
                
                # Центральный ряд
                {'lat': 55.75, 'lon': 37.35, 'name': 'Крылатское'},
                {'lat': 55.75, 'lon': 37.52, 'name': 'Пресня'},
                {'lat': 55.75, 'lon': 37.62, 'name': 'Центр'},
                {'lat': 55.75, 'lon': 37.75, 'name': 'Таганка'},
                {'lat': 55.75, 'lon': 37.90, 'name': 'Перово'},
                
                # Южно-центральный ряд
                {'lat': 55.65, 'lon': 37.35, 'name': 'Солнцево'},
                {'lat': 55.65, 'lon': 37.52, 'name': 'Тёплый Стан'},
                {'lat': 55.65, 'lon': 37.68, 'name': 'Чертаново'},
                {'lat': 55.65, 'lon': 37.85, 'name': 'Марьино'},
                {'lat': 55.65, 'lon': 38.00, 'name': 'Люберцы'},
                
                # Южный ряд
                {'lat': 55.55, 'lon': 37.35, 'name': 'Внуково'},
                {'lat': 55.55, 'lon': 37.52, 'name': 'Бутово'},
                {'lat': 55.55, 'lon': 37.68, 'name': 'Домодедово'},
                {'lat': 55.55, 'lon': 37.85, 'name': 'Видное'},
                {'lat': 55.55, 'lon': 38.00, 'name': 'Котельники'},
            ]
        }
    }
    
    # Logging configuration for data fetchers
    # Конфигурация логирования сборщиков данных
    FETCHER_LOG_FILE = os.getenv('FETCHER_LOG_FILE', 'logs/fetcher.log')
    FETCHER_LOG_LEVEL = os.getenv('FETCHER_LOG_LEVEL', 'INFO')


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_ECHO = False


# Config dictionary for easy switching
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': Config
}
