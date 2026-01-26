"""
Тестовый скрипт для проверки работы сборщика данных Open-Meteo Air Quality
"""
import logging
import sys
from pathlib import Path

# Добавляем корневую директорию проекта в путь
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from data_sources.air_quality.open_meteo_fetcher import собрать_данные_о_качестве_воздуха

# Импортируем приложение Flask для контекста
from app import create_app


def настроить_логирование():
    """Настроить логирование для теста"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('logs/test_open_meteo.log', encoding='utf-8')
        ]
    )


def main():
    """Основная функция теста"""
    print("=" * 70)
    print("ТЕСТ СБОРЩИКА ДАННЫХ О КАЧЕСТВЕ ВОЗДУХА (Open-Meteo API)")
    print("=" * 70)
    print()
    
    # Настраиваем логирование
    настроить_логирование()
    logger = logging.getLogger(__name__)
    
    logger.info("Запуск теста...")
    
    # Создаем контекст приложения Flask для доступа к БД
    app = create_app()
    
    try:
        with app.app_context():
            # Вызываем функцию сбора данных
            результат = собрать_данные_о_качестве_воздуха()
            
            # Выводим результаты
            print("\n" + "=" * 70)
            print("РЕЗУЛЬТАТЫ ТЕСТА")
            print("=" * 70)
            print(f"✓ Получено записей из API:  {результат['получено']}")
            print(f"✓ Сохранено записей в БД:   {результат['сохранено']}")
            print(f"✗ Количество ошибок:        {len(результат['ошибки'])}")
            print()
            
            if результат['ошибки']:
                print("ДЕТАЛИ ОШИБОК:")
                print("-" * 70)
                for i, ошибка in enumerate(результат['ошибки'], 1):
                    print(f"{i}. {ошибка}")
                print()
            
            # Оценка успешности
            if результат['сохранено'] > 0:
                успешность = (результат['сохранено'] / результат['получено'] * 100) \
                             if результат['получено'] > 0 else 0
                print(f"Успешность: {успешность:.1f}%")
                
                if успешность >= 80:
                    print("\n✓✓✓ ТЕСТ ПРОЙДЕН УСПЕШНО! ✓✓✓")
                    статус = 0
                else:
                    print("\n⚠ ТЕСТ ПРОЙДЕН С ПРЕДУПРЕЖДЕНИЯМИ")
                    статус = 1
            else:
                print("\n✗✗✗ ТЕСТ ПРОВАЛЕН! ✗✗✗")
                print("Ни одна запись не была сохранена в базу данных.")
                статус = 2
            
            print("=" * 70)
            print()
            
            # Дополнительная информация
            print("СЛЕДУЮЩИЕ ШАГИ:")
            print("1. Проверьте данные в БД:")
            print("   SELECT * FROM measurements WHERE source_id IN ")
            print("   (SELECT id FROM data_sources WHERE name LIKE '%Open-Meteo%')")
            print("   ORDER BY measured_at DESC LIMIT 10;")
            print()
            print("2. Проверьте данные через API:")
            print("   http://127.0.0.1:5000/api/measurements?category=качество_воздуха")
            print()
            print("3. Посмотрите лог-файл: logs/test_open_meteo.log")
            print("=" * 70)
            
            return статус
        
    except Exception as e:
        logger.error(f"Критическая ошибка во время теста: {e}", exc_info=True)
        print("\n" + "=" * 70)
        print("✗✗✗ КРИТИЧЕСКАЯ ОШИБКА! ✗✗✗")
        print("=" * 70)
        print(f"Ошибка: {e}")
        print("\nПодробности см. в логе: logs/test_open_meteo.log")
        print("=" * 70)
        return 3


if __name__ == '__main__':
    код_возврата = main()
    sys.exit(код_возврата)
