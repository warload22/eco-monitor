/**
 * Упрощённые погодные слои для EcoMonitor
 * Температура: цветные круги с tooltip
 * Ветер: простые стрелки с анимацией прозрачности
 */

// Глобальные переменные для слоёв
let temperatureLayer = null;
let windLayer = null;
let isTemperatureLoaded = false;
let isWindLoaded = false;

// Переменные для анимации ветра (только opacity)
let windAnimationFrame = null;
let windAnimationPhase = 0;

/**
 * Получить цвет для температуры
 * Синий (-10°C) -> Зелёный (+15°C) -> Красный (+30°C)
 * @param {number} temp - Температура в градусах Цельсия
 * @returns {string} Цвет в формате rgba
 */
function getTemperatureColor(temp) {
    // Нормализуем температуру от -10 до +30 в диапазон 0-1
    const normalized = Math.max(0, Math.min(1, (temp + 10) / 40));
    
    let r, g, b;
    
    if (normalized < 0.5) {
        // От синего к зелёному (0 -> 0.5)
        const t = normalized * 2;
        r = Math.round(30 * (1 - t));
        g = Math.round(100 + 155 * t);
        b = Math.round(200 * (1 - t));
    } else {
        // От зелёного к красному (0.5 -> 1)
        const t = (normalized - 0.5) * 2;
        r = Math.round(50 + 205 * t);
        g = Math.round(255 * (1 - t));
        b = Math.round(50 * (1 - t));
    }
    
    return `rgba(${r}, ${g}, ${b}, 0.9)`;
}

/**
 * Создать слой температуры (простые цветные круги)
 * @returns {ol.layer.Vector} Векторный слой
 */
function createTemperatureLayer() {
    const source = new ol.source.Vector();
    
    const layer = new ol.layer.Vector({
        source: source,
        style: function(feature) {
            const temp = feature.get('temperature');
            const color = getTemperatureColor(temp);
            
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 12,
                    fill: new ol.style.Fill({ color: color }),
                    stroke: new ol.style.Stroke({
                        color: '#ffffff',
                        width: 2
                    })
                })
            });
        },
        visible: false
    });
    
    console.log('[Temperature] Слой создан');
    return layer;
}

/**
 * Создать SVG стрелку для ветра
 * @param {string} color - Цвет стрелки
 * @returns {string} Data URI
 */
