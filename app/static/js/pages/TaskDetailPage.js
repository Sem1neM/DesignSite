// pages/TaskDetailPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { Navbar } from '../components/Navbar.js';

// ============================================
// СТАТУСЫ НА РУССКОМ
// ============================================
const STATUS_MAP = {
    'new': 'Новая',
    'clarification': 'Уточнение',
    'ready_for_review': 'Готово к проверке',
    'in_progress': 'В работе',
    'completed': 'Завершено',
    'rejected': 'Отклонено'
};

const STATUS_CLASS_MAP = {
    'new': 'new',
    'clarification': 'new',
    'ready_for_review': 'ready',
    'in_progress': 'progress',
    'completed': 'done',
    'rejected': 'cancel'
};

function getStatusText(status) {
    const key = status ? status.toLowerCase() : '';
    return STATUS_MAP[key] || status || 'Неизвестно';
}

function getStatusClass(status) {
    const key = status ? status.toLowerCase() : '';
    return STATUS_CLASS_MAP[key] || 'new';
}

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
            <div class="app">
                <section class="view active" id="taskDetail">
                    <div id="taskDetailContent">
                        <div class="loader-container" style="padding:40px 0;">
                            <div class="loader"></div>
                            <div>Загрузка задачи...</div>
                        </div>
                    </div>
                </section>
            </div>
        `;

        TaskDetailPage.loadTask(taskId, user);
    },

    async loadTask(taskId, user) {
        try {
            const token = store.get('token');

            const response = await fetch('/api/v1/tasks/' + taskId, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                document.getElementById('taskDetailContent').innerHTML = `
                    <div class="card" style="padding:32px;">
                        <div class="alert alert-error">❌ Задача не найдена</div>
                        <button class="btn btn-ghost btn-sm" onclick="window.router.navigate('tasks')">← Назад</button>
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

            const statusText = getStatusText(task.status);
            const statusClass = getStatusClass(task.status);

            const isClient = user.role === 'client' && task.client_id === user.id;
            const isDesigner = user.role === 'designer';
            const isAdmin = user.role === 'admin';

            // ============================================
            // ИЗОБРАЖЕНИЯ
            // ============================================
            let imagesHtml = '';
            if (images.length > 0) {
                const imagesItems = images.map(img => `
                    <div class="file-chip">
                        <div class="file-thumb" style="background:url('/api/v1/images/${img.id}?token=${encodeURIComponent(token)}') center/cover;"></div>
                        <div class="file-info">
                            <div class="fn" title="${img.filename}">${img.filename}</div>
                            <div class="fs">${formatFileSize(img.file_size)}</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="window.open('/api/v1/images/${img.id}?token=${encodeURIComponent(token)}', '_blank')">👁️</button>
                        ${(isClient || isAdmin) ? `<button class="btn btn-ghost btn-sm" onclick="deleteImage(${img.id}, ${taskId})">✕</button>` : ''}
                    </div>
                `).join('');

                imagesHtml = `
                    <div class="panel">
                        <div class="files-head">
                            <h3>🖼️ Изображения-референсы</h3>
                            ${(isDesigner || isAdmin) ? `
                                <button class="btn btn-ghost btn-sm" onclick="downloadAllImages(${taskId})">
                                    ⬇️ Скачать все (${images.length})
                                </button>
                            ` : ''}
                        </div>
                        <div class="file-row">
                            ${imagesItems}
                        </div>
                    </div>
                `;
            }

            // ============================================
            // СТЕППЕР СТАТУСОВ
            // ============================================
            const stepOrder = ['new', 'clarification', 'ready_for_review', 'in_progress', 'completed', 'rejected'];
            const currentIdx = stepOrder.indexOf(task.status.toLowerCase());
            const steps = stepOrder.map((s, idx) => {
                const label = STATUS_MAP[s] || s;
                let state = '';
                if (idx < currentIdx) state = 'done';
                else if (idx === currentIdx) state = 'current';
                return `<div class="step ${state}"><div class="dot">${state === 'done' ? '✓' : idx+1}</div><span class="label">${label}</span></div>`;
            });

            // Вставляем линии между шагами
            let stepperHtml = '<div class="stepper">';
            for (let i=0; i<steps.length; i++) {
                stepperHtml += steps[i];
                if (i < steps.length-1) stepperHtml += '<div class="line"></div>';
            }
            stepperHtml += '</div>';

            // ============================================
            // ЧАТ
            // ============================================
            // Для чата будем использовать заглушку, реальный WebSocket будет позже
            const chatHtml = `
                <div class="panel chat-panel">
                    <h3>💬 Чат по задаче</h3>
                    <div class="chat-thread" id="chatThread">
                        <div class="msg">
                            <div class="mavatar" style="background:linear-gradient(135deg,var(--blue),var(--violet));">${user.full_name.charAt(0)}</div>
                            <div>
                                <div class="bubble">Здесь будут сообщения с ИИ-агентом и дизайнером</div>
                                <div class="time">Подключите WebSocket</div>
                            </div>
                        </div>
                    </div>
                    <div class="chat-input-row">
                        <input type="text" id="chatInput" placeholder="Написать сообщение…">
                        <button class="send-btn" onclick="sendChatMessage(${task.id})">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-3-7-7-1z" stroke="white" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>
                        </button>
                    </div>
                </div>
            `;

            // ============================================
            // ИЗМЕНЕНИЕ СТАТУСА (только для дизайнера и админа)
            // ============================================
            let statusSelectHtml = '';
            if (isDesigner || isAdmin) {
                const statusList = {
                    'new': 'Новая',
                    'clarification': 'Уточнение',
                    'ready_for_review': 'Готово к проверке',
                    'in_progress': 'В работе',
                    'completed': 'Завершено',
                    'rejected': 'Отклонено'
                };
                const currentStatus = task.status.toLowerCase();
                let options = '';
                for (const [key, label] of Object.entries(statusList)) {
                    // Для дизайнера убираем completed и rejected
                    if (isDesigner && (key === 'completed' || key === 'rejected')) continue;
                    const selected = key === currentStatus ? 'selected' : '';
                    options += `<option value="${key}" ${selected}>${label}</option>`;
                }
                statusSelectHtml = `
                    <div class="side-row">
                        <span class="field-label">Изменить статус</span>
                        <select class="status-select" id="statusSelect">
                            ${options}
                        </select>
                        <button class="btn btn-primary btn-sm" style="width:100%; justify-content:center; margin-top:10px;" onclick="updateTaskStatus(${task.id})">
                            Обновить статус
                        </button>
                    </div>
                `;
            }

            // ============================================
            // ЗАГРУЗКА НОВОГО ИЗОБРАЖЕНИЯ
            // ============================================
            const uploadHtml = `
                <div class="side-row">
                    <div class="upload-zone">
                        <b onclick="document.getElementById('imageInput').click()">Выбрать файл</b> или перетащите сюда<br>
                        JPG, PNG, GIF, WEBP, SVG, BMP, TIFF · до 50 МБ
                        <input type="file" id="imageInput" accept="image/*" style="display:none;" onchange="uploadImageToTask(${task.id})">
                    </div>
                </div>
            `;

            // ============================================
            // ФОРМИРУЕМ HTML
            // ============================================
            const container = document.getElementById('taskDetailContent');
            container.innerHTML = `
                <div class="task-topline">
                    <button class="back-link" onclick="window.router.navigate('tasks')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        Назад к задачам
                    </button>
                    <div class="task-actions">
                        ${(isClient || isAdmin) ? `<button class="btn btn-primary btn-sm" onclick="window.router.navigate('task-edit', {id: ${task.id}})">✏️ Редактировать</button>` : ''}
                        ${isClient ? `<button class="btn btn-ghost btn-sm" onclick="window.deleteTask(${task.id})">🗑 Удалить</button>` : ''}
                    </div>
                </div>

                <div class="task-heading">
                    <h1>${task.title}</h1>
                    <span class="status-chip ${statusClass}">${statusText}</span>
                </div>

                ${stepperHtml}

                <div class="task-grid">
                    <div class="task-main">
                        <div class="panel">
                            <h3>📝 Описание</h3>
                            <p class="desc-text">${task.description || 'Нет описания'}</p>
                            ${task.clarified_description ? `
                                <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line);">
                                    <h3>🤖 Уточнённое ТЗ (ИИ)</h3>
                                    <p class="desc-text">${task.clarified_description}</p>
                                </div>
                            ` : ''}
                            ${task.preferred_style ? `<div style="margin-top:12px;"><strong>Стиль:</strong> ${task.preferred_style}</div>` : ''}
                            ${task.references && task.references.length ? `
                                <div style="margin-top:12px;">
                                    <strong>Референсы (ссылки):</strong>
                                    ${task.references.map(ref => `<a href="${ref}" target="_blank" style="color:var(--violet);display:block;">${ref}</a>`).join('')}
                                </div>
                            ` : ''}
                        </div>

                        ${imagesHtml}

                        ${chatHtml}
                    </div>

                    <div class="task-side">
                        <div class="side-panel">
                            <div class="side-row">
                                <div class="label">📍 Место в очереди</div>
                                <div class="queue-value"><span class="n">—</span><span class="sub">(скоро)</span></div>
                            </div>
                            <div class="side-row">
                                <div class="label">Статус</div>
                                <div class="value" style="color:var(--${statusClass === 'done' ? 'green' : statusClass === 'progress' ? 'blue' : 'violet'});">${statusText}</div>
                            </div>
                            <div class="side-row">
                                <div class="label">📅 Создана</div>
                                <div class="value" style="font-size:14.5px;">${new Date(task.created_at).toLocaleString()}</div>
                                <div class="sub">${Math.floor((Date.now() - new Date(task.created_at)) / (1000*60*60*24))} дней назад</div>
                            </div>
                            <div class="side-row">
                                <div class="label">🔄 Обновлена</div>
                                <div class="value" style="font-size:14.5px;">${task.updated_at ? new Date(task.updated_at).toLocaleString() : '—'}</div>
                            </div>
                            <div class="side-row">
                                <div class="label">👤 Клиент</div>
                                <div class="value" style="font-size:14.5px;">#${task.client_id}</div>
                            </div>
                            ${task.assigned_designer_id ? `
                                <div class="side-row">
                                    <div class="label">👨‍🎨 Дизайнер</div>
                                    <div class="value" style="font-size:14.5px;">#${task.assigned_designer_id}</div>
                                </div>
                            ` : ''}
                        </div>

                        <div class="side-panel">
                            ${statusSelectHtml}
                            ${uploadHtml}
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('❌ Fetch error:', error);
            document.getElementById('taskDetailContent').innerHTML = `
                <div class="card" style="padding:32px;">
                    <div class="alert alert-error">❌ Ошибка загрузки: ${error.message}</div>
                    <button class="btn btn-ghost btn-sm" onclick="window.router.navigate('tasks')">← Назад</button>
                </div>
            `;
        }
    }
};

// ============================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ (для onclick)
// ============================================

// Изменение статуса
window.updateTaskStatus = async function(taskId) {
    const sel = document.getElementById('statusSelect');
    if (!sel) return;
    const status = sel.value;
    try {
        const token = store.get('token');
        const res = await fetch(`/api/v1/tasks/${taskId}/status?status=${status}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            window.showAlert('✅ Статус обновлён!', 'success');
            setTimeout(() => window.router.navigate('task-detail', { id: taskId }), 500);
        } else {
            const err = await res.json();
            window.showAlert('❌ ' + (err.detail || 'Ошибка'), 'error');
        }
    } catch (e) {
        window.showAlert('❌ Ошибка', 'error');
    }
};

