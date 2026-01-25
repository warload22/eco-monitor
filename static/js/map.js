/**
 * Map initialization and management for EcoMonitor
 * Uses Leaflet.js for interactive map visualization
 */

let map = null;
let markersLayer = null;
let currentFilters = {
    parameter_id: '',
    location_id: '',
    hours: 24
};

/**
 * Initialize Leaflet map
 */
function initMap() {
    // Center on Moscow
    const moscowCenter = [55.7558, 37.6173];
    
    map = L.map('map').setView(moscowCenter, 10);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Initialize marker layer
    markersLayer = L.layerGroup().addTo(map);
    
    // Load initial data
    loadMeasurements();
}

/**
 * Load measurements from API and display on map
 */
async function loadMeasurements() {
    try {
        // Build query parameters
        const params = new URLSearchParams();
        
        if (currentFilters.parameter_id) {
            params.append('parameter_id', currentFilters.parameter_id);
        }
        
        if (currentFilters.location_id) {
            params.append('location_id', currentFilters.location_id);
        }
        
        // Fetch data from API
        const response = await fetch(`/api/measurements?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch measurements');
        }
        
        const geojson = await response.json();
        
        // Clear existing markers
        markersLayer.clearLayers();
        
        // Add markers for each feature
        if (geojson.features && geojson.features.length > 0) {
            geojson.features.forEach(feature => {
                addMarkerToMap(feature);
            });
            
            // Update last update time
            updateLastUpdateTime();
        } else {
            console.log('No measurements found for current filters');
        }
        
    } catch (error) {
        console.error('Error loading measurements:', error);
        alert('Ошибка загрузки данных. Пожалуйста, попробуйте позже.');
    }
}

/**
 * Add marker to map for a measurement
 * @param {Object} feature - GeoJSON feature
 */
function addMarkerToMap(feature) {
    const coords = feature.geometry.coordinates;
    const props = feature.properties;
    
    // Determine marker color based on safety
    const markerColor = getMarkerColor(props.value, props.safe_limit);
    
    // Create custom icon
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${markerColor};
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    // Create marker
    const marker = L.marker([coords[1], coords[0]], { icon: icon });
    
    // Create popup content
    const popupContent = createPopupContent(props);
    marker.bindPopup(popupContent);
    
    // Add to layer
    marker.addTo(markersLayer);
}

/**
 * Determine marker color based on value and safe limit
 * @param {number} value - Measured value
 * @param {number|null} safeLimit - Safe limit
 * @returns {string} - Hex color code
 */
function getMarkerColor(value, safeLimit) {
    if (!safeLimit) {
        return '#6c757d'; // Gray for unknown
    }
    
    const ratio = value / safeLimit;
    
    if (ratio <= 0.5) {
        return '#28a745'; // Green - Good
    } else if (ratio <= 1.0) {
        return '#ffc107'; // Yellow - Moderate
    } else if (ratio <= 2.0) {
        return '#fd7e14'; // Orange - Unhealthy
    } else {
        return '#dc3545'; // Red - Dangerous
    }
}

/**
 * Create popup content for marker
 * @param {Object} props - Feature properties
 * @returns {string} - HTML content
 */
function createPopupContent(props) {
    const status = props.is_safe ? 
        '<span class="badge bg-success">Норма</span>' : 
        '<span class="badge bg-danger">Превышение</span>';
    
    const measuredDate = new Date(props.measured_at);
    const formattedDate = measuredDate.toLocaleString('ru-RU');
    
    return `
        <div style="min-width: 200px;">
            <h6><strong>${props.location_name}</strong></h6>
            ${props.district ? `<p class="mb-1"><small>📍 ${props.district}</small></p>` : ''}
            <hr class="my-2">
            <p class="mb-1">
                <strong>${props.parameter_name}:</strong><br>
                <span style="font-size: 1.2rem;">${props.value} ${props.unit}</span>
            </p>
            ${props.safe_limit ? `<p class="mb-1"><small>Норма: ${props.safe_limit} ${props.unit}</small></p>` : ''}
            <p class="mb-1">${status}</p>
            <hr class="my-2">
            <p class="mb-0"><small>🕒 ${formattedDate}</small></p>
        </div>
    `;
}

/**
 * Update last update time display
 */
function updateLastUpdateTime() {
    const now = new Date();
    const formatted = now.toLocaleString('ru-RU');
    document.getElementById('lastUpdate').textContent = formatted;
}

/**
 * Apply filters and reload map
 * @param {Object} filters - Filter values
 */
function applyFilters(filters) {
    currentFilters = { ...currentFilters, ...filters };
    loadMeasurements();
}

/**
 * Reset all filters
 */
function resetFilters() {
    currentFilters = {
        parameter_id: '',
        location_id: '',
        hours: 24
    };
    
    // Reset form elements
    document.getElementById('parameterSelect').value = '';
    document.getElementById('locationSelect').value = '';
    document.getElementById('timeRange').value = '24';
    
    loadMeasurements();
}

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    initMap();
});
