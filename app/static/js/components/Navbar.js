// components/Navbar.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { helpers } from '../utils/helpers.js';

let notifications = [];
let unreadCount = 0;
let isOpen = false;

// Определяем, какая вкладка активна
function getActiveTab() {
    const page = window.router?.getCurrentPage() || 'dashboard';
    const taskPages = ['tasks', 'task-detail', 'task-create', 'task-edit'];
    if (taskPages.includes(page)) return 'tasks';
    if (page === 'users') return 'users';
    return 'dashboard';
}

// Обновление индикатора и активных классов
function updatePill(activeTab) {
    const nav = document.getElementById('pillnav');
    const indicator = document.getElementById('pillIndicator');
    if (!nav || !indicator) return;

    const targetBtn = nav.querySelector(`button[data-target="${activeTab}"]`);
    if (!targetBtn) return;

    const navRect = nav.getBoundingClientRect();
    const btnRect = targetBtn.getBoundingClientRect();

    indicator.style.width = btnRect.width + 'px';
    indicator.style.transform = 'translateX(' + (btnRect.left - navRect.left - 4) + 'px)';

    nav.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === activeTab);
    });
}

// Функция для вызова извне (после навигации)
window.updatePill = updatePill;

export const Navbar = {
    render() {
        const user = store.get('user');
        if (!user) return '';

        const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
        const roleLabel = user.role === 'client' ? 'Байер' : user.role === 'designer' ? 'Дизайнер' : 'Админ';
        const roleClass = user.role === 'client' ? 'client' : user.role === 'designer' ? 'designer' : 'admin';

        // Определяем активную вкладку
        const activeTab = getActiveTab();

        return `
            <div class="topbar">
                <div class="topbar-inner">
                    <div class="brand" onclick="window.router.navigate('dashboard')">
                        <div class="brand-mark">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M4 17L10 5L20 19" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17" cy="8" r="2.2" fill="white"/></svg>
                        </div>
                        <div class="brand-word">Design Task <span>Manager</span></div>
                    </div>

                    <div class="pillnav" id="pillnav">
                        <div class="pill-indicator" id="pillIndicator"></div>
                        <button data-target="dashboard" onclick="window.router.navigate('dashboard')">Кабинет</button>
                        <button data-target="tasks" onclick="window.router.navigate('tasks')">Задачи</button>
                        ${user.role === 'admin' ? `<button data-target="users" onclick="window.router.navigate('users')">Пользователи</button>` : ''}
                    </div>

                    <div class="topbar-right">
                        <button class="icon-btn" onclick="window.toggleNotifications()" title="Уведомления">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 19a2.5 2.5 0 005 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                            <span class="dot" id="notifBadge"></span>
                        </button>
                        <div id="notifDropdown" style="display:none;position:absolute;right:0;top:44px;width:360px;background:white;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,0.12);z-index:1000;padding:8px 0;">
                            <div style="padding:12px 16px;border-bottom:1px solid #e8e4f6;display:flex;justify-content:space-between;">
                                <span style="font-weight:700;">Уведомления</span>
                                <button class="btn btn-ghost btn-sm" onclick="window.markAllRead()">Все прочитаны</button>
                            </div>
                            <div id="notifList" style="max-height:300px;overflow-y:auto;">
                                <div style="padding:16px;text-align:center;color:#a6a2be;">Загрузка...</div>
                            </div>
                        </div>
                        <div class="user-chip">
                            <div class="avatar">${initials}</div>
                            <div class="user-meta">
                                <div class="name">${helpers.escapeHtml(user.full_name)}</div>
                                <span class="role-badge ${roleClass}">${roleLabel}</span>
                            </div>
                        </div>
                        <button class="logout" onclick="window.logout()">Выйти</button>
                    </div>
                </div>
            </div>
        `;
    }
};

// ----- Уведомления (без изменений) -----
window.loadNotifications = async function() {
    try {
        const token = store.get('token');
        if (!token) return;
        const res = await fetch('/api/v1/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            notifications = await res.json();
            window.updateUnreadCount();
            window.renderNotificationList();
        }
    } catch (e) {
        console.error('Notifications error:', e);
    }
};

window.updateUnreadCount = function() {
    const count = notifications.filter(n => !n.is_read).length;
    unreadCount = count;
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.style.display = count > 0 ? 'block' : 'none';
    }
};

window.renderNotificationList = function() {
    const container = document.getElementById('notifList');
    if (!container) return;
    if (notifications.length === 0) {
        container.innerHTML = `<div style="padding:24px;text-align:center;color:#a6a2be;">Нет уведомлений</div>`;
        return;
    }
    let html = '';
    for (const n of notifications) {
        const isRead = n.is_read;
        const link = n.link || '';
        const taskId = link.split('/').pop();
        html += `
            <div onclick="window.markAsRead(${n.id})" style="padding:12px 16px;border-bottom:1px solid #e8e4f6;cursor:pointer;${!isRead ? 'background:#f0f4ff;border-left:3px solid #6C4EFF;' : ''}">
                <div style="font-weight:${!isRead ? '700' : '400'};font-size:0.85rem;">${helpers.escapeHtml(n.title)}</div>
                <div style="font-size:0.8rem;color:#6C6980;margin-top:4px;">${helpers.escapeHtml(n.message)}</div>
                <div style="font-size:0.65rem;color:#a6a2be;margin-top:4px;">
                    ${new Date(n.created_at).toLocaleString()}
                    ${taskId ? ` • <a href="#" onclick="event.stopPropagation();window.router.navigate('task-detail',{id:${taskId}});window.toggleNotifications();" style="color:#6C4EFF;">Подробнее</a>` : ''}
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
};

window.toggleNotifications = function() {
    isOpen = !isOpen;
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) {
        dropdown.style.display = isOpen ? 'block' : 'none';
        if (isOpen) window.loadNotifications();
    }
};

window.markAsRead = async function(id) {
    try {
        const token = store.get('token');
        await fetch(`/api/v1/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const n = notifications.find(x => x.id === id);
        if (n) n.is_read = true;
        window.updateUnreadCount();
        window.renderNotificationList();
    } catch (e) {}
};

window.markAllRead = async function() {
    try {
        const token = store.get('token');
        await fetch('/api/v1/notifications/mark-all-read', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        notifications.forEach(n => n.is_read = true);
        window.updateUnreadCount();
        window.renderNotificationList();
    } catch (e) {}
};

// Закрываем dropdown при клике вне
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown && isOpen && !e.target.closest('#notifDropdown') && !e.target.closest('.icon-btn')) {
        isOpen = false;
        dropdown.style.display = 'none';
    }
});

// Автоматическая загрузка уведомлений
setTimeout(() => {
    if (document.getElementById('notifBadge')) {
        window.loadNotifications();
    }
}, 1500);

// Инициализация пилла после рендера Navbar
setTimeout(() => {
    updatePill(getActiveTab());
}, 100);