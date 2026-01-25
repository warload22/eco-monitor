# EcoMonitor — Система мониторинга экологической ситуации в Московском регионе

**EcoMonitor** — это веб-приложение для визуализации данных о качестве воздуха в Московском регионе. Проект построен на **Flask**, **PostgreSQL** и **OpenLayers**, предоставляя интерактивную карту с точками мониторинга и REST API для работы с экологическими данными в реальном времени.

## Основные возможности

- **Интерактивная карта** — визуализация станций мониторинга на базе OpenLayers с возможностью навигации и масштабирования
- **Фильтрация по параметрам** — отображение измерений по конкретным загрязнителям (PM2.5, PM10, NO₂, SO₂, CO, O₃)
- **Отображение в реальном времени** — актуальные данные с цветовой индикацией уровня опасности (зеленый/желтый/оранжевый/красный)
- **REST API** — программный доступ к данным измерений в формате GeoJSON
- **Информативные всплывающие окна** — детальная информация о каждой точке мониторинга при клике на маркер
- **Адаптивный дизайн** — корректное отображение на мобильных устройствах

## Отслеживаемые параметры

- **PM2.5** - Твердые частицы размером 2.5 микрон
- **PM10** - Твердые частицы размером 10 микрон
- **NO₂** - Диоксид азота
- **SO₂** - Диоксид серы
- **CO** - Угарный газ
- **O₃** - Озон

## Технологический стек

**Backend:**
- Python 3.10+
- Flask 3.0
- Pydantic (валидация данных)
- PostgreSQL (база данных)
- psycopg (драйвер PostgreSQL)

**Frontend:**
- OpenLayers (интерактивная карта)
- Vanilla JavaScript (без фреймворков)
- Bootstrap 5 (адаптивный UI)
- Chart.js (графики и отчеты)

**Dev Tools:**
- Git (версионный контроль)
- Cursor AI (разработка)

## Быстрый старт (Getting Started)

### 1. Клонировать репозиторий

```bash
git clone https://github.com/warload22/eco-monitor.git
cd eco_monitor
```

### 2. Убедиться, что установлены Python 3.10+ и PostgreSQL 12+

```bash
python --version
psql --version
```

### 3. Создать виртуальное окружение

```bash
python -m venv venv
```

**Активировать виртуальное окружение:**
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

### 4. Установить зависимости

```bash
pip install -r requirements.txt
```

### 5. Настроить файл `.env`

Скопировать `.env.example` в `.env`:

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Отредактировать `.env` и указать параметры подключения к PostgreSQL:

```ini
SECRET_KEY=your-secret-key-here
FLASK_DEBUG=True
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecomonitor
DB_USER=postgres
DB_PASSWORD=your_password
```

### 6. Создать базу данных PostgreSQL

```bash
psql -U postgres
```

```sql
CREATE DATABASE ecomonitor;
\q
```

### 7. Инициализировать схему базы данных

```bash
psql -U postgres -d ecomonitor -f init_db.sql
```

Или через Python-скрипт `check_setup.py` для проверки настройки:

```bash
python check_setup.py
```

### 8. Запустить приложение

```bash
python app.py
```

Или через Flask CLI:

```bash
flask run
```

Приложение будет доступно по адресу: **http://localhost:5000**

## Структура проекта

```
eco_monitor/
├── app.py                      # Точка входа приложения
├── config.py                   # Конфигурация
├── database.py                 # Управление БД
├── models.py                   # Модели данных
├── schemas.py                  # Pydantic схемы
├── routes/                     # Blueprints
│   ├── __init__.py
│   ├── api_measurements.py     # API эндпоинты
│   ├── map_view.py             # Страницы карты
│   └── reports.py              # Отчеты
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── map.js              # Логика карты
│       └── filters.js          # Фильтры
├── templates/                  # HTML шаблоны
│   ├── base.html
│   ├── index.html
│   ├── report.html
│   └── about.html
├── utils/                      # Вспомогательные функции
│   ├── data_validation.py
│   └── geo_utils.py
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Скриншот интерфейса

<!-- Добавь скриншот главной страницы с картой -->
_TODO: Добавить скриншот интерактивной карты с маркерами и всплывающими окнами_

## API для работы с данными

Приложение предоставляет REST API для программного доступа к данным измерений.

### Основные эндпоинты

**Параметры мониторинга:**
- `GET /api/parameters` — получить список всех параметров (PM2.5, CO, NO₂ и т.д.)

**Измерения:**
- `GET /api/measurements` — получить измерения в формате GeoJSON (с поддержкой фильтров)
- `GET /api/measurements?parameter_id=1` — фильтрация по конкретному параметру
- `POST /api/measurements` — добавить новое измерение

**Локации:**
- `GET /api/locations` — получить список всех станций мониторинга

### Примеры запросов

**Получить последние 10 измерений PM2.5:**

```bash
curl "http://localhost:5000/api/measurements?parameter_id=1&limit=10"
```

**Создать новое измерение:**

```bash
curl -X POST http://localhost:5000/api/measurements \
  -H "Content-Type: application/json" \
  -d '{
    "parameter_id": 1,
    "value": 25.5,
    "latitude": 55.7558,
    "longitude": 37.6173
  }'
```

### Подробная документация API

Полная документация по тестированию API с примерами и форматами ответов доступна в файле **[API_TESTING.md](API_TESTING.md)**.

## Для разработчиков

### Стиль кода

Проект следует принципам:
- Функциональное и декларативное программирование
- Type hints для всех функций
- Guard clauses и early returns для валидации
- Чистое разделение ответственности (routes/utils/models)

### Соглашения

- `snake_case` для файлов, переменных, функций
- Описательные имена с вспомогательными глаголами (`is_safe`, `has_measurements`)
- Параметризованные SQL запросы (защита от SQL-инъекций)
- Guard clauses в начале функций для ранних возвратов

### Запуск тестов

```bash
python test_api.py
```

### Проверка настройки

```bash
python check_setup.py
```

## Лицензия

MIT License — см. файл [LICENSE](LICENSE)

---

**EcoMonitor** © 2026 | [GitHub Repository](https://github.com/warload22/eco-monitor)
