/**
 * Модуль управления слоями карты
 * Управляет видимостью и прозрачностью всех слоёв на карте
 */

// Глобальный объект для отслеживания состояния слоёв
const activeLayers = {
    stations: {
        visible: true,
        opacity: 1.0,
        name: 'Станции мониторинга'
    },
    temperature: {
        visible: false,
        opacity: 1.0,
        name: 'Температура (текстовые подписи)'
    },
    wind: {
        visible: false,
        opacity: 0.85,
        name: 'Векторное поле ветра (анимированное)'
    }
};

/**
 * Инициализировать управление слоями
 * Навешивает обработчики на все чекбоксы и слайдеры
 */
function инициализироватьУправлениеСлоями() {
    console.log('[LayersControl] Initializing layers control...');
    
    // Чекбокс для станций мониторинга
    const stationsCheckbox = document.getElementById('toggleStations');
    if (stationsCheckbox) {
        console.log('[LayersControl] Found stations checkbox');
        stationsCheckbox.checked = activeLayers.stations.visible;
        stationsCheckbox.addEventListener('change', function() {
            переключитьСлой('stations', this.checked);
        });
    } else {
        console.warn('[LayersControl] Stations checkbox not found!');
    }
    
    // Чекбокс для текстовых подписей температуры
    const temperatureCheckbox = document.getElementById('toggleTemperature');
    if (temperatureCheckbox) {
        console.log('[LayersControl] Found temperature checkbox');
        temperatureCheckbox.checked = activeLayers.temperature.visible;
        temperatureCheckbox.addEventListener('change', async function() {
            console.log('[LayersControl] Temperature checkbox changed:', this.checked);
            await переключитьСлой('temperature', this.checked);
        });
    } else {
        console.warn('[LayersControl] Temperature checkbox not found!');
    }
    
    // Чекбокс для векторов ветра
    const windCheckbox = document.getElementById('toggleWind');
    if (windCheckbox) {
        console.log('[LayersControl] Found wind checkbox');
        windCheckbox.checked = activeLayers.wind.visible;
        windCheckbox.addEventListener('change', async function() {
            console.log('[LayersControl] Wind checkbox changed:', this.checked);
            await переключитьСлой('wind', this.checked);
        });
    } else {
        console.warn('[LayersControl] Wind checkbox not found!');
    }
    
    // Слайдер прозрачности для температуры (если есть)
    const temperatureOpacitySlider = document.getElementById('temperatureOpacity');
    if (temperatureOpacitySlider) {
        console.log('[LayersControl] Found temperature opacity slider');
        temperatureOpacitySlider.value = activeLayers.temperature.opacity;
        temperatureOpacitySlider.addEventListener('input', function() {
            изменитьПрозрачность('temperature', parseFloat(this.value));
            updateOpacityLabel('temperatureOpacityValue', this.value);
        });
        updateOpacityLabel('temperatureOpacityValue', temperatureOpacitySlider.value);
    }
    
    // Слайдер прозрачности для векторов ветра
    const windOpacitySlider = document.getElementById('windOpacity');
    if (windOpacitySlider) {
        console.log('[LayersControl] Found wind opacity slider');
        windOpacitySlider.value = activeLayers.wind.opacity;
        windOpacitySlider.addEventListener('input', function() {
            изменитьПрозрачность('wind', parseFloat(this.value));
            updateOpacityLabel('windOpacityValue', this.value);
        });
        updateOpacityLabel('windOpacityValue', windOpacitySlider.value);
    }
    
    // Кнопка сброса вида
    const resetViewButton = document.getElementById('resetMapView');
    if (resetViewButton) {
        console.log('[LayersControl] Found reset view button');
        resetViewButton.addEventListener('click', сброситьВидКарты);
    }
    
    console.log('[LayersControl] Layers control initialized successfully');
}

/**
 * Переключить видимость слоя
 * @param {string} имяСлоя - Название слоя ('stations', 'heatmap', 'wind')
 * @param {boolean} состояние - Включить (true) или выключить (false)
 */
