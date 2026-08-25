// components/Alert.js
export const Alert = {
    show(message, type) {
        type = type || 'info';
        const container = document.getElementById('alertContainer');
        if (!container) {
            console.log('Alert:', message, type);
            return;
        }
        const types = {
            success: 'alert-success',
            error: 'alert-error',
            info: 'alert-info',
            warning: 'alert-warning'
        };
        container.innerHTML = '<div class="alert ' + (types[type] || types.info) + '">' + message + '</div>';
        clearTimeout(window._alertTimeout);
        window._alertTimeout = setTimeout(function() {
            if (container) container.innerHTML = '';
        }, 5000);
    }
};