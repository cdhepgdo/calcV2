/**
 * Servicio de Almacenamiento — Arquitectura Local-First
 *
 * ¿Cómo funciona ahora?
 * ─────────────────────
 * 1. Al arrancar la app, onSnapshot se conecta a Firebase UNA SOLA VEZ.
 * 2. Firebase llena el caché en memoria (_cacheVentas, _cacheMovimientos)
 *    leyendo primero de IndexedDB local (sin red) y luego sincronizando con el servidor.
 * 3. obtenerVentas() y obtenerMovimientos() devuelven el caché INSTANTÁNEAMENTE,
 *    igual que localStorage. Sin esperar red.
 * 4. Las escrituras siguen siendo fire-and-forget: la UI no espera a Firebase.
 * 5. Cuando Firebase detecta cualquier cambio (local o de otro dispositivo),
 *    actualiza el caché y avisa a la UI automáticamente.
 *
 * Resultado: la app se siente tan rápida como localStorage,
 * pero con toda la potencia de Firebase sincronizando en background.
 */

import { db } from '../config/firebase-config.js';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

import { Venta } from '../models/Venta.js';
import { Movimiento } from '../models/Movimiento.js';
import { Caja } from '../models/Caja.js';

class StorageService {
    constructor() {
        // ── CACHÉ EN MEMORIA ──────────────────────────────────────────
        // Estos dos arrays son la fuente de verdad LOCAL de la app.
        // onSnapshot los mantiene sincronizados automáticamente con Firebase.
        // obtenerVentas() y obtenerMovimientos() leen de aquí — sin red.
        this._cacheVentas = [];
        this._cacheMovimientos = [];

        // Flags para saber si onSnapshot ya cargó los datos por primera vez
        this._ventasListas = false;
        this._movimientosListos = false;

        // ── SISTEMA DE NOTIFICACIONES ─────────────────────────────────
        // Lista de funciones que se llaman automáticamente cuando
        // el caché cambia. La UI se suscribe aquí para actualizarse sola.
        // Ejemplo de uso en main.js:
        //   storageService.onCambio(() => this.actualizarUI());
        this._listeners = [];

        // ── IDs ELIMINADOS OFFLINE ────────────────────────────────────
        // CONSERVADO del código original — sigue siendo útil.
        // onSnapshot puede tardar un instante en reflejar eliminaciones.
        // Este Set las filtra del caché de inmediato para que no reaparezcan.
        this._deletedVentaIds = new Set();

        // Referencias para poder cancelar los listeners si el usuario cierra sesión
        this._unsubscribeVentas = null;
        this._unsubscribeMovimientos = null;
    }

    // ═══════════════════════════════════════════════════════════════════
    // INICIALIZACIÓN
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Obtiene el path base para la sede actual basado en la sesión.
     * Si no hay sesión (o es la primera vez), usa "sede_1" por defecto para no romper.
     */
    _getBasePath() {
        const sedeId = localStorage.getItem('usuario_sede_id') || 'sede_1';
        return `sedes/${sedeId}`;
    }

    /**
     * Arranca los listeners de onSnapshot.
     * ¡IMPORTANTE! Llamar esto UNA SOLA VEZ al iniciar la app.
     *
     * onSnapshot funciona así:
     * - Primera llamada: lee de IndexedDB local (sin red, instantáneo)
     * - Luego: escucha cambios del servidor y actualiza el caché automáticamente
     * - Si no hay internet: sigue funcionando con el caché local
     * - Cuando vuelve internet: sincroniza los cambios pendientes solo
     *
     * Uso en main.js → método init():
     *   storageService.inicializar();
     *   storageService.onCambio(() => this.actualizarUI());
     */
    inicializar() {
        console.log('🚀 Inicializando StorageService con caché en memoria...');
        this._escucharVentas();
        this._escucharMovimientos();
    }

