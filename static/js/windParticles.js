/**
 * Модуль для профессиональной визуализации ветра с помощью системы частиц
 * Создаёт плавную анимацию потоков ветра, как на windy.com
 */

// Глобальные переменные для particle system
let windParticleLayer = null;
let particleCanvas = null;
let particleContext = null;
let particles = [];
let windGrid = null;
let animationRunning = false;
let animationFrameId = null;

// Настройки системы частиц
const PARTICLE_CONFIG = {
    count: 3000,              // Количество частиц
    lineWidth: 2,             // Толщина линий
    speedFactor: 0.25,        // Множитель скорости
    fadeOpacity: 0.95,        // Эффект затухания следов (0.9-0.98)
    maxAge: 100,              // Максимальный возраст частицы (в кадрах)
    colorScheme: 'speed',     // 'speed' или 'direction'
    minZoom: 9                // Минимальный zoom для отображения
};

/**
 * Класс частицы ветра
 */
class WindParticle {
    constructor(x, y, age = 0) {
        this.x = x;
        this.y = y;
        this.age = age;
        this.maxAge = PARTICLE_CONFIG.maxAge;
        this.speed = 0;
        this.direction = 0;
    }
    
    /**
     * Обновить положение частицы на основе поля ветра
     * @param {Object} windGrid - Сетка данных о ветре
     * @param {number} width - Ширина canvas
     * @param {number} height - Высота canvas
     * @returns {boolean} true если частица жива, false если умерла
     */
    update(windGrid, width, height) {
        // Стареем
        this.age++;
        
        // Если частица слишком старая, убиваем её
        if (this.age > this.maxAge) {
            return false;
        }
        
        // Если вышли за пределы, убиваем частицу
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            return false;
        }
        
        // Получаем вектор ветра в текущей позиции
        const wind = windGrid.interpolate(this.x, this.y);
        
        if (!wind) {
            return false;  // Нет данных о ветре
        }
        
        this.speed = wind.speed;
        this.direction = wind.direction;
        
        // Конвертируем направление ветра (откуда дует) в направление движения (куда дует)
        // Добавляем 180° и конвертируем в радианы
        const moveDirection = (wind.direction + 180) * Math.PI / 180;
        
        // Вычисляем смещение (speed в м/с * speedFactor)
        const dx = Math.cos(moveDirection) * wind.speed * PARTICLE_CONFIG.speedFactor;
        const dy = Math.sin(moveDirection) * wind.speed * PARTICLE_CONFIG.speedFactor;
        
        // Обновляем позицию
        this.x += dx;
        this.y += dy;
        
