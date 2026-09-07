// core/app.js
import { store } from './store.js';
import { router } from './router.js';

// Импортируем страницы
import { LoginPage } from '../pages/LoginPage.js';
import { RegisterPage } from '../pages/RegisterPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { TasksPage } from '../pages/TasksPage.js';
import { TaskCreatePage } from '../pages/TaskCreatePage.js';
import { TaskDetailPage } from '../pages/TaskDetailPage.js';
import { TaskEditPage } from '../pages/TaskEditPage.js';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage.js';
import { ResetPasswordPage } from '../pages/ResetPasswordPage.js';
import { UsersPage } from '../pages/UsersPage.js';
import { clearMediaToken } from './mediaToken.js';

// ============================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ
// ============================================

window.showAlert = function(message, type) {
    type = type || 'info';
    var container = document.getElementById('alertContainer');
    if (!container) {
        console.log('Alert:', message, type);
        return;
    }
    var types = {
        success: 'alert-success',
        error: 'alert-error',
        info: 'alert-info',
        warning: 'alert-warning'
    };
    // textContent, а не innerHTML — message нередко содержит данные,
    // введённые пользователем (например, имя загружаемого файла).
    container.textContent = '';
    var alertEl = document.createElement('div');
    alertEl.className = 'alert ' + (types[type] || types.info);
    alertEl.textContent = message;
    container.appendChild(alertEl);
    clearTimeout(window._alertTimeout);
    window._alertTimeout = setTimeout(function() {
        if (container) container.textContent = '';
    }, 5000);
};

window.logout = function() {
    store.clear();
    clearMediaToken();
    window.router.navigate('login');
};

window.router = router;
window.store = store;
window.navigate = router.navigate.bind(router);

// ============================================
// РЕГИСТРАЦИЯ МАРШРУТОВ
// ============================================

router.register('login', {
    title: 'Вход',
    render: LoginPage.render,
    redirectIfAuth: 'dashboard'
});

router.register('register', {
    title: 'Регистрация',
    render: RegisterPage.render,
    redirectIfAuth: 'dashboard'
});

router.register('forgot-password', {
    title: 'Восстановление пароля',
    render: ForgotPasswordPage.render
});

router.register('reset-password', {
    title: 'Сброс пароля',
    render: ResetPasswordPage.render
});

router.register('dashboard', {
    title: 'Главная',
    render: DashboardPage.render,
    requiresAuth: true
});

router.register('tasks', {
    title: 'Задачи',
    render: TasksPage.render,
    requiresAuth: true
});

router.register('task-create', {
    title: 'Создать задачу',
    render: TaskCreatePage.render,
    requiresAuth: true
});

router.register('task-detail', {
    title: 'Детали задачи',
    render: TaskDetailPage.render,
    requiresAuth: true
});

router.register('task-edit', {
    title: 'Редактировать задачу',
    render: TaskEditPage.render,
    requiresAuth: true
});

router.register('users', {
    title: 'Пользователи',
    render: UsersPage.render,
    requiresAuth: true
});

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

async function initApp() {
    console.log('🚀 App initializing...');

    const token = store.get('token');
    if (token) {
        try {
            const response = await fetch('/api/v1/auth/me', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (response.ok) {
                const user = await response.json();
                store.setUser(user);
                console.log('👤 User authenticated:', user.email);

                // Загружаем уведомления
                setTimeout(() => {
                    if (window.loadNotifications) {
                        console.log('🔔 Загружаем уведомления...');
                        window.loadNotifications();
                    }
                }, 500);

                router.navigate('dashboard');
                // Обновляем пилл после рендера
                setTimeout(() => {
                    if (window.updatePill) window.updatePill('dashboard');
                }, 100);
                return;
            } else {
                store.clear();
            }
        } catch (e) {
            console.error('Auth error:', e);
            store.clear();
        }
    }

    console.log('🔐 Not authenticated, showing login');
    router.navigate('login');
}

// Сохраняем оригинальный navigate для обновления пилла
const originalNavigate = router.navigate.bind(router);
router.navigate = function(page, params) {
    // Закрываем сокет чата задачи при уходе со страницы задачи
    if (page !== 'task-detail' && window.closeChatSocket) {
        window.closeChatSocket();
    }
    originalNavigate(page, params);
    // После рендера обновляем пилл
    setTimeout(() => {
        if (window.updatePill) {
            let activeTab = 'dashboard';
            if (['tasks', 'task-detail', 'task-create', 'task-edit'].includes(page)) activeTab = 'tasks';
            else if (page === 'users') activeTab = 'users';
            window.updatePill(activeTab);
        }
    }, 50);
};

document.addEventListener('DOMContentLoaded', initApp);

console.log('🚀 App loaded');