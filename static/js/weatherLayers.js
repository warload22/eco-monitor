/**
 * Модуль для работы с погодными слоями на карте
 * Включает тепловую карту температуры и векторное поле ветра
 */

// Глобальные переменные для слоев
let temperatureLabelsLayer = null;  // Изменено: теперь это слой текстовых подписей
let windVectorsLayer = null;
let isTemperatureLabelsLoaded = false;  // Изменено название
let isWindVectorsLoaded = false;

// Переменные для анимации ветра
let windAnimationFrame = null;
let windAnimationTime = 0;

/**
 * Получить цвет температуры в зависимости от значения
 * @param {number} temp - Температура в градусах Цельсия
 * @returns {string} Hex цвет
 */
function получитьЦветТемпературы(temp) {
    if (temp < -20) {
        return '#1a0052';  // Очень холодно - тёмно-фиолетовый
    } else if (temp < -10) {
        return '#0047ab';  // Очень холодно - кобальтовый синий
    } else if (temp < 0) {
        return '#2E86C1';  // Холодно - синий
    } else if (temp < 10) {
        return '#5DADE2';  // Прохладно - голубой
    } else if (temp < 15) {
        return '#27AE60';  // Комфортно - зелёный
    } else if (temp < 20) {
        return '#82E0AA';  // Тепло - светло-зелёный
    } else if (temp < 25) {
        return '#F39C12';  // Тепло - оранжевый
    } else if (temp < 30) {
        return '#E74C3C';  // Жарко - красный
    } else {
        return '#943126';  // Очень жарко - тёмно-красный
    }
}

/**
 * Получить фон для температурной метки
 * @param {number} temp - Температура в градусах Цельсия
 * @returns {string} RGBA цвет фона
 */
function получитьФонТемпературы(temp) {
    if (temp < 0) {
        return 'rgba(46, 134, 193, 0.15)';  // Синеватый фон для холода
    } else if (temp < 15) {
        return 'rgba(39, 174, 96, 0.15)';  // Зеленоватый для комфорта
    } else if (temp < 25) {
        return 'rgba(243, 156, 18, 0.15)';  // Оранжевый для тепла
    } else {
        return 'rgba(231, 76, 60, 0.15)';  // Красноватый для жары
    }
}

/**
 * Создать SVG иконку термометра
 * @param {string} цвет - Цвет термометра
 * @returns {string} Data URI с SVG
 */
