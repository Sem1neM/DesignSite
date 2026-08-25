// services/images.js
import { api } from '../core/api.js';
import { store } from '../core/store.js';

export const imagesService = {
    async upload(taskId, file) {
        const formData = new FormData();
        formData.append('file', file);

        const token = store.get('token');
        const response = await fetch(`${api.baseURL}/images/upload/${taskId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Ошибка загрузки');
        }

        return await response.json();
    },

    async getByTask(taskId) {
        try {
            const response = await api.get(`/images/task/${taskId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching images for task ${taskId}:`, error);
            throw error;
        }
    },

    async delete(imageId) {
        try {
            await api.delete(`/images/${imageId}`);
        } catch (error) {
            console.error(`Error deleting image ${imageId}:`, error);
            throw error;
        }
    },

    getImageUrl(imageId, token) {
        return `${api.baseURL}/images/${imageId}?token=${encodeURIComponent(token)}`;
    },

    async uploadMultiple(taskId, files, onProgress) {
        const results = {
            uploaded: [],
            failed: []
        };

        for (let i = 0; i < files.length; i++) {
            try {
                const file = files[i];
                const result = await this.upload(taskId, file);
                results.uploaded.push({ ...result, file });
                if (onProgress) {
                    onProgress(i + 1, files.length);
                }
            } catch (error) {
                results.failed.push({ file: files[i], error: error.message });
            }
        }

        return results;
    },

    validateFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'
        ];

        if (file.size > maxSize) {
            return { valid: false, error: `Файл "${file.name}" слишком большой (${(file.size / (1024 * 1024)).toFixed(1)} МБ). Максимум: 50 МБ` };
        }

        if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
            return { valid: false, error: `Файл "${file.name}" имеет неподдерживаемый формат` };
        }

        return { valid: true };
    },

    formatSize(size) {
        if (size < 1024) return size + ' B';
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
        if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
        return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
};