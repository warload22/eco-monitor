"""
Скрипт для запуска всех сборщиков данных
Предназначен для автоматического запуска через планировщик задач
"""
import sys
import logging
from datetime import datetime
from pathlib import Path

# Добавляем корень проекта в PYTHONPATH
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Импортируем Flask приложение для контекста
from app import create_app
from data_sources import запустить_все_сборщики

# Создаём экземпляр приложения
app = create_app()


def настроить_логирование():
    """
    Настроить логирование для запуска сборщиков
    Логи сохраняются в logs/data_fetchers.log
    """
    # Создаём директорию для логов, если её нет
    log_dir = project_root / 'logs'
    log_dir.mkdir(exist_ok=True)
    
    # Формируем имя файла лога
    log_file = log_dir / 'data_fetchers.log'
    
    # Настраиваем форматирование
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'
    
    # Настраиваем консольный хэндлер с UTF-8
    import io
    console_handler = logging.StreamHandler(
        io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
    )
    console_handler.setFormatter(logging.Formatter(log_format, datefmt=date_format))
    
    # Настраиваем файловый хэндлер
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setFormatter(logging.Formatter(log_format, datefmt=date_format))
    
    # Настраиваем логирование
    logging.basicConfig(
        level=logging.INFO,
        handlers=[file_handler, console_handler]
    )
    
    return logging.getLogger(__name__)


def вывести_статистику(результаты: dict, logger):
    """
    Вывести красивую статистику по результатам сбора
    
    Args:
        результаты: Словарь результатов от всех сборщиков
        logger: Объект логгера
    """
    logger.info("=" * 80)
    logger.info("ИТОГОВАЯ СТАТИСТИКА СБОРА ДАННЫХ")
    logger.info("=" * 80)
    
    всего_получено = 0
    всего_сохранено = 0
    всего_ошибок = 0
    
    for источник, результат in результаты.items():
        получено = результат.get('получено', 0)
        сохранено = результат.get('сохранено', 0)
        ошибки = результат.get('ошибки', [])
        
        всего_получено += получено
        всего_сохранено += сохранено
        всего_ошибок += len(ошибки)
        
        # Определяем статус (используем простые символы для совместимости)
        if len(ошибки) > 0:
            статус = "[!] ОШИБКИ"
        elif сохранено == получено and получено > 0:
            статус = "[OK] УСПЕШНО"
        elif сохранено < получено:
            статус = "[!] ЧАСТИЧНО"
        else:
            статус = "[X] НЕТ ДАННЫХ"
        
        logger.info(f"{статус} | {источник}")
        logger.info(f"  └─ Получено: {получено} | Сохранено: {сохранено} | Ошибок: {len(ошибки)}")
        
        # Выводим ошибки, если есть
        if ошибки:
            for ошибка in ошибки:
                logger.error(f"     [!] {ошибка}")
    
    logger.info("-" * 80)
    logger.info(f"ИТОГО: Получено: {всего_получено} | Сохранено: {всего_сохранено} | Ошибок: {всего_ошибок}")
    
    # Вычисляем процент успешности
    if всего_получено > 0:
        процент_успеха = (всего_сохранено / всего_получено) * 100
        logger.info(f"Успешность: {процент_успеха:.1f}%")
    
    logger.info("=" * 80)
    
    return всего_получено, всего_сохранено, всего_ошибок


def main():
    """
    Главная функция - запускает все сборщики и выводит результаты
    """
    # Настраиваем логирование
    logger = настроить_логирование()
    
    # Выводим заголовок
    время_начала = datetime.now()
    logger.info("")
    logger.info("=" * 80)
    logger.info(" ЗАПУСК АВТОМАТИЧЕСКОГО СБОРА ЭКОЛОГИЧЕСКИХ ДАННЫХ ".center(80))
    logger.info(f"Время запуска: {время_начала.strftime('%Y-%m-%d %H:%M:%S')}".center(80))
    logger.info("=" * 80)
    logger.info("")
    
    try:
        # Запускаем все сборщики в контексте Flask приложения
        with app.app_context():
            результаты = запустить_все_сборщики()
        
        # Выводим статистику
        всего_получено, всего_сохранено, всего_ошибок = вывести_статистику(результаты, logger)
        
        # Вычисляем время выполнения
        время_окончания = datetime.now()
        длительность = время_окончания - время_начала
        
        logger.info("")
        logger.info(f"Время выполнения: {длительность.total_seconds():.2f} секунд")
        logger.info("")
        
        # Определяем код возврата
        if всего_ошибок > 0:
            logger.warning("[!] Сбор завершён с ошибками")
            return 1
        elif всего_сохранено == 0:
            logger.error("[X] Не удалось сохранить данные")
            return 2
        else:
            logger.info("[OK] Сбор данных завершён успешно")
            return 0
            
    except Exception as e:
        logger.error(f"[X] КРИТИЧЕСКАЯ ОШИБКА: {e}", exc_info=True)
        return 3


if __name__ == '__main__':
    sys.exit(main())
