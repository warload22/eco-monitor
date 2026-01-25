# Руководство по развертыванию EcoMonitor

Инструкции по развертыванию приложения в продакшн среде.

## Подготовка к развертыванию

### 1. Системные требования

- Python 3.10+
- PostgreSQL 13+
- 2GB RAM (минимум)
- 10GB дисковое пространство

### 2. Создание production конфигурации

Создайте файл `.env` для production:

```bash
SECRET_KEY=<сгенерируйте-сложный-ключ>
FLASK_DEBUG=False
FLASK_HOST=0.0.0.0
FLASK_PORT=8000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecomonitor
DB_USER=ecomonitor_user
DB_PASSWORD=<сложный-пароль>
```

Генерация SECRET_KEY:

```python
import secrets
print(secrets.token_hex(32))
```

### 3. Настройка PostgreSQL

Создайте пользователя и базу данных:

```sql
CREATE USER ecomonitor_user WITH PASSWORD 'secure_password';
CREATE DATABASE ecomonitor OWNER ecomonitor_user;
GRANT ALL PRIVILEGES ON DATABASE ecomonitor TO ecomonitor_user;
```

Примените схему:

```bash
psql -U ecomonitor_user -d ecomonitor -f init_db.sql
```

## Варианты развертывания

### Вариант 1: Gunicorn + Nginx (Рекомендуется)

#### Установка Gunicorn

```bash
pip install gunicorn
```

#### Создание systemd service

Создайте файл `/etc/systemd/system/ecomonitor.service`:

```ini
[Unit]
Description=EcoMonitor Flask Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/eco_monitor
Environment="PATH=/var/www/eco_monitor/venv/bin"
ExecStart=/var/www/eco_monitor/venv/bin/gunicorn \
    --workers 4 \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/ecomonitor/access.log \
    --error-logfile /var/log/ecomonitor/error.log \
    "app:create_app()"

[Install]
WantedBy=multi-user.target
```

Запуск service:

```bash
sudo systemctl daemon-reload
sudo systemctl start ecomonitor
sudo systemctl enable ecomonitor
```

#### Настройка Nginx

Создайте файл `/etc/nginx/sites-available/ecomonitor`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/eco_monitor/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Размер загружаемых файлов
    client_max_body_size 16M;

    # Логи
    access_log /var/log/nginx/ecomonitor_access.log;
    error_log /var/log/nginx/ecomonitor_error.log;
}
```

Активация конфигурации:

```bash
sudo ln -s /etc/nginx/sites-available/ecomonitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### SSL сертификат (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Вариант 2: Docker

#### Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Установка зависимостей системы
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Копирование файлов
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Создание пользователя
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "app:create_app()"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: ecomonitor
      POSTGRES_USER: ecomonitor_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init_db.sql:/docker-entrypoint-initdb.d/init_db.sql
    restart: always

  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ecomonitor
      DB_USER: ecomonitor_user
      DB_PASSWORD: secure_password
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - db
    restart: always

volumes:
  postgres_data:
```

Запуск:

```bash
docker-compose up -d
```

## Мониторинг и обслуживание

### Логи приложения

```bash
# Systemd service
sudo journalctl -u ecomonitor -f

# Docker
docker-compose logs -f web
```

### Бэкап базы данных

```bash
# Создание бэкапа
pg_dump -U ecomonitor_user ecomonitor > backup_$(date +%Y%m%d).sql

# Восстановление
psql -U ecomonitor_user ecomonitor < backup_20260125.sql
```

### Автоматический бэкап (cron)

Добавьте в crontab:

```cron
0 2 * * * /usr/bin/pg_dump -U ecomonitor_user ecomonitor > /backups/ecomonitor_$(date +\%Y\%m\%d).sql
```

## Оптимизация производительности

### 1. PostgreSQL

Настройте параметры в `postgresql.conf`:

```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
max_connections = 100
```

### 2. Кэширование

Установите Flask-Caching:

```bash
pip install Flask-Caching
```

### 3. Connection pooling

Используйте pgbouncer для пулинга соединений:

```bash
sudo apt install pgbouncer
```

## Безопасность

### 1. Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Регулярные обновления

```bash
sudo apt update
sudo apt upgrade
pip install --upgrade -r requirements.txt
```

### 3. Мониторинг безопасности

- Используйте fail2ban для защиты от брутфорса
- Регулярно проверяйте логи на подозрительную активность
- Настройте алерты для критических событий

## Troubleshooting

### Приложение не запускается

1. Проверьте логи: `journalctl -u ecomonitor -n 50`
2. Убедитесь, что PostgreSQL запущен: `systemctl status postgresql`
3. Проверьте подключение к БД: `psql -U ecomonitor_user -d ecomonitor`

### Медленная работа

1. Проверьте индексы в БД
2. Увеличьте количество workers в Gunicorn
3. Включите кэширование

### Ошибки 502

1. Проверьте, что Gunicorn запущен
2. Проверьте конфигурацию Nginx
3. Увеличьте timeout в Gunicorn

## Контакты поддержки

При возникновении проблем обращайтесь к команде разработки.
