/**
 * Обработка фильтров для карты
 * Управляет взаимодействием пользователя с элементами управления фильтрами
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
        
        // Добавить параметры из API (используем русифицированное имя, если есть)
        параметры.forEach(param => {
            const option = document.createElement('option');
            option.value = param.id;
            // Используем name_ru, если доступно, иначе name
            const displayName = param.name_ru || param.name;
            option.textContent = `${displayName}, ${param.unit}`;
            selectElement.appendChild(option);
        });
        
        console.log(t ? t('console.parametersLoaded', {count: параметры.length}) : `Загружено ${параметры.length} параметр(ов)`);
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
        
        console.log(t ? t('console.locationsLoaded', {count: локации.length}) : `Загружено ${локации.length} локаци(й)`);
    } catch (error) {
        console.error('Ошибка загрузки локаций:', error);
        const selectElement = document.getElementById('locationSelect');
        selectElement.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

/**
 * Обработчик клика на кнопку применения фильтров
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
 * Обработчик клика на кнопку сброса фильтров
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
    
    console.log(t ? t('console.filtersInitialized') : 'Фильтры успешно инициализированы');
});

/**
 * Функция автообновления (опционально)
 * Раскомментируйте для включения автообновления каждые 5 минут
 */
/*
setInterval(function() {
    console.log('Автообновление данных карты...');
    loadMeasurements();
}, 5 * 60 * 1000); // 5 минут
*/

/**
 * Клавиатурные сокращения
 */
document.addEventListener('keydown', function(event) {
    // Ctrl+R или Cmd+R - Обновить данные (предотвращаем перезагрузку браузера по умолчанию)
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        loadMeasurements();
    }
});