// Загрузка изображения
window.uploadImageToTask = async function(taskId) {
    const input = document.getElementById('imageInput');
    if (!input || !input.files || !input.files.length) {
        window.showAlert('❌ Выберите файл', 'error');
        return;
    }
    const file = input.files[0];
    if (file.size > 50 * 1024 * 1024) {
        window.showAlert('❌ Файл слишком большой (макс. 50 МБ)', 'error');
        return;
    }
    try {
        const token = store.get('token');
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/v1/images/upload/${taskId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd
        });
        if (res.ok) {
            window.showAlert('✅ Изображение загружено!', 'success');
            input.value = '';
            const user = store.get('user');
            TaskDetailPage.loadTask(taskId, user);
        } else {
            const err = await res.json();
            window.showAlert('❌ ' + (err.detail || 'Ошибка'), 'error');
        }
    } catch (e) {
        window.showAlert('❌ Ошибка', 'error');
    }
};

// Удаление изображения
window.deleteImage = async function(imageId, taskId) {
    if (!confirm('Удалить это изображение?')) return;
    try {
        const token = store.get('token');
        const res = await fetch(`/api/v1/images/${imageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            window.showAlert('✅ Изображение удалено', 'success');
            const user = store.get('user');
            TaskDetailPage.loadTask(taskId, user);
        } else {
            const err = await res.json();
            window.showAlert('❌ ' + (err.detail || 'Ошибка'), 'error');
        }
    } catch (e) {
        window.showAlert('❌ Ошибка', 'error');
    }
};

// Скачивание всех изображений
window.downloadAllImages = async function(taskId) {
    try {
        const token = store.get('token');
        const res = await fetch(`/api/v1/images/task/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Не удалось получить список изображений');
        const images = await res.json();
        if (!images.length) {
            window.showAlert('❌ Нет изображений', 'error');
            return;
        }
        // Скачиваем по одному
        window.showAlert(`⏳ Скачивание ${images.length} изображений...`, 'info');
        let downloaded = 0;
        for (const img of images) {
            const link = document.createElement('a');
            link.href = `/api/v1/images/${img.id}?token=${encodeURIComponent(token)}`;
            link.download = img.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            downloaded++;
            await new Promise(r => setTimeout(r, 300));
        }
        window.showAlert(`✅ Скачано ${downloaded} изображений`, 'success');
    } catch (e) {
        window.showAlert('❌ ' + e.message, 'error');
    }
};

// Отправка сообщения в чат (заглушка)
window.sendChatMessage = function(taskId) {
    const input = document.getElementById('chatInput');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    const thread = document.getElementById('chatThread');
    const div = document.createElement('div');
    div.className = 'msg me';
    const user = store.get('user');
    const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    div.innerHTML = `
        <div class="mavatar" style="background:linear-gradient(135deg,var(--violet),var(--pink));">${initials}</div>
        <div>
            <div class="bubble">${msg}</div>
            <div class="time">Вы · только что</div>
        </div>
    `;
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
    input.value = '';
    // Здесь можно отправить сообщение в WebSocket
};

// Удаление задачи
window.deleteTask = async function(taskId) {
    if (!confirm('Вы уверены, что хотите удалить задачу?')) return;
    try {
        const token = store.get('token');
        const res = await fetch(`/api/v1/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            window.showAlert('✅ Задача удалена', 'success');
            setTimeout(() => window.router.navigate('tasks'), 500);
        } else {
            const err = await res.json();
            window.showAlert('❌ ' + (err.detail || 'Ошибка'), 'error');
        }
    } catch (e) {
        window.showAlert('❌ Ошибка', 'error');
    }
};

// Вспомогательная функция
function formatFileSize(size) {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Выход
window.logout = function() {
    store.clear();
    window.router.navigate('login');
};