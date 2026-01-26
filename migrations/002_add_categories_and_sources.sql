-- Migration: Add categories and data sources support
-- This migration extends the database schema to support multiple ecological parameter categories
-- and tracks data sources for measurements

BEGIN;

-- Step 1: Create data_sources table
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Add category column to parameters table
ALTER TABLE parameters 
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Step 3: Add source_id and extra_data columns to measurements table
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS source_id INTEGER REFERENCES data_sources(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS extra_data JSONB;

-- Step 4: Update existing parameters with 'качество_воздуха' category
UPDATE parameters 
SET category = 'качество_воздуха' 
WHERE category IS NULL;

-- Step 5: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_measurements_source ON measurements(source_id);
CREATE INDEX IF NOT EXISTS idx_measurements_extra_data ON measurements USING gin(extra_data);
CREATE INDEX IF NOT EXISTS idx_parameters_category ON parameters(category);

-- Step 6: Insert default data sources
INSERT INTO data_sources (name, url, description) VALUES
    ('Manual Entry', NULL, 'Manually entered measurements'),
    ('OpenWeatherMap API', 'https://openweathermap.org/api', 'Weather and air quality data from OpenWeatherMap'),
    ('Roshydromet', 'https://www.meteorf.gov.ru/', 'Russian Federal Service for Hydrometeorology and Environmental Monitoring'),
    ('SafeCast', 'https://safecast.org/', 'Radiation monitoring network'),
    ('Local Sensors', NULL, 'Data from local monitoring stations')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- Verification queries (commented out, run manually if needed)
-- SELECT * FROM data_sources;
-- SELECT name, category, unit FROM parameters ORDER BY category, name;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'measurements';
