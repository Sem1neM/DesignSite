// pages/DashboardPage.js
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { Navbar } from '../components/Navbar.js';

export const DashboardPage = {
    tasksCount: 0,

    render() {
        const user = store.get('user');
        if (!user) {
            router.navigate('login');
            return;
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            ${Navbar.render()}
            <div class="app">
                <section class="view active" id="dashboard">
                    <div class="hero-row">
                        <div class="card welcome-card">
                            <div class="kicker">С возвращением 👋</div>
                            <h1>Привет, ${user.full_name}!</h1>
                            <div class="info-grid">
                                <div class="info-item"><div class="label">Email</div><div class="value">${user.email}</div></div>
                                <div class="info-item"><div class="label">Роль</div><div class="value">${user.role === 'client' ? 'Байер' : user.role === 'designer' ? 'Дизайнер' : 'Админ'}</div></div>
                            </div>
                            <div class="btn-row">
                                <button class="btn btn-primary" onclick="window.router.navigate('tasks')">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h10" stroke="white" stroke-width="2.2" stroke-linecap="round"/></svg>
                                    Мои задачи
                                </button>
                                ${user.role === 'client' ? `
                                    <button class="btn btn-ghost" onclick="window.router.navigate('task-create')">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>
                                        Создать задачу
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                        <div class="card mood-card">
                            <div>
                                <div class="emoji">🔥</div>
                                <p>Держи темп — за неделю уже ${DashboardPage.tasksCount || 0} задач в работе с командой дизайна.</p>
                            </div>
                            <div class="streak">
                                <div class="n">5</div>
                                <div class="t">дней подряд<br>с активными задачами</div>
                            </div>
                        </div>
                    </div>

                    <div class="stats-grid" id="statsGrid">
                        <div class="stat-tile stat-hero"><div class="top-row"><span class="icon">📊</span></div><div class="n num" id="statTotal">0</div><div class="t">Всего задач</div></div>
                        <div class="stat-tile stat-new"><div class="top-row"><span class="icon">✨</span></div><div class="n num" id="statNew">0</div><div class="t">Новых</div></div>
                        <div class="stat-tile stat-progress"><div class="top-row"><span class="icon">⚙️</span></div><div class="n num" id="statProgress">0</div><div class="t">В работе</div></div>
                        <div class="stat-tile stat-ready"><div class="top-row"><span class="icon">👀</span></div><div class="n num" id="statReady">0</div><div class="t">Готово</div></div>
                        <div class="stat-tile stat-done"><div class="top-row"><span class="icon">✅</span></div><div class="n num" id="statDone">0</div><div class="t">Завершено</div></div>
                        <div class="stat-tile stat-cancel"><div class="top-row"><span class="icon">✕</span></div><div class="n num" id="statCancel">0</div><div class="t">Отменены</div></div>
                    </div>

                    <div class="card feed-card">
                        <div class="feed-head">
                            <div>
                                <h2>Лента событий</h2>
                                <div class="sub">Последние уведомления по вашим задачам</div>
                            </div>
                        </div>
                        <div class="feed-list" id="feedList">
                            <div class="loader"></div>
                        </div>
                    </div>
                </section>
            </div>
        `;

        DashboardPage.loadStats();
        DashboardPage.loadFeed();
    },

    loadStats: async function() {
        try {
            const token = store.get('token');
            const res = await fetch('/api/v1/tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const tasks = await res.json();
                const total = tasks.length;
                const newCount = tasks.filter(t => t.status.toLowerCase() === 'new').length;
                const progress = tasks.filter(t => t.status.toLowerCase() === 'in_progress').length;
                const ready = tasks.filter(t => t.status.toLowerCase() === 'ready_for_review').length;
                const done = tasks.filter(t => t.status.toLowerCase() === 'completed').length;
                const canceled = tasks.filter(t => t.status.toLowerCase() === 'rejected').length;

                document.getElementById('statTotal').textContent = total;
                document.getElementById('statNew').textContent = newCount;
                document.getElementById('statProgress').textContent = progress;
                document.getElementById('statReady').textContent = ready;
                document.getElementById('statDone').textContent = done;
                document.getElementById('statCancel').textContent = canceled;

                DashboardPage.tasksCount = progress;
            }
        } catch (e) {
            console.error('Stats error:', e);
        }
    },

    loadFeed: async function() {
        const list = document.getElementById('feedList');
        try {
            const token = store.get('token');
            const res = await fetch('/api/v1/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const notifications = await res.json();
                if (notifications.length === 0) {
                    list.innerHTML = `
                        <div class="feed-item">
                            <div class="feed-ico" style="background:var(--violet-soft);">📭</div>
                            <div>
                                <div class="feed-text">Нет событий</div>
                                <div class="feed-time">Пока ничего не происходило</div>
                            </div>
                        </div>
                    `;
                    return;
                }
                // Берём последние 5 уведомлений
                const recent = notifications.slice(0, 5);
                list.innerHTML = recent.map(n => {
                    // Иконка по типу уведомления
                    let icon = '💬';
                    if (n.title.includes('Создана')) icon = '✨';
                    else if (n.title.includes('Статус')) icon = '🔄';
                    else if (n.title.includes('Обновлена')) icon = '✏️';
                    else if (n.title.includes('Удалена')) icon = '🗑️';
                    return `
                        <div class="feed-item">
                            <div class="feed-ico" style="background:var(--violet-soft);">${icon}</div>
                            <div>
                                <div class="feed-text">${n.title}: ${n.message}</div>
                                <div class="feed-time">${new Date(n.created_at).toLocaleString()}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                list.innerHTML = `
                    <div class="feed-item">
                        <div class="feed-ico" style="background:var(--coral-soft);">⚠️</div>
                        <div>
                            <div class="feed-text">Ошибка загрузки событий</div>
                            <div class="feed-time">Попробуйте обновить страницу</div>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.error('Feed error:', e);
            list.innerHTML = `
                <div class="feed-item">
                    <div class="feed-ico" style="background:var(--coral-soft);">⚠️</div>
                    <div>
                        <div class="feed-text">Ошибка: ${e.message}</div>
                        <div class="feed-time">Попробуйте позже</div>
                    </div>
                </div>
            `;
        }
    }
};