    /**
     * Activa el listener de ventas.
     * Cada vez que hay un cambio en Firestore (local o remoto),
     * este bloque se ejecuta automáticamente y actualiza _cacheVentas.
     */
    _escucharVentas() {
        // onSnapshot devuelve una función para cancelar el listener
        this._unsubscribeVentas = onSnapshot(
            collection(db, `${this._getBasePath()}/ventas`),

            // ── Callback de ÉXITO ─────────────────────────────────────
            // Firebase llama esto automáticamente cuando:
            //   • La app abre por primera vez (carga desde IndexedDB)
            //   • Se guarda una venta nueva
            //   • Se edita o elimina una venta
            //   • Otro dispositivo sincroniza un cambio
            (snapshot) => {
                this._cacheVentas = snapshot.docs
                    // Filtrar las que fueron eliminadas offline
                    // (pueden persistir en IndexedDB unos instantes)
                    .filter(docSnap => !this._deletedVentaIds.has(docSnap.id))
                    .map(docSnap => Venta.fromJSON(docSnap.data()));

                this._ventasListas = true;
                console.log('✅ Caché ventas:', this._cacheVentas.length, 'registros');

                // Avisar a la UI para que se re-renderice
                this._notificarCambio();
            },

            // ── Callback de ERROR ─────────────────────────────────────
            (error) => {
                console.error('❌ Error en listener de ventas:', error);
            }
        );
    }

    /**
     * Activa el listener de movimientos.
     * Misma lógica que _escucharVentas.
     */
    _escucharMovimientos() {
        this._unsubscribeMovimientos = onSnapshot(
            collection(db, `${this._getBasePath()}/movimientos`),
            (snapshot) => {
                this._cacheMovimientos = snapshot.docs
                    .map(docSnap => Movimiento.fromJSON(docSnap.data()));

                this._movimientosListos = true;
                console.log('✅ Caché movimientos:', this._cacheMovimientos.length, 'registros');

                this._notificarCambio();
            },
            (error) => {
                console.error('❌ Error en listener de movimientos:', error);
            }
        );
    }

    /**
     * Suscribe una función para que se llame cuando el caché cambie.
     * La UI usa esto para actualizarse automáticamente.
     *
     * Ejemplo en main.js:
     *   storageService.onCambio(() => this.actualizarUI());
     */
    onCambio(fn) {
        this._listeners.push(fn);
    }

    /**
     * Ejecuta todas las funciones suscritas.
     * Se llama internamente cada vez que onSnapshot actualiza el caché.
     */
    _notificarCambio() {
        this._listeners.forEach(fn => fn());
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILIDADES INTERNAS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Sanitiza un objeto para Firestore: reemplaza undefined por null.
     * Firestore rechaza silenciosamente los campos con valor undefined.
     * CONSERVADO del código original — funciona perfectamente.
     */
    _sanitize(obj) {
        if (obj === undefined) return null;
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this._sanitize(item));
        const clean = {};
        for (const [key, value] of Object.entries(obj)) {
            clean[key] = this._sanitize(value);
        }
        return clean;
    }

    // ═══════════════════════════════════════════════════════════════════
    // VENTAS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Devuelve las ventas del caché en memoria.
     *
     * AHORA ES SÍNCRONO — ya no devuelve una Promise.
     * Lee del array local igual que localStorage.
     * onSnapshot mantiene ese array actualizado en background.
     *
     * Antes:  const ventas = await storageService.obtenerVentas();
     * Ahora:  const ventas = storageService.obtenerVentas();  ← instantáneo
     */
    obtenerVentas() {
        return this._cacheVentas;
    }

