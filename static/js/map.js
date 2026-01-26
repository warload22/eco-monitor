/**
 * Инициализация и управление картой для EcoMonitor
 * Использует OpenLayers для интерактивной визуализации карты
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
let isLoading = false;

/**
 * Инициализировать карту OpenLayers
 */
function initMap() {
    // Создать элемент всплывающего окна
    const popupElement = document.createElement('div');
    popupElement.id = 'popup';
    popupElement.className = 'ol-popup';
    document.body.appendChild(popupElement);
    
    // Создать кнопку закрытия всплывающего окна
    const popupCloser = document.createElement('a');
    popupCloser.href = '#';
    popupCloser.className = 'ol-popup-closer';
    popupCloser.innerHTML = '×';
    popupElement.appendChild(popupCloser);
    
    // Создать контейнер для содержимого всплывающего окна
    const popupContent = document.createElement('div');
    popupContent.id = 'popup-content';
    popupElement.appendChild(popupContent);
    
    // Создать оверлей для всплывающего окна
    popupOverlay = new ol.Overlay({
        element: popupElement,
        autoPan: {
            animation: {
                duration: 250
            }
        }
    });
    
    // Обработчик закрытия всплывающего окна
    popupCloser.onclick = function() {
        popupOverlay.setPosition(undefined);
        popupCloser.blur();
        return false;
    };
    
    // Создать векторный источник и слой для маркеров
    vectorSource = new ol.source.Vector();
    
    vectorLayer = new ol.layer.Vector({
        source: vectorSource
    });
    
    // Центрировать на Москве (долгота, широта в EPSG:4326)
    const moscowCoords = [37.6173, 55.7558];
    const moscowCoordsProjected = ol.proj.fromLonLat(moscowCoords);
    
    // Создать карту
    map = new ol.Map({
        target: 'map',
        layers: [
            // Слой OpenStreetMap
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            // Векторный слой для маркеров
            vectorLayer
        ],
        overlays: [popupOverlay],
        view: new ol.View({
            center: moscowCoordsProjected,
            zoom: 10
        })
    });
    
    // Инициализировать погодные слои
    инициализироватьПогодныеСлои(map);
    
    // Обработчик клика для маркеров
    map.on('click', function(event) {
        const feature = map.forEachFeatureAtPixel(event.pixel, function(feature) {
            return feature;
        });
        
        if (feature) {
            const coordinates = feature.getGeometry().getCoordinates();
            const props = feature.get('properties');
            
            if (props) {
                popupContent.innerHTML = createPopupContent(props);
                popupOverlay.setPosition(coordinates);
            }
        } else {
            popupOverlay.setPosition(undefined);
        }
    });
    
    // Изменить курсор при наведении
    map.on('pointermove', function(event) {
        const pixel = map.getEventPixel(event.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel);
        const mapTarget = map.getTarget();
        if (mapTarget && typeof mapTarget === 'string') {
            const element = document.getElementById(mapTarget);
            if (element) element.style.cursor = hit ? 'pointer' : '';
        } else if (mapTarget) {
            mapTarget.style.cursor = hit ? 'pointer' : '';
        }
    });
    
    // Инициализировать погодные слои
    if (typeof инициализироватьПогодныеСлои === 'function') {
        console.log('Инициализация погодных слоев...');
        инициализироватьПогодныеСлои(map);
    }
    
    // Инициализировать систему частиц ветра
    if (typeof инициализироватьЧастицыВетра === 'function') {
        console.log('Инициализация системы частиц ветра...');
        инициализироватьЧастицыВетра(map);
    }
    
    // Загрузить начальные данные
    loadMeasurements();
    
    console.log(t ? t('console.mapInitialized') : 'Карта инициализирована');
}

/**
 * Показать индикатор загрузки
 */
function showLoadingIndicator() {
    isLoading = true;
    const applyButton = document.getElementById('applyFilters');
    if (applyButton) {
        applyButton.disabled = true;
        applyButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Загрузка...';
    }
}

/**
 * Скрыть индикатор загрузки
 */
function hideLoadingIndicator() {
    isLoading = false;
    const applyButton = document.getElementById('applyFilters');
    if (applyButton) {
        applyButton.disabled = false;
        applyButton.innerHTML = 'Применить фильтры';
    }
}

