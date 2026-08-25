// components/Loader.js
export const Loader = {
    render(message = 'Загрузка...') {
        return `
            <div class="loader-container">
                <div class="loader"></div>
                <div>${message}</div>
            </div>
        `;
    },

    small() {
        return `<span class="loader-small"></span>`;
    },

    show(elementId, message = 'Загрузка...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = this.render(message);
        }
    },

    hide(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '';
        }
    }
};