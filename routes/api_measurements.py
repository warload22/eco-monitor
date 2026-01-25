"""
API blueprint for measurements data
Provides JSON endpoints for AJAX calls
"""
from flask import Blueprint, jsonify, request, current_app
from pydantic import ValidationError
from database import execute_query
from schemas import MeasurementFilterSchema, MeasurementCreateSchema
from typing import Dict, Any

bp = Blueprint('api_measurements', __name__)


@bp.route('/measurements', methods=['GET'])
def get_measurements():
    """
    Get measurements with optional filters
    Returns GeoJSON format for OpenLayers
    
    Query parameters:
        location_id: Filter by location
        parameter_id: Filter by parameter
        start_date: Filter by start date (ISO format)
        end_date: Filter by end date (ISO format)
        limit: Max results (default 100, max 1000)
        offset: Pagination offset (default 0)
    
    Returns:
        JSON response with GeoJSON features
    """
    try:
        # Validate query parameters
        filter_params = MeasurementFilterSchema(
            location_id=request.args.get('location_id'),
            parameter_id=request.args.get('parameter_id'),
            start_date=request.args.get('start_date'),
            end_date=request.args.get('end_date'),
            limit=request.args.get('limit', 100),
            offset=request.args.get('offset', 0)
        )
    except ValidationError as e:
        return jsonify({'error': 'Invalid parameters', 'details': e.errors()}), 400
    
    # Build query with filters
    query = """
        SELECT 
            m.id,
            m.value,
            m.measured_at,
            l.id as location_id,
            l.name as location_name,
            l.latitude,
            l.longitude,
            l.district,
            p.id as parameter_id,
            p.name as parameter_name,
            p.unit,
            p.safe_limit
        FROM measurements m
        JOIN locations l ON m.location_id = l.id
        JOIN parameters p ON m.parameter_id = p.id
        WHERE l.is_active = TRUE
    """
    params = []
    
    if filter_params.location_id:
        query += " AND m.location_id = %s"
        params.append(filter_params.location_id)
    
    if filter_params.parameter_id:
        query += " AND m.parameter_id = %s"
        params.append(filter_params.parameter_id)
    
    if filter_params.start_date:
        query += " AND m.measured_at >= %s"
        params.append(filter_params.start_date)
    
    if filter_params.end_date:
        query += " AND m.measured_at <= %s"
        params.append(filter_params.end_date)
    
    query += " ORDER BY m.measured_at DESC LIMIT %s OFFSET %s"
    params.extend([filter_params.limit, filter_params.offset])
    
    try:
        results = execute_query(query, tuple(params))
        
        # Convert to GeoJSON format
        features = []
        for row in results:
            is_safe = row['value'] <= row['safe_limit'] if row['safe_limit'] else True
            
            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [float(row['longitude']), float(row['latitude'])]
                },
                'properties': {
                    'id': row['id'],
                    'location_id': row['location_id'],
                    'location_name': row['location_name'],
                    'district': row['district'],
                    'parameter_id': row['parameter_id'],
                    'parameter_name': row['parameter_name'],
                    'unit': row['unit'],
                    'value': float(row['value']),
                    'safe_limit': float(row['safe_limit']) if row['safe_limit'] else None,
                    'is_safe': is_safe,
                    'measured_at': row['measured_at'].isoformat()
                }
            }
            features.append(feature)
        
        geojson = {
            'type': 'FeatureCollection',
            'features': features
        }
        
        return jsonify(geojson), 200
    
    except Exception as e:
        current_app.logger.error(f"Error fetching measurements: {e}")
        return jsonify({'error': 'Database error'}), 500


@bp.route('/measurements', methods=['POST'])
def create_measurement():
    """
    Create new measurement record
    
    Request body:
        JSON with location_id, parameter_id, value, measured_at (optional)
    
    Returns:
        JSON response with created measurement ID
    """
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400
    
    try:
        # Validate request data
        measurement_data = MeasurementCreateSchema(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid data', 'details': e.errors()}), 400
    
    query = """
        INSERT INTO measurements (location_id, parameter_id, value, measured_at)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """
    params = (
        measurement_data.location_id,
        measurement_data.parameter_id,
        measurement_data.value,
        measurement_data.measured_at
    )
    
    try:
        result = execute_query(query, params, fetch_one=True)
        return jsonify({
            'success': True,
            'id': result['id'],
            'message': 'Measurement created successfully'
        }), 201
    
    except Exception as e:
        current_app.logger.error(f"Error creating measurement: {e}")
        return jsonify({'error': 'Failed to create measurement'}), 500


@bp.route('/parameters', methods=['GET'])
def get_parameters():
    """
    Get all environmental parameters
    
    Returns:
        JSON array of parameters
    """
    query = """
        SELECT id, name, unit, description, safe_limit
        FROM parameters
        ORDER BY name
    """
    
    try:
        results = execute_query(query)
        return jsonify(results or []), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching parameters: {e}")
        return jsonify({'error': 'Database error'}), 500


@bp.route('/locations', methods=['GET'])
def get_locations():
    """
    Get all active monitoring locations
    
    Returns:
        JSON array of locations
    """
    query = """
        SELECT id, name, latitude, longitude, address, district, is_active
        FROM locations
        WHERE is_active = TRUE
        ORDER BY name
    """
    
    try:
        results = execute_query(query)
        return jsonify(results or []), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching locations: {e}")
        return jsonify({'error': 'Database error'}), 500
