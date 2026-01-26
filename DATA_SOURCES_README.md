# Архитектура сборщиков данных (Data Sources)

Система сборщиков данных предоставляет модульную и расширяемую архитектуру для получения экологических данных из различных внешних источников (API, датчиков, баз данных).

## Оглавление

1. [Структура проекта](#структура-проекта)
2. [Архитектура](#архитектура)
3. [Базовый модуль](#базовый-модуль)
4. [Создание нового сборщика](#создание-нового-сборщика)
5. [Единый формат данных](#единый-формат-данных)
6. [Конфигурация](#конфигурация)
7. [Тестирование](#тестирование)
8. [Логирование](#логирование)

---

## Структура проекта

```
data_sources/
├── __init__.py              # Точка входа, запуск всех сборщиков
├── base_fetcher.py          # Базовые утилиты для всех сборщиков
├── template_fetcher.py      # Шаблон для создания новых модулей
├── air_quality/             # Модуль качества воздуха
│   ├── __init__.py
│   └── iqair_fetcher.py     # Сборщик IQAir API
├── weather/                 # Модуль погодных данных
│   ├── __init__.py
│   └── openweather_fetcher.py  # Сборщик OpenWeatherMap API
└── ...                      # Другие модули
```

---

## Архитектура

### Принципы дизайна

1. **Модульность**: Каждый источник данных - отдельный модуль
2. **Единый интерфейс**: Все модули реализуют функцию `получить_данные()`
3. **Единый формат**: Все данные преобразуются в единый формат перед сохранением
4. **Переиспользование кода**: Общая логика в `base_fetcher.py`
5. **Обработка ошибок**: Централизованное логирование и обработка ошибок

### Поток данных

```
Внешний API → Модуль-адаптер → Преобразование → Валидация → Сохранение в БД
                    ↓                                             ↓
              base_fetcher.py                          utils.measurements_logic
```

---

## Базовый модуль

`base_fetcher.py` предоставляет общие функции для всех сборщиков:

### Основные функции

#### `выполнить_запрос(url, params, headers, method, timeout)`

Выполняет HTTP запрос к внешнему API с обработкой ошибок.

**Параметры:**
- `url` (str): URL для запроса
- `params` (dict, optional): Параметры запроса
- `headers` (dict, optional): HTTP заголовки
- `method` (str): HTTP метод ('GET' или 'POST')
- `timeout` (int): Таймаут в секундах

**Возвращает:**
- `dict` или `None`: Ответ сервера в формате JSON

**Обрабатывает:**
- Таймауты
- Ошибки соединения
- HTTP статус-коды (404, 500, и т.д.)
- Ошибки декодирования JSON

**Пример:**

```python
from data_sources.base_fetcher import выполнить_запрос

ответ = выполнить_запрос(
    url="https://api.example.com/data",
    params={"api_key": "xxx", "city": "Moscow"},
    timeout=30
)

if ответ:
    print(f"Получено данных: {len(ответ['items'])}")
```

#### `сохранить_измерения(список_измерений, название_источника, url_источника)`

Сохраняет список измерений в базу данных.

**Параметры:**
- `список_измерений` (list): Список словарей с данными измерений
- `название_источника` (str): Название источника данных
- `url_источника` (str, optional): URL источника

**Возвращает:**
- `tuple`: (количество_сохраненных, список_ошибок)

**Функция автоматически:**
- Находит или создает источник данных в таблице `data_sources`
- Находит `parameter_id` по названию и категории
- Находит или создает локацию по координатам
- Сохраняет дополнительные метаданные в `extra_data`
- Валидирует обязательные поля

**Пример:**

```python
измерения = [
    {
        'parameter_name': 'PM2.5',
        'category': 'air_quality',
        'value': 25.5,
        'unit': 'мкг/м³',
        'latitude': 55.7558,
        'longitude': 37.6176,
        'external_id': 'station_123'
    }
]

сохранено, ошибки = сохранить_измерения(
    измерения,
    'OpenWeatherMap API',
    'https://api.openweathermap.org'
)
```

#### `логировать_результат(источник, получено, сохранено, ошибки)`

Записывает результат работы сборщика в лог.

**Параметры:**
- `источник` (str): Название источника
- `получено` (int): Количество полученных записей
- `сохранено` (int): Количество сохраненных записей
- `ошибки` (list, optional): Список ошибок

#### Функции валидации

- `валидировать_координаты(latitude, longitude)` - проверка широты и долготы
- `валидировать_значение(value, название_параметра)` - проверка значения измерения
- `найти_parameter_id(название, категория)` - поиск ID параметра в БД
- `найти_или_создать_источник(название, url, описание)` - поиск/создание источника

---

## Создание нового сборщика

### Шаг 1: Выбор категории

Определите, к какой категории относится ваш источник данных:
- `air_quality` - качество воздуха (PM2.5, NO2, CO, и т.д.)
- `weather` - погода (температура, влажность, давление)
- `water` - качество воды
- `radiation` - радиационный фон
- Или создайте новую категорию

### Шаг 2: Создание модуля

Скопируйте `template_fetcher.py` в нужную директорию:

```bash
cp data_sources/template_fetcher.py data_sources/air_quality/iqair_fetcher.py
```

### Шаг 3: Реализация функций

Реализуйте три ключевые функции:

#### 1. `получить_данные()` - главная функция

```python
def получить_данные() -> Dict[str, Any]:
    """Получить данные от API"""
    logger.info(f"Запуск сборщика: {ИСТОЧНИК_НАЗВАНИЕ}")
    
    # Шаг 1: Получить сырые данные
    сырые_данные = получить_сырые_данные_от_api()
    if not сырые_данные:
        return {'получено': 0, 'сохранено': 0, 'ошибки': ['Ошибка API']}
    
    # Шаг 2: Преобразовать данные
    измерения = преобразовать_данные(сырые_данные)
    
    # Шаг 3: Сохранить
    сохранено, ошибки = сохранить_измерения(
        измерения, ИСТОЧНИК_НАЗВАНИЕ, API_BASE_URL
    )
    
    # Шаг 4: Залогировать
    логировать_результат(ИСТОЧНИК_НАЗВАНИЕ, len(измерения), сохранено, ошибки)
    
    return {'получено': len(измерения), 'сохранено': сохранено, 'ошибки': ошибки}
```

#### 2. `получить_сырые_данные_от_api()` - запрос к API

```python
def получить_сырые_данные_от_api() -> Optional[Dict[str, Any]]:
    """Выполнить запрос к API"""
    from config import Config
    
    api_config = Config.DATA_SOURCES_CONFIG['iqair']
    
    if not api_config['enabled']:
        logger.warning("IQAir API отключен в конфигурации")
        return None
    
    endpoint = f"{api_config['base_url']}/cities"
    params = {
        'key': api_config['api_key'],
        'city': 'Moscow'
    }
    
    return выполнить_запрос(endpoint, params=params, timeout=api_config['timeout'])
```

#### 3. `преобразовать_данные()` - преобразование в единый формат

```python
def преобразовать_данные(сырые_данные: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Преобразовать данные API в единый формат"""
    измерения = []
    
    for item in сырые_данные.get('data', []):
        # Извлечение данных
        lat = item['coordinates']['latitude']
        lon = item['coordinates']['longitude']
        
        # Валидация координат
        if not валидировать_координаты(lat, lon):
            continue
        
        # Создание записи
        for measurement in item['measurements']:
            param_name = measurement['parameter']
            value = measurement['value']
            
            # Маппинг параметров API -> БД
            mapped = маппинг_параметров(param_name)
            if not mapped:
                continue
            
            измерения.append({
                'parameter_name': mapped['name'],
                'category': mapped['category'],
                'value': float(value),
                'unit': measurement['unit'],
                'latitude': float(lat),
                'longitude': float(lon),
                'timestamp': datetime.fromisoformat(measurement['timestamp']),
                'external_id': item['station_id'],
                'station_name': item.get('station_name')
            })
    
    return измерения
```

### Шаг 4: Конфигурация

Добавьте конфигурацию в `config.py`:

```python
DATA_SOURCES_CONFIG = {
    'iqair': {
        'enabled': os.getenv('IQAIR_ENABLED', 'False').lower() == 'true',
        'api_key': os.getenv('IQAIR_API_KEY', ''),
        'base_url': 'https://api.airvisual.com/v2',
        'timeout': 30
    }
}
```

И добавьте переменные в `.env`:

```bash
IQAIR_ENABLED=True
IQAIR_API_KEY=your_api_key_here
```

### Шаг 5: Регистрация в системе

Обновите `data_sources/__init__.py`:

```python
def запустить_все_сборщики() -> Dict[str, Any]:
    """Запустить все активные сборщики"""
    from data_sources.air_quality import iqair_fetcher
    
    результаты = {}
    
    if Config.DATA_SOURCES_CONFIG['iqair']['enabled']:
        результаты['iqair'] = iqair_fetcher.получить_данные()
    
    return результаты
```

---

## Единый формат данных

Все измерения должны преобразовываться в следующий формат:

### Обязательные поля

```python
{
    'parameter_name': str,    # Название параметра (должно быть в таблице parameters)
    'category': str,          # Категория параметра (air_quality, weather, и т.д.)
    'value': float,           # Значение измерения
    'latitude': float,        # Широта (-90 до 90)
    'longitude': float,       # Долгота (-180 до 180)
}
```

### Опциональные поля

```python
{
    'unit': str,              # Единица измерения (для логирования)
    'timestamp': datetime,    # Время измерения (по умолчанию - текущее время)
    'external_id': str,       # ID станции во внешней системе
    'station_name': str,      # Название станции
    # Любые другие метаданные сохраняются в extra_data
    'wind_speed': float,
    'wind_direction': str,
    'humidity': float,
    'pressure': float
}
```

### Пример

```python
измерение = {
    'parameter_name': 'PM2.5',
    'category': 'air_quality',
    'value': 25.5,
    'unit': 'мкг/м³',
    'latitude': 55.7558,
    'longitude': 37.6176,
    'timestamp': datetime(2024, 1, 26, 12, 0, 0),
    'external_id': 'moscow_center_station_01',
    'station_name': 'Москва Центр',
    'humidity': 65.0,
    'pressure': 1013.25
}
```

---

## Конфигурация

### config.py

Все настройки источников хранятся в `Config.DATA_SOURCES_CONFIG`:

```python
DATA_SOURCES_CONFIG = {
    'название_источника': {
        'enabled': bool,      # Включен ли источник
        'api_key': str,       # API ключ
        'base_url': str,      # Базовый URL API
        'timeout': int        # Таймаут запросов в секундах
    }
}
```

### Переменные окружения (.env)

```bash
# OpenWeatherMap
OPENWEATHERMAP_ENABLED=True
OPENWEATHERMAP_API_KEY=your_key_here

# IQAir
IQAIR_ENABLED=True
IQAIR_API_KEY=your_key_here

# Логирование
FETCHER_LOG_FILE=logs/fetcher.log
FETCHER_LOG_LEVEL=INFO
```

---

## Тестирование

### Запуск тестов

```bash
# Все тесты
python -m pytest tests/test_base_fetcher.py -v

# С покрытием кода
python -m pytest tests/test_base_fetcher.py --cov=data_sources --cov-report=html
```

### Структура тестов

Каждый модуль должен иметь тесты для:

1. **Успешного получения данных** - нормальный flow
2. **Обработки ошибок API** - 404, 500, таймауты
3. **Валидации данных** - невалидные координаты, значения
4. **Преобразования данных** - корректность маппинга
5. **Сохранения в БД** - мокирование БД операций

### Пример теста

```python
@responses.activate
def test_успешный_запрос():
    """Тест успешного получения данных"""
    responses.add(
        responses.GET,
        "https://api.example.com/data",
        json={"data": [{"value": 25.5}]},
        status=200
    )
    
    результат = получить_данные()
    
    assert результат['получено'] > 0
    assert результат['сохранено'] > 0
```

---

## Логирование

### Настройка логирования

Сборщики используют стандартный модуль `logging` Python:

```python
import logging

logger = logging.getLogger(__name__)
```

### Уровни логирования

- **DEBUG**: Детальная информация о запросах, параметрах
- **INFO**: Основные события (запуск, завершение, статистика)
- **WARNING**: Предупреждения (невалидные данные, пропущенные записи)
- **ERROR**: Ошибки (сбой API, ошибки БД)

### Пример записей лога

```
2024-01-26 12:00:00 - data_sources.air_quality.iqair - INFO - Запуск сборщика: IQAir API
2024-01-26 12:00:01 - data_sources.base_fetcher - DEBUG - Запрос к API: https://api.airvisual.com/v2/cities
2024-01-26 12:00:02 - data_sources.air_quality.iqair - INFO - Преобразовано 150 измерений из 25 станций
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - Сохранено 148 из 150 измерений от источника 'IQAir API'
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - ============================================================
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - ОТЧЕТ О СБОРЕ ДАННЫХ
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - Время: 2024-01-26T12:00:03Z
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - Источник: IQAir API
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - Получено записей: 150
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - Сохранено записей: 148
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - Ошибок: 2
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - Успешность: 98.7%
2024-01-26 12:00:03 - data_sources.base_fetcher - INFO - ============================================================
```

---

## Реализованные сборщики

### Open-Meteo Air Quality API

**Статус:** ✅ Реализовано

**Описание:** Бесплатный API для получения данных о качестве воздуха. Не требует ключа API.

**Модуль:** `data_sources/air_quality/open_meteo_fetcher.py`

**Покрытие:** Москва (55.7558, 37.6176)

**Параметры:**
- PM10 - Твердые частицы 10 микрон (мкг/м³)
- PM2.5 - Твердые частицы 2.5 микрон (мкг/м³)
- CO - Угарный газ (мг/м³)
- NO2 - Диоксид азота (мкг/м³)
- SO2 - Диоксид серы (мкг/м³)
- O3 - Озон (мкг/м³)

**Особенности:**
- API возвращает почасовые данные за несколько дней
- Сборщик извлекает последнее доступное значение для каждого параметра
- Автоматическая конвертация единиц (CO: µg/m³ → мг/м³)
- Временные метки в формате ISO8601 с автоматическим определением часового пояса

**Пример ответа API:**

```json
{
  "latitude": 55.75,
  "longitude": 37.625,
  "generationtime_ms": 1.234,
  "utc_offset_seconds": 10800,
  "timezone": "Europe/Moscow",
  "hourly": {
    "time": [
      "2026-01-26T00:00",
      "2026-01-26T01:00",
      "2026-01-26T02:00"
    ],
    "pm10": [12.5, 13.2, 14.1],
    "pm2_5": [8.3, 9.1, 9.8],
    "carbon_monoxide": [245.0, 250.0, 255.0],
    "nitrogen_dioxide": [18.5, 19.2, 20.1],
    "sulphur_dioxide": [5.2, 5.5, 5.8],
    "ozone": [45.0, 46.0, 47.0]
  }
}
```

**Логика парсинга:**

```python
# 1. API возвращает временные ряды (массивы значений по часам)
hourly_data = response['hourly']
time_series = hourly_data['pm10']  # [12.5, 13.2, 14.1, ...]
timestamps = hourly_data['time']   # ["2026-01-26T00:00", ...]

# 2. Извлекаем последнее не-null значение
last_value = None
last_timestamp = None
for value, timestamp in reversed(zip(time_series, timestamps)):
    if value is not None:
        last_value = value
        last_timestamp = timestamp
        break

# 3. Преобразуем в единый формат
measurement = {
    'parameter_name': 'PM10',
    'category': 'качество_воздуха',
    'value': last_value,
    'unit': 'мкг/м³',
    'latitude': 55.7558,
    'longitude': 37.6176,
    'timestamp': datetime.fromisoformat(last_timestamp),
    'external_id': 'open_meteo_moscow'
}
```

**Конфигурация:**

В `config.py`:

```python
AIR_QUALITY_CONFIG = {
    'open_meteo': {
        'base_url': 'https://air-quality-api.open-meteo.com/v1/air-quality',
        'latitude': 55.7558,  # Москва
        'longitude': 37.6176,  # Москва
        'params': ['pm10', 'pm2_5', 'carbon_monoxide', 
                  'nitrogen_dioxide', 'sulphur_dioxide', 'ozone'],
        'timeout': 30
    }
}
```

**Запуск:**

```bash
# Напрямую
python data_sources/air_quality/open_meteo_fetcher.py

# Через тестовый скрипт
python test_open_meteo_fetcher.py

# Через общий интерфейс
python -c "from data_sources import запустить_сборщик; запустить_сборщик('air_quality')"
```

**Тестирование:**

```bash
# Запуск теста с детальным выводом
python test_open_meteo_fetcher.py

# Проверка данных в БД
psql -d ecomonitor -c "SELECT * FROM measurements WHERE source_id IN 
  (SELECT id FROM data_sources WHERE name LIKE '%Open-Meteo%') 
  ORDER BY measured_at DESC LIMIT 10;"

# Проверка через API
curl "http://127.0.0.1:5000/api/measurements?category=качество_воздуха"
```

**URL для тестирования в браузере:**

```
https://air-quality-api.open-meteo.com/v1/air-quality?latitude=55.7558&longitude=37.6176&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto
```

**Источники данных:**
- CAMS European Air Quality Forecast (11 км разрешение)
- CAMS Global Atmospheric Composition Forecasts (25 км разрешение)

**Обновление:** Каждые 12-24 часа (в зависимости от модели)

**Документация:** https://open-meteo.com/en/docs/air-quality-api

---

## Примеры использования

### Запуск всех сборщиков

```python
from data_sources import запустить_все_сборщики

результаты = запустить_все_сборщики()

for источник, результат in результаты.items():
    print(f"{источник}: сохранено {результат['сохранено']} записей")
```

### Запуск конкретного сборщика

```python
from data_sources.air_quality import iqair_fetcher

результат = iqair_fetcher.получить_данные()
print(f"Получено: {результат['получено']}, Сохранено: {результат['сохранено']}")
```

### Планировщик (будущая функциональность)

```python
from apscheduler.schedulers.background import BackgroundScheduler
from data_sources import запустить_все_сборщики

scheduler = BackgroundScheduler()

# Запускать каждый час
scheduler.add_job(
    запустить_все_сборщики,
    'interval',
    hours=1,
    id='data_fetchers'
)

scheduler.start()
```

---

## Поддерживаемые параметры

Список параметров, которые должны быть в БД (таблица `parameters`):

### Качество воздуха (air_quality)
- PM2.5 - Твердые частицы 2.5 микрон (мкг/м³)
- PM10 - Твердые частицы 10 микрон (мкг/м³)
- NO2 - Диоксид азота (мкг/м³)
- SO2 - Диоксид серы (мкг/м³)
- CO - Угарный газ (мг/м³)
- O3 - Озон (мкг/м³)

### Погода (weather)
- temperature - Температура (°C)
- humidity - Влажность (%)
- pressure - Атмосферное давление (гПа)
- wind_speed - Скорость ветра (м/с)
- precipitation - Осадки (мм)

### Вода (water)
- ph - pH воды
- dissolved_oxygen - Растворенный кислород (мг/л)
- turbidity - Мутность (NTU)
- temperature_water - Температура воды (°C)

---

## FAQ

### Как добавить новый параметр?

Добавьте запись в таблицу `parameters`:

```sql
INSERT INTO parameters (name, unit, description, safe_limit, category)
VALUES ('новый_параметр', 'единица', 'описание', 100.0, 'категория');
```

### Как обработать API с другой структурой ответа?

Реализуйте свою функцию `преобразовать_данные()` в модуле-адаптере. Главное - вернуть список словарей в едином формате.

### Как протестировать без реального API?

Используйте библиотеку `responses` для мокирования HTTP запросов (см. `tests/test_base_fetcher.py`).

### Что делать если API требует аутентификацию?

Добавьте токен/ключ в `.env` и `config.py`, затем используйте в заголовках запроса:

```python
headers = {
    'Authorization': f'Bearer {api_config["api_key"]}',
    'Accept': 'application/json'
}

выполнить_запрос(url, headers=headers)
```

---

## Дальнейшее развитие

### Планируемые улучшения

1. **Планировщик задач** - автоматический запуск сборщиков по расписанию
2. **Мониторинг** - дашборд статуса сборщиков
3. **Кеширование** - предотвращение дублирования данных
4. **Rate limiting** - защита от превышения лимитов API
5. **Retry механизм** - повторные попытки при сбоях
6. **Webhook support** - обработка push-уведомлений от источников

### Идеи для новых модулей

- `radiation/` - данные о радиационном фоне
- `water/` - качество воды из рек и водоемов
- `noise/` - уровень шума в городе
- `traffic/` - плотность трафика (косвенный экологический показатель)

---

## Контакты и поддержка

При возникновении вопросов или проблем:

1. Проверьте логи в `logs/fetcher.log`
2. Запустите тесты: `pytest tests/test_base_fetcher.py -v`
3. Проверьте конфигурацию в `.env` и `config.py`
4. Создайте issue в репозитории проекта

---

**Версия документа:** 1.0  
**Дата:** 26 января 2024  
**Авторы:** EcoMonitor Team
