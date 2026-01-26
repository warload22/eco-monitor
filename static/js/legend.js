/**
 * Модуль управления интерактивной легендой карты
 * Динамически обновляет содержимое легенды в зависимости от активных слоёв
 */

/**
 * Инициализировать легенду
 */
function инициализироватьЛегенду() {
    console.log('Инициализация легенды...');
    // Инициально показываем легенду для станций мониторинга (они включены по умолчанию)
    обновитьЛегенду();
}

/**
 * Обновить содержимое легенды на основе активных слоёв
 */
function обновитьЛегенду() {
    const legendContainer = document.getElementById('map-legend-content');
    
    if (!legendContainer) {
        console.warn('Контейнер легенды не найден');
        return;
    }
    
    // Получить список активных слоёв
    const активныеСлои = получитьАктивныеСлои();
    
    if (активныеСлои.length === 0) {
        legendContainer.innerHTML = '<p class="text-muted"><small>Нет активных слоёв</small></p>';
        return;
    }
    
    let содержимое = '';
    
    // Добавить легенду для каждого активного слоя
    активныеСлои.forEach(слой => {
        switch(слой) {
            case 'stations':
                содержимое += создатьЛегендуСтанций();
                break;
            case 'temperature':
                содержимое += создатьЛегендуТемпературы();
                break;
            case 'wind':
                содержимое += создатьЛегендуВетра();
                break;
        }
    });
    
    legendContainer.innerHTML = содержимое;
    console.log('Легенда обновлена для слоёв:', активныеСлои);
}

/**
 * Создать легенду для станций мониторинга
 * @returns {string} HTML-код легенды
 */
function создатьЛегендуСтанций() {
    return `
        <div class="legend-section mb-3">
            <h6 class="legend-title">📊 Станции мониторинга</h6>
            <div class="legend-item">
                <div class="legend-marker" style="background-color: #28a745;"></div>
                <span class="legend-text">Норма (0-50% от предела)</span>
            </div>
            <div class="legend-item">
                <div class="legend-marker" style="background-color: #ffc107;"></div>
                <span class="legend-text">Умеренно (50-100%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-marker" style="background-color: #fd7e14;"></div>
                <span class="legend-text">Нездорово (100-200%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-marker" style="background-color: #dc3545;"></div>
                <span class="legend-text">Опасно (&gt;200%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-marker" style="background-color: #6c757d;"></div>
                <span class="legend-text">Нет данных о пределе</span>
            </div>
        </div>
    `;
}

/**
 * Создать легенду для текстовых подписей температуры
 * @returns {string} HTML-код легенды
 */
function создатьЛегендуТемпературы() {
    return `
        <div class="legend-section mb-3">
            <h6 class="legend-title">🌡️ Температура воздуха</h6>
            <div class="mb-2">
                <div class="d-flex align-items-center mb-1">
                    <span style="display: inline-block; width: 30px; height: 20px; background-color: rgba(0, 102, 204, 0.2); border: 1px solid #0066cc; border-radius: 3px; margin-right: 8px; text-align: center; line-height: 20px; font-weight: bold; color: #0066cc; font-size: 11px;">-5°C</span>
                    <span class="legend-text">Мороз (&lt;0°C)</span>
                </div>
                <div class="d-flex align-items-center mb-1">
                    <span style="display: inline-block; width: 30px; height: 20px; background-color: rgba(74, 144, 226, 0.2); border: 1px solid #4a90e2; border-radius: 3px; margin-right: 8px; text-align: center; line-height: 20px; font-weight: bold; color: #4a90e2; font-size: 11px;">5°C</span>
                    <span class="legend-text">Холод (0-10°C)</span>
                </div>
                <div class="d-flex align-items-center mb-1">
                    <span style="display: inline-block; width: 30px; height: 20px; background-color: rgba(44, 140, 63, 0.2); border: 1px solid #2c8c3f; border-radius: 3px; margin-right: 8px; text-align: center; line-height: 20px; font-weight: bold; color: #2c8c3f; font-size: 11px;">15°C</span>
                    <span class="legend-text">Комфорт (10-20°C)</span>
                </div>
                <div class="d-flex align-items-center mb-1">
                    <span style="display: inline-block; width: 30px; height: 20px; background-color: rgba(245, 166, 35, 0.2); border: 1px solid #f5a623; border-radius: 3px; margin-right: 8px; text-align: center; line-height: 20px; font-weight: bold; color: #f5a623; font-size: 11px;">22°C</span>
                    <span class="legend-text">Тепло (20-25°C)</span>
                </div>
                <div class="d-flex align-items-center mb-1">
                    <span style="display: inline-block; width: 30px; height: 20px; background-color: rgba(208, 2, 27, 0.2); border: 1px solid #d0021b; border-radius: 3px; margin-right: 8px; text-align: center; line-height: 20px; font-weight: bold; color: #d0021b; font-size: 11px;">30°C</span>
                    <span class="legend-text">Жара (&gt;25°C)</span>
                </div>
            </div>
            <p class="legend-description mt-2 mb-0">
                <small class="text-muted">
                    💡 Текстовые метки отображают точную температуру в каждой точке. Цвет текста зависит от температурного диапазона. Подписи видны при zoom &gt; 10.
                </small>
            </p>
        </div>
    `;
}

