// pages/TaskCreatePage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { Navbar } from '../components/Navbar.js';

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
            ${Navbar.render()}
            <div class="app">
                <section class="view active" style="max-width:700px; margin:0 auto; padding-top:28px;">
                    <div class="card" style="padding:32px;">
                        <div class="page-head" style="margin-top:0; margin-bottom:20px;">
                            <h1>➕ Создать задачу</h1>
                            <button class="btn btn-ghost btn-sm" onclick="window.router.navigate('tasks')">← Назад</button>
                        </div>
                        <form id="createTaskForm">
                            <div class="form-group">
                                <label>Название *</label>
                                <input type="text" id="taskTitle" class="form-control" placeholder="Введите название задачи" required>
                            </div>
                            <div class="form-group">
                                <label>Описание</label>
                                <textarea id="taskDescription" class="form-control" rows="4" placeholder="Опишите задачу подробнее"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Предпочтительный стиль</label>
                                <input type="text" id="taskStyle" class="form-control" placeholder="Например: Яркий, минималистичный">
                            </div>
                            <div class="form-group">
                                <label>Референсы (ссылки через запятую)</label>
                                <input type="text" id="taskReferences" class="form-control" placeholder="https://example.com, https://example2.com">
                            </div>

                            <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line);">
                                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                                    <span style="font-weight:600;">🖼️ Изображения-референсы</span>
                                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                        <input type="file" id="imageInput" accept="image/*" multiple style="padding:6px;border:1px solid var(--line);border-radius:6px;max-width:200px;">
                                        <button type="button" class="btn btn-primary btn-sm" onclick="addImageToTask()">📤 Добавить</button>
                                    </div>
                                </div>
                                <div style="font-size:0.8rem;color:var(--ink-soft);margin-top:4px;">Максимум: 50 МБ на файл. JPG, PNG, GIF, WEBP, SVG, BMP, TIFF</div>
                                <div id="taskImagesPreview" style="margin-top:12px;">
                                    <div class="image-preview-empty"><div class="icon">🖼️</div><div class="title">Нет загруженных изображений</div></div>
                                </div>
                            </div>

                            <div style="display:flex;gap:12px;margin-top:24px;">
                                <button type="submit" class="btn btn-primary" id="submitBtn">Создать задачу</button>
                                <button type="button" class="btn btn-ghost" onclick="window.router.navigate('tasks')">Отмена</button>
                            </div>
                        </form>
                        <div id="createError" class="hidden alert-error" style="margin-top:12px;"></div>
                    </div>
                </section>
            </div>
        `;

        document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            const orig = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loader-small"></span> Создание...';

            const title = document.getElementById('taskTitle').value;
            const description = document.getElementById('taskDescription').value;
            const style = document.getElementById('taskStyle').value;
            const refs = document.getElementById('taskReferences').value;
            const errorDiv = document.getElementById('createError');

            const references = refs.split(',').map(r => r.trim()).filter(r => r);

            try {
                const token = store.get('token');
                const res = await fetch('/api/v1/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ title, description, preferred_style: style, references })
                });
                if (res.ok) {
                    const task = await res.json();
                    // Загружаем изображения
                    if (this.uploadedImages.length) {
                        let uploaded = 0;
                        for (const file of this.uploadedImages) {
                            const fd = new FormData();
                            fd.append('file', file);
                            const up = await fetch(`/api/v1/images/upload/${task.id}`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` },
                                body: fd
                            });
                            if (up.ok) uploaded++;
                        }
                        window.showAlert(`✅ Задача #${task.id} создана! Загружено ${uploaded} изображений.`, 'success');
                    } else {
                        window.showAlert(`✅ Задача #${task.id} создана!`, 'success');
                    }
                    submitBtn.disabled = false;
                    submitBtn.textContent = orig;
                    setTimeout(() => router.navigate('task-detail', { id: task.id }), 1000);
                } else {
                    const err = await res.json();
                    errorDiv.textContent = '❌ ' + (err.detail || 'Ошибка');
                    errorDiv.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = orig;
                }
            } catch (e) {
                errorDiv.textContent = '❌ ' + e.message;
                errorDiv.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = orig;
            }
        });

        window.addImageToTask = () => this.addImage();
        window.removeImageFromTask = (i) => this.removeImage(i);
    },

    addImage() {
        const input = document.getElementById('imageInput');
        if (!input || !input.files || !input.files.length) {
            window.showAlert('❌ Выберите файлы', 'error');
            return;
        }
        const files = Array.from(input.files);
        const valid = [];
        for (const f of files) {
            if (f.size > 50 * 1024 * 1024) {
                window.showAlert(`❌ ${f.name} слишком большой`, 'error');
                continue;
            }
            valid.push(f);
        }
        if (!valid.length) return;
        this.uploadedImages.push(...valid);
        this.updatePreview();
        window.showAlert(`✅ Добавлено ${valid.length} изображений`, 'success');
        input.value = '';
    },

    removeImage(index) {
        this.uploadedImages.splice(index, 1);
        this.updatePreview();
        if (!this.uploadedImages.length) window.showAlert('📭 Все изображения удалены', 'info');
    },

    updatePreview() {
        const container = document.getElementById('taskImagesPreview');
        if (!container) return;
        if (!this.uploadedImages.length) {
            container.innerHTML = `<div class="image-preview-empty"><div class="icon">🖼️</div><div class="title">Нет загруженных изображений</div></div>`;
            return;
        }
        let html = '<div class="image-preview-grid">';
        for (let i=0; i<this.uploadedImages.length; i++) {
            const f = this.uploadedImages[i];
            html += `
                <div class="image-preview-item">
                    <img src="${URL.createObjectURL(f)}" alt="${f.name}">
                    <button type="button" class="remove-btn" onclick="window.removeImageFromTask(${i})">✕</button>
                    <div class="file-info"><div class="name">${f.name}</div><div class="size">${(f.size/1024).toFixed(1)} KB</div></div>
                </div>
            `;
        }
        html += '</div><div style="margin-top:8px;font-size:0.7rem;color:var(--ink-soft);">Всего: '+this.uploadedImages.length+'</div>';
        container.innerHTML = html;
    }
};