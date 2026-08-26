// pages/TasksPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { Navbar } from '../components/Navbar.js';

const STATUS_RUSSIAN = {
    'new': 'Новая',
    'clarification': 'Уточнение',
    'ready_for_review': 'Готово к проверке',
    'in_progress': 'В работе',
    'completed': 'Завершено',
    'rejected': 'Отклонено'
};

export const TasksPage = {
    render() {
        const user = store.get('user');
        if (!user) {
            router.navigate('login');
            return;
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            ${Navbar.render()}
            <div class="container">
                <div id="alertContainer"></div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">📋 ${user.role === 'designer' ? 'Активные задачи' : 'Мои задачи'}</span>
                        <div style="display: flex; gap: 8px;">
                            ${user.role === 'client' ? '<button class="btn btn-success btn-sm" onclick="window.router.navigate(\'task-create\')">➕ Создать</button>' : ''}
                            <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('dashboard')">← На главную</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-weight: 500; font-size: 0.9rem; color: #4a4a6a;">Сортировать:</label>
                            <select id="sortStatus" class="form-control" style="width: auto; padding: 6px 12px; font-size: 0.9rem;" onchange="window.applySort()">
                                <option value="all">Все статусы</option>
                                <option value="new">Новые</option>
                                <option value="clarification">Уточнение</option>
                                <option value="ready_for_review">Готово</option>
                                <option value="in_progress">В работе</option>
                                <option value="completed">Завершено</option>
                                <option value="rejected">Отклонено</option>
                            </select>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-weight: 500; font-size: 0.9rem; color: #4a4a6a;">По дате:</label>
                            <select id="sortDate" class="form-control" style="width: auto; padding: 6px 12px; font-size: 0.9rem;" onchange="window.applySort()">
                                <option value="newest">Сначала новые</option>
                                <option value="oldest">Сначала старые</option>
                            </select>
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

        loadTasksList();
    }
};

let allTasks = [];

async function loadTasksList() {
    try {
        const token = store.get('token');
        const user = store.get('user');

        const response = await fetch('/api/v1/tasks', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            document.getElementById('taskList').innerHTML = '<div class="alert alert-error">❌ Ошибка загрузки</div>';
            return;
        }

        let tasks = await response.json();

        if (user.role === 'client') {
            tasks = tasks.filter(task => task.client_id === user.id);
        } else if (user.role === 'designer') {
            tasks = tasks.filter(task => task.status.toLowerCase() !== 'completed');
        }

        allTasks = tasks;
        renderTasks(user);

    } catch (error) {
        console.error('❌ Error:', error);
        document.getElementById('taskList').innerHTML = '<div class="alert alert-error">❌ Ошибка: ' + error.message + '</div>';
    }
}

function renderTasks(user) {
    const container = document.getElementById('taskList');
    if (!container) return;

    const sortStatus = document.getElementById('sortStatus')?.value || 'all';
    const sortDate = document.getElementById('sortDate')?.value || 'newest';

    let filteredTasks = allTasks;
    if (sortStatus !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.status.toLowerCase() === sortStatus);
    }

    filteredTasks = filteredTasks.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        if (sortDate === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });

    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <h3>${allTasks.length === 0 ? 'Нет задач' : 'Нет задач с таким статусом'}</h3>
                <p class="text-muted">${allTasks.length === 0 ? 'Создайте свою первую задачу!' : 'Попробуйте выбрать другой статус'}</p>
            </div>
        `;
        return;
    }

    let html = '';
    for (const task of filteredTasks) {
        const statusText = STATUS_RUSSIAN[task.status.toLowerCase()] || task.status;

        html += `
            <div class="task-item" onclick="window.router.navigate('task-detail', {id: ${task.id}})">
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span>🆔 #${task.id}</span>
                        <span>📅 ${new Date(task.created_at).toLocaleDateString()}</span>
                        ${task.deadline ? '<span>⏰ ' + new Date(task.deadline).toLocaleDateString() + '</span>' : ''}
                        ${user && user.role !== 'client' ? '<span>👤 Клиент: #' + task.client_id + '</span>' : ''}
                    </div>
                </div>
                <div><span class="status-badge status-${task.status}">${statusText}</span></div>
                <div class="task-actions">
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.router.navigate('task-detail', {id: ${task.id}})">Просмотр</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

window.applySort = function() {
    const user = store.get('user');
    renderTasks(user);
};

window.logout = function() {
    store.clear();
    window.router.navigate('login');
};