// pages/RegisterPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const RegisterPage = {
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="max-width:400px;margin:80px auto;">
                <div class="card" style="padding:32px;">
                    <h2 style="text-align:center;font-size:24px;margin-bottom:8px;">Регистрация</h2>
                    <p class="text-muted" style="text-align:center;margin-bottom:24px;">Создайте новую учетную запись</p>
                    <div id="alertContainer"></div>
                    <form id="registerForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="regEmail" class="form-control" placeholder="example@mail.com" required>
                        </div>
                        <div class="form-group">
                            <label>Полное имя</label>
                            <input type="text" id="regName" class="form-control" placeholder="Иван Иванов" required>
                        </div>
                        <div class="form-group">
                            <label>Пароль (мин. 6 символов)</label>
                            <input type="password" id="regPassword" class="form-control" placeholder="••••••••" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Роль</label>
                            <select id="regRole" class="form-control">
                                <option value="client">Клиент</option>
                                <option value="designer">Дизайнер</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Зарегистрироваться</button>
                    </form>
                    <div id="registerError" class="hidden alert-error" style="margin-top:12px;"></div>
                    <p style="text-align:center;margin-top:16px;">
                        Уже есть аккаунт? <a href="#" onclick="router.navigate('login')">Войти</a>
                    </p>
                </div>
            </div>
        `;

        document.getElementById('registerForm').addEventListener('submit', async (e) => {
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
                    localStorage.setItem('access_token', data.access_token);
                    const meRes = await fetch('/api/v1/auth/me', {
                        headers: { 'Authorization': `Bearer ${data.access_token}` }
                    });
                    if (meRes.ok) {
                        const user = await meRes.json();
                        store.setUser(user);
                    }
                    router.navigate('dashboard');
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