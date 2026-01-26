"""
Простой тест для проверки новых полей API
"""
import urllib.request
import json


def test_parameters():
    """Тест эндпоинта /api/parameters с новым полем category"""
    print("\n" + "="*60)
    print("ТЕСТ: GET /api/parameters (с полем category)")
    print("="*60)
    
    url = "http://127.0.0.1:5000/api/parameters"
    
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            
            print(f"✓ Получено параметров: {len(data)}")
            
            # Группируем по категориям
            categories = {}
            for param in data:
                cat = param.get('category', 'без категории')
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(param['name'])
            
            print(f"\nРаспределение по категориям:")
            for cat in sorted(categories.keys()):
                params = categories[cat]
                print(f"  {cat}: {len(params)} параметров")
                print(f"    Примеры: {', '.join(params[:5])}")
            
            # Показываем пример параметра с category
            if data:
                example = data[0]
                print(f"\nПример записи:")
                print(f"  ID: {example.get('id')}")
                print(f"  Name: {example.get('name')}")
                print(f"  Unit: {example.get('unit')}")
                print(f"  Category: {example.get('category')}")
                print(f"  Safe limit: {example.get('safe_limit')}")
            
            return True
            
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return False


def test_measurements():
    """Тест эндпоинта /api/measurements с новыми полями"""
    print("\n" + "="*60)
    print("ТЕСТ: GET /api/measurements (с новыми полями)")
    print("="*60)
    
    url = "http://127.0.0.1:5000/api/measurements?limit=5"
    
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            
            features = data.get('features', [])
            print(f"✓ Получено измерений: {len(features)}")
            
            if features:
                # Проверяем первую запись
                first_feature = features[0]
                props = first_feature.get('properties', {})
                
                print(f"\nПример измерения:")
                print(f"  ID: {props.get('id')}")
                print(f"  Параметр: {props.get('parameter_name')}")
                print(f"  Значение: {props.get('value')} {props.get('unit')}")
                print(f"  Категория: {props.get('category')}")
                print(f"  Source ID: {props.get('source_id')}")
                print(f"  Extra data: {props.get('extra_data')}")
                print(f"  Координаты: {first_feature.get('geometry', {}).get('coordinates')}")
                
                # Проверяем наличие новых полей
                has_category = any(f.get('properties', {}).get('category') is not None for f in features)
                print(f"\n✓ Поле 'category' присутствует: {has_category}")
                print(f"✓ Поле 'source_id' присутствует: {'source_id' in props}")
                print(f"✓ Поле 'extra_data' присутствует: {'extra_data' in props}")
            
            return True
            
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return False


def main():
    print("\n" + "="*60)
    print("Тестирование новых полей API EcoMonitor")
    print("="*60)
    
    results = []
    
    results.append(("Параметры с категориями", test_parameters()))
    results.append(("Измерения с новыми полями", test_measurements()))
    
    print("\n" + "="*60)
    print("ИТОГИ ТЕСТИРОВАНИЯ")
    print("="*60)
    
    for test_name, result in results:
        status = "✅ ПРОЙДЕН" if result else "❌ НЕ ПРОЙДЕН"
        print(f"{status}: {test_name}")
    
    passed = sum(1 for _, result in results if result)
    print(f"\nИтого: {passed}/{len(results)} тестов пройдено")
    
    return 0 if passed == len(results) else 1


if __name__ == '__main__':
    exit(main())
