// pages/ResetPasswordPage.js
import { router } from '../core/router.js';

export const ResetPasswordPage = {
    render(params) {
        const token = params.token || new URLSearchParams(window.location.search).get('token');
        if (!token) {
            document.getElementById('app').innerHTML = `
                <div class="container" style="max-width:400px;margin:80px auto;">
                    <div class="card">
                        <div class="alert alert-error">❌ Не передан токен сброса</div>
                        <button class="btn btn-secondary" onclick="router.navigate('login')">← На вход</button>
                    </div>
                </div>
            `;
            return;
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="max-width:400px;margin:80px auto;">
                <div class="card">
                    <h2 style="text-align:center;">🔄 Сброс пароля</h2>
                    <p class="text-muted" style="text-align:center;margin-bottom:20px;">
                        Введите новый пароль
                    </p>
                    <form id="resetForm">
                        <div class="form-group">
                            <label>Новый пароль (минимум 6 символов)</label>
                            <input type="password" id="password" class="form-control" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Подтвердите пароль</label>
                            <input type="password" id="confirm" class="form-control" required minlength="6">
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Сменить пароль</button>
                    </form>
                    <div id="message" class="hidden" style="margin-top:12px;"></div>
                    <p style="text-align:center;margin-top:16px;">
                        <a href="#" onclick="router.navigate('login')">← Вернуться к входу</a>
                    </p>
                </div>
            </div>
        `;

        document.getElementById('resetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm').value;
            const messageDiv = document.getElementById('message');

            if (password !== confirm) {
                messageDiv.className = 'alert alert-error';
                messageDiv.textContent = '❌ Пароли не совпадают';
                messageDiv.classList.remove('hidden');
                return;
            }

            try {
                const response = await fetch('/api/v1/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, new_password: password })
                });
                const data = await response.json();
                if (response.ok) {
                    messageDiv.className = 'alert alert-success';
                    messageDiv.textContent = '✅ Пароль изменён! Перенаправление...';
                    messageDiv.classList.remove('hidden');
                    setTimeout(() => router.navigate('login'), 2000);
                } else {
                    messageDiv.className = 'alert alert-error';
                    messageDiv.textContent = '❌ ' + (data.detail || 'Ошибка');
                    messageDiv.classList.remove('hidden');
                }
            } catch (error) {
                messageDiv.className = 'alert alert-error';
                messageDiv.textContent = '❌ Ошибка соединения';
                messageDiv.classList.remove('hidden');
            }
        });
    }
};