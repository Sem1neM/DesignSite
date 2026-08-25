// components/TaskCard.js
import { helpers } from '../utils/helpers.js';
import { StatusBadge } from './StatusBadge.js';
import { router } from '../core/router.js';

export const TaskCard = {
    render(task, options = {}) {
        const { showActions = true, compact = false } = options;
        const isClient = window.store?.get('user')?.role === 'client';

        if (compact) {
            return `
                <div class="task-item" onclick="window.router.navigate('task-detail', {id: ${task.id}})">
                    <div class="task-info">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            <span>🆔 #${task.id}</span>
                            <span>📅 ${helpers.formatDate(task.created_at)}</span>
                            ${task.deadline ? `<span>⏰ ${helpers.formatDate(task.deadline)}</span>` : ''}
                        </div>
                    </div>
                    <div>${StatusBadge.render(task.status)}</div>
                    ${showActions ? `
                        <div class="task-actions">
                            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.router.navigate('task-detail', {id: ${task.id}})">Просмотр</button>
                            ${isClient ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); window.deleteTask(${task.id})">✕</button>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span class="card-title">${task.title}</span>
                        ${StatusBadge.render(task.status)}
                    </div>
                    ${showActions ? `
                        <div>
                            <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('task-detail', {id: ${task.id}})">Просмотр</button>
                            ${isClient ? `<button class="btn btn-danger btn-sm" onclick="window.deleteTask(${task.id})">🗑 Удалить</button>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="task-detail-grid">
                    <div>
                        <div class="field-label">📝 Описание</div>
                        <div class="field-value">${task.description || '—'}</div>
                        <div class="field-label">🎯 Целевая аудитория</div>
                        <div class="field-value">${task.target_audience || '—'}</div>
                    </div>
                    <div>
                        <div class="field-label">📅 Создана</div>
                        <div class="field-value">${helpers.formatDate(task.created_at)}</div>
                        <div class="field-label">🔄 Обновлена</div>
                        <div class="field-value">${helpers.formatDate(task.updated_at)}</div>
                        ${task.deadline ? `<div class="field-label">⏰ Дедлайн</div><div class="field-value">${helpers.formatDate(task.deadline)}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
};