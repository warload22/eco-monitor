# Руководство по тестированию REST API

## Автоматическое тестирование

Для автоматического тестирования всех эндпоинтов используйте скрипт `test_api.py`:

```bash
python test_api.py
```

Скрипт проверяет:
- ✅ GET /api/parameters - получение списка параметров
- ✅ GET /api/measurements - получение измерений в формате GeoJSON
- ✅ GET /api/measurements?parameter_id=1 - фильтрация по параметру
- ✅ POST /api/measurements - создание нового измерения

## Ручное тестирование через браузер

### 1. Запуск приложения

```bash
python run.py
```

Приложение будет доступно по адресу: `http://127.0.0.1:5000`

### 2. Тестирование эндпоинтов

#### GET /api/parameters
Получение списка всех параметров экологического мониторинга:

```
http://127.0.0.1:5000/api/parameters
```

**Ожидаемый результат:** JSON-массив с параметрами (PM2.5, NO2, CO и т.д.)

#### GET /api/measurements
Получение измерений в формате GeoJSON:

```
http://127.0.0.1:5000/api/measurements
```

**Параметры запроса:**
- `parameter_id` - фильтр по ID параметра (например: `?parameter_id=1`)
- `date_from` - начальная дата в ISO формате (например: `?date_from=2026-01-25T00:00:00`)
- `date_to` - конечная дата в ISO формате
- `limit` - максимальное количество результатов (по умолчанию 100, макс 1000)
- `offset` - смещение для пагинации

**Примеры:**
```
http://127.0.0.1:5000/api/measurements?limit=10
http://127.0.0.1:5000/api/measurements?parameter_id=1
http://127.0.0.1:5000/api/measurements?parameter_id=1&limit=5
```

#### GET /api/locations
Получение всех активных точек мониторинга:

```
http://127.0.0.1:5000/api/locations
```

## Тестирование через curl (командная строка)

### GET запросы

```bash
# Получить параметры
curl http://127.0.0.1:5000/api/parameters

# Получить измерения
curl http://127.0.0.1:5000/api/measurements?limit=5

# Фильтрация по параметру PM2.5
curl http://127.0.0.1:5000/api/measurements?parameter_id=1
```

### POST запросы

```bash
# Создать новое измерение
curl -X POST http://127.0.0.1:5000/api/measurements \
  -H "Content-Type: application/json" \
  -d "{\"parameter_id\": 1, \"value\": 42.5, \"latitude\": 55.7558, \"longitude\": 37.6173}"
```

**Пример успешного ответа:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "parameter_id": 1,
    "value": 42.5,
    "latitude": 55.7558,
    "longitude": 37.6173,
    "measured_at": "2026-01-26T01:49:54.014Z",
    "created_at": "2026-01-26T01:49:54.097Z"
  },
  "message": "Измерение успешно создано"
}
```

## Тестирование через PostgreSQL

Для проверки данных в БД используйте команды:

```bash
# Подключение к БД
psql -h localhost -U postgres -d ecomonitor

# Просмотр последних измерений
SELECT m.id, m.value, p.name as parameter_name, l.latitude, l.longitude, m.measured_at 
FROM measurements m 
JOIN parameters p ON m.parameter_id = p.id 
JOIN locations l ON m.location_id = l.id 
ORDER BY m.id DESC LIMIT 10;

# Количество измерений по каждому параметру
SELECT p.name, COUNT(m.id) as count 
FROM parameters p 
LEFT JOIN measurements m ON p.id = m.parameter_id 
GROUP BY p.name;
```

## Формат ответов API

### GeoJSON для измерений

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [37.6173, 55.7558]
      },
      "properties": {
        "id": 1,
        "parameter_id": 1,
        "parameter_name": "PM2.5",
        "unit": "мкг/м³",
        "value": 28.5,
        "location_name": "Станция \"Центр\"",
        "safe_limit": 35.0,
        "is_safe": true,
        "measured_at": "2026-01-25T20:48:17.118Z",
        "created_at": "2026-01-25T21:48:17.118Z"
      }
    }
  ]
}
```

### Список параметров

```json
[
  {
    "id": 1,
    "name": "PM2.5",
    "unit": "мкг/м³",
    "description": "Твердые частицы размером 2.5 микрон",
    "safe_limit": 35.0
  }
]
```

## Коды ответов

- `200 OK` - успешный GET запрос
- `201 Created` - успешное создание ресурса (POST)
- `400 Bad Request` - некорректные данные в запросе
- `500 Internal Server Error` - ошибка сервера/БД

## Валидация данных

API автоматически валидирует:
- ✅ Координаты должны быть в диапазоне: широта [-90, 90], долгота [-180, 180]
- ✅ Значение измерения должно быть >= 0
- ✅ parameter_id должен существовать в таблице parameters
- ✅ Конечная дата должна быть позже начальной (при фильтрации)
- ✅ Limit не может превышать 1000

## Примечания

- При создании измерения локация создается автоматически, если не существует точки с такими координатами
- Timestamp (measured_at) проставляется автоматически сервером
- Все даты возвращаются в формате ISO 8601
- Фильтрация регистронезависима
- API возвращает только активные локации (is_active = TRUE)
