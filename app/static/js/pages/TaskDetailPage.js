// pages/TaskDetailPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { Navbar } from '../components/Navbar.js';

export const TaskDetailPage = {
    render(params) {
        const user = store.get('user');
        if (!user) {
            router.navigate('login');
            return;
        }

        const taskId = params.id;
        const app = document.getElementById('app');
        app.innerHTML = `
            ${Navbar.render()}
            <div class="container">
                <div id="alertContainer"></div>
                <div id="taskDetail">
                    <div class="loader-container">
                        <div class="loader"></div>
                        <div>Загрузка задачи...</div>
                    </div>
                </div>
            </div>
        `;

        loadTaskDetail(taskId, user);
    }
};

async function loadTaskDetail(taskId, user) {
    try {
        const token = store.get('token');

        const response = await fetch('/api/v1/tasks/' + taskId, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            document.getElementById('taskDetail').innerHTML = `
                <div class="card">
                    <div class="alert alert-error">❌ Задача не найдена</div>
                    <button class="btn btn-secondary" onclick="window.router.navigate('tasks')">← Назад</button>
                </div>
            `;
            return;
        }

        const task = await response.json();

        const imagesResponse = await fetch('/api/v1/images/task/' + taskId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        let images = [];
        if (imagesResponse.ok) {
            images = await imagesResponse.json();
        }

        const container = document.getElementById('taskDetail');

        let statusLabel = '';
        if (task.status === 'NEW') statusLabel = '🆕 Новая';
        else if (task.status === 'CLARIFICATION') statusLabel = '💬 Уточнение';
        else if (task.status === 'READY_FOR_REVIEW') statusLabel = '✅ Готово к проверке';
        else if (task.status === 'IN_PROGRESS') statusLabel = '🔄 В работе';
        else if (task.status === 'COMPLETED') statusLabel = '✔️ Завершено';
        else if (task.status === 'REJECTED') statusLabel = '❌ Отклонено';
        else statusLabel = task.status;

        const isClient = user.role === 'client' && task.client_id === user.id;
        const isDesigner = user.role === 'designer';
        const isAdmin = user.role === 'admin';

        let imagesHtml = '';
        if (images.length > 0) {
            imagesHtml = `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                    <div style="font-weight: 600; font-size: 0.9rem; color: #4a4a6a; margin-bottom: 12px;">🖼️ Изображения-референсы</div>
                    <div class="image-grid">
                        ${images.map(img => `
                            <div class="image-card">
                                <img src="/api/v1/images/${img.id}?token=${encodeURIComponent(token)}" alt="${img.filename}"
                                     onclick="window.open('/api/v1/images/${img.id}?token=${encodeURIComponent(token)}', '_blank')"
                                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f2f5%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23a0aec0%22 font-family=%22Arial%22 font-size=%2214%22%3EОшибка%3C/text%3E%3C/svg%3E'">
                                <div class="image-info">
                                    <div class="filename" title="${img.filename}">${img.filename}</div>
                                    <div class="meta">
                                        <span>📦 ${formatFileSize(img.file_size)}</span>
                                        ${img.width && img.height ? `<span>📐 ${img.width}×${img.height}</span>` : ''}
                                        <span>🕐 ${new Date(img.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        let canChangeStatus = false;
        let statusOptions = '';

        const statusList = {
            'new': '🆕 Новая',
            'clarification': '💬 Уточнение',
            'ready_for_review': '✅ Готово к проверке',
            'in_progress': '🔄 В работе',
            'completed': '✔️ Завершено',
            'rejected': '❌ Отклонено'
        };

        const currentStatus = task.status.toLowerCase();

        if (isAdmin) {
            canChangeStatus = true;
            statusOptions = '';
            for (const [key, label] of Object.entries(statusList)) {
                statusOptions += `<option value="${key}" ${currentStatus === key ? 'selected' : ''}>${label}</option>`;
            }
        } else if (isDesigner) {
            canChangeStatus = true;
            const designerStatuses = ['new', 'clarification', 'ready_for_review', 'in_progress'];
            for (const key of designerStatuses) {
                statusOptions += `<option value="${key}" ${currentStatus === key ? 'selected' : ''}>${statusList[key]}</option>`;
            }
        } else if (isClient && task.status !== 'COMPLETED') {
            canChangeStatus = true;
            statusOptions = `
                <option value="completed">✔️ Завершено</option>
            `;
        }

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span class="card-title">${task.title}</span>
                        <span class="status-badge status-${task.status}">${statusLabel}</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('tasks')">← Назад</button>
                        ${(isClient || isAdmin) ? '<button class="btn btn-primary btn-sm" onclick="window.router.navigate(\'task-edit\', {id: ' + task.id + '})">✏️ Редактировать</button>' : ''}
                        ${isClient ? '<button class="btn btn-danger btn-sm" onclick="window.deleteTask(' + task.id + ')">🗑 Удалить</button>' : ''}
                    </div>
                </div>
                <div class="task-detail-grid">
                    <div>
                        <div class="field-label">📝 Описание</div>
                        <div class="field-value">${task.description || '—'}</div>
                        ${task.clarified_description ? '<div class="field-label">🤖 Уточнённое ТЗ (ИИ)</div><div class="field-value" style="background: #f7fafc; padding: 12px; border-radius: 8px;">' + task.clarified_description + '</div>' : ''}
                        <div class="field-label">🎨 Предпочтительный стиль</div>
                        <div class="field-value">${task.preferred_style || '—'}</div>
                        ${task.references && task.references.length > 0 ? '<div class="field-label">🔗 Референсы (ссылки)</div><div class="field-value">' + task.references.map(function(ref) { return '<a href="' + ref + '" target="_blank" style="color: #667eea; display: block;">' + ref + '</a>'; }).join('') + '</div>' : ''}
                        ${imagesHtml}
                    </div>
                    <div>
                        <div class="field-label">🆔 ID</div>
                        <div class="field-value">#${task.id}</div>
                        <div class="field-label">📊 Статус</div>
                        <div class="field-value"><span class="status-badge status-${task.status}">${statusLabel}</span></div>
                        <div class="field-label">👤 Клиент</div>
                        <div class="field-value">${task.client_id}</div>
                        <div class="field-label">📅 Создана</div>
                        <div class="field-value">${new Date(task.created_at).toLocaleString()}</div>
                        <div class="field-label">🔄 Обновлена</div>
                        <div class="field-value">${new Date(task.updated_at).toLocaleString()}</div>

                        ${canChangeStatus ? `
                            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                                <label style="font-weight: 600; font-size: 0.85rem; color: #4a4a6a; display: block; margin-bottom: 4px;">Изменить статус</label>
                                <select id="statusSelect" class="form-control" style="margin-bottom: 8px;">
                                    ${statusOptions}
                                </select>
                                <button class="btn btn-primary btn-sm btn-block" onclick="updateTaskStatus(${task.id})">Обновить статус</button>
                            </div>
                        ` : ''}

                        ${(isClient || isDesigner || isAdmin) ? `
                            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                    <input type="file" id="imageInput" accept="image/*" style="padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; max-width: 180px;">
                                    <button class="btn btn-primary btn-sm" onclick="uploadImageToTask(${task.id})">📤 Загрузить</button>
                                </div>
                                <div style="font-size: 0.7rem; color: #a0aec0; margin-top: 4px;">Максимум: 50 МБ. Форматы: JPG, PNG, GIF, WEBP, SVG, BMP, TIFF</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('❌ Fetch error:', error);
        document.getElementById('taskDetail').innerHTML = '<div class="alert alert-error">❌ Ошибка загрузки: ' + error.message + '</div>';
    }
}

window.updateTaskStatus = async function(taskId) {
    const statusSelect = document.getElementById('statusSelect');
    if (!statusSelect) {
        window.showAlert('❌ Элемент выбора статуса не найден', 'error');
        return;
    }

    const statusValue = statusSelect.value;
    const statusLower = statusValue.toLowerCase();

    try {
        const token = store.get('token');
        const response = await fetch('/api/v1/tasks/' + taskId + '/status?status=' + statusLower, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            window.showAlert('✅ Статус обновлён!', 'success');
            setTimeout(function() {
                const user = store.get('user');
                loadTaskDetail(taskId, user);
            }, 500);
        } else {
            let errorMessage = 'Ошибка обновления статуса';
            try {
                const error = await response.json();
                errorMessage = error.detail || errorMessage;
            } catch (e) {}
            window.showAlert('❌ ' + errorMessage, 'error');
        }
    } catch (e) {
        window.showAlert('❌ Ошибка соединения: ' + e.message, 'error');
    }
};

window.uploadImageToTask = async function(taskId) {
    const input = document.getElementById('imageInput');
    if (!input || !input.files || input.files.length === 0) {
        window.showAlert('❌ Выберите файл для загрузки', 'error');
        return;
    }

    const file = input.files[0];

    if (file.size > 50 * 1024 * 1024) {
        window.showAlert('❌ Файл слишком большой. Максимум: 50 МБ', 'error');
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
        window.showAlert('❌ Неподдерживаемый формат файла', 'error');
        return;
    }

    try {
        const token = store.get('token');
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/v1/images/upload/' + taskId, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            window.showAlert('✅ Изображение "' + data.filename + '" загружено!', 'success');
            input.value = '';
            const user = store.get('user');
            loadTaskDetail(taskId, user);
        } else {
            const err = await response.json();
            window.showAlert('❌ ' + (err.detail || 'Ошибка загрузки'), 'error');
        }
    } catch (e) {
        window.showAlert('❌ Ошибка соединения', 'error');
    }
};

function formatFileSize(size) {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

window.deleteTask = async function(taskId) {
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    try {
        const token = store.get('token');
        const response = await fetch('/api/v1/tasks/' + taskId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            window.showAlert('✅ Задача удалена', 'success');
            setTimeout(function() { window.router.navigate('tasks'); }, 500);
        } else {
            window.showAlert('❌ Не удалось удалить задачу', 'error');
        }
    } catch (e) {
        window.showAlert('❌ Ошибка соединения', 'error');
    }
};

window.logout = function() {
    store.clear();
    window.router.navigate('login');
};