        return true;
    }
    
    /**
     * Получить цвет частицы на основе скорости ветра
     * @returns {string} RGBA цвет
     */
    getColor() {
        // Прозрачность уменьшается с возрастом
        const ageAlpha = 1.0 - (this.age / this.maxAge);
        const baseAlpha = 0.7;
        const alpha = ageAlpha * baseAlpha;
        
        if (PARTICLE_CONFIG.colorScheme === 'direction') {
            // Цвет на основе направления (hue от 0 до 360)
            const hue = this.direction;
            return `hsla(${hue}, 70%, 50%, ${alpha})`;
        } else {
            // Цвет на основе скорости (по шкале Бофорта)
            let r, g, b;
            
            if (this.speed < 1) {
                // Штиль - серый
                r = 200; g = 200; b = 200;
            } else if (this.speed < 3) {
                // Легкий ветер - голубой
                r = 116; g = 173; b = 209;
            } else if (this.speed < 6) {
                // Слабый ветер - синий
                r = 69; g = 117; b = 180;
            } else if (this.speed < 10) {
                // Умеренный ветер - жёлто-оранжевый
                r = 253; g = 174; b = 97;
            } else if (this.speed < 15) {
                // Свежий ветер - оранжевый
                r = 244; g = 109; b = 67;
            } else {
                // Сильный ветер - красный
                r = 215; g = 48; b = 39;
            }
            
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
}

/**
 * Класс для интерполяции данных ветра на сетке
 */
class WindGrid {
    constructor(data, bounds) {
        this.data = data;  // Массив {lon, lat, speed, direction}
        this.bounds = bounds;  // {minX, maxX, minY, maxY} в пикселях canvas
        
        // Создаём 2D сетку для быстрого поиска
        this.gridSize = 20;  // Размер ячейки сетки
        this.grid = this.buildGrid();
    }
    
    /**
     * Построить пространственную сетку для быстрого поиска
     */
    buildGrid() {
        const grid = {};
        
        for (const point of this.data) {
            const cellX = Math.floor(point.x / this.gridSize);
            const cellY = Math.floor(point.y / this.gridSize);
            const key = `${cellX},${cellY}`;
            
            if (!grid[key]) {
                grid[key] = [];
            }
            grid[key].push(point);
        }
        
        return grid;
    }
    
    /**
     * Получить ближайшие точки к заданной позиции
     */
    getNearbyPoints(x, y, radius = 2) {
        const cellX = Math.floor(x / this.gridSize);
        const cellY = Math.floor(y / this.gridSize);
        const points = [];
        
        // Проверяем соседние ячейки
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const key = `${cellX + dx},${cellY + dy}`;
                if (this.grid[key]) {
                    points.push(...this.grid[key]);
                }
            }
        }
        
        return points;
    }
    
    /**
     * Интерполировать значение ветра в заданной точке (билинейная интерполяция)
     */
    interpolate(x, y) {
        const nearbyPoints = this.getNearbyPoints(x, y);
        
        if (nearbyPoints.length === 0) {
            return null;
        }
        
        // Находим 4 ближайшие точки для билинейной интерполяции
        // Сортируем по расстоянию
        nearbyPoints.sort((a, b) => {
            const distA = Math.hypot(a.x - x, a.y - y);
            const distB = Math.hypot(b.x - x, b.y - y);
            return distA - distB;
        });
        
        // Используем inverse distance weighting (IDW)
        let totalWeight = 0;
        let weightedSpeed = 0;
        let weightedDirX = 0;
        let weightedDirY = 0;
        
        const maxPoints = Math.min(4, nearbyPoints.length);
        
        for (let i = 0; i < maxPoints; i++) {
            const point = nearbyPoints[i];
            const dist = Math.hypot(point.x - x, point.y - y);
            
            // Избегаем деления на ноль
            const weight = dist < 0.1 ? 1.0 : 1.0 / (dist * dist);
            
            totalWeight += weight;
            weightedSpeed += point.speed * weight;
            
            // Конвертируем направление в вектор для корректного усреднения
            const radians = point.direction * Math.PI / 180;
            weightedDirX += Math.cos(radians) * weight;
            weightedDirY += Math.sin(radians) * weight;
        }
        
        if (totalWeight === 0) {
            return null;
        }
        
        // Усредняем
        const speed = weightedSpeed / totalWeight;
        const dirX = weightedDirX / totalWeight;
        const dirY = weightedDirY / totalWeight;
        
        // Конвертируем вектор обратно в направление
        let direction = Math.atan2(dirY, dirX) * 180 / Math.PI;
        if (direction < 0) direction += 360;
        
        return { speed, direction };
    }
}

/**
 * Создать новую частицу в случайной позиции
 */
function createRandomParticle(width, height) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const age = Math.floor(Math.random() * PARTICLE_CONFIG.maxAge);
    return new WindParticle(x, y, age);
}

/**
 * Инициализировать систему частиц
 */
function инициализироватьЧастицыВетра(map) {
    console.log('[WindParticles] Initializing particle system...');
    
    // Создаём canvas overlay для частиц
    const mapElement = map.getTargetElement();
    
    // Проверяем, не создан ли уже canvas
    let existingCanvas = document.getElementById('wind-particles-canvas');
    if (existingCanvas) {
        particleCanvas = existingCanvas;
    } else {
        particleCanvas = document.createElement('canvas');
        particleCanvas.id = 'wind-particles-canvas';
        particleCanvas.style.position = 'absolute';
        particleCanvas.style.top = '0';
        particleCanvas.style.left = '0';
        particleCanvas.style.pointerEvents = 'none';  // Не блокировать клики
        particleCanvas.style.zIndex = '500';  // Поверх карты, но под UI
        particleCanvas.style.display = 'none';  // Скрыт по умолчанию
        
        mapElement.appendChild(particleCanvas);
    }
    
    // Устанавливаем размер canvas
    const size = map.getSize();
    particleCanvas.width = size[0];
    particleCanvas.height = size[1];
    
    particleContext = particleCanvas.getContext('2d');
    
    // Слушаем изменение размера карты
    map.on('change:size', function() {
        const newSize = map.getSize();
        particleCanvas.width = newSize[0];
        particleCanvas.height = newSize[1];
        
        // Пересоздаём частицы
        if (animationRunning) {
            остановитьАнимациюЧастиц();
            запуститьАнимациюЧастиц(map);
        }
    });
    
    console.log('[WindParticles] Particle system initialized');
}

/**
 * Загрузить данные ветра и преобразовать в сетку
 */
