"""
Setup verification script for EcoMonitor
Checks if all dependencies and configurations are correct
"""
import sys
import os


def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print("❌ Python 3.10+ is required")
        print(f"   Current version: {version.major}.{version.minor}.{version.micro}")
        return False
    print(f"✅ Python version: {version.major}.{version.minor}.{version.micro}")
    return True


def check_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        'flask',
        'psycopg2',
        'pydantic',
        'dotenv'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} installed")
        except ImportError:
            missing.append(package)
            print(f"❌ {package} NOT installed")
    
    if missing:
        print("\n💡 Install missing packages:")
        print("   pip install -r requirements.txt")
        return False
    
    return True


def check_env_file():
    """Check if .env file exists"""
    if not os.path.exists('.env'):
        print("❌ .env file NOT found")
        print("💡 Copy .env.example to .env and configure:")
        print("   cp .env.example .env")
        return False
    
    print("✅ .env file exists")
    
    # Check if .env has required variables
    required_vars = [
        'SECRET_KEY',
        'DB_HOST',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD'
    ]
    
    from dotenv import load_dotenv
    load_dotenv()
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
            print(f"⚠️  {var} not set in .env")
    
    if missing_vars:
        print("\n💡 Configure these variables in .env")
        return False
    
    print("✅ All required environment variables set")
    return True


def check_database_connection():
    """Check if database is accessible"""
    try:
        import psycopg2
        from dotenv import load_dotenv
        load_dotenv()
        
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            port=os.getenv('DB_PORT', 5432),
            dbname=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        
        print(f"✅ Database connection successful")
        print(f"   PostgreSQL: {version[0].split(',')[0]}")
        
        # Check if tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        expected_tables = {'parameters', 'locations', 'measurements'}
        existing_tables = {table[0] for table in tables}
        
        if expected_tables.issubset(existing_tables):
            print("✅ All required tables exist")
        else:
            missing = expected_tables - existing_tables
            print(f"⚠️  Missing tables: {missing}")
            print("💡 Run init_db.sql to create schema:")
            print("   psql -U <user> -d <dbname> -f init_db.sql")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n💡 Check:")
        print("   1. PostgreSQL is running")
        print("   2. Database exists")
        print("   3. Credentials in .env are correct")
        return False


def check_directory_structure():
    """Check if all required directories exist"""
    required_dirs = [
        'routes',
        'static',
        'static/css',
        'static/js',
        'templates',
        'utils'
    ]
    
    all_exist = True
    for dir_path in required_dirs:
        if os.path.isdir(dir_path):
            print(f"✅ {dir_path}/ exists")
        else:
            print(f"❌ {dir_path}/ NOT found")
            all_exist = False
    
    return all_exist


def main():
    """Run all checks"""
    print("=" * 60)
    print("🔍 EcoMonitor Setup Verification")
    print("=" * 60)
    print()
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Environment File", check_env_file),
        ("Directory Structure", check_directory_structure),
        ("Database Connection", check_database_connection)
    ]
    
    results = []
    for name, check_func in checks:
        print(f"\n--- {name} ---")
        try:
            result = check_func()
            results.append(result)
        except Exception as e:
            print(f"❌ Error during check: {e}")
            results.append(False)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✅ All checks passed! Ready to run EcoMonitor")
        print("\nStart the application:")
        print("   python run.py")
        print("   or")
        print("   python app.py")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        sys.exit(1)
    print("=" * 60)


if __name__ == '__main__':
    main()
