// components/StatusBadge.js
export const StatusBadge = {
    render(status) {
        const labels = {
            'NEW': 'Новая',
            'CLARIFICATION': 'Уточнение',
            'READY_FOR_REVIEW': 'Готово к проверке',
            'IN_PROGRESS': 'В работе',
            'COMPLETED': 'Завершено',
            'REJECTED': 'Отклонено'
        };

        const displayText = labels[status] || status.replace('_', ' ');
        return `<span class="status-badge status-${status}">${displayText}</span>`;
    }
};