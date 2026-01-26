"""
Тесты для базового модуля сборщиков данных
Tests for base data fetcher module
"""
import pytest
import responses
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from data_sources.base_fetcher import (
    выполнить_запрос,
    валидировать_координаты,
    валидировать_значение,
    сохранить_измерения,
    найти_parameter_id,
    найти_или_создать_источник
)


class TestВыполнитьЗапрос:
    """Тесты для функции выполнить_запрос"""
    
    @responses.activate
    def test_успешный_get_запрос(self):
        """Тест успешного GET запроса"""
        url = "https://api.example.com/data"
        mock_response = {"status": "ok", "data": [1, 2, 3]}
        
        responses.add(
            responses.GET,
            url,
            json=mock_response,
            status=200
        )
        
        результат = выполнить_запрос(url)
        
        assert результат is not None
        assert результат["status"] == "ok"
        assert результат["data"] == [1, 2, 3]
    
    @responses.activate
    def test_обработка_404(self):
        """Тест обработки ошибки 404"""
        url = "https://api.example.com/notfound"
        
        responses.add(
            responses.GET,
            url,
            status=404
        )
        
        результат = выполнить_запрос(url)
        
        assert результат is None
    
    @responses.activate
    def test_обработка_500(self):
        """Тест обработки ошибки 500"""
        url = "https://api.example.com/error"
        
        responses.add(
            responses.GET,
            url,
            status=500
        )
        
        результат = выполнить_запрос(url)
        
        assert результат is None
    
    @responses.activate
    def test_запрос_с_параметрами(self):
        """Тест запроса с параметрами"""
        url = "https://api.example.com/data"
        
        responses.add(
            responses.GET,
            url,
            json={"result": "success"},
            status=200
        )
        
        результат = выполнить_запрос(
            url,
            params={"key": "value", "page": 1}
        )
        
        assert результат is not None
        assert результат["result"] == "success"
    
    @responses.activate
    def test_post_запрос(self):
        """Тест POST запроса"""
        url = "https://api.example.com/submit"
        
        responses.add(
            responses.POST,
            url,
            json={"created": True},
            status=200
        )
        
        результат = выполнить_запрос(
            url,
            params={"data": "test"},
            method='POST'
        )
        
        assert результат is not None
        assert результат["created"] is True


class TestВалидацияДанных:
    """Тесты для функций валидации"""
    
    def test_валидные_координаты(self):
        """Тест валидных координат"""
        assert валидировать_координаты(55.7558, 37.6176) is True
        assert валидировать_координаты(0, 0) is True
        assert валидировать_координаты(-90, -180) is True
        assert валидировать_координаты(90, 180) is True
    
    def test_невалидные_координаты(self):
        """Тест невалидных координат"""
        assert валидировать_координаты(91, 0) is False
        assert валидировать_координаты(-91, 0) is False
        assert валидировать_координаты(0, 181) is False
        assert валидировать_координаты(0, -181) is False
    
    def test_валидные_значения(self):
        """Тест валидных значений измерений"""
        assert валидировать_значение(25.5, "temperature") is True
        assert валидировать_значение(0, "temperature") is True
        assert валидировать_значение(100.5, "pm2.5") is True
        assert валидировать_значение("42", "value") is True  # Строка, которая преобразуется в число
    
    def test_невалидные_значения(self):
        """Тест невалидных значений измерений"""
        assert валидировать_значение(-10, "temperature") is False  # Отрицательное
        assert валидировать_значение(1e7, "value") is False  # Слишком большое
        assert валидировать_значение("abc", "value") is False  # Не число
        assert валидировать_значение(None, "value") is False


class TestНайтиParameterId:
    """Тесты для функции найти_parameter_id"""
    
    @patch('data_sources.base_fetcher.execute_query')
    def test_найти_существующий_параметр(self, mock_execute_query):
        """Тест поиска существующего параметра"""
        mock_execute_query.return_value = {'id': 5}
        
        результат = найти_parameter_id('PM2.5', 'air_quality')
        
        assert результат == 5
        mock_execute_query.assert_called_once()
    
    @patch('data_sources.base_fetcher.execute_query')
    def test_параметр_не_найден(self, mock_execute_query):
        """Тест когда параметр не найден"""
        mock_execute_query.return_value = None
        
        результат = найти_parameter_id('unknown_param', 'unknown_category')
        
        assert результат is None


