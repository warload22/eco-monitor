/**
 * Модуль для работы с погодными слоями на карте
 * Включает тепловую карту температуры и векторное поле ветра
 */

// Глобальные переменные для слоев
let heatmapLayer = null;
let windVectorsLayer = null;
let isHeatmapLoaded = false;
let isWindVectorsLoaded = false;

/**
 * Создать слой тепловой карты для температуры
 * @returns {ol.layer.Heatmap} Слой тепловой карты
 */
function создатьТепловуюКарту() {
    // Создаем источник для тепловой карты
    const heatmapSource = new ol.source.Vector();
    
    // Создаем слой тепловой карты с улучшенной визуализацией
    const layer = new ol.layer.Heatmap({
        source: heatmapSource,
        blur: 25,  // Увеличено размытие для более плавных переходов
        radius: 30,  // Оптимальный радиус
        weight: function(feature) {
            // Вес точки влияет на интенсивность цвета
            // Нормализуем температуру к диапазону 0-1
            const temp = feature.get('temperature');
            // Узкий диапазон для реальных температур Москвы (зимой/весной)
            const minTemp = 10;   // 10°C - холодно
            const maxTemp = 25;   // 25°C - тепло
            
            // Ограничиваем значения диапазоном
            const normalized = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));
            
            console.log(`[Heatmap] Temp: ${temp}°C, normalized: ${normalized.toFixed(2)}`);
            return normalized;
        },
        gradient: [
            // Градиент на основе метеорологических стандартов (как Windy.com, Ventusky.com)
            '#313695',  // Темно-синий (очень холодно)
            '#4575b4',  // Синий
            '#74add1',  // Светло-синий  
            '#abd9e9',  // Голубой
            '#e0f3f8',  // Бледно-голубой
            '#ffffbf',  // Желтовато-белый (нейтрально)
            '#fee090',  // Светло-желтый
            '#fdae61',  // Желто-оранжевый
            '#f46d43',  // Оранжевый
            '#d73027',  // Красно-оранжевый
            '#a50026'   // Темно-красный (очень тепло)
        ],
        opacity: 0.5,  // Немного снижена для лучшей читаемости карты
        visible: false  // По умолчанию скрыт
    });
    
    return layer;
}

/**
 * Загрузить данные температурной сетки с сервера
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 */
async function загрузитьТепловуюКарту(map) {
    try {
        console.log('[Heatmap] Loading temperature data...');
        
        // Получаем границы видимой области карты
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const [minLon, minLat, maxLon, maxLat] = ol.proj.transformExtent(
            extent, 
            'EPSG:3857', 
            'EPSG:4326'
        );
        
        console.log('[Heatmap] Map bounds:', { minLon, minLat, maxLon, maxLat });
        
        // Запрос к API
        const params = new URLSearchParams({
            parameter: 'temperature',
            min_lat: minLat.toFixed(4),
            max_lat: maxLat.toFixed(4),
            min_lon: minLon.toFixed(4),
            max_lon: maxLon.toFixed(4),
            grid_size: 20
        });
        
        const url = `/api/weather/map-grid?${params.toString()}`;
        console.log('[Heatmap] Fetching from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const данные = await response.json();
        console.log('[Heatmap] Received data:', данные);
        
        // Получаем источник данных слоя
        const source = heatmapLayer.getSource();
        console.log('[Heatmap] Layer source:', source);
        
        source.clear();
        console.log('[Heatmap] Source cleared');
        
        // Добавляем точки на карту
        let addedFeatures = 0;
        данные.data.forEach(точка => {
            const coords = ol.proj.fromLonLat([точка.lon, точка.lat]);
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(coords),
                temperature: точка.value
            });
            source.addFeature(feature);
            addedFeatures++;
        });
        
        console.log(`[Heatmap] Added ${addedFeatures} features to source`);
        console.log(`[Heatmap] Source now has ${source.getFeatures().length} features`);
        console.log(`[Heatmap] Layer visibility: ${heatmapLayer.getVisible()}`);
        console.log(`[Heatmap] Layer opacity: ${heatmapLayer.getOpacity()}`);
        
        isHeatmapLoaded = true;
        
        // Показываем уведомление
        показатьУведомление(`Heatmap loaded: ${данные.count} points`, 'success');
        
    } catch (error) {
        console.error('[Heatmap] Loading error:', error);
        показатьУведомление('Heatmap loading error', 'danger');
        isHeatmapLoaded = false;
    }
}

