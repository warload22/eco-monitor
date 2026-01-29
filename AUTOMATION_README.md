# Автоматизация сборщиков данных

Руководство по настройке автоматического запуска сборщиков данных в Windows.

## Оглавление

1. [Обзор](#обзор)
2. [Планировщик задач Windows](#планировщик-задач-windows)
3. [Настройка для Open-Meteo Air Quality](#настройка-для-open-meteo-air-quality)
4. [Мониторинг и логи](#мониторинг-и-логи)
5. [Альтернативные решения](#альтернативные-решения)

---

## Обзор

Сборщики данных должны запускаться периодически для получения актуальных экологических данных. Рекомендуемая частота запуска зависит от источника:

- **Open-Meteo Air Quality**: каждый час (данные обновляются почасово)
- **Погодные сервисы**: каждые 30 минут
- **Другие источники**: в зависимости от частоты обновления

---

## Планировщик задач Windows

### Шаг 1: Открытие планировщика задач

1. Нажмите `Win + R`
2. Введите `taskschd.msc`
3. Нажмите Enter

### Шаг 2: Создание базовой задачи

1. В правой панели выберите "Создать простую задачу" (Create Basic Task)
2. Введите имя: "EcoMonitor - Open-Meteo Air Quality Fetcher"
3. Описание: "Сбор данных о качестве воздуха из Open-Meteo API"

### Шаг 3: Настройка триггера

**Для почасового запуска:**

1. Выберите "Ежедневно" (Daily)
2. Установите время начала (например, 00:00)
3. В настройках повторения:
   - Повторять задачу каждые: **1 час**
   - В течение: **1 день**

**Для других интервалов:**

- Каждые 30 минут: установите повторение каждые 30 минут
- Каждые 6 часов: установите повторение каждые 6 часов

### Шаг 4: Настройка действия

1. Выберите "Запустить программу" (Start a program)
2. В поле "Программа или сценарий":
   ```
   C:\Projects\eco_monitor\.venv\Scripts\python.exe
   ```

3. В поле "Добавить аргументы":
   ```
   data_sources/air_quality/open_meteo_fetcher.py
   ```

4. В поле "Рабочая папка":
   ```
   C:\Projects\eco_monitor
   ```

### Шаг 5: Дополнительные параметры

В окне свойств задачи:

1. **Общие (General)**:
   - ☑ Выполнять с наивысшими правами (если требуется доступ к БД)
   - ☑ Выполнять для всех пользователей

2. **Триггеры (Triggers)**:
   - Проверьте настройки повторения
   - ☑ Включено (Enabled)

3. **Действия (Actions)**:
   - Проверьте пути к Python и скрипту

4. **Условия (Conditions)**:
   - ☐ Запускать только при питании от сети (для ноутбуков)
   - ☑ Разбудить компьютер для выполнения задачи (опционально)

5. **Параметры (Settings)**:
   - ☑ Разрешить выполнение задачи по требованию
   - ☑ Если задача не выполнена, запускать немедленно после пропуска
   - При сбое выполнения перезапускать через: **5 минут**
   - Попыток перезапуска: **3**

---

## Настройка для Open-Meteo Air Quality

### Создание пакетного файла (рекомендуется)

Создайте файл `run_open_meteo_fetcher.bat` в корне проекта:

```batch
@echo off
cd /d "C:\Projects\eco_monitor"
call .venv\Scripts\activate
python data_sources/air_quality/open_meteo_fetcher.py >> logs/open_meteo_scheduler.log 2>&1
echo ========================= >> logs/open_meteo_scheduler.log
```

Затем в планировщике задач запускайте этот файл вместо прямого вызова Python.

**Преимущества:**
- Логирование в отдельный файл
- Активация виртуального окружения
- Простота изменения параметров

### Проверка задачи

После создания задачи:

1. Найдите задачу в списке
2. Правый клик → "Выполнить" (Run)
3. Проверьте статус: должно быть "Работает" или "Выполнено успешно"
4. Проверьте логи в `logs/fetcher.log`

---

## Мониторинг и логи

### Логи планировщика

Логи выполнения задачи доступны в:

- **Журнал событий Windows**: 
  - Откройте `eventvwr.msc`
  - Перейдите в "Журналы приложений и служб" → "Microsoft" → "Windows" → "TaskScheduler"

- **История задачи**:
  - В планировщике задач выберите задачу
  - Вкладка "История" (History)

### Логи приложения

Проверяйте логи сборщиков в:

```
C:\Projects\eco_monitor\logs\
├── fetcher.log              # Общий лог всех сборщиков
├── open_meteo_scheduler.log # Лог запусков из планировщика
└── test_open_meteo.log      # Лог тестовых запусков
```

### Команды для просмотра логов

PowerShell:

```powershell
# Последние 50 строк лога
Get-Content logs/fetcher.log -Tail 50

# Мониторинг в реальном времени
Get-Content logs/fetcher.log -Wait

# Фильтр ошибок
Get-Content logs/fetcher.log | Select-String -Pattern "ERROR"
```

### Метрики успешности

Отслеживайте в логах:

- ✓ Количество полученных записей
- ✓ Количество сохраненных записей
- ✗ Количество ошибок
- % Успешность (должна быть ≥ 90%)

---

## Альтернативные решения

### Python-планировщик (APScheduler)

Для более гибкой настройки можно использовать встроенный планировщик:

**Создайте файл `scheduler.py`:**

```python
"""
Планировщик автоматического запуска сборщиков данных
"""
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

from data_sources import запустить_все_сборщики

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/scheduler.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def запустить_задачу():
    """Запустить все сборщики"""
    logger.info("=" * 60)
    logger.info("ЗАПУСК ПЕРИОДИЧЕСКОГО СБОРА ДАННЫХ")
    logger.info("=" * 60)
    
    try:
        результаты = запустить_все_сборщики()
        
        for источник, результат in результаты.items():
            logger.info(
                f"{источник}: получено {результат['получено']}, "
                f"сохранено {результат['сохранено']}"
            )
            
    except Exception as e:
        logger.error(f"Ошибка при запуске сборщиков: {e}", exc_info=True)

if __name__ == '__main__':
    scheduler = BlockingScheduler()
    
    # Запускать каждый час
    scheduler.add_job(
        запустить_задачу,
        trigger=IntervalTrigger(hours=1),
        id='data_fetchers',
        name='Сборщики экологических данных',
        max_instances=1
    )
    
    logger.info("Планировщик запущен. Нажмите Ctrl+C для остановки.")
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Планировщик остановлен")
```

**Установка зависимостей:**

```bash
pip install apscheduler
```

**Запуск:**

```bash
python scheduler.py
```

**Для фонового запуска в Windows:**

Создайте службу Windows с помощью NSSM (Non-Sucking Service Manager):

```bash
# Скачайте NSSM с https://nssm.cc/
nssm install EcoMonitorScheduler "C:\...\eco_monitor\.venv\Scripts\python.exe" "C:\...\eco_monitor\scheduler.py"
nssm start EcoMonitorScheduler
```

### Systemd (для Linux в будущем)

Если проект будет развернут на Linux-сервере:

**Создайте файл `/etc/systemd/system/ecomonitor-fetcher.service`:**

```ini
[Unit]
Description=EcoMonitor Data Fetcher
After=network.target postgresql.service

[Service]
Type=oneshot
User=www-data
WorkingDirectory=/var/www/ecomonitor
Environment="PATH=/var/www/ecomonitor/.venv/bin"
ExecStart=/var/www/ecomonitor/.venv/bin/python data_sources/air_quality/open_meteo_fetcher.py

[Install]
WantedBy=multi-user.target
```

**Создайте таймер `/etc/systemd/system/ecomonitor-fetcher.timer`:**

```ini
[Unit]
Description=EcoMonitor Data Fetcher Timer
Requires=ecomonitor-fetcher.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=1h

[Install]
WantedBy=timers.target
```

**Активация:**

```bash
sudo systemctl enable ecomonitor-fetcher.timer
sudo systemctl start ecomonitor-fetcher.timer
sudo systemctl status ecomonitor-fetcher.timer
```

---

## Устранение неполадок

### Задача не запускается

1. **Проверьте пути**: Убедитесь, что пути к Python и скрипту верны
2. **Проверьте права**: Запустите задачу от имени администратора
3. **Проверьте логи**: Смотрите `logs/fetcher.log` и журнал событий Windows
4. **Тестовый запуск**: Запустите скрипт вручную из консоли

### Ошибки подключения к БД

1. **PostgreSQL запущен**: Проверьте, что сервер PostgreSQL работает
2. **Порты открыты**: Проверьте firewall для порта 5432
3. **Учетные данные**: Проверьте `.env` файл

### Ошибки API

1. **Интернет-соединение**: Убедитесь в наличии доступа к интернету
2. **Таймауты**: Увеличьте timeout в `config.py`
3. **Rate limiting**: Проверьте, не превышены ли лимиты запросов

### Высокое потребление ресурсов

1. **Уменьшите частоту**: Запускайте реже (каждые 2-3 часа)
2. **Оптимизация БД**: Создайте индексы на часто запрашиваемых полях
3. **Очистка старых данных**: Удаляйте данные старше 6-12 месяцев

---

## Рекомендации

### Частота запуска

- **Open-Meteo Air Quality**: каждый час (обновляется почасово)
- **Погода**: каждые 15-30 минут (для актуальности)
- **Статистические данные**: раз в день (обновляются редко)

### Время запуска

Распределяйте запуски разных сборщиков:
- Open-Meteo Air Quality: 00:00, 01:00, 02:00, ...
- Погода: 00:15, 01:15, 02:15, ...
- Другие: 00:30, 01:30, 02:30, ...

### Резервное копирование

Настройте регулярное резервное копирование БД:

```bash
# Пример команды для бэкапа PostgreSQL
pg_dump -U postgres ecomonitor > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Мониторинг здоровья системы

Регулярно проверяйте:
- Размер БД (`SELECT pg_size_pretty(pg_database_size('ecomonitor'));`)
- Количество записей за последние 24 часа
- Процент успешных запусков сборщиков
- Дисковое пространство сервера

---

**Версия документа:** 1.0  
**Дата:** 26 января 2026  
**Автор:** EcoMonitor Team
