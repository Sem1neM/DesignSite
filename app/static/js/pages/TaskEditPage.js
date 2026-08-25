// pages/TaskEditPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const TaskEditPage = {
    render(params) {
        const user = store.get('user');
        if (!user) {
            router.navigate('login');
            return;
        }

        const taskId = params.id;
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
                <div id="editForm">
                    <div class="loader-container">
                        <div class="loader"></div>
                        <div>Загрузка...</div>
                    </div>
                </div>
            </div>
        `;

        TaskEditPage.loadTask(taskId);
    },

    async loadTask(taskId) {
        try {
            const token = store.get('token');
            const response = await fetch('/api/v1/tasks/' + taskId, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const task = await response.json();
                document.getElementById('editForm').innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">✏️ Редактировать задачу #${task.id}</span>
                            <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('task-detail', {id: ${task.id}})">← Назад</button>
                        </div>
                        <form id="editTaskForm">
                            <div class="form-group">
                                <label>Название *</label>
                                <input type="text" id="editTitle" class="form-control" value="${task.title}" required>
                            </div>
                            <div class="form-group">
                                <label>Описание</label>
                                <textarea id="editDescription" class="form-control" rows="4">${task.description || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Целевая аудитория</label>
                                <input type="text" id="editAudience" class="form-control" value="${task.target_audience || ''}">
                            </div>
                            <div class="form-group">
                                <label>Предпочтительный стиль</label>
                                <input type="text" id="editStyle" class="form-control" value="${task.preferred_style || ''}">
                            </div>
                            <div class="form-group">
                                <label>Референсы (ссылки через запятую)</label>
                                <input type="text" id="editReferences" class="form-control" value="${(task.references || []).join(', ')}">
                            </div>
                            <div class="form-group">
                                <label>Дедлайн</label>
                                <input type="datetime-local" id="editDeadline" class="form-control" value="${task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''}">
                            </div>
                            <button type="submit" class="btn btn-primary">Сохранить</button>
                            <button type="button" class="btn btn-secondary" onclick="window.router.navigate('task-detail', {id: ${task.id}})">Отмена</button>
                        </form>
                        <div id="editError" class="hidden alert-error" style="margin-top:12px;"></div>
                    </div>
                `;

                document.getElementById('editTaskForm').addEventListener('submit', async function(e) {
                    e.preventDefault();

                    const submitBtn = this.querySelector('button[type="submit"]');
                    const originalText = submitBtn.textContent;
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="loader-small"></span> Сохранение...';

                    const title = document.getElementById('editTitle').value;
                    const description = document.getElementById('editDescription').value;
                    const target_audience = document.getElementById('editAudience').value;
                    const preferred_style = document.getElementById('editStyle').value;
                    const refs = document.getElementById('editReferences').value;
                    const deadline = document.getElementById('editDeadline').value;
                    const errorDiv = document.getElementById('editError');

                    const references = refs.split(',').map(function(r) { return r.trim(); }).filter(function(r) { return r; });

                    try {
                        const token = store.get('token');
                        const response = await fetch('/api/v1/tasks/' + taskId, {
                            method: 'PATCH',
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
                            if (window.showAlert) window.showAlert('✅ Задача обновлена!', 'success');
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalText;
                            setTimeout(function() { window.router.navigate('task-detail', { id: taskId }); }, 1000);
                        } else {
                            const err = await response.json();
                            errorDiv.textContent = '❌ ' + (err.detail || 'Ошибка обновления');
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
        } catch (error) {
            document.getElementById('editForm').innerHTML = `
                <div class="card">
                    <div class="alert alert-error">❌ Ошибка загрузки задачи: ${error.message}</div>
                    <button class="btn btn-secondary" onclick="window.router.navigate('tasks')">← Назад</button>
                </div>
            `;
        }
    }
};