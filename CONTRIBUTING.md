# Руководство для разработчиков

Спасибо за интерес к проекту EcoMonitor! Это руководство поможет вам начать работу над проектом.

## Архитектурные принципы

### 1. Функциональный подход

Предпочитайте чистые функции классам где это возможно:

```python
# ✅ Хорошо
def calculate_aqi(value: float, safe_limit: float) -> str:
    ratio = value / safe_limit
    if ratio <= 0.5:
        return "Хорошо"
    # ...

# ❌ Избегайте без необходимости
class AQICalculator:
    def __init__(self, value, safe_limit):
        self.value = value
        self.safe_limit = safe_limit
    
    def calculate(self):
        # ...
```

### 2. Type Hints

Используйте аннотации типов для всех функций:

```python
from typing import Optional, List, Dict

def get_measurements(
    parameter_id: Optional[int] = None,
    limit: int = 100
) -> List[Dict]:
    # ...
```

### 3. Guard Clauses

Используйте ранние выходы и избегайте вложенных условий:

```python
# ✅ Хорошо
@bp.route('/data')
def get_data():
    param_id = request.args.get('param_id')
    if not param_id:
        return jsonify({'error': 'Missing param_id'}), 400
    
    data = fetch_data(param_id)
    return jsonify(data)

# ❌ Избегайте
@bp.route('/data')
def get_data():
    param_id = request.args.get('param_id')
    if param_id:
        data = fetch_data(param_id)
        return jsonify(data)
    else:
        return jsonify({'error': 'Missing param_id'}), 400
```

### 4. Разделение ответственности

- **routes/** - только маршрутизация и валидация
- **utils/** - чистые функции без побочных эффектов
- **database.py** - только работа с БД
- **static/js/** - логика фронтенда

## Стиль кода

### Python

Следуем [PEP 8](https://pep8.org/) с некоторыми дополнениями:

#### Именование

```python
# snake_case для функций, переменных, файлов
def calculate_average_value():
    measurement_count = 0
    
# PascalCase для классов
class MeasurementSchema:
    pass

# UPPER_CASE для констант
MAX_QUERY_LIMIT = 1000
```

#### Описательные имена

Используйте вспомогательные глаголы:

```python
# ✅ Хорошо
is_valid_coordinate(lat, lon)
has_measurements(location_id)
should_update_cache()
can_access_data(user_id)

# ❌ Избегайте
validate(lat, lon)
check(location_id)
update()
access(user_id)
```

#### Docstrings

Документируйте все публичные функции:

```python
def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Calculate distance between two points using Haversine formula
    
    Args:
        lat1: Latitude of first point
        lon1: Longitude of first point
        lat2: Latitude of second point
        lon2: Longitude of second point
        
    Returns:
        Distance in kilometers
    """
    # implementation
```

### JavaScript

#### Современный ES6+

```javascript
// ✅ Используйте const/let
const map = L.map('map');
let currentFilters = {};

// ❌ Не используйте var
var map = L.map('map');

// ✅ Используйте arrow functions
const getColor = (value, limit) => {
    return value > limit ? 'red' : 'green';
};

// ✅ Async/await для асинхронных операций
async function loadData() {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
}
```

#### JSDoc комментарии

```javascript
/**
 * Add marker to map for a measurement
 * @param {Object} feature - GeoJSON feature
 */
function addMarkerToMap(feature) {
    // implementation
}
```

## Работа с базой данных

### Параметризованные запросы

**ВСЕГДА** используйте параметры для предотвращения SQL инъекций:

```python
# ✅ Хорошо
query = "SELECT * FROM measurements WHERE location_id = %s"
results = execute_query(query, (location_id,))

# ❌ НИКОГДА так не делайте
query = f"SELECT * FROM measurements WHERE location_id = {location_id}"
results = execute_query(query)
```

### Индексы

При добавлении новых запросов проверяйте необходимость индексов:

```sql
-- Если часто фильтруете по полю
CREATE INDEX idx_field_name ON table_name(field_name);

-- Если часто сортируете
CREATE INDEX idx_created_at ON table_name(created_at DESC);
```

## Тестирование (будущее развитие)

Структура для будущих тестов:

```
tests/
├── test_routes.py
├── test_utils.py
├── test_database.py
└── fixtures/
    └── sample_data.json
```

Пример теста:

```python
def test_calculate_aqi_level():
    from utils.data_validation import calculate_aqi_level
    
    assert calculate_aqi_level(10.0, 20.0) == "Хорошо"
    assert calculate_aqi_level(25.0, 20.0) == "Умеренно"
```

## Git Workflow

### Ветки

- `main` - стабильная продакшн версия
- `develop` - разработка новых функций
- `feature/название` - новая функциональность
- `fix/название` - исправление багов

### Коммиты

Используйте понятные сообщения коммитов:

```bash
# Хорошо
git commit -m "Add filter by district in map view"
git commit -m "Fix measurement validation for negative values"
git commit -m "Update database schema with new indexes"

# Избегайте
git commit -m "fix"
git commit -m "updates"
git commit -m "WIP"
```

### Pull Requests

1. Создайте feature ветку
2. Сделайте изменения
3. Напишите описание в PR
4. Дождитесь ревью

## API Guidelines

### REST принципы

```
GET    /api/measurements      - Получить список
POST   /api/measurements      - Создать новый
GET    /api/measurements/:id  - Получить один
PUT    /api/measurements/:id  - Обновить
DELETE /api/measurements/:id  - Удалить
```

### Стандартные ответы

Успех:
```json
{
  "success": true,
  "data": { ... }
}
```

Ошибка:
```json
{
  "success": false,
  "error": "Description of error",
  "details": { ... }
}
```

### Статус коды

- `200 OK` - Успешный GET/PUT
- `201 Created` - Успешный POST
- `204 No Content` - Успешный DELETE
- `400 Bad Request` - Неверные данные
- `404 Not Found` - Ресурс не найден
- `500 Internal Server Error` - Ошибка сервера

## Безопасность

### Валидация

Всегда валидируйте входные данные:

```python
from schemas import MeasurementCreateSchema
from pydantic import ValidationError

try:
    data = MeasurementCreateSchema(**request.get_json())
except ValidationError as e:
    return jsonify({'error': 'Invalid data', 'details': e.errors()}), 400
```

### Secrets

**НИКОГДА** не коммитьте:
- `.env` файлы
- Пароли
- API ключи
- Токены

## Производительность

### Оптимизация запросов

```python
# ✅ Используйте LIMIT
query = "SELECT * FROM measurements ORDER BY created_at DESC LIMIT 100"

# ✅ Выбирайте только нужные поля
query = "SELECT id, value, measured_at FROM measurements"

# ❌ Избегайте SELECT * без LIMIT на больших таблицах
query = "SELECT * FROM measurements"
```

### Кэширование

Для дорогих вычислений рассмотрите кэширование:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_parameters():
    # Expensive database query
    return query_parameters()
```

## Документация

При добавлении новых функций обновляйте:

- `README.md` - если меняется API или установка
- Комментарии в коде
- Docstrings для функций

## Чек-лист перед коммитом

- [ ] Код следует стилю проекта
- [ ] Добавлены type hints
- [ ] Функции документированы
- [ ] Нет захардкоженных значений
- [ ] SQL запросы параметризованы
- [ ] Проверена работа локально
- [ ] Нет debug-кода (print, console.log)
- [ ] Обновлена документация (если нужно)

## Вопросы?

Если есть вопросы по архитектуре или стилю кода, создайте issue или обратитесь к команде.

---

Спасибо за вклад в EcoMonitor! 🌿
