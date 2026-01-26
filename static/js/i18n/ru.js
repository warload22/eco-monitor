/**
 * Словарь переводов для интерфейса EcoMonitor
 * Все текстовые константы для русского языка
 */

const i18n = {
    // Общие
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    warning: 'Предупреждение',
    info: 'Информация',
    close: 'Закрыть',
    apply: 'Применить',
    reset: 'Сбросить',
    cancel: 'Отмена',
    save: 'Сохранить',
    delete: 'Удалить',
    edit: 'Редактировать',
    
    // Фильтры
    filters: {
        title: 'Фильтры',
        parameter: 'Параметр',
        location: 'Станция',
        period: 'Период',
        applyFilters: 'Применить фильтры',
        resetFilters: 'Сбросить',
        allParameters: 'Все параметры',
        allStations: 'Все станции',
        lastHour: 'Последний час',
        last24Hours: 'Последние 24 часа',
        lastWeek: 'Последняя неделя'
    },
    
    // Карта
    map: {
        title: 'Карта мониторинга качества воздуха',
        subtitle: 'Московский регион - данные с мониторинговых станций',
        stationsShown: 'Показано точек',
        lastUpdate: 'Последнее обновление',
        loading: 'Загрузка данных карты...',
        error: 'Ошибка загрузки данных. Пожалуйста, попробуйте позже.',
        noData: 'Нет данных для отображения',
        clickForDetails: 'Нажмите на точку для подробной информации'
    },
    
    // Легенда
    legend: {
        title: 'Легенда',
        normal: 'Норма',
        moderate: 'Умеренно',
        unhealthy: 'Нездорово',
        dangerous: 'Опасно',
        unknown: 'Неизвестно'
    },
    
    // Popup на карте
    popup: {
        monitoringStation: 'Станция мониторинга',
        pollutantType: 'Тип загрязнителя',
        value: 'Значение',
        standard: 'Норматив',
        percentOfStandard: 'Процент от нормы',
        status: 'Статус',
        measurementTime: 'Время измерения',
        normal: '✓ Норма',
        exceeded: '⚠ Превышение'
    },
    
    // Отчеты
    reports: {
        title: 'Аналитические отчеты',
        subtitle: 'Формирование сводной статистики и детальных отчетов',
        parameters: 'Параметры отчета',
        parameter: 'Параметр мониторинга',
        location: 'Станция мониторинга',
        dateFrom: 'Дата начала',
        dateTo: 'Дата окончания',
        generate: 'Сформировать',
        summary: 'Сводная статистика',
        detailedData: 'Детальные данные измерений',
        exportCsv: 'Экспорт в CSV',
        noData: 'Данные не найдены.',
        tryChangeParams: 'Попробуйте изменить параметры отчета.',
        average: 'Среднее значение',
        maximum: 'Максимум',
        minimum: 'Минимум',
        recordsCount: 'Количество записей',
        tableHeaders: {
            number: '№',
            dateTime: 'Дата и время',
            value: 'Значение',
            location: 'Точка мониторинга',
            district: 'Район',
            coordinates: 'Координаты',
            status: 'Статус'
        }
    },
    
    // Погодные слои
    weather: {
        heatmap: 'Тепловая карта температуры',
        windVectors: 'Векторы ветра',
        toggleHeatmap: 'Показать/скрыть тепловую карту',
        toggleWind: 'Показать/скрыть векторы ветра',
        heatmapLoaded: 'Тепловая карта: загружено {count} точек',
        windLoaded: 'Векторы ветра: загружено {count} векторов',
        loadingHeatmap: 'Загрузка тепловой карты...',
        loadingWind: 'Загрузка векторов ветра...',
        errorLoading: 'Ошибка загрузки погодных данных',
        layersTitle: 'Погодные слои',
        temperature: 'Температура',
        wind: 'Ветер',
        windSpeed: 'Скорость ветра',
        windDirection: 'Направление ветра',
        weak: 'Слабый',
        moderate: 'Умеренный',
        strong: 'Сильный',
        veryStrong: 'Очень сильный'
    },
    
    // Параметры качества воздуха
    parameters: {
        'PM2.5': 'Твердые частицы PM2.5',
        'PM10': 'Твердые частицы PM10',
        'NO2': 'Диоксид азота',
        'SO2': 'Диоксид серы',
        'CO': 'Угарный газ',
        'O3': 'Озон',
        'temperature': 'Температура воздуха',
        'humidity': 'Влажность',
        'pressure': 'Атмосферное давление'
    },
    
    // Категории
    categories: {
        'air_quality': 'Качество воздуха',
        'weather': 'Погода',
        'radiation': 'Радиация',
        'noise': 'Шум'
    },
    
    // Ошибки
    errors: {
        failedToLoad: 'Не удалось загрузить данные',
        networkError: 'Ошибка сети. Проверьте подключение к интернету.',
        serverError: 'Ошибка сервера. Попробуйте позже.',
        invalidData: 'Получены некорректные данные',
        noConnection: 'Нет соединения с сервером'
    },
    
    // Консольные сообщения (для отладки)
    console: {
        mapInitialized: 'Карта инициализирована',
        filtersInitialized: 'Фильтры успешно инициализированы',
        parametersLoaded: 'Загружено {count} параметр(ов)',
        locationsLoaded: 'Загружено {count} локаци(й)',
        measurementsLoaded: 'Загружено {count} измерени(й)',
        requestInProgress: 'Запрос уже выполняется, пропускаем...',
        noMeasurements: 'Нет измерений для текущих фильтров',
        weatherLayersInitialized: 'Погодные слои инициализированы',
        heatmapShown: 'Тепловая карта показана',
        heatmapHidden: 'Тепловая карта скрыта',
        windShown: 'Векторы ветра показаны',
        windHidden: 'Векторы ветра скрыты'
    }
};

/**
 * Получить переведенное значение по ключу
 * Поддерживает вложенные ключи через точку (например, 'map.title')
 * @param {string} key - Ключ перевода
 * @param {Object} params - Параметры для подстановки (например, {count: 5})
 * @returns {string} - Переведенная строка
 */
function t(key, params = {}) {
    const keys = key.split('.');
    let value = i18n;
    
    // Навигируемся по вложенным объектам
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            console.warn(`Перевод не найден для ключа: ${key}`);
            return key;
        }
    }
    
    // Если это строка, выполняем подстановку параметров
    if (typeof value === 'string') {
        return value.replace(/\{(\w+)\}/g, (match, param) => {
            return params.hasOwnProperty(param) ? params[param] : match;
        });
    }
    
    return value;
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18n, t };
}