async function переключитьСлой(имяСлоя, состояние) {
    console.log(`[LayersControl] Toggle layer "${имяСлоя}" to state: ${состояние}`);
    
    activeLayers[имяСлоя].visible = состояние;
    
    switch(имяСлоя) {
        case 'stations':
            console.log('[LayersControl] Toggling stations layer...');
            // Переключить видимость векторного слоя со станциями
            if (vectorLayer) {
                vectorLayer.setVisible(состояние);
                console.log('[LayersControl] Stations layer visibility set');
            } else {
                console.warn('[LayersControl] vectorLayer not found!');
            }
            break;
            
        case 'temperature':
            console.log('[LayersControl] Toggling temperature labels layer...');
            console.log('[LayersControl] Function переключитьТекстыТемпературы exists?', typeof переключитьТекстыТемпературы);
            console.log('[LayersControl] Map object exists?', !!map);
            
            // Переключить текстовые подписи температуры (используем функцию из weatherLayers.js)
            if (typeof переключитьТекстыТемпературы === 'function' && map) {
                await переключитьТекстыТемпературы(map, состояние);
                console.log('[LayersControl] Temperature labels toggle complete');
            } else {
                console.error('[LayersControl] Cannot toggle temperature - function or map missing');
            }
            break;
            
        case 'wind':
            console.log('[LayersControl] Toggling wind layer...');
            console.log('[LayersControl] Function переключитьВекторыВетра exists?', typeof переключитьВекторыВетра);
            console.log('[LayersControl] Map object exists?', !!map);
            
            // Переключить векторы ветра (используем функцию из weatherLayers.js)
            if (typeof переключитьВекторыВетра === 'function' && map) {
                await переключитьВекторыВетра(map, состояние);
                console.log('[LayersControl] Wind toggle complete');
            } else {
                console.error('[LayersControl] Cannot toggle wind - function or map missing');
            }
            break;
    }
    
    // Обновить легенду
    if (typeof обновитьЛегенду === 'function') {
        console.log('[LayersControl] Updating legend...');
        обновитьЛегенду();
    } else {
        console.warn('[LayersControl] Legend update function not found');
    }
}

/**
 * Изменить прозрачность слоя
 * @param {string} имяСлоя - Название слоя ('temperature', 'wind')
 * @param {number} значение - Значение прозрачности (0.0 - 1.0)
 */
function изменитьПрозрачность(имяСлоя, значение) {
    console.log(`Изменение прозрачности слоя "${имяСлоя}" на ${значение}`);
    
    activeLayers[имяСлоя].opacity = значение;
    
    switch(имяСлоя) {
        case 'temperature':
            if (temperatureLabelsLayer) {
                temperatureLabelsLayer.setOpacity(значение);
            }
            break;
            
        case 'wind':
            if (windVectorsLayer) {
                windVectorsLayer.setOpacity(значение);
            }
            break;
    }
}

/**
 * Обновить отображение значения прозрачности рядом со слайдером
 * @param {string} elementId - ID элемента для отображения значения
 * @param {number} value - Значение прозрачности
 */
function updateOpacityLabel(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = `${Math.round(value * 100)}%`;
    }
}

/**
 * Сбросить вид карты к значениям по умолчанию
 * Центрирует карту на Москве и устанавливает zoom = 10
 */
function сброситьВидКарты() {
    if (!map) {
        console.error('Карта не инициализирована');
        return;
    }
    
    console.log('Сброс вида карты...');
    
    // Координаты Москвы
    const moscowCoords = [37.6173, 55.7558];
    const moscowCoordsProjected = ol.proj.fromLonLat(moscowCoords);
    
    // Анимированный переход к новому виду
    map.getView().animate({
        center: moscowCoordsProjected,
        zoom: 10,
        duration: 1000
    });
    
    console.log('Вид карты сброшен');
}

/**
 * Получить состояние всех слоёв
 * @returns {Object} Объект с состоянием слоёв
 */
function получитьСостояниеСлоёв() {
    return { ...activeLayers };
}

/**
 * Получить список активных (видимых) слоёв
 * @returns {Array} Массив названий активных слоёв
 */
function получитьАктивныеСлои() {
    return Object.keys(activeLayers).filter(key => activeLayers[key].visible);
}
