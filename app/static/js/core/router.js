// core/router.js
import { store } from './store.js';

export class Router {
    constructor() {
        this.routes = {};
        this.currentPage = 'login';
        this.params = {};
    }

    register(page, config) {
        this.routes[page] = config;
        return this;
    }

    navigate(page, params = {}) {
        console.log('🔀 Navigating to:', page);

        const route = this.routes[page];
        if (!route) {
            console.warn('Page not found:', page);
            this.navigate('dashboard');
            return;
        }

        if (route.requiresAuth && !store.isAuthenticated()) {
            console.log('🔒 Auth required, redirecting to login');
            this.navigate('login');
            return;
        }

        if (route.redirectIfAuth && store.isAuthenticated()) {
            console.log('↩️ Redirecting to:', route.redirectIfAuth);
            this.navigate(route.redirectIfAuth);
            return;
        }

        this.currentPage = page;
        this.params = params;
        document.title = 'Design Task Manager — ' + (route.title || page);

        if (route.render) {
            console.log('📄 Rendering:', page);
            route.render(params);
        }

        window.scrollTo(0, 0);
    }

    getParam(key) {
        return this.params[key];
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

export const router = new Router();