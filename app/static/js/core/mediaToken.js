// core/mediaToken.js
// Короткоживущий токен для мест, где нельзя поставить заголовок
// Authorization (<img src>, window.open, WebSocket) — используется
// вместо основного access-токена, чтобы он не оседал в URL/логах/истории
// браузера. См. app/core/security.py::create_media_token.
import { store } from './store.js';

let cached = null; // { token, expiresAt }

export async function getMediaToken() {
    if (cached && Date.now() < cached.expiresAt) {
        return cached.token;
    }

    const token = store.get('token');
    const res = await fetch('/api/v1/images/media-token', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
        throw new Error('Не удалось получить доступ к файлам');
    }
    const data = await res.json();
    // Обновляем немного заранее (30с запаса), чтобы не словить истёкший
    // токен прямо в момент использования.
    cached = {
        token: data.token,
        expiresAt: Date.now() + Math.max(data.expires_in_minutes * 60 * 1000 - 30000, 0)
    };
    return cached.token;
}

export function clearMediaToken() {
    cached = null;
}
