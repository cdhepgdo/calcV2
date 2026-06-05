/**
 * connectionMonitor.js
 * Monitor de estado de conexión a Internet (online/offline).
 * Reutilizable en cualquier página del proyecto.
 */

/**
 * Inicializa el monitor de conexión.
 * @param {HTMLElement} badgeEl - El elemento contenedor del badge (#connectionBadge)
 * @param {Function} [onOnline] - Callback cuando se restaura la conexión
 * @param {Function} [onOffline] - Callback cuando se pierde la conexión
 */
export function initConnectionMonitor(badgeEl, onOnline, onOffline) {
    if (!badgeEl) return;

    const dot = badgeEl.querySelector('.connection-dot');
    const text = badgeEl.querySelector('.connection-text');
    let hideTimer = null;

    function setOnline() {
        badgeEl.classList.remove('hidden');

        dot?.classList.add('online');
        dot?.classList.remove('offline');
        text?.classList.add('online');
        text?.classList.remove('offline');
        if (text) text.textContent = 'En línea';

        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            badgeEl.classList.add('hidden');
        }, 3000);
    }

    function setOffline() {
        badgeEl.classList.remove('hidden');

        dot?.classList.add('offline');
        dot?.classList.remove('online');
        text?.classList.add('offline');
        text?.classList.remove('online');
        if (text) text.textContent = 'Sin conexión - Modo offline';

        clearTimeout(hideTimer); // nunca ocultar en modo offline
    }

    window.addEventListener('online', () => {
        console.log('🟢 Conexión restaurada');
        setOnline();
        if (typeof onOnline === 'function') onOnline();
    });

    window.addEventListener('offline', () => {
        console.log('🔴 Sin conexión - Modo offline activado');
        setOffline();
        if (typeof onOffline === 'function') onOffline();
    });

    // Estado inicial
    if (!navigator.onLine) {
        setOffline();
    }
}
