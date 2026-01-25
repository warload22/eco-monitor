/**
 * Filter handling for map view
 * Manages user interactions with filter controls
 */

/**
 * Загрузить параметры из API и заполнить выпадающий список
 */
async function загрузитьПараметры() {
    try {
        const response = await fetch('/api/parameters');
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить параметры');
        }
        
        const параметры = await response.json();
        const selectElement = document.getElementById('parameterSelect');
        
        // Очистить текущие опции
        selectElement.innerHTML = '<option value="">Все параметры</option>';
        
        // Добавить параметры из API
        параметры.forEach(param => {
            const option = document.createElement('option');
            option.value = param.id;
            option.textContent = `${param.name} (${param.unit})`;
            selectElement.appendChild(option);
        });
        
        console.log(`Загружено ${параметры.length} параметр(ов)`);
    } catch (error) {
        console.error('Ошибка загрузки параметров:', error);
        const selectElement = document.getElementById('parameterSelect');
        selectElement.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

/**
 * Загрузить локации (станции мониторинга) из API и заполнить выпадающий список
 */
async function загрузитьЛокации() {
    try {
        const response = await fetch('/api/locations');
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить локации');
        }
        
        const локации = await response.json();
        const selectElement = document.getElementById('locationSelect');
        
        // Очистить текущие опции
        selectElement.innerHTML = '<option value="">Все станции</option>';
        
        // Добавить локации из API
        локации.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc.id;
            option.textContent = loc.name;
            if (loc.district) {
                option.textContent += ` (${loc.district})`;
            }
            selectElement.appendChild(option);
        });
        
        console.log(`Загружено ${локации.length} локаци(й)`);
    } catch (error) {
        console.error('Ошибка загрузки локаций:', error);
        const selectElement = document.getElementById('locationSelect');
        selectElement.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

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
 * Инициализация фильтров при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', async function() {
    // Загружаем параметры и локации параллельно
    await Promise.all([
        загрузитьПараметры(),
        загрузитьЛокации()
    ]);
    
    console.log('Фильтры успешно инициализированы');
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