/**
 * Создать стиль для стрелки ветра
 * @param {number} speed - Скорость ветра (м/с)
 * @param {number} direction - Направление ветра (градусы)
 * @returns {ol.style.Style} Стиль для отображения вектора
 */
function создатьСтильСтрелкиВетра(speed, direction) {
    // Определяем цвет и размер на основе скорости ветра (по шкале Бофорта)
    let цвет, размер;
    
    if (speed < 1) {
        // Штиль
        цвет = '#d0d0d0';
        размер = 6;
    } else if (speed < 3) {
        // Легкий ветер
        цвет = '#74add1';  
        размер = 8;
    } else if (speed < 6) {
        // Слабый ветер
        цвет = '#4575b4';
        размер = 10;
    } else if (speed < 10) {
        // Умеренный ветер
        цвет = '#fdae61';
        размер = 12;
    } else if (speed < 15) {
        // Свежий ветер
        цвет = '#f46d43';
        размер = 14;
    } else {
        // Сильный ветер
        цвет = '#d73027';
        размер = 16;
    }
    
    // Конвертируем направление в радианы
    // Метеорологическое направление: откуда дует ветер
    // OpenLayers: 0° = восток, поворот против часовой стрелки
    // Преобразование: метео 0°(север) -> OL 90°
    const радианы = ((90 - direction) * Math.PI) / 180;
    
    return new ol.style.Style({
        image: new ol.style.RegularShape({
            fill: new ol.style.Fill({ color: цвет }),
            stroke: new ol.style.Stroke({ 
                color: '#ffffff', 
                width: 2 
            }),
            points: 3,  // Треугольник (стрелка)
            radius: размер,
            rotation: радианы,
            angle: 0,
            rotateWithView: false  // Стрелка не вращается при повороте карты
        })
    });
}

/**
 * Создать слой векторов ветра
 * @returns {ol.layer.Vector} Слой с векторами ветра
 */
function создатьСлойВекторовВетра() {
    const vectorSource = new ol.source.Vector();
    
    const layer = new ol.layer.Vector({
        source: vectorSource,
        style: function(feature) {
            const speed = feature.get('speed');
            const direction = feature.get('direction');
            return создатьСтильСтрелкиВетра(speed, direction);
        },
        opacity: 0.8,
        visible: false  // По умолчанию скрыт
    });
    
    return layer;
}

/**
 * Загрузить векторы ветра с сервера
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 */
async function загрузитьВекторыВетра(map) {
    try {
        console.log('[Wind] Loading wind vectors...');
        
        // Получаем границы видимой области
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const [minLon, minLat, maxLon, maxLat] = ol.proj.transformExtent(
            extent, 
            'EPSG:3857', 
            'EPSG:4326'
        );
        
        console.log('[Wind] Map bounds:', { minLon, minLat, maxLon, maxLat });
        
        // Запрос к API
        const params = new URLSearchParams({
            min_lat: minLat.toFixed(4),
            max_lat: maxLat.toFixed(4),
            min_lon: minLon.toFixed(4),
            max_lon: maxLon.toFixed(4),
            grid_size: 12
        });
        
        const url = `/api/weather/wind-vectors?${params.toString()}`;
        console.log('[Wind] Fetching from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const данные = await response.json();
        console.log('[Wind] Received data:', данные);
        
        // Получаем источник данных слоя
        const source = windVectorsLayer.getSource();
        console.log('[Wind] Layer source:', source);
        
        source.clear();
        console.log('[Wind] Source cleared');
        
        // Добавляем векторы на карту
        let addedFeatures = 0;
        данные.data.forEach(вектор => {
            const coords = ol.proj.fromLonLat([вектор.lon, вектор.lat]);
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(coords),
                speed: вектор.speed,
                direction: вектор.direction
            });
            source.addFeature(feature);
            addedFeatures++;
        });
        
        console.log(`[Wind] Added ${addedFeatures} features to source`);
        console.log(`[Wind] Source now has ${source.getFeatures().length} features`);
        console.log(`[Wind] Layer visibility: ${windVectorsLayer.getVisible()}`);
        console.log(`[Wind] Layer opacity: ${windVectorsLayer.getOpacity()}`);
        
        isWindVectorsLoaded = true;
        
        // Показываем уведомление
        показатьУведомление(`Wind vectors loaded: ${данные.count} vectors`, 'success');
        
    } catch (error) {
        console.error('[Wind] Loading error:', error);
        показатьУведомление('Wind vectors loading error', 'danger');
        isWindVectorsLoaded = false;
    }
}

