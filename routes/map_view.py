"""
Map view blueprint - serves main map interface
"""
from flask import Blueprint, render_template, current_app
from database import execute_query

bp = Blueprint('map_view', __name__)


@bp.route('/')
def index():
    """
    Render main map page
    Данные для фильтров и карты загружаются динамически через API
    
    Returns:
        Rendered HTML template
    """
    return render_template('index.html')


@bp.route('/about')
def about():
    """
    Render about page
    
    Returns:
        Rendered HTML template
    """
    return render_template('about.html')
