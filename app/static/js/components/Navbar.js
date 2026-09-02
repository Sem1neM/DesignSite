// components/Navbar.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

let notifications = [];
let unreadCount = 0;
let isOpen = false;

export const Navbar = {
    render() {
        const user = store.get('user');
        if (!user) return '';

        return `
            <nav class="navbar">
                <a href="#" onclick="window.router.navigate('dashboard')" class="navbar-brand">
                    🎨 Design Task Manager
                </a>
                <div class="navbar-menu">
                    <span class="user-info">${user.full_name}</span>
                    <span class="role-badge">${user.role}</span>
                    <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('dashboard')">📁 Кабинет</button>
                    <div style="position:relative;display:inline-block;">
                        <button class="btn btn-secondary btn-sm" onclick="window.toggleNotifications()" style="position:relative;">
                            🔔
                            <span id="notifBadge" style="display:none;position:absolute;top:-5px;right:-5px;background:#e53e3e;color:white;border-radius:50%;font-size:10px;padding:2px 6px;min-width:18px;text-align:center;">
                                0
                            </span>
                        </button>
                        <div id="notifDropdown" style="display:none;position:absolute;right:0;top:40px;width:380px;max-height:400px;overflow-y:auto;background:white;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:1000;padding:8px 0;">
                            <div style="padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-weight:600;">Уведомления</span>
                                <button class="btn btn-secondary btn-sm" onclick="window.markAllRead()" style="font-size:0.7rem;">Все прочитаны</button>
                            </div>
                            <div id="notifList">
                                <div style="padding:16px;text-align:center;color:#a0aec0;">Загрузка...</div>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="window.logout()">Выйти</button>
                </div>
            </nav>
        `;
    }
};

// ============================================
// ФУНКЦИИ УВЕДОМЛЕНИЙ
// ============================================

window.loadNotifications = async function() {
    console.log('🔔 loadNotifications вызвана');
    try {
        const token = store.get('token');
        if (!token) {
            console.log('⚠️ Нет токена');
            return;
        }

        const response = await fetch('/api/v1/notifications', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        console.log('📡 Статус ответа уведомлений:', response.status);

        if (response.ok) {
            notifications = await response.json();
            console.log('🔔 Уведомления загружены:', notifications.length);
            window.updateUnreadCount();
            window.renderNotificationList();
        } else {
            const err = await response.json();
            console.error('❌ Ошибка загрузки уведомлений:', err);
        }
    } catch (e) {
        console.error('❌ Error loading notifications:', e);
    }
};

window.updateUnreadCount = function() {
    const count = notifications.filter(n => !n.is_read).length;
    unreadCount = count;
    const badge = document.getElementById('notifBadge');
    if (badge) {
        if (count > 0) {
            badge.style.display = 'inline';
            badge.textContent = count > 99 ? '99+' : count;
        } else {
            badge.style.display = 'none';
        }
    }
};

window.renderNotificationList = function() {
    const container = document.getElementById('notifList');
    if (!container) {
        console.log('⚠️ notifList не найден в DOM, повторная попытка через 100ms');
        setTimeout(() => window.renderNotificationList(), 100);
        return;
    }

    console.log('📝 Рендерим уведомления, количество:', notifications.length);

    if (notifications.length === 0) {
        container.innerHTML = `
            <div style="padding:24px;text-align:center;color:#a0aec0;">
                <div style="font-size:2rem;margin-bottom:8px;">🔔</div>
                <div>Нет уведомлений</div>
            </div>
        `;
        return;
    }

    let html = '';
    for (const notif of notifications) {
        const isRead = notif.is_read;
        const link = notif.link || '';
        const taskId = link ? link.split('/').pop() : null;

        html += `
            <div onclick="window.markAsRead(${notif.id})" style="
                padding:12px 16px;
                border-bottom:1px solid #f0f2f5;
                cursor:pointer;
                ${!isRead ? 'background:#f0f4ff;border-left:3px solid #667eea;' : ''}
                transition:background 0.2s;
            " onmouseover="this.style.background='#f7fafc'" onmouseout="this.style.background='${!isRead ? '#f0f4ff' : 'white'}'">
                <div style="font-weight:${!isRead ? '600' : '400'};font-size:0.85rem;">${notif.title}</div>
                <div style="font-size:0.8rem;color:#4a4a6a;margin-top:4px;">${notif.message}</div>
                <div style="font-size:0.65rem;color:#a0aec0;margin-top:4px;">
                    ${new Date(notif.created_at).toLocaleString()}
                    ${taskId ? ` • <a href="#" onclick="event.stopPropagation();window.router.navigate('task-detail',{id:${taskId}});window.toggleNotifications();" style="color:#667eea;">Подробнее</a>` : ''}
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
        if (isOpen) {
            window.loadNotifications();
        }
    }
};

window.markAsRead = async function(notificationId) {
    try {
        const token = store.get('token');
        const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            const notif = notifications.find(n => n.id === notificationId);
            if (notif) notif.is_read = true;
            window.updateUnreadCount();
            window.renderNotificationList();
        }
    } catch (e) {
        console.error('Error marking as read:', e);
    }
};

window.markAllRead = async function() {
    try {
        const token = store.get('token');
        const response = await fetch('/api/v1/notifications/mark-all-read', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            notifications.forEach(n => n.is_read = true);
            window.updateUnreadCount();
            window.renderNotificationList();
        }
    } catch (e) {
        console.error('Error marking all as read:', e);
    }
};

// Закрывать dropdown при клике вне
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown && isOpen && !e.target.closest('#notifDropdown') && !e.target.closest('.btn-secondary')) {
        isOpen = false;
        dropdown.style.display = 'none';
    }
});

// Автоматическая загрузка уведомлений после рендера Navbar
setTimeout(() => {
    if (document.getElementById('notifBadge')) {
        console.log('🔔 Автозагрузка уведомлений из Navbar');
        window.loadNotifications();
    }
}, 1500);