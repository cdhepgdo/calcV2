import { authService } from '../../services/AuthService.js';
import { inventarioService } from '../../services/InventarioService.js';
import { movimientoService } from '../../services/MovimientoService.js';
import { EquipoInventario } from '../../models/EquipoInventario.js';
import { MODELOS_CORTOS, COLORES_IPHONE, CAPACIDADES_IPHONE } from '../../config/constants.js';

import { initConnectionMonitor } from '../../utils/connectionMonitor.js';
import { initModoIngreso } from './ModoIngreso.js';
import { initModoSalida } from './ModoSalida.js';
import { initNotasImpresion } from './NotasImpresion.js';

document.addEventListener('DOMContentLoaded', () => {
    const appContent = document.getElementById('appContent');
    const toast = document.getElementById('toast');
    const overlay = document.getElementById('loadingOverlay');

    let inventarioCargado = false;
    let modoActual = 'ingreso'; // 'ingreso' o 'salida'

    function showToast(msg, type = 'success') {
        toast.textContent = msg;
        toast.className = `show ${type}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function setLoading(isLoading) {
        overlay.classList.toggle('visible', isLoading);
    }

    // ====== MONITOR DE CONEXIÓN ======
    const connectionBadge = document.getElementById('connectionBadge');
    initConnectionMonitor(
        connectionBadge,
        () => showToast('✅ Conexión restaurada. Sincronizando...', 'success'),
        () => showToast('⚠️ Sin conexión. Trabajando en modo offline', 'error')
    );

    // ====== INICIALIZACIÓN DE MODOS ======

    // MODO INGRESO
    const { recolectarEquipos } = initModoIngreso({
        inventarioService,
        movimientoService,
        EquipoInventario,
        MODELOS_CORTOS,
        COLORES_IPHONE,
        showToast,
        setLoading,
        onInventarioCargado: () => inventarioCargado
    });

    // MODO SALIDA
    const { actualizarListaSugerenciasSalida, getEquiposSeleccionados } = initModoSalida({
        inventarioService,
        movimientoService,
        showToast,
        setLoading,
        onInventarioCargado: () => inventarioCargado
    });

    // IMPRESIÓN
    initNotasImpresion({
        getModoActual: () => modoActual,
        getEquiposSeleccionadosSalida: getEquiposSeleccionados,
        recolectarEquiposIngreso: recolectarEquipos,
        inventarioService,
        showToast
    });

    // ====== TOGGLE DE MODOS ======
    function cambiarModo(modo) {
        modoActual = modo;
        const seccionIngreso = document.getElementById('seccionIngreso');
        const seccionSalida = document.getElementById('seccionSalida');
        const btnIngreso = document.getElementById('btnModoIngreso');
        const btnSalida = document.getElementById('btnModoSalida');
        const titulo = document.getElementById('tituloModo');
        const subtitulo = document.getElementById('subtituloModo');
        const panelResumen = document.getElementById('panelResumen');

        if (modo === 'ingreso') {
            seccionIngreso.classList.remove('hidden');
            seccionSalida.classList.add('hidden');
            btnIngreso.classList.add('btn-modo-activo', 'shadow');
            btnIngreso.classList.remove('opacity-50');
            btnSalida.classList.remove('btn-modo-activo', 'shadow');
            btnSalida.classList.add('opacity-50');
            titulo.innerHTML = '📦 <span>Nota de Ingreso de Mercancía</span>';
            subtitulo.innerHTML = 'Ingresa los equipos fila por fila. Usa <kbd class="kbd-atajo">Tab</kbd> para avanzar y <kbd class="kbd-atajo">Enter</kbd> al final de fila para agregar otra.';

            if (panelResumen) panelResumen.classList.remove('hidden');
        } else {
            seccionIngreso.classList.add('hidden');
            seccionSalida.classList.remove('hidden');
            btnSalida.classList.add('btn-modo-activo', 'shadow');
            btnSalida.classList.remove('opacity-50');
            btnIngreso.classList.remove('btn-modo-activo', 'shadow');
            btnIngreso.classList.add('opacity-50');
            titulo.innerHTML = '📤 <span>Nota de Salida de Equipos</span>';
            subtitulo.textContent = 'Selecciona equipos disponibles para dar de baja o trasladar.';

            if (panelResumen) panelResumen.classList.add('hidden');

            actualizarListaSugerenciasSalida();
        }
    }

    document.getElementById('btnModoIngreso')?.addEventListener('click', () => cambiarModo('ingreso'));
    document.getElementById('btnModoSalida')?.addEventListener('click', () => cambiarModo('salida'));

    // ====== AUTENTICACIÓN Y CARGA INICIAL ======
    authService.onAuthChange(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        appContent.style.display = 'block';
        const sedeId = localStorage.getItem('usuario_sede_id') || 'sede_1';
        document.getElementById('badgeSede').textContent = `📍 ${sedeId}`;
        document.getElementById('fechaHoy').textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

        const btnGuardar = document.getElementById('btnGuardarLote');
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.textContent = '⏳ Cargando inventario...';
        }

        try {
            await inventarioService.esperarListo();
            inventarioCargado = true;
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = '💾 Guardar Todo al Inventario';
            }
            console.log('✅ Inventario listo para validaciones en tiempo real');

            if (modoActual === 'salida') {
                actualizarListaSugerenciasSalida();
            }
        } catch (error) {
            console.error('❌ Error al cargar inventario:', error);
            showToast('⚠️ Error al cargar inventario. Recarga la página.', 'error');
        }
    });

    // ====== MENÚ MOBILE Y LOGOUT ======
    const doLogout = async () => {
        await authService.logout();
        window.location.href = 'login.html';
    };

    document.getElementById('btnLogout')?.addEventListener('click', doLogout);
    document.getElementById('btnLogoutMobile')?.addEventListener('click', doLogout);

    const menuToggle = document.getElementById('menuToggle');
    const floatingMenu = document.getElementById('floatingMenu');
    if (menuToggle && floatingMenu) {
        menuToggle.addEventListener('click', () => {
            floatingMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !floatingMenu.contains(e.target)) {
                floatingMenu.classList.add('hidden');
            }
        });
    }
});
