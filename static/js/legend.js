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
            case 'heatmap':
                содержимое += создатьЛегендуТепловойКарты();
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
 * Создать легенду для тепловой карты температуры
 * @returns {string} HTML-код легенды
 */
function создатьЛегендуТепловойКарты() {
    return `
        <div class="legend-section mb-3">
            <h6 class="legend-title">🌡️ Тепловая карта температуры</h6>
            <div class="legend-gradient-container">
                <div class="legend-gradient" style="
                    background: linear-gradient(to right, 
                        #0000ff 0%, 
                        #00ffff 20%, 
                        #00ff00 40%, 
                        #ffff00 60%, 
                        #ff9900 80%, 
                        #ff0000 100%
                    );
                    height: 20px;
                    border-radius: 4px;
                    margin-bottom: 5px;
                "></div>
                <div class="legend-gradient-labels" style="
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                ">
                    <span>-10°C</span>
                    <span>0°C</span>
                    <span>10°C</span>
                    <span>20°C</span>
                    <span>30°C</span>
                </div>
            </div>
            <p class="legend-description">
                <small class="text-muted">
                    Интенсивность цвета показывает температуру воздуха
                </small>
            </p>
        </div>
    `;
}

/**
 * Создать легенду для векторного поля ветра
 * @returns {string} HTML-код легенды
 */
function создатьЛегендуВетра() {
    return `
        <div class="legend-section mb-3">
            <h6 class="legend-title">💨 Векторное поле ветра</h6>
            <div class="legend-item">
                <svg width="30" height="20" style="margin-right: 8px;">
                    <polygon points="15,2 20,10 10,10" fill="#00ff00" stroke="#fff" stroke-width="1"/>
                    <line x1="15" y1="10" x2="15" y2="18" stroke="#00ff00" stroke-width="2"/>
                </svg>
                <span class="legend-text">Слабый (&lt;3 м/с)</span>
            </div>
            <div class="legend-item">
                <svg width="30" height="20" style="margin-right: 8px;">
                    <polygon points="15,2 20,10 10,10" fill="#ffff00" stroke="#fff" stroke-width="1"/>
                    <line x1="15" y1="10" x2="15" y2="18" stroke="#ffff00" stroke-width="2"/>
                </svg>
                <span class="legend-text">Умеренный (3-8 м/с)</span>
            </div>
            <div class="legend-item">
                <svg width="30" height="20" style="margin-right: 8px;">
                    <polygon points="15,2 20,10 10,10" fill="#ff9900" stroke="#fff" stroke-width="1"/>
                    <line x1="15" y1="10" x2="15" y2="18" stroke="#ff9900" stroke-width="2"/>
                </svg>
                <span class="legend-text">Сильный (8-15 м/с)</span>
            </div>
            <div class="legend-item">
                <svg width="30" height="20" style="margin-right: 8px;">
                    <polygon points="15,2 20,10 10,10" fill="#ff0000" stroke="#fff" stroke-width="1"/>
                    <line x1="15" y1="10" x2="15" y2="18" stroke="#ff0000" stroke-width="2"/>
                </svg>
                <span class="legend-text">Очень сильный (&gt;15 м/с)</span>
            </div>
            <p class="legend-description">
                <small class="text-muted">
                    Стрелка показывает направление, цвет и длина - скорость ветра
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