    /**
     * Guarda una nueva venta en Firestore.
     *
     * Fire-and-forget — CONSERVADO del código original.
     * No esperamos respuesta del servidor. La venta se guarda en
     * IndexedDB local al instante y se sube al servidor en background.
     * onSnapshot detecta el cambio y actualiza el caché automáticamente.
     */
    async guardarVenta(venta) {
        try {
            const data = this._sanitize(venta.toJSON());

            // Disparar escritura sin esperar (fire-and-forget)
            // Firebase guarda en IndexedDB local inmediatamente
            // y sincroniza con el servidor cuando pueda
            setDoc(doc(db, `${this._getBasePath()}/ventas`, venta.id), data)
                .then(() => console.log('✅ Venta sincronizada con servidor'))
                .catch(err => console.warn('⚠️ Venta en cola offline, se sincronizará:', err.message));

            return { exito: true };
        } catch (error) {
            console.error('❌ Error al guardar venta:', error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Actualiza una venta existente en Firestore.
     * Fire-and-forget — CONSERVADO del código original.
     */
    async actualizarVenta(ventaActualizada) {
        try {
            const data = this._sanitize(ventaActualizada.toJSON());

            setDoc(doc(db, `${this._getBasePath()}/ventas`, ventaActualizada.id), data)
                .then(() => console.log('✅ Venta actualizada en servidor'))
                .catch(err => console.warn('⚠️ Actualización en cola offline:', err.message));

            return { exito: true };
        } catch (error) {
            console.error('❌ Error al actualizar venta:', error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Elimina una venta de Firestore.
     *
     * MEJORA sobre el original:
     * Además del fire-and-forget, ahora también actualiza el caché
     * local directamente para que la venta desaparezca de la UI
     * ANTES de que onSnapshot confirme la eliminación.
     */
    async eliminarVenta(ventaId) {
        try {
            // 1. Registrar como eliminada para filtrarla en onSnapshot
            this._deletedVentaIds.add(ventaId);

            // 2. Quitar del caché local inmediatamente
            //    La UI verá el cambio al instante, sin esperar red
            this._cacheVentas = this._cacheVentas.filter(v => v.id !== ventaId);
            this._notificarCambio();

            // 3. Disparar eliminación en Firebase sin esperar (fire-and-forget)
            deleteDoc(doc(db, `${this._getBasePath()}/ventas`, ventaId))
                .then(() => {
                    console.log('✅ Venta eliminada del servidor');
                    // Limpiar del Set local cuando el servidor confirma
                    this._deletedVentaIds.delete(ventaId);
                })
                .catch(err => console.warn('⚠️ Eliminación en cola offline:', err.message));

            return { exito: true };
        } catch (error) {
            console.error('❌ Error al eliminar venta:', error);
            return { exito: false, error: error.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // MOVIMIENTOS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Devuelve los movimientos del caché en memoria.
     * AHORA ES SÍNCRONO — misma lógica que obtenerVentas().
     */
    obtenerMovimientos() {
        return this._cacheMovimientos;
    }

    /**
     * Guarda un nuevo movimiento en Firestore.
     * Fire-and-forget — CONSERVADO del código original.
     */
    async guardarMovimiento(movimiento) {
        try {
            const data = this._sanitize(movimiento.toJSON());

            setDoc(doc(db, `${this._getBasePath()}/movimientos`, movimiento.id), data)
                .then(() => console.log('✅ Movimiento sincronizado'))
                .catch(err => console.warn('⚠️ Movimiento en cola offline:', err.message));

            return { exito: true };
        } catch (error) {
            console.error('❌ Error al guardar movimiento:', error);
            return { exito: false, error: error.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CAJA
    // Estos métodos siguen siendo async porque solo se llaman UNA VEZ
    // al arrancar la app, no durante operaciones frecuentes.
    // El pequeño delay inicial es aceptable.
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Obtiene la caja inicial desde Firestore.
     * Se llama solo una vez al cargar la app.
     */
    async obtenerCajaInicial() {
        try {
            const docSnap = await getDoc(doc(db, `${this._getBasePath()}/config`, "cajaInicial"));
            if (docSnap.exists()) {
                return Caja.fromJSON(docSnap.data());
            }
            return new Caja(0);
        } catch (error) {
            console.error('❌ Error al obtener caja inicial:', error);
            return new Caja(0);
        }
    }

    /**
     * Guarda la caja inicial en Firestore.
     * Fire-and-forget.
     */
    async guardarCajaInicial(caja) {
        try {
            const data = this._sanitize(caja.toJSON());
            setDoc(doc(db, `${this._getBasePath()}/config`, "cajaInicial"), data)
                .catch(err => console.warn('⚠️ Caja inicial en cola offline:', err.message));
            return { exito: true };
        } catch (error) {
            console.error('❌ Error al guardar caja inicial:', error);
            return { exito: false, error: error.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CIERRE DE CAJA
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Guarda el cierre de caja del día en Firestore.
     * Fire-and-forget.
     */
    async guardarCierreCaja(monto) {
        try {
            const datosCierre = {
                monto: monto,
                fecha: new Date().toLocaleDateString('es-ES')
            };
            setDoc(doc(db, `${this._getBasePath()}/config`, "cierreCaja"), datosCierre)
                .catch(err => console.warn('⚠️ Cierre de caja en cola offline:', err.message));
            return { exito: true };
        } catch (error) {
            console.error('❌ Error al guardar cierre de caja:', error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Obtiene el último cierre de caja desde Firestore.
     * Se llama solo al arrancar la app.
     */
    async obtenerCierreCaja() {
        try {
            const docSnap = await getDoc(doc(db, `${this._getBasePath()}/config`, "cierreCaja"));
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error('❌ Error al obtener cierre de caja:', error);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILIDADES
    // CONSERVADAS del código original
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Limpia todos los datos (usar con precaución).
     * Ahora usa el caché en vez de ir a leer Firestore primero.
     */
    async limpiarTodo() {
        try {
            for (const venta of this._cacheVentas) {
                await deleteDoc(doc(db, `${this._getBasePath()}/ventas`, venta.id));
            }
            for (const mov of this._cacheMovimientos) {
                await deleteDoc(doc(db, `${this._getBasePath()}/movimientos`, mov.id));
            }
            await deleteDoc(doc(db, `${this._getBasePath()}/config`, "cajaInicial"));
            await deleteDoc(doc(db, `${this._getBasePath()}/config`, "cierreCaja"));
            return { exito: true };
        } catch (error) {
            console.error('❌ Error al limpiar storage:', error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Exporta todos los datos como JSON.
     * Ahora lee del caché en memoria, sin ir a la red.
     */
    async exportarDatos() {
        return {
            ventas: this.obtenerVentas().map(v => v.toJSON()),
            movimientos: this.obtenerMovimientos().map(m => m.toJSON()),
            cajaInicial: (await this.obtenerCajaInicial()).toJSON(),
            fechaExportacion: new Date().toISOString()
        };
    }

    /**
     * Importa datos desde un JSON a Firestore.
     * CONSERVADO del código original.
     */
    async importarDatos(datos) {
        try {
            if (datos.ventas) {
                for (const ventaJSON of datos.ventas) {
                    const venta = Venta.fromJSON(ventaJSON);
                    await setDoc(doc(db, `${this._getBasePath()}/ventas`, venta.id), venta.toJSON());
                }
            }
            if (datos.movimientos) {
                for (const movJSON of datos.movimientos) {
                    const mov = Movimiento.fromJSON(movJSON);
                    await setDoc(doc(db, `${this._getBasePath()}/movimientos`, mov.id), mov.toJSON());
                }
            }
            if (datos.cajaInicial) {
                await setDoc(doc(db, `${this._getBasePath()}/config`, "cajaInicial"), datos.cajaInicial);
            }
            return { exito: true };
        } catch (error) {
            console.error('❌ Error al importar datos:', error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Cancela los listeners de onSnapshot y limpia el estado.
     * Llamar esto cuando el usuario cierra sesión.
     *
     * Ejemplo:
     *   storageService.destruir();
     */
    destruir() {
        if (this._unsubscribeVentas) this._unsubscribeVentas();
        if (this._unsubscribeMovimientos) this._unsubscribeMovimientos();
        this._listeners = [];
        this._cacheVentas = [];
        this._cacheMovimientos = [];
        console.log('🔴 StorageService desconectado');
    }
}

// Exportar instancia única (Singleton)
// El mismo objeto se reutiliza en toda la app
export const storageService = new StorageService();
