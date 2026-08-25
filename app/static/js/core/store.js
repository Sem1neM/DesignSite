// core/store.js
class Store {
    constructor() {
        this._data = {
            user: null,
            token: localStorage.getItem('access_token'),
            tasks: [],
            currentTask: null,
            images: [],
            isLoading: false,
            errors: []
        };
        console.log('📦 Store initialized, token:', this._data.token ? 'present' : 'none');
    }

    get(key) {
        return this._data[key];
    }

    set(key, value) {
        this._data[key] = value;
        this._notify(key, value);

        if (key === 'token') {
            if (value) {
                localStorage.setItem('access_token', value);
            } else {
                localStorage.removeItem('access_token');
            }
        }
    }

    update(data) {
        Object.keys(data).forEach(key => {
            this.set(key, data[key]);
        });
    }

    subscribe(key, callback) {
        if (!this._subscribers) this._subscribers = {};
        if (!this._subscribers[key]) {
            this._subscribers[key] = [];
        }
        this._subscribers[key].push(callback);
        callback(this._data[key]);
        return () => this._unsubscribe(key, callback);
    }

    _unsubscribe(key, callback) {
        if (this._subscribers && this._subscribers[key]) {
            this._subscribers[key] = this._subscribers[key].filter(cb => cb !== callback);
        }
    }

    _notify(key, value) {
        if (this._subscribers && this._subscribers[key]) {
            this._subscribers[key].forEach(callback => callback(value));
        }
    }

    setUser(user) {
        this.set('user', user);
    }

    setToken(token) {
        this.set('token', token);
    }

    setTasks(tasks) {
        this.set('tasks', tasks);
    }

    setCurrentTask(task) {
        this.set('currentTask', task);
    }

    setImages(images) {
        this.set('images', images);
    }

    setLoading(isLoading) {
        this.set('isLoading', isLoading);
    }

    clear() {
        console.log('🧹 Clearing store');
        this.set('token', null);
        this.set('user', null);
        this.set('tasks', []);
        this.set('currentTask', null);
        this.set('images', []);
    }

    isAuthenticated() {
        const result = !!this.get('token') && !!this.get('user');
        return result;
    }
}

export const store = new Store();