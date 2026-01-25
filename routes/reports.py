"""
Reports blueprint - data analysis and visualization
"""
from flask import Blueprint, render_template, jsonify, request, current_app
from database import execute_query
from datetime import datetime, timedelta

bp = Blueprint('reports', __name__)


@bp.route('/')
def index():
    """
    Render reports page
    
    Returns:
        Rendered HTML template
    """
    return render_template('report.html')


@bp.route('/statistics', methods=['GET'])
def get_statistics():
    """
    Get aggregated statistics for measurements
    
    Query parameters:
        parameter_id: Filter by parameter (optional)
        days: Number of days to analyze (default 7)
    
    Returns:
        JSON with statistics (avg, min, max, count)
    """
    parameter_id = request.args.get('parameter_id', type=int)
    days = request.args.get('days', default=7, type=int)
    
    if days < 1 or days > 365:
        return jsonify({'error': 'Days must be between 1 and 365'}), 400
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = """
        SELECT 
            p.id as parameter_id,
            p.name as parameter_name,
            p.unit,
            COUNT(m.id) as measurement_count,
            AVG(m.value) as avg_value,
            MIN(m.value) as min_value,
            MAX(m.value) as max_value,
            p.safe_limit
        FROM measurements m
        JOIN parameters p ON m.parameter_id = p.id
        WHERE m.measured_at >= %s
    """
    params = [start_date]
    
    if parameter_id:
        query += " AND p.id = %s"
        params.append(parameter_id)
    
    query += """
        GROUP BY p.id, p.name, p.unit, p.safe_limit
        ORDER BY p.name
    """
    
    try:
        results = execute_query(query, tuple(params))
        
        # Format results
        statistics = []
        for row in results:
            stat = {
                'parameter_id': row['parameter_id'],
                'parameter_name': row['parameter_name'],
                'unit': row['unit'],
                'count': row['measurement_count'],
                'average': round(float(row['avg_value']), 2),
                'minimum': round(float(row['min_value']), 2),
                'maximum': round(float(row['max_value']), 2),
                'safe_limit': float(row['safe_limit']) if row['safe_limit'] else None
            }
            
            if stat['safe_limit']:
                stat['exceeds_limit'] = stat['average'] > stat['safe_limit']
            
            statistics.append(stat)
        
        return jsonify({
            'period_days': days,
            'start_date': start_date.isoformat(),
            'statistics': statistics
        }), 200
    
    except Exception as e:
        current_app.logger.error(f"Error generating statistics: {e}")
        return jsonify({'error': 'Failed to generate statistics'}), 500


@bp.route('/trends', methods=['GET'])
def get_trends():
    """
    Get time-series data for trend analysis
    
    Query parameters:
        parameter_id: Required parameter ID
        location_id: Optional location ID
        days: Number of days (default 7)
    
    Returns:
        JSON with time-series data
    """
    parameter_id = request.args.get('parameter_id', type=int)
    location_id = request.args.get('location_id', type=int)
    days = request.args.get('days', default=7, type=int)
    
    if not parameter_id:
        return jsonify({'error': 'parameter_id is required'}), 400
    
    if days < 1 or days > 365:
        return jsonify({'error': 'Days must be between 1 and 365'}), 400
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = """
        SELECT 
            DATE_TRUNC('hour', m.measured_at) as time_bucket,
            AVG(m.value) as avg_value,
            MIN(m.value) as min_value,
            MAX(m.value) as max_value,
            COUNT(m.id) as count
        FROM measurements m
        WHERE m.parameter_id = %s
            AND m.measured_at >= %s
    """
    params = [parameter_id, start_date]
    
    if location_id:
        query += " AND m.location_id = %s"
        params.append(location_id)
    
    query += """
        GROUP BY time_bucket
        ORDER BY time_bucket
    """
    
    try:
        results = execute_query(query, tuple(params))
        
        trends = [
            {
                'timestamp': row['time_bucket'].isoformat(),
                'average': round(float(row['avg_value']), 2),
                'minimum': round(float(row['min_value']), 2),
                'maximum': round(float(row['max_value']), 2),
                'count': row['count']
            }
            for row in results
        ]
        
        return jsonify({
            'parameter_id': parameter_id,
            'location_id': location_id,
            'period_days': days,
            'trends': trends
        }), 200
    
    except Exception as e:
        current_app.logger.error(f"Error generating trends: {e}")
        return jsonify({'error': 'Failed to generate trends'}), 500
