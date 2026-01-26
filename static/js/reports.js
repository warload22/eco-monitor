/**
 * Логика работы страницы аналитических отчетов
 * Управление формой, запросами к API и отображением данных
 */

// Глобальные переменные для хранения данных
let текущиеДанные = [];
let текущийПараметр = {};

/**
 * Инициализация при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        загрузитьПараметры(),
        загрузитьСтанции()
    ]);
    настроитьОбработчики();
});

/**
 * Загрузить список параметров из API
 */
async function загрузитьПараметры() {
    try {
        const response = await fetch('/api/parameters');
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить параметры');
        }
        
        const параметры = await response.json();
        const select = document.getElementById('parameterSelect');
        
        // Очищаем селект
        select.innerHTML = '<option value="">Выберите параметр...</option>';
        
        // Заполняем параметрами (используем русифицированное имя, если доступно)
        параметры.forEach(param => {
            const option = document.createElement('option');
            option.value = param.id;
            const displayName = param.name_ru || param.name;
            option.textContent = `${displayName} (${param.unit})`;
            option.dataset.unit = param.unit;
            option.dataset.name = displayName;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Ошибка при загрузке параметров:', error);
        const select = document.getElementById('parameterSelect');
        select.innerHTML = '<option value="">Ошибка загрузки параметров</option>';
    }
}

/**
 * Загрузить список станций мониторинга из API
 */
async function загрузитьСтанции() {
    try {
        const response = await fetch('/api/locations');
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить станции');
        }
        
        const станции = await response.json();
        const select = document.getElementById('locationSelect');
        
        // Очищаем селект
        select.innerHTML = '<option value="">Все станции</option>';
        
        // Заполняем станциями
        станции.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            option.dataset.name = location.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Ошибка при загрузке станций:', error);
        const select = document.getElementById('locationSelect');
        select.innerHTML = '<option value="">Ошибка загрузки станций</option>';
    }
}

/**
 * Настроить обработчики событий
 */
function настроитьОбработчики() {
    // Обработчик отправки формы
    const форма = document.getElementById('reportForm');
    форма.addEventListener('submit', обработатьОтправкуФормы);
    
    // Обработчик экспорта в CSV
    const кнопкаЭкспорта = document.getElementById('exportCsvBtn');
    кнопкаЭкспорта.addEventListener('click', экспортироватьВCSV);
}

/**
 * Обработать отправку формы для формирования отчета
 */
async function обработатьОтправкуФормы(event) {
    event.preventDefault();
    
    // Получаем значения из формы
    const parameterId = document.getElementById('parameterSelect').value;
    const locationId = document.getElementById('locationSelect').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    // Валидация
    if (!parameterId) {
        alert('Пожалуйста, выберите параметр для формирования отчета');
        return;
    }
    
    // Получаем информацию о выбранном параметре
    const select = document.getElementById('parameterSelect');
    const selectedOption = select.options[select.selectedIndex];
    текущийПараметр = {
        id: parameterId,
        name: selectedOption.dataset.name,
        unit: selectedOption.dataset.unit
    };
    
    // Показываем индикатор загрузки
    показатьЗагрузку(true);
    
    try {
        // Параллельные запросы к API
        const [статистика, сырыеДанные] = await Promise.all([
            получитьСтатистику(parameterId, locationId, dateFrom, dateTo),
            получитьСырыеДанные(parameterId, locationId, dateFrom, dateTo)
        ]);
        
        // Проверяем наличие данных
        if (!статистика || !сырыеДанные || сырыеДанные.length === 0) {
            показатьСообщениеОПустомРезультате();
            return;
        }
        
        // Сохраняем данные
        текущиеДанные = сырыеДанные;
        
        // Отображаем результаты
        отобразитьСтатистику(статистика);
        отобразитьТаблицуДанных(сырыеДанные);
        
    } catch (error) {
        console.error('Ошибка при формировании отчета:', error);
        alert('Произошла ошибка при формировании отчета. Попробуйте позже.');
    } finally {
        показатьЗагрузку(false);
    }
}

/**
 * Получить статистику с сервера
 */
async function получитьСтатистику(parameterId, locationId, dateFrom, dateTo) {
    const params = new URLSearchParams({ parameter_id: parameterId });
    
    if (locationId) params.append('location_id', locationId);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    const response = await fetch(`/reports/api/summary?${params}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при получении статистики');
    }
    
    return await response.json();
}

/**
 * Получить сырые данные с сервера
 */
async function получитьСырыеДанные(parameterId, locationId, dateFrom, dateTo) {
    const params = new URLSearchParams({ parameter_id: parameterId });
    
    if (locationId) params.append('location_id', locationId);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    const response = await fetch(`/reports/api/raw_data?${params}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при получении данных');
    }
    
    return await response.json();
}

/**
 * Отобразить сводную статистику
 */
