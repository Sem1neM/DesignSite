// services/auth.js
import { api } from '../core/api.js';
import { store } from '../core/store.js';

console.log('🔐 Auth service loaded');

export const authService = {
    async login(email, password) {
        console.log('🔑 Attempting login for:', email);
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const response = await fetch(`${api.baseURL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                store.setToken(data.access_token);
                console.log('✅ Login successful');
                return { success: true, token: data.access_token };
            }

            const error = await response.json();
            console.log('❌ Login failed:', error);
            return { success: false, error: error.detail || 'Ошибка входа' };
        } catch (e) {
            console.error('❌ Login error:', e);
            return { success: false, error: 'Ошибка соединения' };
        }
    },

    async register(email, password, full_name, role = 'client') {
        console.log('📝 Attempting registration for:', email);
        try {
            const response = await fetch(`${api.baseURL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name, role })
            });

            if (response.ok) {
                const data = await response.json();
                store.setToken(data.access_token);
                console.log('✅ Registration successful');
                return { success: true, token: data.access_token };
            }

            const error = await response.json();
            console.log('❌ Registration failed:', error);
            return { success: false, error: error.detail || 'Ошибка регистрации' };
        } catch (e) {
            console.error('❌ Registration error:', e);
            return { success: false, error: 'Ошибка соединения' };
        }
    },

    async getMe() {
        try {
            const token = store.get('token');
            if (!token) {
                console.log('🔐 No token found');
                return null;
            }

            const response = await fetch(`${api.baseURL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const user = await response.json();
                console.log('👤 User loaded:', user.email);
                return user;
            }
            console.log('❌ Failed to load user');
            return null;
        } catch (e) {
            console.error('❌ Error loading user:', e);
            return null;
        }
    },

    logout() {
        console.log('🚪 Logging out');
        store.clear();
        window.router?.navigate('login');
    }
};