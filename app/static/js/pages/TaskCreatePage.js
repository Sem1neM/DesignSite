// pages/TaskCreatePage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';

export const TaskCreatePage = {
    uploadedImages: [],

    render() {
        const user = store.get('user');
        if (!user || user.role !== 'client') {
            router.navigate('dashboard');
            return;
        }

        this.uploadedImages = [];

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

                        <!-- Секция загрузки изображений -->
                        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                                <span style="font-weight: 600; font-size: 0.9rem; color: #4a4a6a;">🖼️ Изображения-референсы</span>
                                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                    <input type="file" id="imageInput" accept="image/*" multiple style="padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; max-width: 200px;">
                                    <button type="button" class="btn btn-primary btn-sm" onclick="TaskCreatePage.addImage()">📤 Добавить</button>
                                </div>
                            </div>
                            <div style="font-size: 0.8rem; color: #a0aec0; margin-bottom: 12px;">
                                ⚡ Максимальный размер: 50 МБ на файл. Поддерживаемые форматы: JPG, PNG, GIF, WEBP, SVG, BMP, TIFF
                            </div>
                            <div id="taskImagesPreview">
                                <div class="image-preview-empty">
                                    <div class="icon">🖼️</div>
                                    <div class="title">Нет загруженных изображений</div>
                                    <div class="subtitle">Добавьте референсы для этой задачи</div>
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button type="submit" class="btn btn-primary" id="submitBtn">Создать задачу</button>
                            <button type="button" class="btn btn-secondary" onclick="window.router.navigate('tasks')">Отмена</button>
                        </div>
                    </form>
                    <div id="createError" class="hidden alert-error" style="margin-top:12px;"></div>
                </div>
            </div>
        `;

        document.getElementById('createTaskForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = document.getElementById('submitBtn');
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

                // 1. Создаём задачу
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

                    // 2. Загружаем изображения
                    if (TaskCreatePage.uploadedImages && TaskCreatePage.uploadedImages.length > 0) {
                        let uploaded = 0;
                        let failed = 0;

                        for (let i = 0; i < TaskCreatePage.uploadedImages.length; i++) {
                            try {
                                const formData = new FormData();
                                formData.append('file', TaskCreatePage.uploadedImages[i]);

                                const uploadResponse = await fetch('/api/v1/images/upload/' + task.id, {
                                    method: 'POST',
                                    headers: { 'Authorization': 'Bearer ' + token },
                                    body: formData
                                });

                                if (uploadResponse.ok) {
                                    uploaded++;
                                } else {
                                    failed++;
                                }
                            } catch (e) {
                                failed++;
                            }
                        }

                        if (failed > 0) {
                            window.showAlert('✅ Задача #' + task.id + ' создана! Загружено ' + uploaded + ' из ' + TaskCreatePage.uploadedImages.length + ' изображений.', 'success');
                        } else {
                            window.showAlert('✅ Задача #' + task.id + ' создана! Загружено ' + uploaded + ' изображений.', 'success');
                        }
                    } else {
                        window.showAlert('✅ Задача #' + task.id + ' "' + task.title + '" создана!', 'success');
                    }

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
    },

    addImage() {
        const input = document.getElementById('imageInput');
        if (!input || !input.files || input.files.length === 0) {
            if (window.showAlert) window.showAlert('❌ Выберите файлы для загрузки', 'error');
            return;
        }

        const files = Array.from(input.files);
        const validFiles = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Проверка размера (50 МБ)
            if (file.size > 50 * 1024 * 1024) {
                if (window.showAlert) window.showAlert('❌ Файл "' + file.name + '" слишком большой. Максимум: 50 МБ', 'error');
                continue;
            }

            // Проверка типа
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];
            if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
                if (window.showAlert) window.showAlert('❌ Файл "' + file.name + '" имеет неподдерживаемый формат.', 'error');
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        this.uploadedImages = this.uploadedImages.concat(validFiles);
        this.updatePreview();
        if (window.showAlert) window.showAlert('✅ Добавлено ' + validFiles.length + ' изображений. Всего: ' + this.uploadedImages.length, 'success');
        input.value = '';
    },

    removeImage(index) {
        this.uploadedImages.splice(index, 1);
        this.updatePreview();
        if (this.uploadedImages.length === 0) {
            if (window.showAlert) window.showAlert('📭 Все изображения удалены', 'info');
        }
    },

    updatePreview() {
        const container = document.getElementById('taskImagesPreview');
        if (!container) return;

        if (!this.uploadedImages || this.uploadedImages.length === 0) {
            container.innerHTML = `
                <div class="image-preview-empty">
                    <div class="icon">🖼️</div>
                    <div class="title">Нет загруженных изображений</div>
                    <div class="subtitle">Добавьте референсы для этой задачи</div>
                </div>
            `;
            return;
        }

        let html = '<div class="image-preview-grid">';
        for (let i = 0; i < this.uploadedImages.length; i++) {
            const file = this.uploadedImages[i];
            html += `
                <div class="image-preview-item">
                    <img src="${URL.createObjectURL(file)}" alt="${file.name}">
                    <button type="button" class="remove-btn" onclick="TaskCreatePage.removeImage(${i})">✕</button>
                    <div class="file-info">
                        <div class="name" title="${file.name}">${file.name}</div>
                        <div class="size">${(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        html += '<div style="margin-top: 8px; font-size: 0.7rem; color: #a0aec0; text-align: center;">Всего изображений: ' + this.uploadedImages.length + '</div>';
        container.innerHTML = html;
    }
};

// Делаем методы глобальными для onclick
window.TaskCreatePage = TaskCreatePage;