/**
 * Создать легенду для векторного поля ветра (улучшенную)
 * @returns {string} HTML-код легенды
 */
function создатьЛегендуВетра() {
    return `
        <div class="legend-section mb-3">
            <h6 class="legend-title">💨 Векторное поле ветра</h6>
            <div class="legend-item mb-2">
                <svg width="26" height="26" style="margin-right: 10px;" viewBox="0 0 26 26">
                    <path d="M 13 4 L 13 20" stroke="#d0d0d0" stroke-width="2.5" stroke-linecap="round"/>
                    <polygon points="13,4 9,11 13,9 17,11" fill="#d0d0d0" stroke="#fff" stroke-width="1"/>
                </svg>
                <span class="legend-text">Штиль (&lt;1 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="28" height="28" style="margin-right: 10px;" viewBox="0 0 28 28">
                    <path d="M 14 4 L 14 22" stroke="#74add1" stroke-width="3" stroke-linecap="round"/>
                    <polygon points="14,4 10,11 14,9 18,11" fill="#74add1" stroke="#fff" stroke-width="1"/>
                </svg>
                <span class="legend-text">Легкий (1-3 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="30" height="30" style="margin-right: 10px;" viewBox="0 0 30 30">
                    <path d="M 15 4 L 15 23" stroke="#4575b4" stroke-width="3.5" stroke-linecap="round"/>
                    <polygon points="15,4 10,12 15,9 20,12" fill="#4575b4" stroke="#fff" stroke-width="1"/>
                </svg>
                <span class="legend-text">Слабый (3-6 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="32" height="32" style="margin-right: 8px;" viewBox="0 0 32 32">
                    <path d="M 16 4 L 16 25" stroke="#fdae61" stroke-width="3.5" stroke-linecap="round"/>
                    <polygon points="16,4 11,13 16,10 21,13" fill="#fdae61" stroke="#fff" stroke-width="1"/>
                </svg>
                <span class="legend-text">Умеренный (6-10 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="34" height="34" style="margin-right: 6px;" viewBox="0 0 34 34">
                    <path d="M 17 4 L 17 27" stroke="#f46d43" stroke-width="4" stroke-linecap="round"/>
                    <polygon points="17,4 11,14 17,10 23,14" fill="#f46d43" stroke="#fff" stroke-width="1.5"/>
                </svg>
                <span class="legend-text">Свежий (10-15 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="36" height="36" style="margin-right: 4px;" viewBox="0 0 36 36">
                    <path d="M 18 4 L 18 28" stroke="#d73027" stroke-width="4" stroke-linecap="round"/>
                    <polygon points="18,4 12,15 18,11 24,15" fill="#d73027" stroke="#fff" stroke-width="1.5"/>
                </svg>
                <span class="legend-text">Сильный (&gt;15 м/с)</span>
            </div>
            <p class="legend-description mt-2 mb-0">
                <small class="text-muted">
                    🧭 Стрелки указывают направление ветра. Размер и цвет соответствуют силе ветра (шкала Бофорта). 
                    ✨ Стрелки анимированы для лучшей видимости.
                </small>
            </p>
        </div>
    `;
}

/**
 * Показать информацию о данных в легенде
 * @param {Object} info - Информация для отображения (например, количество точек)
 */
function показатьИнфоВЛегенде(info) {
    const infoContainer = document.getElementById('legend-info');
    
    if (!infoContainer) {
        return;
    }
    
    let содержимое = '<div class="mt-2 pt-2 border-top">';
    
    if (info.stationsCount !== undefined) {
        содержимое += `<small class="text-muted d-block">Станций: <strong>${info.stationsCount}</strong></small>`;
    }
    
    if (info.heatmapPoints !== undefined) {
        содержимое += `<small class="text-muted d-block">Точек температуры: <strong>${info.heatmapPoints}</strong></small>`;
    }
    
    if (info.windVectors !== undefined) {
        содержимое += `<small class="text-muted d-block">Векторов ветра: <strong>${info.windVectors}</strong></small>`;
    }
    
    содержимое += '</div>';
    
    infoContainer.innerHTML = содержимое;
}

/**
 * Очистить легенду
 */
function очиститьЛегенду() {
    const legendContainer = document.getElementById('map-legend-content');
    
    if (legendContainer) {
        legendContainer.innerHTML = '<p class="text-muted"><small>Включите слои для отображения легенды</small></p>';
    }
}