class TestНайтиИлиСоздатьИсточник:
    """Тесты для функции найти_или_создать_источник"""
    
    @patch('data_sources.base_fetcher.execute_query')
    def test_найти_существующий_источник(self, mock_execute_query):
        """Тест поиска существующего источника"""
        mock_execute_query.return_value = {'id': 3}
        
        результат = найти_или_создать_источник('Test API')
        
        assert результат == 3
    
    @patch('data_sources.base_fetcher.execute_query')
    def test_создать_новый_источник(self, mock_execute_query):
        """Тест создания нового источника"""
        # Первый вызов - поиск (не найден)
        # Второй вызов - создание
        mock_execute_query.side_effect = [
            None,  # Источник не найден
            {'id': 10}  # Новый ID
        ]
        
        результат = найти_или_создать_источник(
            'New API',
            'https://api.example.com',
            'Test API'
        )
        
        assert результат == 10
        assert mock_execute_query.call_count == 2


class TestСохранитьИзмерения:
    """Тесты для функции сохранить_измерения"""
    
    @patch('data_sources.base_fetcher.найти_или_создать_источник')
    @patch('data_sources.base_fetcher.найти_parameter_id')
    @patch('data_sources.base_fetcher.создать_измерение')
    def test_сохранение_валидных_измерений(
        self,
        mock_создать_измерение,
        mock_найти_parameter_id,
        mock_найти_или_создать_источник
    ):
        """Тест успешного сохранения валидных измерений"""
        mock_найти_или_создать_источник.return_value = 1
        mock_найти_parameter_id.return_value = 5
        mock_создать_измерение.return_value = {'id': 100}
        
        измерения = [
            {
                'parameter_name': 'PM2.5',
                'category': 'air_quality',
                'value': 25.5,
                'unit': 'мкг/м³',
                'latitude': 55.7558,
                'longitude': 37.6176,
                'timestamp': datetime.utcnow(),
                'external_id': 'station_123'
            }
        ]
        
        сохранено, ошибки = сохранить_измерения(
            измерения,
            'Test API',
            'https://api.example.com'
        )
        
        assert сохранено == 1
        assert len(ошибки) == 0
        mock_создать_измерение.assert_called_once()
    
    @patch('data_sources.base_fetcher.найти_или_создать_источник')
    def test_пустой_список_измерений(self, mock_найти_или_создать_источник):
        """Тест обработки пустого списка измерений"""
        сохранено, ошибки = сохранить_измерения([], 'Test API')
        
        assert сохранено == 0
        assert len(ошибки) == 0
    
    @patch('data_sources.base_fetcher.найти_или_создать_источник')
    @patch('data_sources.base_fetcher.найти_parameter_id')
    def test_измерение_с_отсутствующими_полями(
        self,
        mock_найти_parameter_id,
        mock_найти_или_создать_источник
    ):
        """Тест обработки измерения с отсутствующими обязательными полями"""
        mock_найти_или_создать_источник.return_value = 1
        
        измерения = [
            {
                'parameter_name': 'PM2.5',
                # Отсутствуют обязательные поля: category, value, latitude, longitude
            }
        ]
        
        сохранено, ошибки = сохранить_измерения(измерения, 'Test API')
        
        assert сохранено == 0
        assert len(ошибки) > 0
        assert 'отсутствуют поля' in ошибки[0]
    
    @patch('data_sources.base_fetcher.найти_или_создать_источник')
    @patch('data_sources.base_fetcher.найти_parameter_id')
    def test_параметр_не_найден_в_бд(
        self,
        mock_найти_parameter_id,
        mock_найти_или_создать_источник
    ):
        """Тест обработки случая когда параметр не найден в БД"""
        mock_найти_или_создать_источник.return_value = 1
        mock_найти_parameter_id.return_value = None  # Параметр не найден
        
        измерения = [
            {
                'parameter_name': 'unknown_param',
                'category': 'unknown',
                'value': 25.5,
                'unit': 'unit',
                'latitude': 55.7558,
                'longitude': 37.6176,
            }
        ]
        
        сохранено, ошибки = сохранить_измерения(измерения, 'Test API')
        
        assert сохранено == 0
        assert len(ошибки) > 0
        assert 'не найден в БД' in ошибки[0]


# =============================================================================
# Запуск тестов
# =============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
