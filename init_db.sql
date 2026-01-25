-- Database initialization script for EcoMonitor
-- PostgreSQL schema and sample data

-- Drop tables if exist (for clean re-initialization)
DROP TABLE IF EXISTS measurements CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS parameters CASCADE;

-- Parameters table
CREATE TABLE parameters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    safe_limit DECIMAL(10, 3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    address TEXT,
    district VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_coordinates UNIQUE (latitude, longitude)
);

-- Measurements table
CREATE TABLE measurements (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    parameter_id INTEGER NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    value DECIMAL(10, 3) NOT NULL,
    measured_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_value CHECK (value >= 0)
);

-- Indexes for performance
CREATE INDEX idx_measurements_location ON measurements(location_id);
CREATE INDEX idx_measurements_parameter ON measurements(parameter_id);
CREATE INDEX idx_measurements_measured_at ON measurements(measured_at DESC);
CREATE INDEX idx_locations_active ON locations(is_active) WHERE is_active = TRUE;

-- Insert environmental parameters
INSERT INTO parameters (name, unit, description, safe_limit) VALUES
    ('PM2.5', 'мкг/м³', 'Твердые частицы размером 2.5 микрон', 35.0),
    ('PM10', 'мкг/м³', 'Твердые частицы размером 10 микрон', 50.0),
    ('NO2', 'мкг/м³', 'Диоксид азота', 40.0),
    ('SO2', 'мкг/м³', 'Диоксид серы', 20.0),
    ('CO', 'мг/м³', 'Угарный газ', 5.0),
    ('O3', 'мкг/м³', 'Озон', 120.0);

-- Insert sample monitoring locations in Moscow
INSERT INTO locations (name, latitude, longitude, address, district, is_active) VALUES
    ('Станция "Центр"', 55.7558, 37.6173, 'Красная площадь', 'Центральный', TRUE),
    ('Станция "Марьино"', 55.6500, 37.7500, 'ул. Люблинская', 'Юго-Восточный', TRUE),
    ('Станция "Тушино"', 55.8500, 37.4500, 'ул. Свободы', 'Северо-Западный', TRUE),
    ('Станция "Измайлово"', 55.7900, 37.7800, 'Измайловский парк', 'Восточный', TRUE),
    ('Станция "Юго-Запад"', 55.6700, 37.5000, 'Ленинский проспект', 'Юго-Западный', TRUE),
    ('Станция "Останкино"', 55.8200, 37.6100, 'ул. Академика Королева', 'Северо-Восточный', TRUE),
    ('Станция "Кунцево"', 55.7300, 37.4000, 'ул. Молодогвардейская', 'Западный', TRUE),
    ('Станция "Бирюлево"', 55.5800, 37.6700, 'ул. Бирюлевская', 'Южный', TRUE);

-- Insert sample measurements (last 24 hours)
-- PM2.5 measurements
INSERT INTO measurements (location_id, parameter_id, value, measured_at) VALUES
    (1, 1, 28.5, NOW() - INTERVAL '1 hour'),
    (2, 1, 32.0, NOW() - INTERVAL '1 hour'),
    (3, 1, 18.5, NOW() - INTERVAL '1 hour'),
    (4, 1, 25.0, NOW() - INTERVAL '1 hour'),
    (5, 1, 22.5, NOW() - INTERVAL '1 hour'),
    (6, 1, 30.0, NOW() - INTERVAL '1 hour'),
    (7, 1, 15.5, NOW() - INTERVAL '1 hour'),
    (8, 1, 35.5, NOW() - INTERVAL '1 hour');

-- NO2 measurements
INSERT INTO measurements (location_id, parameter_id, value, measured_at) VALUES
    (1, 3, 38.0, NOW() - INTERVAL '1 hour'),
    (2, 3, 42.5, NOW() - INTERVAL '1 hour'),
    (3, 3, 28.0, NOW() - INTERVAL '1 hour'),
    (4, 3, 35.0, NOW() - INTERVAL '1 hour'),
    (5, 3, 30.5, NOW() - INTERVAL '1 hour'),
    (6, 3, 40.0, NOW() - INTERVAL '1 hour'),
    (7, 3, 25.0, NOW() - INTERVAL '1 hour'),
    (8, 3, 45.0, NOW() - INTERVAL '1 hour');

-- CO measurements
INSERT INTO measurements (location_id, parameter_id, value, measured_at) VALUES
    (1, 5, 2.5, NOW() - INTERVAL '1 hour'),
    (2, 5, 3.2, NOW() - INTERVAL '1 hour'),
    (3, 5, 1.8, NOW() - INTERVAL '1 hour'),
    (4, 5, 2.8, NOW() - INTERVAL '1 hour'),
    (5, 5, 2.2, NOW() - INTERVAL '1 hour'),
    (6, 5, 3.0, NOW() - INTERVAL '1 hour'),
    (7, 5, 1.5, NOW() - INTERVAL '1 hour'),
    (8, 5, 3.5, NOW() - INTERVAL '1 hour');

-- Grant permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;

COMMIT;
