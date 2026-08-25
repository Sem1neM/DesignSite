// pages/RegisterPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const RegisterPage = {
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="max-width:400px;margin:80px auto;">
                <div class="card">
                    <h2 style="text-align:center;">📝 Регистрация</h2>
                    <div id="alertContainer"></div>
                    <form id="registerForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="regEmail" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Полное имя</label>
                            <input type="text" id="regName" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <input type="password" id="regPassword" class="form-control" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Роль</label>
                            <select id="regRole" class="form-control">
                                <option value="client">Клиент</option>
                                <option value="designer">Дизайнер</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Зарегистрироваться</button>
                    </form>
                    <div id="registerError" class="hidden alert-error" style="margin-top:12px;"></div>
                    <p style="text-align:center;margin-top:16px;">
                        <a href="#" onclick="router.navigate('login')">Войти</a>
                    </p>
                </div>
            </div>
        `;

        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('regEmail').value;
            const full_name = document.getElementById('regName').value;
            const password = document.getElementById('regPassword').value;
            const role = document.getElementById('regRole').value;
            const errorDiv = document.getElementById('registerError');

            try {
                const response = await fetch('/api/v1/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, full_name, role })
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
                    const err = await response.json();
                    errorDiv.textContent = '❌ ' + (err.detail || 'Ошибка регистрации');
                    errorDiv.classList.remove('hidden');
                }
            } catch (e) {
                errorDiv.textContent = '❌ Ошибка соединения';
                errorDiv.classList.remove('hidden');
            }
        });
    }
};