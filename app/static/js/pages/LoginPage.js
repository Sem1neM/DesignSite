// pages/LoginPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const LoginPage = {
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="max-width:400px;margin:80px auto;">
                <div class="card" style="padding:32px;">
                    <h2 style="text-align:center;font-size:24px;margin-bottom:8px;">Вход</h2>
                    <p class="text-muted" style="text-align:center;margin-bottom:24px;">Войдите в свою учетную запись</p>
                    <div id="alertContainer"></div>
                    <form id="loginForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="loginEmail" class="form-control" placeholder="example@mail.com" required>
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <input type="password" id="loginPassword" class="form-control" placeholder="••••••••" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Войти</button>
                    </form>
                    <div id="loginError" class="hidden alert-error" style="margin-top:12px;"></div>
                    <p style="text-align:center;margin-top:16px;">
                        Нет аккаунта? <a href="#" onclick="router.navigate('register')">Зарегистрироваться</a>
                    </p>
                    <p style="text-align:center;margin-top:8px;">
                        <a href="#" onclick="router.navigate('forgot-password')" style="color:var(--ink-faint);font-size:0.9rem;">Забыли пароль?</a>
                    </p>
                </div>
                <div style="margin-top:12px;padding:16px;background:var(--surface);border-radius:var(--radius-sm);border:1px solid var(--line);font-size:0.8rem;color:var(--ink-soft);">
                    <strong>Тестовые пользователи:</strong><br>
                    admin@example.com / admin123<br>
                    client@example.com / client123<br>
                    designer@example.com / designer123
                </div>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');

            try {
                const formData = new URLSearchParams();
                formData.append('username', email);
                formData.append('password', password);

                const response = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    // Сохраняем токен
                    localStorage.setItem('access_token', data.access_token);
                    // Устанавливаем токен в store
                    store.setToken(data.access_token);

                    // Загружаем пользователя
                    const meRes = await fetch('/api/v1/auth/me', {
                        headers: { 'Authorization': `Bearer ${data.access_token}` }
                    });
                    if (meRes.ok) {
                        const user = await meRes.json();
                        store.setUser(user);
                        console.log('✅ Пользователь загружен:', user);
                    } else {
                        console.error('❌ Не удалось загрузить пользователя');
                    }
                    // Переходим на дашборд
                    router.navigate('dashboard');
                } else {
                    errorDiv.textContent = '❌ Неверный email или пароль';
                    errorDiv.classList.remove('hidden');
                }
            } catch (e) {
                console.error('Ошибка входа:', e);
                errorDiv.textContent = '❌ Ошибка соединения';
                errorDiv.classList.remove('hidden');
            }
        });
    }
};