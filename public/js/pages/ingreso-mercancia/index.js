import { authService } from '../../services/AuthService.js'; 
import { inventarioService } from '../../services/InventarioService.js';
import { movimientoService } from '../../services/MovimientoService.js';
import { consultaInventarioService } from '../../services/ConsultaInventarioService.js';
import { accesorioInventarioService } from '../../services/AccesorioInventarioService.js';
import { EquipoInventario } from '../../models/EquipoInventario.js';
import { MODELOS_CORTOS, COLORES_IPHONE, CAPACIDADES_IPHONE, SEDES, SEDES_NOMBRES } from '../../config/constants.js';

import { initConnectionMonitor } from '../../utils/connectionMonitor.js';
import { initModoIngreso } from './ModoIngreso.js';
import { initModoSalida } from './ModoSalida.js';
import { initModoConsulta } from './ModoConsulta.js';
import { initNotasImpresion } from './NotasImpresion.js';
import { initModoAccesorios } from './ModoAccesorios.js';

document.addEventListener('DOMContentLoaded', () => {
    const appContent = document.getElementById('appContent');
    const toast = document.getElementById('toast');
    const overlay = document.getElementById('loadingOverlay');

    let inventarioCargado = false;
    let modoActual = 'ingreso'; // 'ingreso', 'salida', 'consulta', 'accesorios'
    let modoAccesoriosApi = null; // Referencia al controlador, para destruir si hace falta

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
        CAPACIDADES_IPHONE,
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

    // MODO CONSULTA — se inicializa aquí, no abre listeners hasta onAuthChange
    const consultaApi = initModoConsulta({
        consultaInventarioService,
        inventarioService,
        authService,
        showToast,
        setLoading,
        SEDES,
        SEDES_NOMBRES,
        onInventarioCargado: () => inventarioCargado
    });

    // ====== TOGGLE DE MODOS ======
    // Configuración declarativa de cada modo. Agregar un modo nuevo es
    // agregar una entrada a esta tabla y un botón en el HTML.
    const MODOS = {
        ingreso: {
            seccionId: 'seccionIngreso',
            btnId: 'btnModoIngreso',
            titulo: '📦 <span>Nota de Ingreso de Mercancía</span>',
            subtitulo: 'Ingresa los equipos fila por fila. Usa <kbd class="kbd-atajo">Tab</kbd> para avanzar y <kbd class="kbd-atajo">Enter</kbd> al final de fila para agregar otra.',
            mostrarResumen: true,
            onActivar: null
        },
        salida: {
            seccionId: 'seccionSalida',
            btnId: 'btnModoSalida',
            titulo: '📤 <span>Nota de Salida de Equipos</span>',
            subtitulo: 'Selecciona equipos disponibles para dar de baja o trasladar.',
            mostrarResumen: false,
            onActivar: () => actualizarListaSugerenciasSalida()
        },
        consulta: {
            seccionId: 'seccionConsulta',
            btnId: 'btnModoConsulta',
            titulo: '📋 <span>Consulta de Inventario</span>',
            subtitulo: 'Filtra, busca y edita el inventario consolidado de todas las sedes.',
            mostrarResumen: false,
            onActivar: () => consultaApi.recargar()
        },
        accesorios: {
            seccionId: 'seccionAccesorios',
            btnId: 'btnModoAccesorios',
            titulo: '🛡️ <span>Stock de Accesorios</span>',
            subtitulo: 'Gestiona el inventario de accesorios: forros, vidrios, cargadores y más. El stock se actualiza automáticamente con las ventas.',
            mostrarResumen: false,
            onActivar: () => {
                // Inicializar el modo de accesorios solo la primera vez que se activa
                if (!modoAccesoriosApi) {
                    modoAccesoriosApi = initModoAccesorios({ showToast, setLoading });
                }
            }
        }
    };

    function cambiarModo(modo) {
        if (!MODOS[modo]) {
            console.error(`[cambiarModo] Modo desconocido: ${modo}`);
            return;
        }
        modoActual = modo;
        const cfg = MODOS[modo];

        // Mostrar la sección del modo activo, ocultar las demás
        Object.values(MODOS).forEach(m => {
            const sec = document.getElementById(m.seccionId);
            if (sec) sec.classList.toggle('hidden', m.seccionId !== cfg.seccionId);
        });

        // Activar el botón del modo (clase activa) y desactivar los otros
        Object.values(MODOS).forEach(m => {
            const btn = document.getElementById(m.btnId);
            if (!btn) return;
            if (m.btnId === cfg.btnId) {
                btn.classList.add('btn-modo-activo', 'shadow');
                btn.classList.remove('opacity-50');
            } else {
                btn.classList.remove('btn-modo-activo', 'shadow');
                btn.classList.add('opacity-50');
            }
        });

        // Header
        const titulo = document.getElementById('tituloModo');
        const subtitulo = document.getElementById('subtituloModo');
        if (titulo) titulo.innerHTML = cfg.titulo;
        if (subtitulo) subtitulo.innerHTML = cfg.subtitulo;

        // Panel resumen (solo visible en Ingreso)
        const panelResumen = document.getElementById('panelResumen');
        if (panelResumen) panelResumen.classList.toggle('hidden', !cfg.mostrarResumen);

        // Hook específico del modo
        if (cfg.onActivar) {
            try { cfg.onActivar(); }
            catch (e) { console.error(`[cambiarModo] Error en onActivar de ${modo}:`, e); }
        }
    }

    document.getElementById('btnModoIngreso')?.addEventListener('click', () => cambiarModo('ingreso'));
    document.getElementById('btnModoSalida')?.addEventListener('click', () => cambiarModo('salida'));
    document.getElementById('btnModoConsulta')?.addEventListener('click', () => cambiarModo('consulta'));
    document.getElementById('btnModoAccesorios')?.addEventListener('click', () => cambiarModo('accesorios'));

    // ====== AUTENTICACIÓN Y CARGA INICIAL ======
    authService.onAuthChange(async (user) => {
        if (!user) {
            // FIX A4: cerrar los listeners de Firestore antes de ir a login.
            // Si el usuario re-loguea (logout + login con otro user, sin
            // recargar), la guarda `length === 0` previene reinicialización
            // pero los 6 listeners de la sesión anterior seguían activos.
            consultaInventarioService.destruir();
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
            // Inicializar el inventario de equipos (iPhones)
            await inventarioService.esperarListo();
            inventarioCargado = true;
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = '💾 Guardar Todo al Inventario';
            }
            console.log('✅ Inventario listo para validaciones en tiempo real');

            // Inicializar el inventario de accesorios en paralelo (no bloquea la UI)
            accesorioInventarioService.inicializar();
            console.log('🛡️ AccesorioInventarioService inicializado');

            if (modoActual === 'salida') {
                actualizarListaSugerenciasSalida();
            }

            // Abrir listeners multi-sede para la pestaña Consulta.
            // No bloqueante: la pestaña Consulta abre con cache local de
            // IndexedDB y se rellena progresivamente mientras los 6
            // snapshots van llegando.
            // FIX A4: defensa por si el chequeo de length === 0 no aplica
            // (p.ej. si se llamó destruir() entre checks). destruir()
            // resetea _unsubscribes a [], por lo que esta guarda es robusta.
            if (consultaInventarioService._unsubscribes.length === 0) {
                consultaInventarioService.inicializar();
                console.log('📡 ConsultaInventarioService inicializado (6 sedes en paralelo)');
            }
        } catch (error) {
            console.error('❌ Error al cargar inventario:', error);
            showToast('⚠️ Error al cargar inventario. Recarga la página.', 'error');
        }
    });

    // ====== MENÚ MOBILE Y LOGOUT ======
    const doLogout = async () => {
        // FIX A4: cerrar listeners de Firestore ANTES de logout
        consultaInventarioService.destruir();
        await authService.logout();
        window.location.href = 'login.html';
    };

    document.getElementById('btnLogout')?.addEventListener('click', doLogout);
    document.getElementById('btnLogoutMobile')?.addEventListener('click', doLogout);
});
