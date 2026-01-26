/**
 * Модуль управления слоями карты (упрощённая версия)
 * Управляет видимостью слоёв: станции, температура, ветер
 */

// Глобальный объект для отслеживания состояния слоёв
const activeLayers = {
    stations: {
        visible: true,
        name: 'Станции мониторинга'
    },
    temperature: {
        visible: false,
        name: 'Температура воздуха'
    },
    wind: {
        visible: false,
        name: 'Направление ветра'
    }
};

/**
 * Инициализировать управление слоями
 * Навешивает обработчики на все чекбоксы
 */
function инициализироватьУправлениеСлоями() {
    console.log('[LayersControl] Инициализация управления слоями...');
    
    // Чекбокс для станций мониторинга
    const stationsCheckbox = document.getElementById('toggleStations');
    if (stationsCheckbox) {
        stationsCheckbox.checked = activeLayers.stations.visible;
        stationsCheckbox.addEventListener('change', function() {
            переключитьСлой('stations', this.checked);
        });
        console.log('[LayersControl] ✓ Чекбокс станций настроен');
    }
    
    // Чекбокс для температуры
    const temperatureCheckbox = document.getElementById('toggleTemperature');
    if (temperatureCheckbox) {
        temperatureCheckbox.checked = activeLayers.temperature.visible;
        temperatureCheckbox.addEventListener('change', async function() {
            await переключитьСлой('temperature', this.checked);
        });
        console.log('[LayersControl] ✓ Чекбокс температуры настроен');
    }
    
    // Чекбокс для ветра
    const windCheckbox = document.getElementById('toggleWind');
    if (windCheckbox) {
        windCheckbox.checked = activeLayers.wind.visible;
        windCheckbox.addEventListener('change', async function() {
            await переключитьСлой('wind', this.checked);
        });
        console.log('[LayersControl] ✓ Чекбокс ветра настроен');
    }
    
    // Кнопка сброса вида
    const resetViewButton = document.getElementById('resetMapView');
    if (resetViewButton) {
        resetViewButton.addEventListener('click', сброситьВидКарты);
        console.log('[LayersControl] ✓ Кнопка сброса настроена');
    }
    
    console.log('[LayersControl] ✅ Инициализация завершена');
}

/**
 * Переключить видимость слоя
 * @param {string} имяСлоя - Название слоя ('stations', 'temperature', 'wind')
 * @param {boolean} состояние - Включить (true) или выключить (false)
 */
async function переключитьСлой(имяСлоя, состояние) {
    console.log(`[LayersControl] Переключение слоя "${имяСлоя}": ${состояние}`);
    
    activeLayers[имяСлоя].visible = состояние;
    
    switch(имяСлоя) {
        case 'stations':
            if (typeof vectorLayer !== 'undefined' && vectorLayer) {
                vectorLayer.setVisible(состояние);
                console.log('[LayersControl] Станции:', состояние ? 'показаны' : 'скрыты');
            }
            break;
            
        case 'temperature':
            if (typeof переключитьТекстыТемпературы === 'function' && typeof map !== 'undefined') {
                await переключитьТекстыТемпературы(map, состояние);
            } else {
                console.error('[LayersControl] Функция переключитьТекстыТемпературы не найдена');
            }
            break;
            
        case 'wind':
            if (typeof переключитьВекторыВетра === 'function' && typeof map !== 'undefined') {
                await переключитьВекторыВетра(map, состояние);
            } else {
                console.error('[LayersControl] Функция переключитьВекторыВетра не найдена');
            }
            break;
    }
    
    // Обновить легенду
    if (typeof обновитьЛегенду === 'function') {
        обновитьЛегенду();
    }
}

/**
 * Сбросить вид карты к значениям по умолчанию
 * Центрирует карту на Москве и устанавливает zoom = 10
 */
function сброситьВидКарты() {
    if (typeof map === 'undefined' || !map) {
        console.error('[LayersControl] Карта не инициализирована');
        return;
    }
    
    console.log('[LayersControl] Сброс вида карты...');
    
    // Координаты Москвы
    const moscowCoords = [37.6173, 55.7558];
    const moscowCoordsProjected = ol.proj.fromLonLat(moscowCoords);
    
    // Анимированный переход
    map.getView().animate({
        center: moscowCoordsProjected,
        zoom: 10,
        duration: 800
    });
    
    console.log('[LayersControl] ✅ Вид сброшен');
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

console.log('[LayersControl] Модуль загружен');
