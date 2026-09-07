// pages/UsersPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { Navbar } from '../components/Navbar.js';
import { helpers } from '../utils/helpers.js';

const ROLE_LABEL = { client: 'Байер', designer: 'Дизайнер', admin: 'Админ' };

export const UsersPage = {
    users: [],

    render() {
        const user = store.get('user');
        if (!user) {
            router.navigate('login');
            return;
        }
        if (user.role !== 'admin') {
            router.navigate('dashboard');
            return;
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            ${Navbar.render()}
            <div class="app">
                <section class="view active">
                    <div class="page-head">
                        <div>
                            <h1>Пользователи</h1>
                            <div class="sub" id="usersCount">Загрузка...</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="window.router.navigate('dashboard')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            На главную
                        </button>
                    </div>
                    <div id="usersList">
                        <div class="loader-container"><div class="loader"></div><div>Загрузка пользователей...</div></div>
                    </div>
                </section>
            </div>
        `;

        UsersPage.loadUsers();
    },

    async loadUsers() {
        const list = document.getElementById('usersList');
        try {
            const token = store.get('token');
            const res = await fetch('/api/v1/users/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                list.innerHTML = `<div class="alert alert-error">❌ Не удалось загрузить пользователей</div>`;
                return;
            }
            UsersPage.users = await res.json();
            document.getElementById('usersCount').textContent = `${UsersPage.users.length} пользователей`;
            UsersPage.renderList();
        } catch (e) {
            list.innerHTML = `<div class="alert alert-error">❌ Ошибка соединения</div>`;
        }
    },

    renderList() {
        const list = document.getElementById('usersList');
        const me = store.get('user');

        list.innerHTML = `
            <div class="card" style="padding:8px;">
                ${UsersPage.users.map(u => `
                    <div style="display:flex;align-items:center;gap:14px;padding:14px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap;">
                        <div style="flex:1;min-width:200px;">
                            <div style="font-weight:700;">${helpers.escapeHtml(u.full_name)}</div>
                            <div style="font-size:13px;color:var(--ink-soft);">${helpers.escapeHtml(u.email)}</div>
                        </div>
                        <span class="role-badge ${u.role}">${ROLE_LABEL[u.role] || helpers.escapeHtml(u.role)}</span>
                        <select class="status-select" style="width:auto;" ${u.id === me.id ? 'disabled title="Нельзя менять собственную роль"' : ''}
                                onchange="window.changeUserRole(${u.id}, this.value)">
                            <option value="client" ${u.role === 'client' ? 'selected' : ''}>Байер</option>
                            <option value="designer" ${u.role === 'designer' ? 'selected' : ''}>Дизайнер</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Админ</option>
                        </select>
                        <button class="btn btn-sm ${u.is_active ? 'btn-ghost' : 'btn-primary'}"
                                ${u.id === me.id ? 'disabled title="Нельзя заблокировать себя"' : ''}
                                onclick="window.toggleUserActive(${u.id}, ${!u.is_active})">
                            ${u.is_active ? '🚫 Заблокировать' : '✅ Разблокировать'}
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
};

window.changeUserRole = async function(userId, role) {
    try {
        const token = store.get('token');
        const res = await fetch(`/api/v1/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ role })
        });
        if (res.ok) {
            window.showAlert('✅ Роль обновлена', 'success');
            UsersPage.loadUsers();
        } else {
            const err = await res.json().catch(() => ({}));
            window.showAlert('❌ ' + (err.detail || 'Ошибка обновления роли'), 'error');
            UsersPage.loadUsers();
        }
    } catch (e) {
        window.showAlert('❌ Ошибка соединения', 'error');
    }
};

window.toggleUserActive = async function(userId, isActive) {
    try {
        const token = store.get('token');
        const res = await fetch(`/api/v1/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ is_active: isActive })
        });
        if (res.ok) {
            window.showAlert(isActive ? '✅ Пользователь разблокирован' : '✅ Пользователь заблокирован', 'success');
            UsersPage.loadUsers();
        } else {
            const err = await res.json().catch(() => ({}));
            window.showAlert('❌ ' + (err.detail || 'Ошибка'), 'error');
        }
    } catch (e) {
        window.showAlert('❌ Ошибка соединения', 'error');
    }
};
