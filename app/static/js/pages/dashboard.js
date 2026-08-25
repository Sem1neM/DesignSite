// ============================================
// DASHBOARD PAGE
// ============================================
function renderDashboard() {
    if (!currentUser) { navigate('login'); return; }

    document.getElementById('app').innerHTML = `
        ${renderNavbar()}
        <div class="container">
            <div id="alertContainer"></div>
            <div class="row" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">👋 Добро пожаловать, ${currentUser.full_name}!</span>
                    </div>
                    <p><strong>Email:</strong> ${currentUser.email}</p>
                    <p><strong>Роль:</strong> <span class="role-badge">${currentUser.role}</span></p>
                    <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="navigate('tasks')">📋 Мои задачи</button>
                        ${currentUser.role === 'client' ? `<button class="btn btn-success" onclick="navigate('task-create')">➕ Создать задачу</button>` : ''}
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">📊 Статистика</span>
                    </div>
                    <div id="stats">
                        <div class="loader"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadStats();
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const tasks = await response.json();
            const stats = {
                total: tasks.length,
                new: tasks.filter(t => t.status === 'NEW').length,
                in_progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
                completed: tasks.filter(t => t.status === 'COMPLETED').length
            };
            document.getElementById('stats').innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="background: #f7fafc; padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700;">${stats.total}</div>
                        <div class="text-muted" style="font-size: 0.8rem;">Всего</div>
                    </div>
                    <div style="background: #bee3f8; padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #2b6cb0;">${stats.new}</div>
                        <div style="font-size: 0.8rem; color: #2b6cb0;">Новых</div>
                    </div>
                    <div style="background: #fbd38d; padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #9c4221;">${stats.in_progress}</div>
                        <div style="font-size: 0.8rem; color: #9c4221;">В работе</div>
                    </div>
                    <div style="background: #c6f6d5; padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #276749;">${stats.completed}</div>
                        <div style="font-size: 0.8rem; color: #276749;">Завершено</div>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        document.getElementById('stats').innerHTML = '<p class="text-muted">Не удалось загрузить статистику</p>';
    }
}