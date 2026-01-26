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
    
    // Создаем слой тепловой карты
    const layer = new ol.layer.Heatmap({
        source: heatmapSource,
        blur: 25,  // Размытие (больше = более плавный градиент)
        radius: 20,  // Радиус влияния каждой точки
        weight: function(feature) {
            // Вес точки влияет на интенсивность цвета
            // Нормализуем температуру к диапазону 0-1
            const temp = feature.get('temperature');
            const minTemp = -10;
            const maxTemp = 30;
            return (temp - minTemp) / (maxTemp - minTemp);
        },
        gradient: [
            // Цветовая градиентная шкала от синего (холодный) к красному (теплый)
            '#0000ff',  // Синий (холодный)
            '#00ffff',  // Голубой
            '#00ff00',  // Зеленый
            '#ffff00',  // Желтый
            '#ff9900',  // Оранжевый
            '#ff0000'   // Красный (теплый)
        ],
        opacity: 0.6,
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
        console.log('Загрузка данных тепловой карты...');
        
        // Получаем границы видимой области карты
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const [minLon, minLat, maxLon, maxLat] = ol.proj.transformExtent(
            extent, 
            'EPSG:3857', 
            'EPSG:4326'
        );
        
        // Запрос к API
        const params = new URLSearchParams({
            parameter: 'temperature',
            min_lat: minLat.toFixed(4),
            max_lat: maxLat.toFixed(4),
            min_lon: minLon.toFixed(4),
            max_lon: maxLon.toFixed(4),
            grid_size: 20
        });
        
        const response = await fetch(`/api/weather/map-grid?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`Ошибка API: ${response.status}`);
        }
        
        const данные = await response.json();
        
        // Получаем источник данных слоя
        const source = heatmapLayer.getSource();
        source.clear();
        
        // Добавляем точки на карту
        данные.data.forEach(точка => {
            const coords = ol.proj.fromLonLat([точка.lon, точка.lat]);
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(coords),
                temperature: точка.value
            });
            source.addFeature(feature);
        });
        
        console.log(`Загружено ${данные.count} точек температурной сетки`);
        isHeatmapLoaded = true;
        
        // Показываем уведомление
        показатьУведомление(`Тепловая карта: загружено ${данные.count} точек`, 'success');
        
    } catch (error) {
        console.error('Ошибка загрузки тепловой карты:', error);
        показатьУведомление('Ошибка загрузки тепловой карты', 'danger');
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
    // Определяем цвет на основе скорости ветра
    let цвет;
    if (speed < 3) {
        цвет = '#00ff00';  // Зеленый - слабый ветер
    } else if (speed < 8) {
        цвет = '#ffff00';  // Желтый - умеренный ветер
    } else if (speed < 15) {
        цвет = '#ff9900';  // Оранжевый - сильный ветер
    } else {
        цвет = '#ff0000';  // Красный - очень сильный ветер
    }
    
    // Длина стрелки зависит от скорости
    const длина = Math.min(speed * 2, 40);
    
    // Конвертируем направление в радианы (OpenLayers использует радианы)
    // Направление 0° = север, но в картографии 0° = восток, поэтому вычитаем 90°
    const радианы = (direction - 90) * Math.PI / 180;
    
    return new ol.style.Style({
        image: new ol.style.RegularShape({
            fill: new ol.style.Fill({ color: цвет }),
            stroke: new ol.style.Stroke({ 
                color: '#ffffff', 
                width: 1.5 
            }),
            points: 3,  // Треугольник (стрелка)
            radius: 8,
            rotation: радианы,
            angle: 0
        }),
        stroke: new ol.style.Stroke({
            color: цвет,
            width: 2
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
        console.log('Загрузка векторов ветра...');
        
        // Получаем границы видимой области
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const [minLon, minLat, maxLon, maxLat] = ol.proj.transformExtent(
            extent, 
            'EPSG:3857', 
            'EPSG:4326'
        );
        
        // Запрос к API
        const params = new URLSearchParams({
            min_lat: minLat.toFixed(4),
            max_lat: maxLat.toFixed(4),
            min_lon: minLon.toFixed(4),
            max_lon: maxLon.toFixed(4),
            grid_size: 12
        });
        
        const response = await fetch(`/api/weather/wind-vectors?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`Ошибка API: ${response.status}`);
        }
        
        const данные = await response.json();
        
        // Получаем источник данных слоя
        const source = windVectorsLayer.getSource();
        source.clear();
        
        // Добавляем векторы на карту
        данные.data.forEach(вектор => {
            const coords = ol.proj.fromLonLat([вектор.lon, вектор.lat]);
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(coords),
                speed: вектор.speed,
                direction: вектор.direction
            });
            source.addFeature(feature);
        });
        
        console.log(`Загружено ${данные.count} векторов ветра`);
        isWindVectorsLoaded = true;
        
        // Показываем уведомление
        показатьУведомление(`Векторы ветра: загружено ${данные.count} векторов`, 'success');
        
    } catch (error) {
        console.error('Ошибка загрузки векторов ветра:', error);
        показатьУведомление('Ошибка загрузки векторов ветра', 'danger');
        isWindVectorsLoaded = false;
    }
}

/**
 * Инициализировать погодные слои на карте
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 */
function инициализироватьПогодныеСлои(map) {
    // Создаем слои
    heatmapLayer = создатьТепловуюКарту();
    windVectorsLayer = создатьСлойВекторовВетра();
    
    // Добавляем слои на карту (они будут скрыты по умолчанию)
    map.addLayer(heatmapLayer);
    map.addLayer(windVectorsLayer);
    
    console.log('Погодные слои инициализированы');
}

/**
 * Переключить видимость тепловой карты
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 * @param {boolean} показать - Показать или скрыть слой
 */
async function переключитьТепловуюКарту(map, показать) {
    if (!heatmapLayer) {
        console.error('Тепловая карта не инициализирована');
        return;
    }
    
    if (показать) {
        // Загружаем данные, если еще не загружены
        if (!isHeatmapLoaded) {
            await загрузитьТепловуюКарту(map);
        }
        heatmapLayer.setVisible(true);
        console.log('Тепловая карта показана');
    } else {
        heatmapLayer.setVisible(false);
        console.log('Тепловая карта скрыта');
    }
}

/**
 * Переключить видимость векторов ветра
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 * @param {boolean} показать - Показать или скрыть слой
 */
async function переключитьВекторыВетра(map, показать) {
    if (!windVectorsLayer) {
        console.error('Векторы ветра не инициализированы');
        return;
    }
    
    if (показать) {
        // Загружаем данные, если еще не загружены
        if (!isWindVectorsLoaded) {
            await загрузитьВекторыВетра(map);
        }
        windVectorsLayer.setVisible(true);
        console.log('Векторы ветра показаны');
    } else {
        windVectorsLayer.setVisible(false);
        console.log('Векторы ветра скрыты');
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
