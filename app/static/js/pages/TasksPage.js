// pages/TasksPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const TasksPage = {
    render() {
        const user = store.get('user');
        if (!user) {
            router.navigate('login');
            return;
        }

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
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">📋 Мои задачи</span>
                        <div style="display: flex; gap: 8px;">
                            ${user.role === 'client' ? '<button class="btn btn-success btn-sm" onclick="window.router.navigate(\'task-create\')">➕ Создать</button>' : ''}
                            <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('dashboard')">← На главную</button>
                        </div>
                    </div>
                    <div id="taskList">
                        <div class="loader-container">
                            <div class="loader"></div>
                            <div>Загрузка задач...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Вызываем loadTasks через TasksPage (сохраняем контекст)
        TasksPage.loadTasks();
    },

    async loadTasks() {
        try {
            const token = store.get('token');
            console.log('🔍 Fetching tasks...');

            const response = await fetch('/api/v1/tasks', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const tasks = await response.json();
                console.log('📋 Tasks loaded:', tasks.length);
                const container = document.getElementById('taskList');

                if (tasks.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <div class="icon">📭</div>
                            <h3>Нет задач</h3>
                            <p class="text-muted">У вас пока нет созданных задач</p>
                            ${store.get('user')?.role === 'client' ? '<button class="btn btn-primary mt-16" onclick="window.router.navigate(\'task-create\')">➕ Создать первую задачу</button>' : ''}
                        </div>
                    `;
                    return;
                }

                let html = '';
                for (const task of tasks) {
                    const statusLabels = {
                        'NEW': '🆕 Новая',
                        'CLARIFICATION': '💬 Уточнение',
                        'READY_FOR_REVIEW': '✅ Готово к проверке',
                        'IN_PROGRESS': '🔄 В работе',
                        'COMPLETED': '✔️ Завершено',
                        'REJECTED': '❌ Отклонено'
                    };
                    const statusLabel = statusLabels[task.status] || task.status;

                    html += `
                        <div class="task-item" onclick="window.router.navigate('task-detail', {id: ${task.id}})">
                            <div class="task-info">
                                <div class="task-title">${task.title}</div>
                                <div class="task-meta">
                                    <span>🆔 #${task.id}</span>
                                    <span>📅 ${new Date(task.created_at).toLocaleDateString()}</span>
                                    ${task.deadline ? '<span>⏰ ' + new Date(task.deadline).toLocaleDateString() + '</span>' : ''}
                                    ${task.assigned_designer_id ? '<span>👤 Дизайнер назначен</span>' : ''}
                                </div>
                            </div>
                            <div><span class="status-badge status-${task.status}">${statusLabel}</span></div>
                            <div class="task-actions">
                                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.router.navigate('task-detail', {id: ${task.id}})">Просмотр</button>
                                ${store.get('user')?.role === 'client' ? '<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); window.deleteTask(' + task.id + ')">✕</button>' : ''}
                            </div>
                        </div>
                    `;
                }
                container.innerHTML = html;
            } else if (response.status === 401) {
                console.log('🔒 Unauthorized');
                store.clear();
                window.router.navigate('login');
            } else {
                const error = await response.json();
                document.getElementById('taskList').innerHTML = '<div class="alert alert-error">❌ Не удалось загрузить задачи: ' + (error.detail || 'Unknown error') + '</div>';
            }
        } catch (error) {
            console.error('❌ Fetch error:', error);
            document.getElementById('taskList').innerHTML = '<div class="alert alert-error">❌ Ошибка загрузки: ' + error.message + '</div>';
        }
    }
};

// Глобальная функция удаления
window.deleteTask = async function(taskId) {
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    try {
        const token = store.get('token');
        const response = await fetch('/api/v1/tasks/' + taskId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            if (window.showAlert) window.showAlert('✅ Задача удалена', 'success');
            setTimeout(function() { window.router.navigate('tasks'); }, 500);
        } else {
            if (window.showAlert) window.showAlert('❌ Не удалось удалить задачу', 'error');
        }
    } catch (e) {
        if (window.showAlert) window.showAlert('❌ Ошибка соединения', 'error');
    }
};

// Делаем logout глобальным
window.logout = function() {
    store.clear();
    window.router.navigate('login');
};