function создатьИконкуТермометра(цвет) {
    const svg = `
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <g>
                <!-- Тело термометра -->
                <rect x="10" y="3" width="4" height="13" rx="2" fill="${цвет}" stroke="white" stroke-width="1"/>
                <!-- Резервуар -->
                <circle cx="12" cy="18" r="4" fill="${цвет}" stroke="white" stroke-width="1"/>
                <!-- Линии шкалы -->
                <line x1="8" y1="6" x2="10" y2="6" stroke="white" stroke-width="0.5"/>
                <line x1="8" y1="9" x2="10" y2="9" stroke="white" stroke-width="0.5"/>
                <line x1="8" y1="12" x2="10" y2="12" stroke="white" stroke-width="0.5"/>
            </g>
        </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Создать слой текстовых подписей температуры (улучшенный)
 * @returns {ol.layer.Vector} Слой с текстовыми подписями
 */
function создатьСлойТекстаТемпературы() {
    // Создаем источник для текстовых меток
    const labelsSource = new ol.source.Vector();
    
    // Создаем векторный слой с функцией стилизации
    const layer = new ol.layer.Vector({
        source: labelsSource,
        style: function(feature) {
            const temperature = feature.get('temperature');
            const цветТекста = получитьЦветТемпературы(temperature);
            const фонЦвет = получитьФонТемпературы(temperature);
            
            // Форматируем температуру с знаком
            const tempText = (temperature > 0 ? '+' : '') + temperature.toFixed(1) + '°';
            
            return [
                // Стиль для текста с улучшенным фоном
                new ol.style.Style({
                    text: new ol.style.Text({
                        text: tempText,
                        font: 'bold 16px "Segoe UI", "Helvetica Neue", Arial, sans-serif',
                        fill: new ol.style.Fill({
                            color: цветТекста
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#ffffff',
                            width: 4
                        }),
                        offsetY: -8,  // Сместить текст выше иконки
                        padding: [6, 8, 6, 8],
                        backgroundFill: new ol.style.Fill({
                            color: 'rgba(255, 255, 255, 0.95)'
                        }),
                        backgroundStroke: new ol.style.Stroke({
                            color: цветТекста,
                            width: 2
                        })
                    })
                }),
                // Иконка термометра под текстом
                new ol.style.Style({
                    image: new ol.style.Icon({
                        src: создатьИконкуТермометра(цветТекста),
                        scale: 1.2,
                        anchor: [0.5, 0.5],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'fraction',
                        offsetY: 15
                    })
                })
            ];
        },
        // Показывать только при zoom > 10
        minZoom: 10,
        opacity: 1.0,
        visible: false  // По умолчанию скрыт
    });
    
    console.log('[TemperatureLabels] Улучшенный слой текстовых подписей создан');
    return layer;
}

/**
 * Загрузить данные температуры с сервера (текстовые подписи)
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 */
async function загрузитьТекстыТемпературы(map) {
    try {
        console.log('[TemperatureLabels] Loading temperature data...');
        
        // Получаем границы видимой области карты
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const [minLon, minLat, maxLon, maxLat] = ol.proj.transformExtent(
            extent, 
            'EPSG:3857', 
            'EPSG:4326'
        );
        
        console.log('[TemperatureLabels] Map bounds:', { minLon, minLat, maxLon, maxLat });
        
        // Запрос к API (используем меньший grid_size для меньшего количества точек)
        const params = new URLSearchParams({
            parameter: 'temperature',
            min_lat: minLat.toFixed(4),
            max_lat: maxLat.toFixed(4),
            min_lon: minLon.toFixed(4),
            max_lon: maxLon.toFixed(4),
            grid_size: 8  // Меньше точек для читаемости текстовых подписей
        });
        
        const url = `/api/weather/map-grid?${params.toString()}`;
        console.log('[TemperatureLabels] Fetching from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const данные = await response.json();
        console.log('[TemperatureLabels] Received data:', данные);
        
        // Получаем источник данных слоя
        const source = temperatureLabelsLayer.getSource();
        console.log('[TemperatureLabels] Layer source:', source);
        
        source.clear();
        console.log('[TemperatureLabels] Source cleared');
        
        // Добавляем точки с текстовыми метками на карту
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
        
        console.log(`[TemperatureLabels] Added ${addedFeatures} features to source`);
        console.log(`[TemperatureLabels] Source now has ${source.getFeatures().length} features`);
        console.log(`[TemperatureLabels] Layer visibility: ${temperatureLabelsLayer.getVisible()}`);
        console.log(`[TemperatureLabels] Layer opacity: ${temperatureLabelsLayer.getOpacity()}`);
        
        isTemperatureLabelsLoaded = true;
        
        // Показываем уведомление
        показатьУведомление(`Загружено подписей температуры: ${данные.count}`, 'success');
        
    } catch (error) {
        console.error('[TemperatureLabels] Loading error:', error);
        показатьУведомление('Ошибка загрузки температуры', 'danger');
        isTemperatureLabelsLoaded = false;
    }
}

/**
 * Создать SVG стрелку для вектора ветра (увеличенная и улучшенная)
 * @param {string} цвет - Цвет стрелки (hex)
 * @param {number} размер - Размер стрелки (базовый размер)
 * @returns {string} Data URI с SVG изображением стрелки
 */
function создатьSVGСтрелку(цвет, размер = 48) {
    const svg = `
        <svg width="${размер}" height="${размер}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
                    <feOffset dx="0" dy="1" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.4"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <!-- Основное тело стрелки -->
            <path d="M ${размер/2} 4 L ${размер/2} ${размер-8}" 
                  stroke="${цвет}" stroke-width="4" stroke-linecap="round" filter="url(#shadow)"/>
            <!-- Наконечник стрелки (больше и выразительнее) -->
            <path d="M ${размер/2} 4 L ${размер/2-8} 14 L ${размер/2} 10 L ${размер/2+8} 14 Z" 
                  fill="${цвет}" stroke="white" stroke-width="1.5" filter="url(#shadow)"/>
            <!-- Хвост стрелки -->
            <path d="M ${размер/2-6} ${размер-8} L ${размер/2} ${размер-8} L ${размер/2+6} ${размер-8}" 
                  stroke="${цвет}" stroke-width="3" stroke-linecap="round"/>
        </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Создать стиль для стрелки ветра (улучшенный с большими размерами)
 * @param {number} speed - Скорость ветра (м/с)
 * @param {number} direction - Направление ветра (градусы)
 * @param {number} animationPhase - Фаза анимации (0-1) для эффекта пульсации
 * @returns {ol.style.Style} Стиль для отображения вектора
 */
function создатьСтильСтрелкиВетра(speed, direction, animationPhase = 0) {
    // Определяем цвет, размер и масштаб на основе скорости ветра (по шкале Бофорта)
    let цвет, базовыйРазмер, масштаб;
    
    if (speed < 1) {
        // Штиль
        цвет = '#d0d0d0';
        базовыйРазмер = 36;
        масштаб = 0.6;
    } else if (speed < 3) {
        // Легкий ветер
        цвет = '#74add1';  
        базовыйРазмер = 40;
        масштаб = 0.7;
    } else if (speed < 6) {
        // Слабый ветер
        цвет = '#4575b4';
        базовыйРазмер = 44;
        масштаб = 0.8;
    } else if (speed < 10) {
        // Умеренный ветер
        цвет = '#fdae61';
        базовыйРазмер = 48;
        масштаб = 0.9;
    } else if (speed < 15) {
        // Свежий ветер
        цвет = '#f46d43';
        базовыйРазмер = 52;
        масштаб = 1.0;
    } else {
        // Сильный ветер
        цвет = '#d73027';
        базовыйРазмер = 56;
        масштаб = 1.1;
    }
    
    // Добавляем эффект пульсации через изменение масштаба
    // animationPhase изменяется от 0 до 1, создаём синусоиду для плавности
    const пульсация = 1 + Math.sin(animationPhase * Math.PI * 2) * 0.1;  // ±10% от базового масштаба
    масштаб *= пульсация;
    
    // Конвертируем направление в радианы
    // Метеорологическое направление: откуда дует ветер (0° = северный ветер, дует С СЕВЕРА)
    // Нужно показать, КУДА дует ветер, поэтому добавляем 180°
    // OpenLayers: 0° = восток, поворот по часовой стрелке
    // Преобразование: метео 0° (север) + 180° (разворот) - 90° (коррекция для OL) = 90°
    const радианы = ((direction + 180 - 90) * Math.PI) / 180;
    
    // Создаём SVG стрелку с динамическим размером
    const arrowSvg = создатьSVGСтрелку(цвет, базовыйРазмер);
    
    // Вычисляем прозрачность для анимации "мерцания"
    const прозрачность = 0.75 + Math.sin(animationPhase * Math.PI * 2) * 0.15;  // 0.6-0.9
    
    return new ol.style.Style({
        image: new ol.style.Icon({
            src: arrowSvg,
            scale: масштаб,
            rotation: радианы,
            rotateWithView: false,  // Стрелка не вращается при повороте карты
            anchor: [0.5, 0.5],  // Центр изображения
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            opacity: прозрачность  // Анимированная прозрачность
        })
    });
}

/**
 * Создать слой векторов ветра с анимацией
 * @returns {ol.layer.Vector} Слой с векторами ветра
 */
function создатьСлойВекторовВетра() {
    const vectorSource = new ol.source.Vector();
    
    const layer = new ol.layer.Vector({
        source: vectorSource,
        style: function(feature) {
            const speed = feature.get('speed');
            const direction = feature.get('direction');
            // Используем глобальную переменную windAnimationTime для синхронной анимации
            return создатьСтильСтрелкиВетра(speed, direction, windAnimationTime);
        },
        opacity: 0.85,
        visible: false  // По умолчанию скрыт
    });
    
    return layer;
}

/**
 * Запустить анимацию векторов ветра
 */
function запуститьАнимациюВетра() {
    if (windAnimationFrame) {
        return;  // Анимация уже запущена
    }
    
    console.log('[Wind] Starting wind animation...');
    
    function анимировать(timestamp) {
        // Обновляем время анимации (цикл 3 секунды)
        windAnimationTime = (timestamp % 3000) / 3000;
        
        // Перерисовываем слой ветра, если он видим
        if (windVectorsLayer && windVectorsLayer.getVisible()) {
            windVectorsLayer.changed();
        }
        
        // Продолжаем анимацию
        windAnimationFrame = requestAnimationFrame(анимировать);
    }
    
    windAnimationFrame = requestAnimationFrame(анимировать);
}

/**
 * Остановить анимацию векторов ветра
 */
function остановитьАнимациюВетра() {
    if (windAnimationFrame) {
        console.log('[Wind] Stopping wind animation...');
        cancelAnimationFrame(windAnimationFrame);
        windAnimationFrame = null;
        windAnimationTime = 0;
    }
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
    temperatureLabelsLayer = создатьСлойТекстаТемпературы();
    console.log('[WeatherLayers] Temperature labels layer created:', temperatureLabelsLayer);
    
    windVectorsLayer = создатьСлойВекторовВетра();
    console.log('[WeatherLayers] Wind vectors layer created:', windVectorsLayer);
    
    // Добавляем слои на карту (они будут скрыты по умолчанию)
    map.addLayer(temperatureLabelsLayer);
    console.log('[WeatherLayers] Temperature labels layer added to map');
    
    map.addLayer(windVectorsLayer);
    console.log('[WeatherLayers] Wind vectors layer added to map');
    
    // Проверим, что слои действительно добавлены
    const allLayers = map.getLayers().getArray();
    console.log('[WeatherLayers] Total layers on map:', allLayers.length);
    console.log('[WeatherLayers] All layers:', allLayers);
    
    // Настроить tooltip для векторов ветра
    настроитьTooltipВетра(map);
    
    // Запустить анимацию ветра
    запуститьАнимациюВетра();
    
    console.log('[WeatherLayers] Weather layers initialized successfully');
}

/**
 * Переключить видимость текстовых подписей температуры
 * @param {ol.Map} map - Экземпляр карты OpenLayers
 * @param {boolean} показать - Показать или скрыть слой
 */
async function переключитьТекстыТемпературы(map, показать) {
    console.log(`[TemperatureLabels] Toggle called with show=${показать}`);
    
    if (!temperatureLabelsLayer) {
        console.error('[TemperatureLabels] Layer not initialized!');
        return;
    }
    
    console.log('[TemperatureLabels] Layer object:', temperatureLabelsLayer);
    
    if (показать) {
        // Загружаем данные, если еще не загружены
        if (!isTemperatureLabelsLoaded) {
            console.log('[TemperatureLabels] Data not loaded, loading now...');
            await загрузитьТекстыТемпературы(map);
        } else {
            console.log('[TemperatureLabels] Data already loaded');
        }
        
        temperatureLabelsLayer.setVisible(true);
        console.log('[TemperatureLabels] Visibility set to true');
        console.log('[TemperatureLabels] Current visibility:', temperatureLabelsLayer.getVisible());
        console.log('[TemperatureLabels] Current opacity:', temperatureLabelsLayer.getOpacity());
    } else {
        temperatureLabelsLayer.setVisible(false);
        console.log('[TemperatureLabels] Visibility set to false');
    }
}

// Для совместимости со старым кодом
const переключитьТепловуюКарту = переключитьТекстыТемпературы;

/**
 * Переключить видимость векторов ветра (с управлением анимацией)
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
        
        // Убедимся, что анимация запущена
        if (!windAnimationFrame) {
            запуститьАнимациюВетра();
        }
    } else {
        windVectorsLayer.setVisible(false);
        console.log('[Wind] Visibility set to false');
        
        // Можно остановить анимацию, если слой скрыт (опционально)
        // остановитьАнимациюВетра();
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
    
    if (temperatureLabelsLayer && temperatureLabelsLayer.getVisible()) {
        обновления.push(загрузитьТекстыТемпературы(map));
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
