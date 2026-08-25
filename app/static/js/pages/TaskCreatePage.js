// pages/TaskCreatePage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const TaskCreatePage = {
    render() {
        const user = store.get('user');
        if (!user || user.role !== 'client') {
            router.navigate('dashboard');
            return;
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            <nav class="navbar">
                <span class="navbar-brand" style="cursor:pointer;" onclick="window.router.navigate('dashboard')">🎨 Design Task Manager</span>
                <div class="navbar-menu">
                    <span class="user-info">${user.full_name}</span>
                    <span class="role-badge">${user.role}</span>
                    <button class="btn btn-secondary btn-sm" onclick="window.logout()">Выйти</button>
                </div>
            </nav>
            <div class="container" style="max-width: 700px;">
                <div id="alertContainer"></div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">➕ Создать задачу</span>
                        <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('tasks')">← Назад</button>
                    </div>
                    <form id="createTaskForm">
                        <div class="form-group">
                            <label>Название *</label>
                            <input type="text" id="taskTitle" class="form-control" placeholder="Введите название задачи" required>
                        </div>
                        <div class="form-group">
                            <label>Описание</label>
                            <textarea id="taskDescription" class="form-control" placeholder="Опишите задачу подробнее"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Целевая аудитория</label>
                            <input type="text" id="taskAudience" class="form-control" placeholder="Например: Молодые люди 18-35 лет">
                        </div>
                        <div class="form-group">
                            <label>Предпочтительный стиль</label>
                            <input type="text" id="taskStyle" class="form-control" placeholder="Например: Яркий, минималистичный">
                        </div>
                        <div class="form-group">
                            <label>Референсы (ссылки через запятую)</label>
                            <input type="text" id="taskReferences" class="form-control" placeholder="https://example.com, https://example2.com">
                        </div>
                        <div class="form-group">
                            <label>Дедлайн</label>
                            <input type="datetime-local" id="taskDeadline" class="form-control">
                        </div>
                        <button type="submit" class="btn btn-primary">Создать задачу</button>
                        <button type="button" class="btn btn-secondary" onclick="window.router.navigate('tasks')">Отмена</button>
                    </form>
                    <div id="createError" class="hidden alert-error" style="margin-top:12px;"></div>
                </div>
            </div>
        `;

        document.getElementById('createTaskForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loader-small"></span> Создание...';

            const title = document.getElementById('taskTitle').value;
            const description = document.getElementById('taskDescription').value;
            const target_audience = document.getElementById('taskAudience').value;
            const preferred_style = document.getElementById('taskStyle').value;
            const refs = document.getElementById('taskReferences').value;
            const deadline = document.getElementById('taskDeadline').value;
            const errorDiv = document.getElementById('createError');

            const references = refs.split(',').map(function(r) { return r.trim(); }).filter(function(r) { return r; });

            try {
                const token = store.get('token');
                const response = await fetch('/api/v1/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                        target_audience: target_audience,
                        preferred_style: preferred_style,
                        references: references,
                        deadline: deadline ? new Date(deadline).toISOString() : null
                    })
                });

                if (response.ok) {
                    const task = await response.json();
                    if (window.showAlert) window.showAlert('✅ Задача #' + task.id + ' "' + task.title + '" создана!', 'success');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    setTimeout(function() { window.router.navigate('task-detail', { id: task.id }); }, 1000);
                } else {
                    const err = await response.json();
                    errorDiv.textContent = '❌ ' + (err.detail || 'Ошибка создания');
                    errorDiv.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            } catch (error) {
                errorDiv.textContent = '❌ ' + (error.message || 'Ошибка соединения');
                errorDiv.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
};