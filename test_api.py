"""
Тестовый скрипт для проверки работы API
"""
import sys
import json
from datetime import datetime
from app import create_app


def тест_получение_параметров():
    """Тест эндпоинта GET /api/parameters"""
    print("\n" + "=" * 60)
    print("ТЕСТ 1: GET /api/parameters")
    print("=" * 60)
    
    app = create_app()
    with app.test_client() as client:
        ответ = client.get('/api/parameters')
        
        print(f"Статус: {ответ.status_code}")
        print(f"Тип контента: {ответ.content_type}")
        
        if ответ.status_code == 200:
            данные = json.loads(ответ.data)
            print(f"Количество параметров: {len(данные)}")
            print("\nПолученные параметры:")
            for параметр in данные:
                print(f"  - {параметр['name']} ({параметр['unit']})")
            print("\n✅ Тест пройден")
            return True
        else:
            print(f"❌ Ошибка: {ответ.data.decode()}")
            return False


def тест_получение_измерений():
    """Тест эндпоинта GET /api/measurements"""
    print("\n" + "=" * 60)
    print("ТЕСТ 2: GET /api/measurements")
    print("=" * 60)
    
    app = create_app()
    with app.test_client() as client:
        ответ = client.get('/api/measurements?limit=10')
        
        print(f"Статус: {ответ.status_code}")
        print(f"Тип контента: {ответ.content_type}")
        
        if ответ.status_code == 200:
            данные = json.loads(ответ.data)
            print(f"Тип ответа: {данные['type']}")
            print(f"Количество features: {len(данные['features'])}")
            
            if данные['features']:
                первая = данные['features'][0]
                print(f"\nПример записи:")
                print(f"  ID: {первая['properties']['id']}")
                print(f"  Параметр: {первая['properties']['parameter_name']}")
                print(f"  Значение: {первая['properties']['value']} {первая['properties']['unit']}")
                print(f"  Координаты: {первая['geometry']['coordinates']}")
            
            print("\n✅ Тест пройден")
            return True
        else:
            print(f"❌ Ошибка: {ответ.data.decode()}")
            return False


def тест_фильтрация_по_параметру():
    """Тест фильтрации измерений по parameter_id"""
    print("\n" + "=" * 60)
    print("ТЕСТ 3: GET /api/measurements?parameter_id=1")
    print("=" * 60)
    
    app = create_app()
    with app.test_client() as client:
        ответ = client.get('/api/measurements?parameter_id=1')
        
        print(f"Статус: {ответ.status_code}")
        
        if ответ.status_code == 200:
            данные = json.loads(ответ.data)
            print(f"Количество измерений PM2.5: {len(данные['features'])}")
            
            # Проверяем, что все измерения относятся к PM2.5
            все_pm25 = all(
                f['properties']['parameter_id'] == 1
                for f in данные['features']
            )
            
            if все_pm25:
                print("✅ Все измерения относятся к PM2.5")
            else:
                print("❌ Обнаружены измерения других параметров")
                return False
            
            print("✅ Тест пройден")
            return True
        else:
            print(f"❌ Ошибка: {ответ.data.decode()}")
            return False


def тест_создание_измерения():
    """Тест эндпоинта POST /api/measurements"""
    print("\n" + "=" * 60)
    print("ТЕСТ 4: POST /api/measurements")
    print("=" * 60)
    
    app = create_app()
    with app.test_client() as client:
        # Создаем новое измерение
        новое_измерение = {
            "parameter_id": 1,
            "value": 45.5,
            "latitude": 55.7558,
            "longitude": 37.6173
        }
        
        print(f"Отправляемые данные:")
        print(f"  Параметр: PM2.5 (id=1)")
        print(f"  Значение: 45.5")
        print(f"  Координаты: 55.7558, 37.6173")
        
        ответ = client.post(
            '/api/measurements',
            data=json.dumps(новое_измерение),
            content_type='application/json'
        )
        
        print(f"\nСтатус: {ответ.status_code}")
        
        if ответ.status_code == 201:
            данные = json.loads(ответ.data)
            print(f"ID созданного измерения: {данные['data']['id']}")
            print(f"Время создания: {данные['data']['created_at']}")
            print(f"Сообщение: {данные['message']}")
            print("\n✅ Тест пройден")
            return True
        else:
            print(f"❌ Ошибка: {ответ.data.decode()}")
            return False


def запустить_все_тесты():
    """Запустить все тесты"""
    print("\n" + "=" * 60)
    print("ЗАПУСК ТЕСТОВ API")
    print("=" * 60)
    
    тесты = [
        ("Получение параметров", тест_получение_параметров),
        ("Получение измерений", тест_получение_измерений),
        ("Фильтрация по параметру", тест_фильтрация_по_параметру),
        ("Создание измерения", тест_создание_измерения),
    ]
    
    результаты = []
    
    for название, тест_функция in тесты:
        try:
            успех = тест_функция()
            результаты.append((название, успех))
        except Exception as e:
            print(f"\n❌ Исключение в тесте: {e}")
            результаты.append((название, False))
    
    # Итоги
    print("\n" + "=" * 60)
    print("ИТОГИ ТЕСТИРОВАНИЯ")
    print("=" * 60)
    
    пройдено = sum(1 for _, успех in результаты if успех)
    всего = len(результаты)
    
    for название, успех in результаты:
        символ = "✅" if успех else "❌"
        print(f"{символ} {название}")
    
    print(f"\nПройдено: {пройдено}/{всего}")
    
    if пройдено == всего:
        print("\n>>> ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        return 0
    else:
        print(f"\n>>> {всего - пройдено} тест(ов) провалено")
        return 1


if __name__ == '__main__':
    код_выхода = запустить_все_тесты()
    sys.exit(код_выхода)
