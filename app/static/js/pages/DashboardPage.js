// pages/DashboardPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { Navbar } from '../components/Navbar.js';

export const DashboardPage = {
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
                <div class="row" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">👋 Добро пожаловать, ${user.full_name}!</span>
                        </div>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Роль:</strong> <span class="role-badge">${user.role}</span></p>
                        <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <button class="btn btn-primary" onclick="window.router.navigate('tasks')">📋 ${user.role === 'designer' ? 'Активные задачи' : 'Мои задачи'}</button>
                            ${user.role === 'client' ? '<button class="btn btn-success" onclick="window.router.navigate(\'task-create\')">➕ Создать задачу</button>' : ''}
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">📊 Статистика</span>
                        </div>
                        <div id="stats">
                            <div class="loader"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        loadDashboardStats();
    }
};

async function loadDashboardStats() {
    try {
        const token = store.get('token');
        const user = store.get('user');

        const response = await fetch('/api/v1/tasks', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) {
            document.getElementById('stats').innerHTML = '<p class="text-muted">Не удалось загрузить статистику</p>';
            return;
        }

        let tasks = await response.json();

        if (user.role === 'client') {
            tasks = tasks.filter(task => task.client_id === user.id);
        } else if (user.role === 'designer') {
            tasks = tasks.filter(task => task.status.toLowerCase() !== 'completed');
        }

        const stats = {
            total: tasks.length,
            new: tasks.filter(t => t.status.toLowerCase() === 'new').length,
            clarification: tasks.filter(t => t.status.toLowerCase() === 'clarification').length,
            ready_for_review: tasks.filter(t => t.status.toLowerCase() === 'ready_for_review').length,
            in_progress: tasks.filter(t => t.status.toLowerCase() === 'in_progress').length,
            completed: tasks.filter(t => t.status.toLowerCase() === 'completed').length,
            rejected: tasks.filter(t => t.status.toLowerCase() === 'rejected').length
        };

        document.getElementById('stats').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div style="background: #f7fafc; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700;">${stats.total}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">Всего</div>
                </div>
                <div style="background: #bee3f8; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #2b6cb0;">${stats.new}</div>
                    <div style="font-size: 0.8rem; color: #2b6cb0;">Новых</div>
                </div>
                <div style="background: #fefcbf; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #975a16;">${stats.clarification}</div>
                    <div style="font-size: 0.8rem; color: #975a16;">Уточнение</div>
                </div>
                <div style="background: #c6f6d5; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #276749;">${stats.ready_for_review}</div>
                    <div style="font-size: 0.8rem; color: #276749;">Готово</div>
                </div>
                <div style="background: #fbd38d; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #9c4221;">${stats.in_progress}</div>
                    <div style="font-size: 0.8rem; color: #9c4221;">В работе</div>
                </div>
                ${user.role !== 'designer' ? `
                    <div style="background: #48bb78; padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: white;">${stats.completed}</div>
                        <div style="font-size: 0.8rem; color: white;">Завершено</div>
                    </div>
                ` : ''}
                ${user.role === 'admin' ? `
                    <div style="background: #feb2b2; padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #9b2c2c;">${stats.rejected}</div>
                        <div style="font-size: 0.8rem; color: #9b2c2c;">Отклонено</div>
                    </div>
                ` : ''}
            </div>
        `;

    } catch (e) {
        console.error('❌ Ошибка статистики:', e);
        document.getElementById('stats').innerHTML = '<p class="text-muted">Не удалось загрузить статистику</p>';
    }
}

window.logout = function() {
    store.clear();
    window.router.navigate('login');
};