/**
 * Инициализировать погодные слои на карте
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 */
function инициализироватьПогодныеСлои(map) {
    console.log('[WeatherLayers] Starting initialization...');
    console.log('[WeatherLayers] Map object:', map);
    
    // Создаем слои
    heatmapLayer = создатьТепловуюКарту();
    console.log('[WeatherLayers] Heatmap layer created:', heatmapLayer);
    
    windVectorsLayer = создатьСлойВекторовВетра();
    console.log('[WeatherLayers] Wind vectors layer created:', windVectorsLayer);
    
    // Добавляем слои на карту (они будут скрыты по умолчанию)
    map.addLayer(heatmapLayer);
    console.log('[WeatherLayers] Heatmap layer added to map');
    
    map.addLayer(windVectorsLayer);
    console.log('[WeatherLayers] Wind vectors layer added to map');
    
    // Проверим, что слои действительно добавлены
    const allLayers = map.getLayers().getArray();
    console.log('[WeatherLayers] Total layers on map:', allLayers.length);
    console.log('[WeatherLayers] All layers:', allLayers);
    
    // Настроить tooltip для векторов ветра
    настроитьTooltipВетра(map);
    
    console.log('[WeatherLayers] Weather layers initialized successfully');
}

/**
 * Переключить видимость тепловой карты
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 * @param {boolean} показать - Показать или скрыть слой
 */
async function переключитьТепловуюКарту(map, показать) {
    console.log(`[Heatmap] Toggle called with show=${показать}`);
    
    if (!heatmapLayer) {
        console.error('[Heatmap] Layer not initialized!');
        return;
    }
    
    console.log('[Heatmap] Layer object:', heatmapLayer);
    
    if (показать) {
        // Загружаем данные, если еще не загружены
        if (!isHeatmapLoaded) {
            console.log('[Heatmap] Data not loaded, loading now...');
            await загрузитьТепловуюКарту(map);
        } else {
            console.log('[Heatmap] Data already loaded');
        }
        
        heatmapLayer.setVisible(true);
        console.log('[Heatmap] Visibility set to true');
        console.log('[Heatmap] Current visibility:', heatmapLayer.getVisible());
        console.log('[Heatmap] Current opacity:', heatmapLayer.getOpacity());
    } else {
        heatmapLayer.setVisible(false);
        console.log('[Heatmap] Visibility set to false');
    }
}

/**
 * Переключить видимость векторов ветра
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 * @param {boolean} показать - Показать или скрыть слой
 */
async function переключитьВекторыВетра(map, показать) {
    console.log(`[Wind] Toggle called with show=${показать}`);
    
    if (!windVectorsLayer) {
        console.error('[Wind] Layer not initialized!');
        return;
    }
    
    console.log('[Wind] Layer object:', windVectorsLayer);
    
    if (показать) {
        // Загружаем данные, если еще не загружены
        if (!isWindVectorsLoaded) {
            console.log('[Wind] Data not loaded, loading now...');
            await загрузитьВекторыВетра(map);
        } else {
            console.log('[Wind] Data already loaded');
        }
        
        windVectorsLayer.setVisible(true);
        console.log('[Wind] Visibility set to true');
        console.log('[Wind] Current visibility:', windVectorsLayer.getVisible());
        console.log('[Wind] Current opacity:', windVectorsLayer.getOpacity());
    } else {
        windVectorsLayer.setVisible(false);
        console.log('[Wind] Visibility set to false');
    }
}

/**
 * Показать всплывающее уведомление
 * @param {string} сообщение - Текст уведомления
 * @param {string} тип - Тип уведомления ('success', 'danger', 'warning', 'info')
 */
