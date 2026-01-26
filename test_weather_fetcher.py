"""
Тестовый скрипт для проверки сборщика погодных данных
"""
import logging
import sys
import os
from datetime import datetime

# Установка кодировки UTF-8 для консоли Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Настройка логирования
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    """Основная функция тестирования"""
    print("=" * 70)
    print("ТЕСТИРОВАНИЕ СБОРЩИКА ПОГОДНЫХ ДАННЫХ")
    print("=" * 70)
    print(f"Время запуска: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Создаем Flask приложение для контекста
        from app import create_app
        app = create_app()
        
        # Импортируем функцию сборщика
        from data_sources.weather.open_meteo_weather_fetcher import собрать_погодные_данные
        
        print("Запуск сборщика погодных данных...")
        print("-" * 70)
        
        # Вызываем функцию сбора данных в контексте приложения
        with app.app_context():
            результат = собрать_погодные_данные()
        
            print()
            print("=" * 70)
            print("РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ")
            print("=" * 70)
            print(f"✓ Получено параметров из API: {результат['получено']}")
            print(f"✓ Сохранено записей в БД:     {результат['сохранено']}")
            print(f"✓ Количество ошибок:          {len(результат['ошибки'])}")
            
            if результат['ошибки']:
                print()
                print("ОШИБКИ:")
                print("-" * 70)
                for idx, ошибка in enumerate(результат['ошибки'], 1):
                    print(f"{idx}. {ошибка}")
            
            print()
            
            # Проверка успешности
            if результат['сохранено'] > 0:
                успешность = (результат['сохранено'] / результат['получено'] * 100) if результат['получено'] > 0 else 0
                print(f"✓ Успешность: {успешность:.1f}%")
                print()
                print("СТАТУС: ✓ ТЕСТ ПРОЙДЕН УСПЕШНО")
                
                # Показываем дополнительную информацию
                print()
                print("Для проверки данных в БД выполните:")
                print("  1. Через PostgreSQL MCP:")
                print("     SELECT p.name, m.value, m.unit, m.timestamp")
                print("     FROM measurements m")
                print("     JOIN parameters p ON m.parameter_id = p.id")
                print("     WHERE p.category = 'погода'")
                print("     ORDER BY m.timestamp DESC LIMIT 10;")
                print()
                print("  2. Через API:")
                print("     http://127.0.0.1:5000/api/measurements?category=погода")
                
                return 0
            else:
                print("СТАТУС: ✗ ТЕСТ НЕ ПРОЙДЕН - Не удалось сохранить данные")
                return 1
            
    except ImportError as e:
        print(f"✗ ОШИБКА ИМПОРТА: {e}")
        print("Проверьте, что модуль создан правильно")
        return 1
    except Exception as e:
        print(f"✗ НЕОЖИДАННАЯ ОШИБКА: {e}")
        logger.exception("Полная информация об ошибке:")
        return 1
    finally:
        print("=" * 70)


if __name__ == '__main__':
    sys.exit(main())
