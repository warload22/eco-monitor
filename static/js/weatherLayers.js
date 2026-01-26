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
 * Создать слой температуры (крупные цветные круги)
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
                    radius: 16,  // Увеличен размер
                    fill: new ol.style.Fill({ color: color }),
                    stroke: new ol.style.Stroke({
                        color: '#ffffff',
                        width: 3  // Толстая белая обводка
                    })
                })
            });
        },
        visible: false,
        zIndex: 99  // Под слоем ветра
    });
    
    console.log('[Temperature] Слой создан (крупные маркеры)');
    return layer;
}

/**
 * Создать SVG стрелку для ветра (КРУПНАЯ и ЗАМЕТНАЯ)
 * @param {string} color - Цвет стрелки
 * @returns {string} Data URI
 */
function createWindArrowSVG(color) {
    // Большая, толстая стрелка с контрастным контуром
    const svg = `
        <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
            <!-- Тень для контраста -->
            <filter id="shadow">
                <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.4"/>
            </filter>
            <!-- Основная стрелка - толстая и заметная -->
            <path d="M24 4 L32 18 L27 18 L27 42 L21 42 L21 18 L16 18 Z" 
                  fill="${color}" 
                  stroke="#000000" 
                  stroke-width="1.5"
                  filter="url(#shadow)"/>
            <!-- Белая обводка поверх для контраста -->
            <path d="M24 4 L32 18 L27 18 L27 42 L21 42 L21 18 L16 18 Z" 
                  fill="none" 
                  stroke="#ffffff" 
                  stroke-width="2.5"/>
            <!-- Внутренний контур цветом -->
            <path d="M24 6 L30 17 L26 17 L26 40 L22 40 L22 17 L18 17 Z" 
                  fill="${color}" 
                  stroke="none"/>
        </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Получить цвет для скорости ветра (яркие контрастные цвета)
 * @param {number} speed - Скорость в м/с
 * @returns {string} Hex цвет
 */
function getWindColor(speed) {
    if (speed < 2) return '#17a2b8';      // Штиль - бирюзовый
    if (speed < 4) return '#28a745';      // Слабый - зелёный
    if (speed < 7) return '#ffc107';      // Умеренный - жёлтый
    if (speed < 10) return '#fd7e14';     // Свежий - оранжевый
    if (speed < 14) return '#dc3545';     // Сильный - красный
    return '#6f42c1';                      // Очень сильный - фиолетовый
}

/**
 * Создать слой ветра (КРУПНЫЕ стрелки с анимацией)
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
            // Нужно показать КУДА дует, поэтому +180, затем -90 для OL
            const rotation = ((direction + 180 - 90) * Math.PI) / 180;
            
            // Фаза анимации для плавного мерцания
            const phase = feature.get('animPhase') || 0;
            const opacity = 0.7 + 0.3 * Math.sin(phase);
            
            // Масштаб зависит от скорости ветра (сильнее ветер = больше стрелка)
            const baseScale = 1.0;
            const speedScale = Math.min(1.3, 0.9 + speed * 0.03);
            
            return new ol.style.Style({
                image: new ol.style.Icon({
                    src: createWindArrowSVG(color),
                    scale: baseScale * speedScale,
                    rotation: rotation,
                    opacity: opacity,
                    anchor: [0.5, 0.5]
                })
            });
        },
        visible: false,
        zIndex: 100  // Поверх других слоёв
    });
    
    console.log('[Wind] Слой создан (крупные стрелки)');
    return layer;
}

/**
 * Загрузить данные погоды из API /api/weather/current
 * @param {ol.Map} map - Карта OpenLayers
 */
async function loadWeatherData(map) {
    try {
        console.log('[WeatherLayers] ========================================');
        console.log('[WeatherLayers] Загрузка данных из /api/weather/current...');
        
        const response = await fetch('/api/weather/current');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        // Консольный отчёт
        console.log('[WeatherLayers] ========================================');
        console.log('[WeatherLayers] ОТЧЁТ О ЗАГРУЗКЕ ДАННЫХ');
        console.log('[WeatherLayers] ========================================');
        console.log(`[WeatherLayers] Источник данных: ${result.source === 'database' ? 'База данных (реальные)' : 'Демо-данные'}`);
        console.log(`[WeatherLayers] Количество точек: ${result.count}`);
        console.log(`[WeatherLayers] Примечание: ${result.note}`);
        
        if (result.data && result.data.length > 0) {
            console.log('[WeatherLayers] Точки данных:');
            result.data.forEach((point, i) => {
                const temp = point.temperature !== null ? `${point.temperature > 0 ? '+' : ''}${point.temperature}°C` : 'н/д';
                const wind = point.wind_speed !== null ? `${point.wind_speed} м/с` : 'н/д';
                console.log(`  ${i+1}. ${point.name}: ${temp}, ветер ${wind}`);
            });
        }
        console.log('[WeatherLayers] ========================================');
        
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
