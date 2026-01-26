"""
Тестирование API погодных эндпоинтов
"""
import urllib.request
import json
import socket

BASE_URL = "http://127.0.0.1:5000"

def test_map_grid():
    """Test heatmap endpoint"""
    print("\n" + "="*60)
    print("TEST: GET /api/weather/map-grid")
    print("="*60)
    
    try:
        url = f"{BASE_URL}/api/weather/map-grid"
        with urllib.request.urlopen(url, timeout=5) as response:
            status_code = response.status
            content_type = response.headers.get('Content-Type')
            data = json.loads(response.read().decode('utf-8'))
            
            print(f"Status: {status_code}")
            print(f"Content-Type: {content_type}")
            
            if status_code == 200:
                print(f"Parameter: {data.get('parameter')}")
                print(f"Data points: {data.get('count')}")
                print(f"Grid size: {data.get('grid_size')}")
                
                if data.get('data') and len(data['data']) > 0:
                    sample = data['data'][0]
                    print(f"\nSample point:")
                    print(f"  Coords: ({sample['lat']}, {sample['lon']})")
                    print(f"  Value: {sample['value']} C")
                    print("\nPASSED!")
                else:
                    print("\nFAILED: No data in response")
            else:
                print(f"FAILED: Status {status_code}")
                
    except socket.timeout:
        print("FAILED: Request timeout")
    except urllib.error.URLError as e:
        print(f"FAILED: Connection error: {e}")
    except Exception as e:
        print(f"FAILED: {e}")


def test_wind_vectors():
    """Test wind vectors endpoint"""
    print("\n" + "="*60)
    print("TEST: GET /api/weather/wind-vectors")
    print("="*60)
    
    try:
        url = f"{BASE_URL}/api/weather/wind-vectors"
        with urllib.request.urlopen(url, timeout=5) as response:
            status_code = response.status
            content_type = response.headers.get('Content-Type')
            data = json.loads(response.read().decode('utf-8'))
            
            print(f"Status: {status_code}")
            print(f"Content-Type: {content_type}")
            
            if status_code == 200:
                print(f"Parameter: {data.get('parameter')}")
                print(f"Vectors count: {data.get('count')}")
                print(f"Grid size: {data.get('grid_size')}")
                
                if data.get('data') and len(data['data']) > 0:
                    sample = data['data'][0]
                    print(f"\nSample vector:")
                    print(f"  Coords: ({sample['lat']}, {sample['lon']})")
                    print(f"  Speed: {sample['speed']} m/s")
                    print(f"  Direction: {sample['direction']} deg")
                    print("\nPASSED!")
                else:
                    print("\nFAILED: No data in response")
            else:
                print(f"FAILED: Status {status_code}")
                
    except socket.timeout:
        print("FAILED: Request timeout")
    except urllib.error.URLError as e:
        print(f"FAILED: Connection error: {e}")
    except Exception as e:
        print(f"FAILED: {e}")


if __name__ == "__main__":
    print("="*60)
    print("Testing Weather API Endpoints")
    print("="*60)
    
    test_map_grid()
    test_wind_vectors()
    
    print("\n" + "="*60)
    print("Testing Complete")
    print("="*60)
