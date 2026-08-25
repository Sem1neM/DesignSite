// pages/TaskDetailPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const TaskDetailPage = {
    render(params) {
        const user = store.get('user');
        if (!user) {
            router.navigate('login');
            return;
        }

        const taskId = params.id;
        const app = document.getElementById('app');
        app.innerHTML = `
            <nav class="navbar">
                <span class="navbar-brand" style="cursor:pointer;" onclick="window.router.navigate('dashboard')">🎨 Design Task Manager</span>
                <div class="navbar-menu">
                    <span class="user-info">${user.full_name}</span>
                    <span class="role-badge">${user.role}</span>
                    <button class="btn btn-secondary btn-sm" onclick="window.logout()">Выйти</button>
                </div>
            </nav>
            <div class="container">
                <div id="alertContainer"></div>
                <div id="taskDetail">
                    <div class="loader-container">
                        <div class="loader"></div>
                        <div>Загрузка задачи...</div>
                    </div>
                </div>
            </div>
        `;

        // Вызываем через TaskDetailPage
        TaskDetailPage.loadTask(taskId);
    },

    async loadTask(taskId) {
        try {
            const token = store.get('token');
            console.log('🔍 Fetching task:', taskId);

            const response = await fetch('/api/v1/tasks/' + taskId, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const task = await response.json();
                console.log('📋 Task loaded:', task.title);

                const container = document.getElementById('taskDetail');
                const statusLabels = {
                    'NEW': '🆕 Новая',
                    'CLARIFICATION': '💬 Уточнение',
                    'READY_FOR_REVIEW': '✅ Готово к проверке',
                    'IN_PROGRESS': '🔄 В работе',
                    'COMPLETED': '✔️ Завершено',
                    'REJECTED': '❌ Отклонено'
                };
                const statusLabel = statusLabels[task.status] || task.status;

                const isClient = user.role === 'client' && task.client_id === user.id;
                const isAdmin = user.role === 'admin';

                container.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <span class="card-title">${task.title}</span>
                                <span class="status-badge status-${task.status}">${statusLabel}</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('tasks')">← Назад</button>
                                ${(isClient || isAdmin) ? '<button class="btn btn-primary btn-sm" onclick="window.router.navigate(\'task-edit\', {id: ' + task.id + '})">✏️ Редактировать</button>' : ''}
                                ${isClient ? '<button class="btn btn-danger btn-sm" onclick="window.deleteTask(' + task.id + ')">🗑 Удалить</button>' : ''}
                            </div>
                        </div>
                        <div class="task-detail-grid">
                            <div>
                                <div class="field-label">📝 Описание</div>
                                <div class="field-value">${task.description || '—'}</div>
                                ${task.clarified_description ? '<div class="field-label">🤖 Уточнённое ТЗ (ИИ)</div><div class="field-value" style="background: #f7fafc; padding: 12px; border-radius: 8px;">' + task.clarified_description + '</div>' : ''}
                                <div class="field-label">🎯 Целевая аудитория</div>
                                <div class="field-value">${task.target_audience || '—'}</div>
                                <div class="field-label">🎨 Предпочтительный стиль</div>
                                <div class="field-value">${task.preferred_style || '—'}</div>
                                ${task.references && task.references.length > 0 ? '<div class="field-label">🔗 Референсы (ссылки)</div><div class="field-value">' + task.references.map(function(ref) { return '<a href="' + ref + '" target="_blank" style="color: #667eea; display: block;">' + ref + '</a>'; }).join('') + '</div>' : ''}
                            </div>
                            <div>
                                <div class="field-label">🆔 ID</div>
                                <div class="field-value">#${task.id}</div>
                                <div class="field-label">📊 Статус</div>
                                <div class="field-value"><span class="status-badge status-${task.status}">${statusLabel}</span></div>
                                <div class="field-label">👤 Клиент</div>
                                <div class="field-value">${task.client_id}</div>
                                <div class="field-label">👨‍🎨 Дизайнер</div>
                                <div class="field-value">${task.assigned_designer_id || 'Не назначен'}</div>
                                <div class="field-label">📅 Создана</div>
                                <div class="field-value">${new Date(task.created_at).toLocaleString()}</div>
                                <div class="field-label">🔄 Обновлена</div>
                                <div class="field-value">${new Date(task.updated_at).toLocaleString()}</div>
                                ${task.deadline ? '<div class="field-label">⏰ Дедлайн</div><div class="field-value">' + new Date(task.deadline).toLocaleString() + '</div>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            } else if (response.status === 404) {
                document.getElementById('taskDetail').innerHTML = `
                    <div class="card">
                        <div class="alert alert-error">❌ Задача не найдена</div>
                        <button class="btn btn-secondary" onclick="window.router.navigate('tasks')">← Назад</button>
                    </div>
                `;
            } else {
                const error = await response.json();
                document.getElementById('taskDetail').innerHTML = '<div class="alert alert-error">❌ Ошибка загрузки: ' + (error.detail || 'Unknown error') + '</div>';
            }
        } catch (error) {
            console.error('❌ Fetch error:', error);
            document.getElementById('taskDetail').innerHTML = '<div class="alert alert-error">❌ Ошибка загрузки: ' + error.message + '</div>';
        }
    }
};