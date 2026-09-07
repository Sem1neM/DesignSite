// utils/helpers.js
export const helpers = {
    // Экранирование пользовательского текста перед вставкой в innerHTML.
    // Обязательно для любых данных, пришедших с сервера/от других
    // пользователей (title, description, чат и т.д.) — иначе XSS.
    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    },

    // Форматирование даты
    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },

    // Форматирование размера файла
    formatFileSize(size) {
        if (size < 1024) return size + ' B';
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
        if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
        return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    },

    // Статус-бейдж
    statusBadge(status) {
        return `<span class="status-badge status-${status}">${status.replace('_', ' ')}</span>`;
    },

    // Скопировать текст
    copyToClipboard(text) {
        navigator.clipboard.writeText(text);
    },

    // Генерация случайного ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Дебаунс
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};