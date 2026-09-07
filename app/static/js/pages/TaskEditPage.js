// pages/TaskEditPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { Navbar } from '../components/Navbar.js';
import { helpers } from '../utils/helpers.js';
import { getMediaToken } from '../core/mediaToken.js';

let editTaskId = null;
let editUploadedImages = [];

export const TaskEditPage = {
    render(params) {
        const user = store.get('user');
        if (!user) {
            router.navigate('login');
            return;
        }

        editTaskId = params.id;
        editUploadedImages = [];

        const app = document.getElementById('app');
        app.innerHTML = `
            ${Navbar.render()}
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

        loadEditTask();
    }
};

async function loadEditTask() {
    try {
        const token = store.get('token');

        const response = await fetch('/api/v1/tasks/' + editTaskId, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            document.getElementById('editForm').innerHTML = `
                <div class="card">
                    <div class="alert alert-error">❌ Задача не найдена</div>
                    <button class="btn btn-secondary" onclick="window.router.navigate('tasks')">← Назад</button>
                </div>
            `;
            return;
        }

        const task = await response.json();

        const imagesResponse = await fetch('/api/v1/images/task/' + editTaskId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        let existingImages = [];
        if (imagesResponse.ok) {
            existingImages = await imagesResponse.json();
        }

        // Отдельный короткоживущий токен для <img>/window.open — их нельзя
        // открыть с заголовком Authorization.
        const mediaToken = existingImages.length > 0 ? await getMediaToken() : null;

        let imagesHtml = '';
        if (existingImages.length > 0) {
            imagesHtml = `
                <div style="margin-bottom: 12px;">
                    <div style="font-weight: 600; font-size: 0.85rem; color: #4a4a6a; margin-bottom: 8px;">Существующие изображения:</div>
                    <div class="image-grid">
                        ${existingImages.map(img => `
                            <div class="image-card">
                                <img src="/api/v1/images/${img.id}?token=${encodeURIComponent(mediaToken)}" alt="${helpers.escapeHtml(img.filename)}"
                                     onclick="window.open('/api/v1/images/${img.id}?token=${encodeURIComponent(mediaToken)}', '_blank')"
                                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f2f5%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23a0aec0%22 font-family=%22Arial%22 font-size=%2214%22%3EОшибка%3C/text%3E%3C/svg%3E'">
                                <button class="delete-btn" onclick="deleteExistingImage(${img.id})">✕</button>
                                <div class="image-info">
                                    <div class="filename" title="${helpers.escapeHtml(img.filename)}">${helpers.escapeHtml(img.filename)}</div>
                                    <div class="meta">
                                        <span>📦 ${formatFileSize(img.file_size)}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        document.getElementById('editForm').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">✏️ Редактировать задачу #${task.id}</span>
                    <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('task-detail', {id: ${task.id}})">← Назад</button>
                </div>
                <form id="editTaskForm">
                    <div class="form-group">
                        <label>Название *</label>
                        <input type="text" id="editTitle" class="form-control" value="${helpers.escapeHtml(task.title)}" required>
                    </div>
                    <div class="form-group">
                        <label>Описание</label>
                        <textarea id="editDescription" class="form-control" rows="4">${helpers.escapeHtml(task.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Предпочтительный стиль</label>
                        <input type="text" id="editStyle" class="form-control" value="${helpers.escapeHtml(task.preferred_style)}">
                    </div>
                    <div class="form-group">
                        <label>Референсы (ссылки через запятую)</label>
                        <input type="text" id="editReferences" class="form-control" value="${helpers.escapeHtml((task.references || []).join(', '))}">
                    </div>

                    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                            <span style="font-weight: 600; font-size: 0.9rem; color: #4a4a6a;">🖼️ Изображения-референсы</span>
                            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                <input type="file" id="editImageInput" accept="image/*" multiple style="padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; max-width: 200px;">
                                <button type="button" class="btn btn-primary btn-sm" onclick="addEditImage()">📤 Добавить</button>
                            </div>
                        </div>
                        <div style="font-size: 0.8rem; color: #a0aec0; margin-bottom: 12px;">
                            ⚡ Максимальный размер: 50 МБ на файл. Поддерживаемые форматы: JPG, PNG, GIF, WEBP, BMP, TIFF
                        </div>

                        ${imagesHtml}

                        <div id="editImagePreview">
                            <div class="image-preview-empty">
                                <div class="icon">🖼️</div>
                                <div class="title">Нет новых изображений</div>
                                <div class="subtitle">Добавьте новые референсы для этой задачи</div>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary" id="editSubmitBtn">Сохранить изменения</button>
                        <button type="button" class="btn btn-secondary" onclick="window.router.navigate('task-detail', {id: ${task.id}})">Отмена</button>
                    </div>
                </form>
                <div id="editError" class="hidden alert-error" style="margin-top:12px;"></div>
            </div>
        `;

        document.getElementById('editTaskForm').addEventListener('submit', handleEditSubmit);

    } catch (error) {
        console.error('❌ Fetch error:', error);
        document.getElementById('editForm').innerHTML = `
            <div class="card">
                <div class="alert alert-error">❌ Ошибка загрузки: ${error.message}</div>
                <button class="btn btn-secondary" onclick="window.router.navigate('tasks')">← Назад</button>
            </div>
        `;
    }
}

async function handleEditSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('editSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader-small"></span> Сохранение...';

    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    const preferred_style = document.getElementById('editStyle').value;
    const refs = document.getElementById('editReferences').value;
    const errorDiv = document.getElementById('editError');

    const references = refs.split(',').map(function(r) { return r.trim(); }).filter(function(r) { return r; });

    try {
        const token = store.get('token');

        const response = await fetch('/api/v1/tasks/' + editTaskId, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                title: title,
                description: description,
                preferred_style: preferred_style,
                references: references
            })
        });

        if (response.ok) {
            if (editUploadedImages && editUploadedImages.length > 0) {
                let uploaded = 0;
                let failed = 0;

                for (let i = 0; i < editUploadedImages.length; i++) {
                    try {
                        const formData = new FormData();
                        formData.append('file', editUploadedImages[i]);

                        const uploadResponse = await fetch('/api/v1/images/upload/' + editTaskId, {
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
                    window.showAlert('✅ Задача обновлена! Загружено ' + uploaded + ' из ' + editUploadedImages.length + ' изображений.', 'success');
                } else {
                    window.showAlert('✅ Задача обновлена! Загружено ' + uploaded + ' изображений.', 'success');
                }
            } else {
                window.showAlert('✅ Задача обновлена!', 'success');
            }

            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            setTimeout(function() { window.router.navigate('task-detail', { id: editTaskId }); }, 1000);
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
}

function addEditImage() {
    const input = document.getElementById('editImageInput');
    if (!input || !input.files || input.files.length === 0) {
        window.showAlert('❌ Выберите файлы для загрузки', 'error');
        return;
    }

    const files = Array.from(input.files);
    const validFiles = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 50 * 1024 * 1024) {
            window.showAlert('❌ Файл "' + file.name + '" слишком большой. Максимум: 50 МБ', 'error');
            continue;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
            window.showAlert('❌ Файл "' + file.name + '" имеет неподдерживаемый формат.', 'error');
            continue;
        }
        validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    editUploadedImages = editUploadedImages.concat(validFiles);
    updateEditPreview();
    window.showAlert('✅ Добавлено ' + validFiles.length + ' изображений. Всего новых: ' + editUploadedImages.length, 'success');
    input.value = '';
}

function removeEditImage(index) {
    editUploadedImages.splice(index, 1);
    updateEditPreview();
    if (editUploadedImages.length === 0) {
        window.showAlert('📭 Все новые изображения удалены', 'info');
    }
}

function updateEditPreview() {
    const container = document.getElementById('editImagePreview');
    if (!container) return;

    if (!editUploadedImages || editUploadedImages.length === 0) {
        container.innerHTML = `
            <div class="image-preview-empty">
                <div class="icon">🖼️</div>
                <div class="title">Нет новых изображений</div>
                <div class="subtitle">Добавьте новые референсы для этой задачи</div>
            </div>
        `;
        return;
    }

    let html = `
        <div style="margin-top: 8px;">
            <div style="font-weight: 600; font-size: 0.85rem; color: #4a4a6a; margin-bottom: 8px;">Новые изображения (будут загружены при сохранении):</div>
            <div class="image-preview-grid">
    `;
    for (let i = 0; i < editUploadedImages.length; i++) {
        const file = editUploadedImages[i];
        html += `
            <div class="image-preview-item">
                <img src="${URL.createObjectURL(file)}" alt="${helpers.escapeHtml(file.name)}">
                <button type="button" class="remove-btn" onclick="removeEditImage(${i})">✕</button>
                <div class="file-info">
                    <div class="name" title="${helpers.escapeHtml(file.name)}">${helpers.escapeHtml(file.name)}</div>
                    <div class="size">${(file.size / 1024).toFixed(1)} KB</div>
                </div>
            </div>
        `;
    }
    html += `
            </div>
            <div style="margin-top: 8px; font-size: 0.7rem; color: #a0aec0; text-align: center;">
                Всего новых изображений: ${editUploadedImages.length}
            </div>
        </div>
    `;
    container.innerHTML = html;
}

async function deleteExistingImage(imageId) {
    if (!confirm('Удалить это изображение?')) return;
    try {
        const token = store.get('token');
        const response = await fetch('/api/v1/images/' + imageId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            window.showAlert('✅ Изображение удалено', 'success');
            await loadEditTask();
        } else {
            const err = await response.json();
            window.showAlert('❌ ' + (err.detail || 'Ошибка удаления'), 'error');
        }
    } catch (e) {
        window.showAlert('❌ Ошибка соединения', 'error');
    }
}

function formatFileSize(size) {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

window.addEditImage = addEditImage;
window.removeEditImage = removeEditImage;
window.deleteExistingImage = deleteExistingImage;