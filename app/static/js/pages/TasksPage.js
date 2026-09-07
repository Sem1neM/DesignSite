// pages/TasksPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { Navbar } from '../components/Navbar.js';
import { helpers } from '../utils/helpers.js';

const statusMap = {
    'new': 'Новая',
    'clarification': 'Уточнение',
    'ready_for_review': 'Готово к проверке',
    'in_progress': 'В работе',
    'completed': 'Завершено',
    'rejected': 'Отклонено'
};

const chipMap = {
    'new': 'new',
    'clarification': 'new',
    'ready_for_review': 'ready',
    'in_progress': 'progress',
    'completed': 'done',
    'rejected': 'cancel'
};

export const TasksPage = {
    tasks: [],

    render() {
        const user = store.get('user');
        if (!user) {
            router.navigate('login');
            return;
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            ${Navbar.render()}
            <div class="app">
                <section class="view active" id="tasks">
                    <div class="page-head">
                        <div>
                            <h1>${user.role === 'client' ? 'Мои задачи' : user.role === 'designer' ? 'Активные задачи' : 'Все задачи'}</h1>
                            <div class="sub" id="taskCount">Загрузка...</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="window.router.navigate('dashboard')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            На главную
                        </button>
                    </div>

                    <div class="filter-bar">
                        <div class="select-pill">
                            <span class="cap">Фильтр</span>
                            <select id="filterStatus" onchange="window.applyFilters()">
                                <option value="all">Все статусы</option>
                                <option value="new">Новая</option>
                                <option value="in_progress">В работе</option>
                                <option value="ready_for_review">Готово</option>
                                <option value="completed">Завершено</option>
                                <option value="rejected">Отменены</option>
                            </select>
                        </div>
                        <div class="select-pill">
                            <span class="cap">Сортировка</span>
                            <select id="sortOrder" onchange="window.applyFilters()">
                                <option value="newest">Сначала новые</option>
                                <option value="oldest">Сначала старые</option>
                            </select>
                        </div>
                    </div>

                    <div class="task-list" id="taskList">
                        <div class="loader-container"><div class="loader"></div><div>Загрузка задач...</div></div>
                    </div>
                </section>
            </div>
        `;

        window.applyFilters = function() {
            TasksPage.applyFilters();
        };

        // Обновляем индикатор pillnav для вкладки "Задачи"
        if (window.updatePillIndicator) {
            window.updatePillIndicator('tasks');
        }

        TasksPage.loadTasks();
    },

    loadTasks: async function() {
        try {
            const token = store.get('token');
            const res = await fetch('/api/v1/tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error(`Ошибка HTTP: ${res.status}`);
            }
            const tasks = await res.json();
            console.log('📋 Загружено задач:', tasks.length);
            TasksPage.tasks = tasks;
            document.getElementById('taskCount').textContent = `${tasks.length} задач`;
            TasksPage.applyFilters();
        } catch (e) {
            console.error('❌ Ошибка загрузки задач:', e);
            document.getElementById('taskList').innerHTML = `
                <div class="alert alert-error">❌ Ошибка загрузки задач: ${e.message}</div>
            `;
        }
    },

    applyFilters: function() {
        const filter = document.getElementById('filterStatus');
        const sort = document.getElementById('sortOrder');
        if (!filter || !sort) return;

        const filterVal = filter.value;
        const sortVal = sort.value;
        let tasks = TasksPage.tasks || [];

        if (filterVal !== 'all') {
            tasks = tasks.filter(t => t.status.toLowerCase() === filterVal);
        }

        tasks = tasks.sort((a, b) => {
            const da = new Date(a.created_at);
            const db = new Date(b.created_at);
            return sortVal === 'newest' ? db - da : da - db;
        });

        const container = document.getElementById('taskList');
        if (!tasks.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <h3>Нет задач</h3>
                    <p class="text-muted">Попробуйте изменить фильтры</p>
                </div>
            `;
            return;
        }

        let html = '';
        for (const task of tasks) {
            const statusText = statusMap[task.status.toLowerCase()] || task.status;
            const chipClass = chipMap[task.status.toLowerCase()] || 'new';
            const borderClass = chipClass ? `st-${chipClass}` : '';
            html += `
                <div class="task-card ${borderClass}" onclick="window.router.navigate('task-detail', {id: ${task.id}})">
                    <div class="task-main-col">
                        <div class="task-title">${helpers.escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            <span>🆔 #${task.id}</span>
                            <span>📅 ${new Date(task.created_at).toLocaleDateString()}</span>
                            <span>👤 Клиент #${task.client_id}</span>
                            <span class="type-chip">Крео</span>
                        </div>
                    </div>
                    <span class="status-chip ${chipClass}">${statusText}</span>
                    <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
            `;
        }
        container.innerHTML = html;
    }
};