// pages/DashboardPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const DashboardPage = {
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
                <div class="row" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">👋 Добро пожаловать, ${user.full_name}!</span>
                        </div>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Роль:</strong> <span class="role-badge">${user.role}</span></p>
                        <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <button class="btn btn-primary" onclick="window.router.navigate('tasks')">📋 Мои задачи</button>
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

        DashboardPage.loadStats();
    },

    async loadStats() {
        try {
            const token = store.get('token');
            const response = await fetch('/api/v1/tasks', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (response.ok) {
                const tasks = await response.json();
                const stats = {
                    total: tasks.length,
                    new: tasks.filter(t => t.status === 'NEW').length,
                    in_progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
                    completed: tasks.filter(t => t.status === 'COMPLETED').length
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
                        <div style="background: #fbd38d; padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #9c4221;">${stats.in_progress}</div>
                            <div style="font-size: 0.8rem; color: #9c4221;">В работе</div>
                        </div>
                        <div style="background: #c6f6d5; padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #276749;">${stats.completed}</div>
                            <div style="font-size: 0.8rem; color: #276749;">Завершено</div>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            document.getElementById('stats').innerHTML = '<p class="text-muted">Не удалось загрузить статистику</p>';
        }
    }
};