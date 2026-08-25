// components/Navbar.js
import { store } from '../core/store.js';

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
                    <button class="btn btn-secondary btn-sm" onclick="window.logout()">Выйти</button>
                </div>
            </nav>
        `;
    }
};