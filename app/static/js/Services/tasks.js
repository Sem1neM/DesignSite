// services/tasks.js
import { api } from '../core/api.js';
import { store } from '../core/store.js';

export const tasksService = {
    async create(taskData) {
        try {
            const response = await api.post('/tasks', taskData);
            return response.data;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    },

    async getAll(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const endpoint = `/tasks${query ? '?' + query : ''}`;
            const response = await api.get(endpoint);
            return response.data;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    },

    async getById(taskId) {
        try {
            const response = await api.get(`/tasks/${taskId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching task ${taskId}:`, error);
            throw error;
        }
    },

    async update(taskId, taskData) {
        try {
            const response = await api.patch(`/tasks/${taskId}`, taskData);
            return response.data;
        } catch (error) {
            console.error(`Error updating task ${taskId}:`, error);
            throw error;
        }
    },

    async delete(taskId) {
        try {
            await api.delete(`/tasks/${taskId}`);
        } catch (error) {
            console.error(`Error deleting task ${taskId}:`, error);
            throw error;
        }
    },

    async updateStatus(taskId, status) {
        try {
            const response = await api.post(`/tasks/${taskId}/status?status=${status}`);
            return response.data;
        } catch (error) {
            console.error(`Error updating status for task ${taskId}:`, error);
            throw error;
        }
    },

    async assignDesigner(taskId, designerId) {
        try {
            const response = await api.post(`/tasks/${taskId}/assign?designer_id=${designerId}`);
            return response.data;
        } catch (error) {
            console.error(`Error assigning designer ${designerId} to task ${taskId}:`, error);
            throw error;
        }
    },

    getStatusOptions() {
        return [
            { value: 'NEW', label: '🆕 Новая' },
            { value: 'CLARIFICATION', label: '💬 Уточнение' },
            { value: 'READY_FOR_REVIEW', label: '✅ Готово к проверке' },
            { value: 'IN_PROGRESS', label: '🔄 В работе' },
            { value: 'COMPLETED', label: '✔️ Завершено' },
            { value: 'REJECTED', label: '❌ Отклонено' }
        ];
    },

    getStatusLabel(status) {
        const options = this.getStatusOptions();
        const found = options.find(opt => opt.value === status);
        return found ? found.label : status;
    },

    getStats(tasks) {
        return {
            total: tasks.length,
            new: tasks.filter(t => t.status === 'NEW').length,
            in_progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            completed: tasks.filter(t => t.status === 'COMPLETED').length,
            clarification: tasks.filter(t => t.status === 'CLARIFICATION').length,
            ready_for_review: tasks.filter(t => t.status === 'READY_FOR_REVIEW').length,
            rejected: tasks.filter(t => t.status === 'REJECTED').length
        };
    }
};