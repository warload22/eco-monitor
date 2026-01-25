"""
Quick start script for EcoMonitor application
Convenient wrapper around app.py with better error handling
"""
import sys
from app import create_app


def main():
    """Main entry point for the application"""
    try:
        app = create_app()
        
        print("=" * 60)
        print("🌿 EcoMonitor - Система мониторинга экологии")
        print("=" * 60)
        print(f"🌐 Сервер запущен: http://{app.config['HOST']}:{app.config['PORT']}")
        print(f"🔧 Режим разработки: {app.config['DEBUG']}")
        print(f"💾 База данных: {app.config['DB_NAME']}@{app.config['DB_HOST']}")
        print("=" * 60)
        print("📝 Нажмите Ctrl+C для остановки сервера")
        print()
        
        app.run(
            host=app.config['HOST'],
            port=app.config['PORT'],
            debug=app.config['DEBUG']
        )
        
    except KeyboardInterrupt:
        print("\n\n✅ Сервер остановлен")
        sys.exit(0)
        
    except Exception as e:
        print(f"\n❌ Ошибка запуска: {e}")
        print("\nПроверьте:")
        print("  1. Создан ли файл .env с настройками БД")
        print("  2. Запущен ли PostgreSQL сервер")
        print("  3. Создана ли база данных ecomonitor")
        print("  4. Применена ли схема БД (init_db.sql)")
        sys.exit(1)


if __name__ == '__main__':
    main()
