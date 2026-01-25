/**
 * Filter handling for map view
 * Manages user interactions with filter controls
 */

/**
 * Apply filters button click handler
 */
document.getElementById('applyFilters').addEventListener('click', function() {
    const filters = {
        parameter_id: document.getElementById('parameterSelect').value,
        location_id: document.getElementById('locationSelect').value,
        hours: parseInt(document.getElementById('timeRange').value)
    };
    
    applyFilters(filters);
});

/**
 * Reset filters button click handler
 */
document.getElementById('resetFilters').addEventListener('click', function() {
    resetFilters();
});

/**
 * Auto-refresh functionality (optional)
 * Uncomment to enable auto-refresh every 5 minutes
 */
/*
setInterval(function() {
    console.log('Auto-refreshing map data...');
    loadMeasurements();
}, 5 * 60 * 1000); // 5 minutes
*/

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', function(event) {
    // Ctrl+R or Cmd+R - Refresh data (prevent default browser reload)
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        loadMeasurements();
    }
});