// Функция setupWeatherLayersControls() удалена - логика перенесена в layersControl.js

/**
 * Загрузить измерения из API и отобразить на карте
 */
async function loadMeasurements() {
    // Предотвратить одновременные запросы
    if (isLoading) {
        console.log(t ? t('console.requestInProgress') : 'Запрос уже выполняется, пропускаем...');
        return;
    }
    
    try {
        // Показать индикатор загрузки
        showLoadingIndicator();
        
        // Построить параметры запроса
        const params = new URLSearchParams();
        
        if (currentFilters.parameter_id) {
            params.append('parameter_id', currentFilters.parameter_id);
        }
        
        if (currentFilters.location_id) {
            params.append('location_id', currentFilters.location_id);
        }
        
        // Добавить временной фильтр (часы), если нужно
        // API пока не поддерживает hours, но можем добавить для будущего расширения
        
        // Получить данные из API
        const response = await fetch(`/api/measurements?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error('Не удалось получить измерения');
        }
        
        const geojson = await response.json();
        
        // ВАЖНО: Очистить все старые маркеры перед добавлением новых
        vectorSource.clear();
        
        // Закрыть popup, если открыт
        if (popupOverlay) {
            popupOverlay.setPosition(undefined);
        }
        
        // Добавить маркеры для каждой точки
        if (geojson.features && geojson.features.length > 0) {
            geojson.features.forEach(feature => {
                addMarkerToMap(feature);
            });
            
            // Обновить счетчик станций
            updateStationCount(geojson.features.length);
            
            // Обновить время последнего обновления
            updateLastUpdateTime();
            
            console.log(t ? t('console.measurementsLoaded', {count: geojson.features.length}) : `Загружено ${geojson.features.length} измерени(й)`);
        } else {
            console.log(t ? t('console.noMeasurements') : 'Нет измерений для текущих фильтров');
            updateStationCount(0);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки измерений:', error);
        alert(t ? t('map.error') : 'Ошибка загрузки данных. Пожалуйста, попробуйте позже.');
    } finally {
        // Скрыть индикатор загрузки
        hideLoadingIndicator();
    }
}

/**
 * Добавить маркер на карту для измерения
 * @param {Object} feature - GeoJSON feature
 */
function addMarkerToMap(feature) {
    const coords = feature.geometry.coordinates; // [долгота, широта]
    const props = feature.properties;
    
    // Определить цвет маркера на основе безопасности
    const markerColor = getMarkerColor(props.value, props.safe_limit);
    
    // Создать геометрию точки (конвертировать из EPSG:4326 в EPSG:3857)
    const point = new ol.geom.Point(ol.proj.fromLonLat(coords));
    
    // Создать feature
    const olFeature = new ol.Feature({
        geometry: point,
        properties: props
    });
    
    // Создать стиль маркера
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
    
    // Добавить в векторный источник
    vectorSource.addFeature(olFeature);
}

/**
 * Определить цвет маркера на основе значения и безопасного предела
 * @param {number} value - Измеренное значение
 * @param {number|null} safeLimit - Безопасный предел
 * @returns {string} - Hex код цвета
 */
function getMarkerColor(value, safeLimit) {
    if (!safeLimit) {
        return '#6c757d'; // Серый для неизвестных
    }
    
    const ratio = value / safeLimit;
    
    if (ratio <= 0.5) {
        return '#28a745'; // Зеленый - Хорошо
    } else if (ratio <= 1.0) {
        return '#ffc107'; // Желтый - Умеренно
    } else if (ratio <= 2.0) {
        return '#fd7e14'; // Оранжевый - Нездорово
    } else {
        return '#dc3545'; // Красный - Опасно
    }
}

/**
 * Создать содержимое всплывающего окна для маркера
 * @param {Object} props - Свойства feature
 * @returns {string} - HTML содержимое
 */
function createPopupContent(props) {
    // Определить статус
    const status = props.is_safe ? 
        '<span class="badge bg-success">✓ Норма</span>' : 
        '<span class="badge bg-danger">⚠ Превышение</span>';
    
    // Форматировать дату и время
    const measuredDate = new Date(props.measured_at);
    const formattedDate = measuredDate.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Вычислить процент от нормы
    let percentageInfo = '';
    let progressBar = '';
    if (props.safe_limit && props.safe_limit > 0) {
        const percentage = ((props.value / props.safe_limit) * 100).toFixed(1);
        const percentageColor = props.is_safe ? '#28a745' : '#dc3545';
        const progressBarColor = props.is_safe ? 'success' : 'danger';
        const progressBarWidth = Math.min(percentage, 100);
        
        percentageInfo = `
            <p class="mb-2">
                <small>
                    Процент от нормы: 
                    <strong style="color: ${percentageColor};">${percentage}%</strong>
                </small>
            </p>
        `;
        
        progressBar = `
            <div class="progress mb-2" style="height: 8px;">
                <div class="progress-bar bg-${progressBarColor}" 
                     role="progressbar" 
                     style="width: ${progressBarWidth}%" 
                     aria-valuenow="${progressBarWidth}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                </div>
            </div>
        `;
    }
    
    // Определить уровень качества воздуха
    let qualityLevel = '';
    if (props.safe_limit && props.safe_limit > 0) {
        const ratio = props.value / props.safe_limit;
        if (ratio <= 0.5) {
            qualityLevel = '<span class="badge bg-success mb-2">🌟 Отличное качество</span>';
        } else if (ratio <= 1.0) {
            qualityLevel = '<span class="badge bg-warning text-dark mb-2">⚠️ Удовлетворительное</span>';
        } else if (ratio <= 2.0) {
            qualityLevel = '<span class="badge bg-orange text-white mb-2" style="background-color: #fd7e14;">⚠️ Нездоровое</span>';
        } else {
            qualityLevel = '<span class="badge bg-danger mb-2">☠️ Опасное</span>';
        }
    }
    
    return `
        <div style="min-width: 280px; max-width: 320px;">
            <div class="d-flex align-items-center mb-2">
                <h6 class="mb-0 flex-grow-1"><strong>📍 ${props.location_name || 'Станция мониторинга'}</strong></h6>
            </div>
            ${props.district ? `<p class="mb-2 text-muted"><small>📌 ${props.district}</small></p>` : ''}
            ${qualityLevel}
            <hr class="my-2">
            <div class="mb-2">
                <strong>Параметр:</strong> ${props.parameter_name}
            </div>
            <div class="mb-2">
                <strong>Значение:</strong> 
                <span style="font-size: 1.4rem; color: #0066cc; font-weight: 600;">${props.value} ${props.unit}</span>
            </div>
            ${props.safe_limit ? `
                <div class="mb-1">
                    <small class="text-muted">Норматив: <strong>${props.safe_limit} ${props.unit}</strong></small>
                </div>
            ` : ''}
            ${progressBar}
            ${percentageInfo}
            <div class="mb-2">${status}</div>
            <hr class="my-2">
            <div class="text-muted">
                <small><strong>⏱️ Время измерения:</strong><br>${formattedDate}</small>
            </div>
            <div class="mt-2">
                <small class="text-muted" style="font-style: italic;">
                    💡 Нажмите на карту, чтобы закрыть
                </small>
            </div>
        </div>
    `;
}

/**
 * Обновить отображение количества станций
 * @param {number} count - Количество станций
 */
function updateStationCount(count) {
    const stationCountElement = document.getElementById('stationCount');
    if (stationCountElement) {
        stationCountElement.textContent = count;
    }
}

/**
 * Обновить отображение времени последнего обновления
 */
function updateLastUpdateTime() {
    const now = new Date();
    const formatted = now.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = formatted;
    }
}

/**
 * Применить фильтры и перезагрузить карту
 * @param {Object} filters - Значения фильтров
 */
function applyFilters(filters) {
    currentFilters = { ...currentFilters, ...filters };
    loadMeasurements();
}

/**
 * Сбросить все фильтры
 */
function resetFilters() {
    currentFilters = {
        parameter_id: '',
        location_id: '',
        hours: 24
    };
    
    // Сбросить элементы формы
    document.getElementById('parameterSelect').value = '';
    document.getElementById('locationSelect').value = '';
    document.getElementById('timeRange').value = '24';
    
    loadMeasurements();
}

// Инициализировать карту при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initMap();
});