async function загрузитьДанныеВетраДляЧастиц(map) {
    try {
        console.log('[WindParticles] Loading wind data...');
        
        // Получаем границы видимой области
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const [minLon, minLat, maxLon, maxLat] = ol.proj.transformExtent(
            extent, 
            'EPSG:3857', 
            'EPSG:4326'
        );
        
        // Запрос к API (плотная сетка для частиц)
        const params = new URLSearchParams({
            min_lat: minLat.toFixed(4),
            max_lat: maxLat.toFixed(4),
            min_lon: minLon.toFixed(4),
            max_lon: maxLon.toFixed(4),
            grid_size: 15  // Плотная сетка
        });
        
        const url = `/api/weather/wind-vectors?${params.toString()}`;
        console.log('[WindParticles] Fetching from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const данные = await response.json();
        console.log('[WindParticles] Received wind data:', данные.count, 'points');
        
        // Преобразуем geo-координаты в пиксели canvas
        const size = map.getSize();
        const processedData = данные.data.map(point => {
            const pixel = map.getPixelFromCoordinate(
                ol.proj.fromLonLat([point.lon, point.lat])
            );
            return {
                x: pixel[0],
                y: pixel[1],
                speed: point.speed,
                direction: point.direction
            };
        });
        
        // Создаём сетку ветра
        windGrid = new WindGrid(processedData, {
            minX: 0,
            maxX: size[0],
            minY: 0,
            maxY: size[1]
        });
        
        console.log('[WindParticles] Wind grid created');
        return true;
        
    } catch (error) {
        console.error('[WindParticles] Error loading wind data:', error);
        return false;
    }
}

/**
 * Запустить анимацию частиц
 */
async function запуститьАнимациюЧастиц(map) {
    if (animationRunning) {
        console.log('[WindParticles] Animation already running');
        return;
    }
    
    // Загружаем данные ветра
    const success = await загрузитьДанныеВетраДляЧастиц(map);
    if (!success) {
        console.error('[WindParticles] Failed to load wind data');
        return;
    }
    
    // Создаём начальные частицы
    particles = [];
    const size = map.getSize();
    for (let i = 0; i < PARTICLE_CONFIG.count; i++) {
        particles.push(createRandomParticle(size[0], size[1]));
    }
    
    // Показываем canvas
    particleCanvas.style.display = 'block';
    animationRunning = true;
    
    console.log('[WindParticles] Animation started with', particles.length, 'particles');
    
    // Запускаем цикл анимации
    function анимироватьЧастицы() {
        if (!animationRunning) {
            return;
        }
        
        // Эффект затухания (рисуем полупрозрачный прямоугольник)
        particleContext.fillStyle = `rgba(0, 0, 0, ${1 - PARTICLE_CONFIG.fadeOpacity})`;
        particleContext.fillRect(0, 0, particleCanvas.width, particleCanvas.height);
        
        // Обновляем и рисуем частицы
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const prevX = particle.x;
            const prevY = particle.y;
            
            // Обновляем частицу
            const alive = particle.update(windGrid, particleCanvas.width, particleCanvas.height);
            
            if (!alive) {
                // Заменяем мёртвую частицу новой
                particles[i] = createRandomParticle(particleCanvas.width, particleCanvas.height);
            } else {
                // Рисуем линию от предыдущей позиции к текущей
                particleContext.strokeStyle = particle.getColor();
                particleContext.lineWidth = PARTICLE_CONFIG.lineWidth;
                particleContext.beginPath();
                particleContext.moveTo(prevX, prevY);
                particleContext.lineTo(particle.x, particle.y);
                particleContext.stroke();
            }
        }
        
        // Следующий кадр
        animationFrameId = requestAnimationFrame(анимироватьЧастицы);
    }
    
    анимироватьЧастицы();
}

/**
 * Остановить анимацию частиц
 */
function остановитьАнимациюЧастиц() {
    if (!animationRunning) {
        return;
    }
    
    console.log('[WindParticles] Stopping animation...');
    
    animationRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Скрываем canvas
    if (particleCanvas) {
        particleCanvas.style.display = 'none';
    }
    
    // Очищаем частицы
    particles = [];
    windGrid = null;
    
    console.log('[WindParticles] Animation stopped');
}

/**
 * Переключить видимость системы частиц ветра
 */
async function переключитьЧастицыВетра(map, показать) {
    console.log(`[WindParticles] Toggle called with show=${показать}`);
    
    if (показать) {
        // Проверяем минимальный zoom
        const zoom = map.getView().getZoom();
        if (zoom < PARTICLE_CONFIG.minZoom) {
            console.warn(`[WindParticles] Zoom too low (${zoom} < ${PARTICLE_CONFIG.minZoom})`);
            показатьУведомление('Увеличьте масштаб для просмотра потоков ветра', 'info');
            return;
        }
        
        await запуститьАнимациюЧастиц(map);
    } else {
        остановитьАнимациюЧастиц();
    }
}

/**
 * Проверить, запущена ли анимация частиц
 */
function частицыВетраАктивны() {
    return animationRunning;
}
