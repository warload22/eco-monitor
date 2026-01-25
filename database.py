"""
Database connection and session management for EcoMonitor
Uses psycopg3 for PostgreSQL connectivity
"""
import psycopg
from psycopg.rows import dict_row
from flask import g, current_app
from typing import Optional


def get_db():
    """
    Get database connection from Flask g object
    Creates new connection if not exists
    
    Returns:
        psycopg connection object
    """
    if 'db' not in g:
        try:
            g.db = psycopg.connect(
                host=current_app.config['DB_HOST'],
                port=current_app.config['DB_PORT'],
                dbname=current_app.config['DB_NAME'],
                user=current_app.config['DB_USER'],
                password=current_app.config['DB_PASSWORD'],
                row_factory=dict_row
            )
        except psycopg.Error as e:
            current_app.logger.error(f"Database connection error: {e}")
            raise
    
    return g.db


def init_db(app) -> None:
    """
    Initialize database connection for the application
    Called before each request
    
    Args:
        app: Flask application instance
    """
    # Connection is created lazily on first get_db() call
    pass


def close_db(exception: Optional[Exception] = None) -> None:
    """
    Close database connection
    Called after each request
    
    Args:
        exception: Exception that occurred during request (if any)
    """
    db = g.pop('db', None)
    
    if db is not None:
        try:
            if exception is None:
                db.commit()
            else:
                db.rollback()
        except psycopg.Error as e:
            current_app.logger.error(f"Database error during cleanup: {e}")
        finally:
            db.close()


def execute_query(query: str, params: tuple = None, fetch_one: bool = False):
    """
    Execute a SQL query with parameters
    
    Args:
        query: SQL query string with %s placeholders
        params: Tuple of parameters for the query
        fetch_one: If True, return single row; if False, return all rows
        
    Returns:
        Query results as dict or list of dicts
    """
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute(query, params)
        
        if cursor.description:  # SELECT query
            if fetch_one:
                return cursor.fetchone()
            return cursor.fetchall()
        
        return None  # INSERT/UPDATE/DELETE query
    except psycopg.Error as e:
        current_app.logger.error(f"Query execution error: {e}")
        raise
    finally:
        cursor.close()
