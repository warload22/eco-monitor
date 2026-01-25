"""
Map view blueprint - serves main map interface
"""
from flask import Blueprint, render_template, current_app
from database import execute_query

bp = Blueprint('map_view', __name__)


@bp.route('/')
def index():
    """
    Render main map page with active monitoring locations
    
    Returns:
        Rendered HTML template
    """
    try:
        # Fetch active locations for initial map rendering
        query = """
            SELECT id, name, latitude, longitude, district
            FROM locations
            WHERE is_active = TRUE
            ORDER BY name
        """
        locations = execute_query(query)
        
        # Fetch available parameters
        query_params = """
            SELECT id, name, unit, safe_limit
            FROM parameters
            ORDER BY name
        """
        parameters = execute_query(query_params)
        
        return render_template(
            'index.html',
            locations=locations or [],
            parameters=parameters or []
        )
    except Exception as e:
        current_app.logger.error(f"Error loading map view: {e}")
        return render_template(
            'index.html',
            locations=[],
            parameters=[],
            error="Ошибка загрузки данных"
        )


@bp.route('/about')
def about():
    """
    Render about page
    
    Returns:
        Rendered HTML template
    """
    return render_template('about.html')
