"""
Скрипт для заполнения таблицы parameters новыми параметрами
для расширенного экологического мониторинга

Запуск: python update_categories.py
"""
import psycopg
from psycopg.rows import dict_row
from config import Config

# Новые параметры для каждой категории
NEW_PARAMETERS = [
    # Категория: Погода
    {
        'name': 'temperature',
        'unit': '°C',
        'description': 'Температура воздуха',
        'safe_limit': None,
        'category': 'погода'
    },
    {
        'name': 'humidity',
        'unit': '%',
        'description': 'Относительная влажность воздуха',
        'safe_limit': None,
        'category': 'погода'
    },
    {
        'name': 'pressure',
        'unit': 'мм рт.ст.',
        'description': 'Атмосферное давление',
        'safe_limit': None,
        'category': 'погода'
    },
    {
        'name': 'wind_speed',
        'unit': 'м/с',
        'description': 'Скорость ветра',
        'safe_limit': None,
        'category': 'погода'
    },
    {
        'name': 'wind_direction',
        'unit': 'град',
        'description': 'Направление ветра (азимут)',
        'safe_limit': None,
        'category': 'погода'
    },
    {
        'name': 'precipitation',
        'unit': 'мм',
        'description': 'Количество осадков',
        'safe_limit': None,
        'category': 'погода'
    },
    {
        'name': 'cloud_cover',
        'unit': '%',
        'description': 'Облачность',
        'safe_limit': None,
        'category': 'погода'
    },
    
    # Категория: Радиация
    {
        'name': 'gamma_background',
        'unit': 'мкЗв/ч',
        'description': 'Гамма-фон (дозиметр)',
        'safe_limit': 0.3,
        'category': 'радиация'
    },
    {
        'name': 'beta_radiation',
        'unit': 'мкЗв/ч',
        'description': 'Бета-излучение',
        'safe_limit': 0.2,
        'category': 'радиация'
    },
    {
        'name': 'radon_concentration',
        'unit': 'Бк/м³',
        'description': 'Концентрация радона в воздухе',
        'safe_limit': 200.0,
        'category': 'радиация'
    },
    
    # Категория: Вода
    {
        'name': 'water_temperature',
        'unit': '°C',
        'description': 'Температура воды',
        'safe_limit': None,
        'category': 'вода'
    },
    {
        'name': 'water_ph',
        'unit': 'pH',
        'description': 'Кислотность (pH) воды',
        'safe_limit': 8.5,
        'category': 'вода'
    },
    {
        'name': 'dissolved_oxygen',
        'unit': 'мг/л',
        'description': 'Растворенный кислород',
        'safe_limit': 5.0,
        'category': 'вода'
    },
    {
        'name': 'turbidity',
        'unit': 'NTU',
        'description': 'Мутность воды',
        'safe_limit': 5.0,
        'category': 'вода'
    },
    {
        'name': 'conductivity',
        'unit': 'мкСм/см',
        'description': 'Электропроводность воды',
        'safe_limit': None,
        'category': 'вода'
    },
    {
        'name': 'nitrate_concentration',
        'unit': 'мг/л',
        'description': 'Концентрация нитратов в воде',
        'safe_limit': 45.0,
        'category': 'вода'
    },
    {
        'name': 'phosphate_concentration',
        'unit': 'мг/л',
        'description': 'Концентрация фосфатов в воде',
        'safe_limit': 0.2,
        'category': 'вода'
    },
    
    # Категория: Шум
    {
        'name': 'noise_level',
        'unit': 'дБ',
        'description': 'Уровень шума',
        'safe_limit': 55.0,
        'category': 'шум'
    },
    {
        'name': 'noise_level_night',
        'unit': 'дБ',
        'description': 'Уровень шума в ночное время',
        'safe_limit': 45.0,
        'category': 'шум'
    },
    
    # Дополнительные параметры качества воздуха
    {
        'name': 'NH3',
        'unit': 'мкг/м³',
        'description': 'Аммиак',
        'safe_limit': 200.0,
        'category': 'качество_воздуха'
    },
    {
        'name': 'CO2',
        'unit': 'ppm',
        'description': 'Углекислый газ',
        'safe_limit': 1000.0,
        'category': 'качество_воздуха'
    },
]


def connect_db():
    """Подключение к базе данных"""
    config = Config()
    return psycopg.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        dbname=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        row_factory=dict_row
    )


def insert_parameters(conn):
    """Вставка новых параметров в таблицу parameters"""
    cursor = conn.cursor()
    
    insert_query = """
        INSERT INTO parameters (name, unit, description, safe_limit, category)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (name) DO UPDATE SET
            unit = EXCLUDED.unit,
            description = EXCLUDED.description,
            safe_limit = EXCLUDED.safe_limit,
            category = EXCLUDED.category
    """
    
    inserted_count = 0
    updated_count = 0
    
    for param in NEW_PARAMETERS:
        try:
            # Проверяем, существует ли параметр
            cursor.execute("SELECT id FROM parameters WHERE name = %s", (param['name'],))
            exists = cursor.fetchone()
            
            cursor.execute(
                insert_query,
                (param['name'], param['unit'], param['description'], 
                 param['safe_limit'], param['category'])
            )
            
            if exists:
                updated_count += 1
                print(f"✓ Обновлен параметр: {param['name']} ({param['category']})")
            else:
                inserted_count += 1
                print(f"✓ Добавлен параметр: {param['name']} ({param['category']})")
                
        except Exception as e:
            print(f"✗ Ошибка при обработке параметра {param['name']}: {e}")
    
    conn.commit()
    cursor.close()
    
    return inserted_count, updated_count


def verify_categories(conn):
    """Проверка распределения параметров по категориям"""
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM parameters
        GROUP BY category
        ORDER BY category
    """)
    
    print("\n=== Статистика параметров по категориям ===")
    for row in cursor.fetchall():
        category = row['category'] or 'Не определена'
        print(f"{category}: {row['count']} параметров")
    
    cursor.close()


def main():
    """Основная функция скрипта"""
    print("🚀 Начало обновления параметров экологического мониторинга...\n")
    
    try:
        conn = connect_db()
        print("✓ Подключение к базе данных установлено\n")
        
        inserted, updated = insert_parameters(conn)
        
        print(f"\n=== Результаты ===")
        print(f"Добавлено новых параметров: {inserted}")
        print(f"Обновлено существующих параметров: {updated}")
        print(f"Всего обработано: {len(NEW_PARAMETERS)}")
        
        verify_categories(conn)
        
        conn.close()
        print("\n✅ Обновление успешно завершено!")
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())
