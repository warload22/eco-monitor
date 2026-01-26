"""
Стресс-тест API для EcoMonitor
Проверяет стабильность ключевых эндпоинтов (50+ итераций)
"""
import logging
import random
from datetime import datetime, timedelta, timezone

import psycopg
from psycopg.rows import dict_row

from app import create_app
from config import Config


ITERATIONS = 60
LOG_PATH = 'logs/stress_test_backend.log'


def настроить_логирование() -> None:
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)s | %(message)s'
    )

    file_handler = logging.FileHandler(LOG_PATH, encoding='utf-8')
    file_handler.setFormatter(formatter)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)

    logger.handlers = [file_handler, stream_handler]


def получить_параметры(client):
    response = client.get('/api/parameters')
    if response.status_code != 200:
        raise RuntimeError(f"/api/parameters вернул {response.status_code}")
    return response.get_json() or []


def получить_диапазон_дат() -> tuple[str, str]:
    now_utc = datetime.now(timezone.utc)
    now = now_utc.replace(tzinfo=None)
    date_from = (now - timedelta(days=7)).isoformat()
    date_to = now.isoformat()
    return date_from, date_to


def cleanup_stress_test_data() -> int:
    with psycopg.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        dbname=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        row_factory=dict_row
    ) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM measurements WHERE extra_data->>'stress_test' = 'true'"
            )
            deleted = cursor.rowcount
        conn.commit()
    return deleted


def main() -> None:
    настроить_логирование()
    logger = logging.getLogger(__name__)

    app = create_app()
    client = app.test_client()

    параметры = получить_параметры(client)
    if not параметры:
        raise RuntimeError("Список параметров пуст. Тест остановлен.")

    date_from, date_to = получить_диапазон_дат()
    ok_count = 0
    error_count = 0

    logger.info("Стресс-тест стартовал: %s итераций", ITERATIONS)
    logger.info("Параметров для теста: %s", len(параметры))

    for idx in range(1, ITERATIONS + 1):
        param = random.choice(параметры)
        parameter_id = param['id']

        logger.info("Итерация %s/%s (parameter_id=%s)", idx, ITERATIONS, parameter_id)

        try:
            # GET /api/parameters
            response = client.get('/api/parameters')
            if response.status_code != 200:
                raise RuntimeError(f"/api/parameters: {response.status_code}")

            # GET /api/measurements
            measurements_url = (
                f"/api/measurements?parameter_id={parameter_id}"
                f"&date_from={date_from}&date_to={date_to}"
            )
            response = client.get(measurements_url)
            if response.status_code != 200:
                raise RuntimeError(f"/api/measurements: {response.status_code}")

            # GET /api/reports/summary
            summary_url = (
                f"/api/reports/summary?parameter_id={parameter_id}"
                f"&date_from={date_from}&date_to={date_to}"
            )
            response = client.get(summary_url)
            if response.status_code not in (200, 404):
                raise RuntimeError(f"/api/reports/summary: {response.status_code}")

            # GET /api/reports/raw_data
            raw_url = (
                f"/api/reports/raw_data?parameter_id={parameter_id}"
                f"&date_from={date_from}&date_to={date_to}"
            )
            response = client.get(raw_url)
            if response.status_code != 200:
                raise RuntimeError(f"/api/reports/raw_data: {response.status_code}")

            # POST /api/measurements (валидные)
            valid_payload = {
                'parameter_id': parameter_id,
                'value': round(random.uniform(1.0, 80.0), 2),
                'latitude': 55.7558,
                'longitude': 37.6173,
                'extra_data': {'stress_test': True}
            }
            response = client.post('/api/measurements', json=valid_payload)
            if response.status_code != 201:
                raise RuntimeError(f"/api/measurements POST valid: {response.status_code}")

            # POST /api/measurements (невалидные)
            invalid_payload = {
                'parameter_id': 0,
                'value': -10,
                'latitude': 200,
                'longitude': 200
            }
            response = client.post('/api/measurements', json=invalid_payload)
            if response.status_code != 400:
                raise RuntimeError(f"/api/measurements POST invalid: {response.status_code}")

            ok_count += 1
        except Exception as exc:
            error_count += 1
            logger.exception("Ошибка итерации %s: %s", idx, exc)

    deleted = cleanup_stress_test_data()
    logger.info("Удалено тестовых измерений: %s", deleted)

    logger.info("Стресс-тест завершён. Успешно: %s, ошибок: %s", ok_count, error_count)

    if error_count > 0:
        raise SystemExit("Обнаружены ошибки во время стресс-теста.")


if __name__ == '__main__':
    main()