function createWindArrowSVG(color) {
    const svg = `
        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 5 L25 15 L22 15 L22 35 L18 35 L18 15 L15 15 Z" 
                  fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
        </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Получить цвет для скорости ветра
 * @param {number} speed - Скорость в м/с
 * @returns {string} Hex цвет
 */
function getWindColor(speed) {
    if (speed < 2) return '#74add1';      // Слабый - голубой
    if (speed < 5) return '#4575b4';      // Умеренный - синий  
    if (speed < 8) return '#fdae61';      // Свежий - оранжевый
    if (speed < 12) return '#f46d43';     // Сильный - красно-оранжевый
    return '#d73027';                      // Очень сильный - красный
}

/**
 * Создать слой ветра (простые стрелки)
 * @returns {ol.layer.Vector} Векторный слой
 */
function createWindLayer() {
    const source = new ol.source.Vector();
    
    const layer = new ol.layer.Vector({
        source: source,
        style: function(feature) {
            const speed = feature.get('wind_speed');
            const direction = feature.get('wind_direction');
            const color = getWindColor(speed);
            
            // Направление: метеорологическое (откуда дует) -> куда дует
            // OpenLayers: 0 = восток, вращение по часовой
            // Метео: 0 = север (откуда дует)
            // Нужно: куда дует, поэтому +180, затем корректируем для OL
            const rotation = ((direction + 180 - 90) * Math.PI) / 180;
            
            // Масштаб зависит от фазы анимации (сохранённой в feature)
            const phase = feature.get('animPhase') || 0;
            const opacity = 0.6 + 0.4 * Math.sin(phase);
            
            return new ol.style.Style({
                image: new ol.style.Icon({
                    src: createWindArrowSVG(color),
                    scale: 0.8,
                    rotation: rotation,
                    opacity: opacity,
                    anchor: [0.5, 0.5]
                })
            });
        },
        visible: false
    });
    
    console.log('[Wind] Слой создан');
    return layer;
}

/**
 * Загрузить данные погоды из API /api/weather/current
 * @param {ol.Map} map - Карта OpenLayers
 */
async function loadWeatherData(map) {
    try {
        console.log('[WeatherLayers] Загрузка данных из /api/weather/current...');
        
        const response = await fetch('/api/weather/current');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[WeatherLayers] Получено точек:', result.count);
        
        if (!result.data || result.data.length === 0) {
            console.warn('[WeatherLayers] Нет данных!');
            return null;
        }
        
        return result.data;
        
    } catch (error) {
        console.error('[WeatherLayers] Ошибка загрузки:', error);
        return null;
    }
}

/**
 * Обновить слой температуры данными
 * @param {Array} data - Массив точек с данными
 */
function updateTemperatureLayer(data) {
    if (!temperatureLayer || !data) return;
    
    const source = temperatureLayer.getSource();
    source.clear();
    
    data.forEach(point => {
        const coords = ol.proj.fromLonLat([point.lon, point.lat]);
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(coords),
            temperature: point.temperature,
            name: point.name
        });
        source.addFeature(feature);
    });
    
    console.log(`[Temperature] Добавлено ${data.length} точек`);
    isTemperatureLoaded = true;
}

/**
 * Обновить слой ветра данными
 * @param {Array} data - Массив точек с данными
 */
function updateWindLayer(data) {
    if (!windLayer || !data) return;
    
    const source = windLayer.getSource();
    source.clear();
    
    data.forEach(point => {
        const coords = ol.proj.fromLonLat([point.lon, point.lat]);
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(coords),
            wind_speed: point.wind_speed,
            wind_direction: point.wind_direction,
            name: point.name,
            animPhase: Math.random() * Math.PI * 2  // Случайная начальная фаза
        });
        source.addFeature(feature);
    });
    
    console.log(`[Wind] Добавлено ${data.length} стрелок`);
    isWindLoaded = true;
}

/**
 * Запустить анимацию прозрачности ветра
 */
function startWindAnimation() {
    if (windAnimationFrame) return;
    
    console.log('[Wind] Запуск анимации прозрачности');
    
    function animate() {
        windAnimationPhase += 0.05;  // ~1 цикл в секунду при 60fps
        
        if (windLayer && windLayer.getVisible()) {
            const source = windLayer.getSource();
            const features = source.getFeatures();
            
            features.forEach(feature => {
                const basePhase = feature.get('basePhase') || feature.get('animPhase') || 0;
                if (!feature.get('basePhase')) {
                    feature.set('basePhase', basePhase);
                }
                feature.set('animPhase', basePhase + windAnimationPhase);
            });
            
            windLayer.changed();
        }
        
        windAnimationFrame = requestAnimationFrame(animate);
    }
    
    windAnimationFrame = requestAnimationFrame(animate);
}

/**
 * Остановить анимацию ветра
 */
function stopWindAnimation() {
    if (windAnimationFrame) {
        console.log('[Wind] Остановка анимации');
        cancelAnimationFrame(windAnimationFrame);
        windAnimationFrame = null;
    }
}

/**
 * Инициализировать погодные слои
 * @param {ol.Map} map - Карта OpenLayers
 */
function инициализироватьПогодныеСлои(map) {
    console.log('[WeatherLayers] ====================================');
    console.log('[WeatherLayers] ИНИЦИАЛИЗАЦИЯ УПРОЩЁННЫХ СЛОЁВ');
    console.log('[WeatherLayers] ====================================');
    
    // Создаём слои
    temperatureLayer = createTemperatureLayer();
    windLayer = createWindLayer();
    
    // Добавляем на карту
    map.addLayer(temperatureLayer);
    map.addLayer(windLayer);
    
    // Настраиваем tooltip для обоих слоёв
    setupWeatherTooltip(map);
    
    console.log('[WeatherLayers] ✅ Инициализация завершена');
    console.log('[WeatherLayers] ====================================');
}

/**
 * Настроить tooltip для погодных слоёв
 * @param {ol.Map} map - Карта OpenLayers
 */
function setupWeatherTooltip(map) {
    // Создаём элемент tooltip
    let tooltip = document.getElementById('weather-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'weather-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 13px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            pointer-events: none;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(tooltip);
    }
    
    // Обработчик движения мыши
    map.on('pointermove', function(event) {
        const feature = map.forEachFeatureAtPixel(event.pixel, function(f, layer) {
            if (layer === temperatureLayer || layer === windLayer) {
                return f;
            }
            return null;
        });
        
        if (feature) {
            const temp = feature.get('temperature');
            const windSpeed = feature.get('wind_speed');
            const windDir = feature.get('wind_direction');
            const name = feature.get('name') || 'Точка';
            
            let html = `<strong>${name}</strong><br>`;
            
            if (temp !== undefined) {
                const sign = temp > 0 ? '+' : '';
                html += `🌡️ ${sign}${temp.toFixed(1)}°C`;
            }
            
            if (windSpeed !== undefined) {
                const dirText = getWindDirectionText(windDir);
                if (temp !== undefined) html += '<br>';
                html += `💨 ${windSpeed.toFixed(1)} м/с (${dirText})`;
            }
            
            tooltip.innerHTML = html;
            tooltip.style.display = 'block';
            tooltip.style.left = (event.originalEvent.pageX + 15) + 'px';
            tooltip.style.top = (event.originalEvent.pageY - 15) + 'px';
        } else {
            tooltip.style.display = 'none';
        }
    });
    
    // Скрывать при выходе за пределы карты
    map.getTargetElement().addEventListener('mouseleave', function() {
        tooltip.style.display = 'none';
    });
    
    console.log('[WeatherLayers] Tooltip настроен');
}

/**
 * Получить текстовое направление ветра
 * @param {number} degrees - Градусы (0-360)
 * @returns {string} Текст
 */
function getWindDirectionText(degrees) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

/**
 * Переключить слой температуры
 * @param {ol.Map} map - Карта
 * @param {boolean} show - Показать/скрыть
 */
async function переключитьТекстыТемпературы(map, show) {
    console.log(`[Temperature] Переключение: ${show}`);
    
    if (!temperatureLayer) {
        console.error('[Temperature] Слой не создан!');
        return;
    }
    
    if (show) {
        // Загружаем данные, если ещё не загружены
        if (!isTemperatureLoaded) {
            const data = await loadWeatherData(map);
            if (data) {
                updateTemperatureLayer(data);
            }
        }
        temperatureLayer.setVisible(true);
        console.log('[Temperature] ✅ Слой показан');
    } else {
        temperatureLayer.setVisible(false);
        console.log('[Temperature] Слой скрыт');
    }
}

/**
 * Переключить слой ветра
 * @param {ol.Map} map - Карта
 * @param {boolean} show - Показать/скрыть
 */
async function переключитьВекторыВетра(map, show) {
    console.log(`[Wind] Переключение: ${show}`);
    
    if (!windLayer) {
        console.error('[Wind] Слой не создан!');
        return;
    }
    
    if (show) {
        // Загружаем данные, если ещё не загружены
        if (!isWindLoaded) {
            const data = await loadWeatherData(map);
            if (data) {
                updateWindLayer(data);
            }
        }
        windLayer.setVisible(true);
        startWindAnimation();
        console.log('[Wind] ✅ Слой показан, анимация запущена');
    } else {
        windLayer.setVisible(false);
        stopWindAnimation();
        console.log('[Wind] Слой скрыт, анимация остановлена');
    }
}

/**
 * Показать уведомление пользователю
 * @param {string} message - Текст
 * @param {string} type - Тип (success, warning, danger, info)
 */
function показатьУведомление(message, type = 'info') {
    let container = document.getElementById('weatherNotifications');
    if (!container) {
        container = document.createElement('div');
        container.id = 'weatherNotifications';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            max-width: 350px;
        `;
        document.body.appendChild(container);
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.appendChild(alert);
    
    setTimeout(() => alert.remove(), 4000);
}

// Для совместимости со старым кодом
const temperatureLabelsLayer = null;  // Убрано - используем temperatureLayer
const windVectorsLayer = null;        // Убрано - используем windLayer

// Экспорт диагностической информации в консоль
console.log('[WeatherLayers] Модуль загружен. Доступные функции:');
console.log('  - инициализироватьПогодныеСлои(map)');
console.log('  - переключитьТекстыТемпературы(map, show)');
console.log('  - переключитьВекторыВетра(map, show)');
