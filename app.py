"""
EcoMonitor Flask Application
Main application factory and configuration
"""
from flask import Flask
from config import Config


def create_app(config_class=Config) -> Flask:
    """
    Flask application factory
    
    Args:
        config_class: Configuration class to use
        
    Returns:
        Configured Flask application instance
    """
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Register blueprints
    from routes.map_view import bp as map_bp
    from routes.api_measurements import bp as api_bp
    from routes.reports import bp as reports_bp
    from routes.api_reports import bp as api_reports_bp
    from routes.weather import bp as weather_bp
    
    app.register_blueprint(map_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(reports_bp, url_prefix='/reports')
    app.register_blueprint(api_reports_bp, url_prefix='/api/reports')
    app.register_blueprint(weather_bp, url_prefix='/api/weather')
    
    # Database lifecycle management
    from database import init_db, close_db
    
    @app.before_request
    def before_request():
        """Initialize database connection before request"""
        init_db(app)
    
    @app.teardown_appcontext
    def teardown_db(exception=None):
        """Close database connection after request"""
        close_db(exception)
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(
        host=app.config.get('HOST', '0.0.0.0'),
        port=app.config.get('PORT', 5000),
        debug=app.config.get('DEBUG', False)
    )