function показатьУведомление(сообщение, тип = 'info') {
    // Проверяем, есть ли контейнер для уведомлений
    let контейнер = document.getElementById('weatherNotifications');
    
    if (!контейнер) {
        // Создаем контейнер, если его нет
        контейнер = document.createElement('div');
        контейнер.id = 'weatherNotifications';
        контейнер.style.position = 'fixed';
        контейнер.style.top = '80px';
        контейнер.style.right = '20px';
        контейнер.style.zIndex = '9999';
        контейнер.style.maxWidth = '400px';
        document.body.appendChild(контейнер);
    }
    
    // Создаем уведомление
    const уведомление = document.createElement('div');
    уведомление.className = `alert alert-${тип} alert-dismissible fade show`;
    уведомление.setAttribute('role', 'alert');
    уведомление.innerHTML = `
        ${сообщение}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    контейнер.appendChild(уведомление);
    
    // Автоматически удаляем через 5 секунд
    setTimeout(() => {
        уведомление.remove();
    }, 5000);
}

/**
 * Обновить погодные слои при изменении видимой области карты
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 */
async function обновитьПогодныеСлои(map) {
    const обновления = [];
    
    if (heatmapLayer && heatmapLayer.getVisible()) {
        обновления.push(загрузитьТепловуюКарту(map));
    }
    
    if (windVectorsLayer && windVectorsLayer.getVisible()) {
        обновления.push(загрузитьВекторыВетра(map));
    }
    
    if (обновления.length > 0) {
        await Promise.all(обновления);
        console.log('Погодные слои обновлены');
    }
}

/**
 * Настроить tooltip для векторов ветра
 * Показывает подсказку при наведении на стрелку
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 */
function настроитьTooltipВетра(map) {
    // Создать элемент tooltip
    let tooltipElement = document.getElementById('wind-tooltip');
    
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.id = 'wind-tooltip';
        tooltipElement.className = 'wind-tooltip';
        tooltipElement.style.display = 'none';
        document.body.appendChild(tooltipElement);
    }
    
    // Создать overlay для tooltip
    const tooltipOverlay = new ol.Overlay({
        element: tooltipElement,
        positioning: 'bottom-center',
        offset: [0, -15],
        stopEvent: false
    });
    
    map.addOverlay(tooltipOverlay);
    
    // Обработчик наведения курсора
    map.on('pointermove', function(event) {
        // Проверяем, видим ли слой векторов ветра
        if (!windVectorsLayer || !windVectorsLayer.getVisible()) {
            tooltipElement.style.display = 'none';
            return;
        }
        
        // Проверяем наличие feature в данной точке
        const feature = map.forEachFeatureAtPixel(event.pixel, function(feature, layer) {
            // Проверяем, что это feature из слоя ветра
            if (layer === windVectorsLayer) {
                return feature;
            }
            return null;
        });
        
        if (feature && feature.get('speed') !== undefined) {
            // Получаем данные о ветре
            const speed = feature.get('speed');
            const direction = feature.get('direction');
            const directionText = получитьНаправлениеВетраТекст(direction);
            
            // Обновляем содержимое tooltip
            tooltipElement.innerHTML = `
                <div class="tooltip-content">
                    <strong>💨 Ветер</strong><br>
                    <small>Скорость: <strong>${speed.toFixed(1)} м/с</strong></small><br>
                    <small>Направление: <strong>${directionText} (${Math.round(direction)}°)</strong></small>
                </div>
            `;
            
            // Позиционируем tooltip
            const coordinates = feature.getGeometry().getCoordinates();
            tooltipOverlay.setPosition(coordinates);
            tooltipElement.style.display = 'block';
        } else {
            tooltipElement.style.display = 'none';
        }
    });
    
    console.log('Tooltip для векторов ветра настроен');
}

/**
 * Получить текстовое описание направления ветра
 * @param {number} градусы - Направление в градусах (0-360)
 * @returns {string} Текстовое описание направления
 */
function получитьНаправлениеВетраТекст(градусы) {
    const направления = [
        { мин: 0, макс: 22.5, текст: 'Северный' },
        { мин: 22.5, макс: 67.5, текст: 'Северо-восточный' },
        { мин: 67.5, макс: 112.5, текст: 'Восточный' },
        { мин: 112.5, макс: 157.5, текст: 'Юго-восточный' },
        { мин: 157.5, макс: 202.5, текст: 'Южный' },
        { мин: 202.5, макс: 247.5, текст: 'Юго-западный' },
        { мин: 247.5, макс: 292.5, текст: 'Западный' },
        { мин: 292.5, макс: 337.5, текст: 'Северо-западный' },
        { мин: 337.5, макс: 360, текст: 'Северный' }
    ];
    
    for (const направление of направления) {
        if (градусы >= направление.мин && градусы < направление.макс) {
            return направление.текст;
        }
    }
    
    return 'Северный';
}
