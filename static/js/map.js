/**
 * Map initialization and management for EcoMonitor
 * Uses OpenLayers for interactive map visualization
 */

let map = null;
let vectorSource = null;
let vectorLayer = null;
let popupOverlay = null;
let currentFilters = {
    parameter_id: '',
    location_id: '',
    hours: 24
};

/**
 * Initialize OpenLayers map
 */
function initMap() {
    // Create popup overlay element
    const popupElement = document.createElement('div');
    popupElement.id = 'popup';
    popupElement.className = 'ol-popup';
    document.body.appendChild(popupElement);
    
    // Create popup closer button
    const popupCloser = document.createElement('a');
    popupCloser.href = '#';
    popupCloser.className = 'ol-popup-closer';
    popupCloser.innerHTML = '×';
    popupElement.appendChild(popupCloser);
    
    // Create popup content container
    const popupContent = document.createElement('div');
    popupContent.id = 'popup-content';
    popupElement.appendChild(popupContent);
    
    // Create popup overlay
    popupOverlay = new ol.Overlay({
        element: popupElement,
        autoPan: {
            animation: {
                duration: 250
            }
        }
    });
    
    // Popup closer handler
    popupCloser.onclick = function() {
        popupOverlay.setPosition(undefined);
        popupCloser.blur();
        return false;
    };
    
    // Create vector source and layer for markers
    vectorSource = new ol.source.Vector();
    
    vectorLayer = new ol.layer.Vector({
        source: vectorSource
    });
    
    // Center on Moscow (longitude, latitude in EPSG:4326)
    const moscowCoords = [37.6173, 55.7558];
    const moscowCoordsProjected = ol.proj.fromLonLat(moscowCoords);
    
    // Create map
    map = new ol.Map({
        target: 'map',
        layers: [
            // OpenStreetMap tile layer
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            // Vector layer for markers
            vectorLayer
        ],
        overlays: [popupOverlay],
        view: new ol.View({
            center: moscowCoordsProjected,
            zoom: 10
        })
    });
    
    // Click handler for markers
    map.on('click', function(event) {
        const feature = map.forEachFeatureAtPixel(event.pixel, function(feature) {
            return feature;
        });
        
        if (feature) {
            const coordinates = feature.getGeometry().getCoordinates();
            const props = feature.get('properties');
            
            popupContent.innerHTML = createPopupContent(props);
            popupOverlay.setPosition(coordinates);
        } else {
            popupOverlay.setPosition(undefined);
        }
    });
    
    // Change cursor on hover
    map.on('pointermove', function(event) {
        const pixel = map.getEventPixel(event.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel);
        map.getTarget().style.cursor = hit ? 'pointer' : '';
    });
    
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
        vectorSource.clear();
        
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
    const coords = feature.geometry.coordinates; // [longitude, latitude]
    const props = feature.properties;
    
    // Determine marker color based on safety
    const markerColor = getMarkerColor(props.value, props.safe_limit);
    
    // Create point geometry (convert from EPSG:4326 to EPSG:3857)
    const point = new ol.geom.Point(ol.proj.fromLonLat(coords));
    
    // Create feature
    const olFeature = new ol.Feature({
        geometry: point,
        properties: props
    });
    
    // Create marker style
    const markerStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 15,
            fill: new ol.style.Fill({
                color: markerColor
            }),
            stroke: new ol.style.Stroke({
                color: '#ffffff',
                width: 3
            })
        })
    });
    
    olFeature.setStyle(markerStyle);
    
    // Add to vector source
    vectorSource.addFeature(olFeature);
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
