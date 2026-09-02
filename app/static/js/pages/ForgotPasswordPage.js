// pages/ForgotPasswordPage.js
import { router } from '../core/router.js';

export const ForgotPasswordPage = {
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="max-width:400px;margin:80px auto;">
                <div class="card" style="padding:32px;">
                    <h2 style="text-align:center;font-size:24px;margin-bottom:8px;">Восстановление пароля</h2>
                    <p class="text-muted" style="text-align:center;margin-bottom:24px;">Введите email, и мы отправим ссылку для сброса</p>
                    <div id="alertContainer"></div>
                    <form id="forgotForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="email" class="form-control" placeholder="example@mail.com" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Отправить</button>
                    </form>
                    <div id="message" class="hidden" style="margin-top:12px;"></div>
                    <p style="text-align:center;margin-top:16px;">
                        <a href="#" onclick="router.navigate('login')">← Вернуться к входу</a>
                    </p>
                </div>
            </div>
        `;

        document.getElementById('forgotForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const messageDiv = document.getElementById('message');

            try {
                const response = await fetch('/api/v1/auth/forgot-password?email=' + encodeURIComponent(email), {
                    method: 'POST'
                });
                const data = await response.json();
                messageDiv.className = 'alert alert-success';
                messageDiv.textContent = data.message || 'Проверьте почту';
                messageDiv.classList.remove('hidden');
                document.getElementById('forgotForm').reset();
            } catch (error) {
                messageDiv.className = 'alert alert-error';
                messageDiv.textContent = 'Ошибка соединения';
                messageDiv.classList.remove('hidden');
            }
        });
    }
};