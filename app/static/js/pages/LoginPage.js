// pages/LoginPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const LoginPage = {
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="max-width:400px;margin:80px auto;">
                <div class="card">
                    <h2 style="text-align:center;">🎨 Вход</h2>
                    <div id="alertContainer"></div>
                    <form id="loginForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="loginEmail" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <input type="password" id="loginPassword" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Войти</button>
                    </form>
                    <div id="loginError" class="hidden alert-error" style="margin-top:12px;"></div>
                    <p style="text-align:center;margin-top:16px;">
                        <a href="#" onclick="router.navigate('register')">Зарегистрироваться</a>
                    </p>
                </div>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', async function(e) {
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
                    store.setToken(data.access_token);

                    const userResponse = await fetch('/api/v1/auth/me', {
                        headers: { 'Authorization': 'Bearer ' + data.access_token }
                    });
                    if (userResponse.ok) {
                        const user = await userResponse.json();
                        store.setUser(user);
                        router.navigate('dashboard');
                    }
                } else {
                    errorDiv.textContent = '❌ Неверный email или пароль';
                    errorDiv.classList.remove('hidden');
                }
            } catch (e) {
                errorDiv.textContent = '❌ Ошибка соединения';
                errorDiv.classList.remove('hidden');
            }
        });
    }
};