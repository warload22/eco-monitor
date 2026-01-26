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
                        #313695 0%,
                        #4575b4 10%,
                        #74add1 20%,
                        #abd9e9 30%,
                        #e0f3f8 40%,
                        #ffffbf 50%,
                        #fee090 60%,
                        #fdae61 70%,
                        #f46d43 80%,
                        #d73027 90%,
                        #a50026 100%
                    );
                    height: 24px;
                    border-radius: 5px;
                    margin-bottom: 8px;
                    border: 1px solid #ddd;
                "></div>
                <div class="legend-gradient-labels" style="
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    color: #666;
                ">
                    <span style="font-weight: 500;">10°C</span>
                    <span style="font-weight: 500;">15°C</span>
                    <span style="font-weight: 500;">20°C</span>
                    <span style="font-weight: 500;">25°C</span>
                </div>
            </div>
            <p class="legend-description mt-2 mb-0">
                <small class="text-muted">
                    💡 Цвета соответствуют температуре воздуха (метеорологическая шкала)
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
            <div class="legend-item mb-2">
                <svg width="24" height="24" style="margin-right: 10px;" viewBox="0 0 24 24">
                    <polygon points="12,4 16,12 8,12" fill="#d0d0d0" stroke="#fff" stroke-width="2"/>
                </svg>
                <span class="legend-text">Штиль (&lt;1 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="24" height="24" style="margin-right: 10px;" viewBox="0 0 24 24">
                    <polygon points="12,4 16,12 8,12" fill="#74add1" stroke="#fff" stroke-width="2"/>
                </svg>
                <span class="legend-text">Легкий (1-3 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="24" height="24" style="margin-right: 10px;" viewBox="0 0 24 24">
                    <polygon points="12,4 17,12 7,12" fill="#4575b4" stroke="#fff" stroke-width="2"/>
                </svg>
                <span class="legend-text">Слабый (3-6 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="28" height="28" style="margin-right: 8px;" viewBox="0 0 28 28">
                    <polygon points="14,4 19,14 9,14" fill="#fdae61" stroke="#fff" stroke-width="2"/>
                </svg>
                <span class="legend-text">Умеренный (6-10 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="30" height="30" style="margin-right: 6px;" viewBox="0 0 30 30">
                    <polygon points="15,4 21,15 9,15" fill="#f46d43" stroke="#fff" stroke-width="2"/>
                </svg>
                <span class="legend-text">Свежий (10-15 м/с)</span>
            </div>
            <div class="legend-item mb-2">
                <svg width="32" height="32" style="margin-right: 4px;" viewBox="0 0 32 32">
                    <polygon points="16,4 23,16 9,16" fill="#d73027" stroke="#fff" stroke-width="2"/>
                </svg>
                <span class="legend-text">Сильный (&gt;15 м/с)</span>
            </div>
            <p class="legend-description mt-2 mb-0">
                <small class="text-muted">
                    🧭 Стрелка указывает направление ветра. Размер и цвет отражают силу ветра (шкала Бофорта)
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