function отобразитьСтатистику(статистика) {
    // Скрываем сообщение о пустом результате
    document.getElementById('noDataMessage').style.display = 'none';
    
    // Показываем контейнер со статистикой
    const контейнер = document.getElementById('summaryContainer');
    контейнер.style.display = 'block';
    
    // Заполняем заголовок
    let заголовок = статистика.parameter;
    if (статистика.location_name) {
        заголовок += ` - ${статистика.location_name}`;
    }
    document.getElementById('parameterName').textContent = заголовок;
    
    // Информация о периоде
    let периодТекст = 'За все время';
    if (статистика.period.date_from || статистика.period.date_to) {
        const от = статистика.period.date_from 
            ? форматироватьДату(статистика.period.date_from)
            : 'начала';
        const до = статистика.period.date_to 
            ? форматироватьДату(статистика.period.date_to)
            : 'сегодня';
        периодТекст = `Период: с ${от} по ${до}`;
    }
    document.getElementById('periodInfo').textContent = периодТекст;
    
    // Заполняем карточки со статистикой
    const stats = статистика.stats;
    const unit = статистика.unit;
    
    document.getElementById('avgValue').textContent = stats.avg;
    document.getElementById('avgUnit').textContent = unit;
    
    document.getElementById('maxValue').textContent = stats.max;
    document.getElementById('maxUnit').textContent = unit;
    
    document.getElementById('minValue').textContent = stats.min;
    document.getElementById('minUnit').textContent = unit;
    
    document.getElementById('countValue').textContent = stats.count;
    
    // Добавляем информацию о безопасном лимите, если есть
    if (статистика.safe_limit) {
        const инфоЛимита = document.createElement('small');
        инфоЛимита.className = 'text-muted';
        инфоЛимита.textContent = ` (безопасный лимит: ${статистика.safe_limit} ${unit})`;
        document.getElementById('parameterName').appendChild(инфоЛимита);
    }
}

/**
 * Отобразить таблицу с данными
 */
function отобразитьТаблицуДанных(данные) {
    // Показываем контейнер с таблицей
    const контейнер = document.getElementById('dataContainer');
    контейнер.style.display = 'block';
    
    // Получаем tbody таблицы
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    // Заполняем таблицу
    данные.forEach((запись, индекс) => {
        const строка = document.createElement('tr');
        
        // Применяем цветовую индикацию для безопасности
        if (!запись.is_safe) {
            строка.classList.add('table-danger-custom');
        } else {
            строка.classList.add('table-safe');
        }
        
        строка.innerHTML = `
            <td>${индекс + 1}</td>
            <td>${форматироватьДату(запись.measured_at)}</td>
            <td><strong>${запись.value}</strong> ${запись.unit}</td>
            <td>${запись.location_name}</td>
            <td>${запись.district || '-'}</td>
            <td>
                <small class="text-muted">
                    ${запись.latitude.toFixed(4)}, ${запись.longitude.toFixed(4)}
                </small>
            </td>
            <td>
                <span class="badge ${запись.is_safe ? 'bg-success' : 'bg-danger'}">
                    ${запись.is_safe ? '✓ Норма' : '⚠ Превышение'}
                </span>
            </td>
        `;
        
        tbody.appendChild(строка);
    });
    
    // Обновляем счетчик записей
    document.getElementById('recordsCount').textContent = 
        `Всего записей: ${данные.length}`;
}

/**
 * Экспортировать данные в CSV
 */
function экспортироватьВCSV() {
    if (!текущиеДанные || текущиеДанные.length === 0) {
        alert('Нет данных для экспорта. Сформируйте отчет.');
        return;
    }
    
    // Формируем CSV
    const заголовки = [
        'ID',
        'Дата и время',
        'Параметр',
        'Значение',
        'Единица измерения',
        'Точка мониторинга',
        'Район',
        'Широта',
        'Долгота',
        'Статус'
    ];
    
    let csv = заголовки.join(',') + '\n';
    
    текущиеДанные.forEach(запись => {
        const строка = [
            запись.id,
            `"${форматироватьДату(запись.measured_at)}"`,
            `"${запись.parameter_name}"`,
            запись.value,
            `"${запись.unit}"`,
            `"${запись.location_name}"`,
            `"${запись.district || '-'}"`,
            запись.latitude,
            запись.longitude,
            запись.is_safe ? 'Норма' : 'Превышение'
        ];
        csv += строка.join(',') + '\n';
    });
    
    // Создаем Blob и ссылку для скачивания
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const ссылка = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    ссылка.setAttribute('href', url);
    ссылка.setAttribute('download', `отчет_${текущийПараметр.name}_${новаяДата()}.csv`);
    ссылка.style.visibility = 'hidden';
    
    document.body.appendChild(ссылка);
    ссылка.click();
    document.body.removeChild(ссылка);
}

/**
 * Показать/скрыть индикатор загрузки
 */
function показатьЗагрузку(показать) {
    const spinner = document.querySelector('.loading-spinner');
    const кнопка = document.querySelector('#reportForm button[type="submit"]');
    
    if (показать) {
        spinner.classList.add('active');
        кнопка.disabled = true;
    } else {
        spinner.classList.remove('active');
        кнопка.disabled = false;
    }
}

/**
 * Показать сообщение о пустом результате
 */
function показатьСообщениеОПустомРезультате() {
    document.getElementById('summaryContainer').style.display = 'none';
    document.getElementById('dataContainer').style.display = 'none';
    document.getElementById('noDataMessage').style.display = 'block';
}

/**
 * Форматировать дату для отображения
 */
function форматироватьДату(isoДата) {
    const дата = new Date(isoДата);
    const опции = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    };
    return дата.toLocaleString('ru-RU', опции);
}

/**
 * Получить текущую дату в формате для имени файла
 */
function новаяДата() {
    const сейчас = new Date();
    const год = сейчас.getFullYear();
    const месяц = String(сейчас.getMonth() + 1).padStart(2, '0');
    const день = String(сейчас.getDate()).padStart(2, '0');
    return `${год}-${месяц}-${день}`;
}
