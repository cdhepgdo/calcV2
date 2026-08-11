import { db } from '../config/firebase-config.js';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    writeBatch,
    onSnapshot,
    query,
    where,
    increment
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { AccesorioInventario } from '../models/AccesorioInventario.js';

// ───────────────────────────────────────────────────────────────────────────────
// CLAVE DE INDEXEDDB para persistencia offline
// ───────────────────────────────────────────────────────────────────────────────
const IDB_STORE = 'calcv2_accesorios_cache';

/**
 * Guarda el array de accesorios en IndexedDB (localStorage por simplicidad).
 * Para la escala actual de la app (< 1000 variantes por sede) localStorage
 * es suficiente y evita la complejidad de abrir una IDB por separado.
 */
function _guardarEnLocal(sedeId, items) {
    try {
        const key = `${IDB_STORE}_${sedeId}`;
        localStorage.setItem(key, JSON.stringify(items.map(a => a.toJSON())));
    } catch (e) {
        console.warn('⚠️ [AccesorioInventarioService] No se pudo persistir en localStorage:', e);
    }
}

function _cargarDesdeLocal(sedeId) {
    try {
        const key = `${IDB_STORE}_${sedeId}`;
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        return JSON.parse(raw).map(j => AccesorioInventario.fromJSON(j));
    } catch (e) {
        console.warn('⚠️ [AccesorioInventarioService] No se pudo leer caché local:', e);
        return [];
    }
}

// ───────────────────────────────────────────────────────────────────────────────
// TIMEOUT HELPER para batch.commit() offline (evita cuelgues)
// ───────────────────────────────────────────────────────────────────────────────
function _commitConTimeout(batch, ms = 3500) {
    const commitPromise = batch.commit();
    const timeoutPromise = new Promise(resolve =>
        setTimeout(() => resolve({ __offlineTimeout: true }), ms)
    );
    return Promise.race([commitPromise, timeoutPromise]);
}

// ───────────────────────────────────────────────────────────────────────────────
// SERVICIO SINGLETON
// ───────────────────────────────────────────────────────────────────────────────
class AccesorioInventarioService {
    constructor() {
        this._cache = [];            // Array<AccesorioInventario>
        this._listeners = [];        // Callbacks UI
        this._unsubscribe = null;
        this._listo = false;
        this._readyPromise = null;
        this._readyResolve = null;
    }

    _getSedeId() {
        return localStorage.getItem('usuario_sede_id') || 'sede_1';
    }

    _getBasePath() {
        return `sedes/${this._getSedeId()}`;
    }

    // ── Ciclo de vida ─────────────────────────────────────────────────────────

    inicializar() {
        if (this._unsubscribe) return this._readyPromise;

        this._readyPromise = new Promise(resolve => {
            this._readyResolve = resolve;
        });

        // Precarga offline desde localStorage para UI instantánea
        const cacheLocal = _cargarDesdeLocal(this._getSedeId());
        if (cacheLocal.length > 0) {
            this._cache = cacheLocal;
            this._notificar();
        }

        const q = query(
            collection(db, `${this._getBasePath()}/inventario`),
            where('tipoItem', '==', 'accesorio')
        );

        this._unsubscribe = onSnapshot(q, snapshot => {
            this._cache = snapshot.docs.map(d =>
                AccesorioInventario.fromJSON({ id: d.id, ...d.data() })
            );
            _guardarEnLocal(this._getSedeId(), this._cache);

            const wasReady = this._listo;
            this._listo = true;

            if (!wasReady && this._readyResolve) {
                this._readyResolve();
            }
            this._notificar();
            console.log(`✅ [AccesorioInventarioService] ${this._cache.length} variantes sincronizadas`);
        }, err => {
            console.error('❌ [AccesorioInventarioService] Error en onSnapshot:', err);
            // Aunque falle el listener, resolver la promesa con el caché local
            if (!this._listo && this._readyResolve) {
                this._listo = true;
                this._readyResolve();
            }
        });

        return this._readyPromise;
    }

    async esperarListo() {
        if (this._listo) return true;
        if (!this._readyPromise) this.inicializar();
        await this._readyPromise;
        return true;
    }

    destruir() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        this._listo = false;
        this._readyPromise = null;
    }

    onCambio(fn) {
        this._listeners.push(fn);
        // Devolver función de unsub
        return () => {
            this._listeners = this._listeners.filter(l => l !== fn);
        };
    }

    _notificar() {
        this._listeners.forEach(fn => fn(this._cache));
    }

    // ── Lecturas ──────────────────────────────────────────────────────────────

    obtenerTodos() {
        return [...this._cache];
    }

    /**
     * Busca en el caché la variante exacta por nombre + modelo + tipoVariacion + color.
     * Comparación insensible a mayúsculas y espacios (via AccesorioInventario.generarClave).
     */
    buscarVariante(nombre, modelo, tipoVariacion, color) {
        const clave = AccesorioInventario.generarClave(nombre, modelo, tipoVariacion, color);
        return this._cache.find(a => a.clave === clave) || null;
    }

    buscarPorId(id) {
        return this._cache.find(a => a.id === id) || null;
    }

    // ── Escrituras (CRUD) ─────────────────────────────────────────────────────

    /**
     * Crea o actualiza un accesorio en Firestore.
     * Incluye timeout para no bloquear la UI offline.
     */
    async guardarAccesorio(accesorio) {
        try {
            const instancia = accesorio instanceof AccesorioInventario
                ? accesorio
                : AccesorioInventario.fromJSON(accesorio);

            const { valido, errores } = instancia.validar();
            if (!valido) {
                return { exito: false, error: errores.join(', ') };
            }

            instancia.fechaActualizacion = new Date().toISOString();

            const docRef = doc(db, `${this._getBasePath()}/inventario`, instancia.id);
            const data = this._limpiar(instancia.toJSON());

            const batch = writeBatch(db);
            batch.set(docRef, data, { merge: true });

            const resultado = await _commitConTimeout(batch);

            if (resultado?.__offlineTimeout) {
                console.warn('⏳ [AccesorioInventarioService] Guardado en cola offline');
                return { exito: true, offline: true };
            }

            console.log(`✅ [AccesorioInventarioService] Accesorio guardado: ${instancia.id}`);
            return { exito: true };
        } catch (error) {
            console.error('❌ [AccesorioInventarioService] Error al guardar:', error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Elimina físicamente un accesorio del inventario.
     */
    async eliminarAccesorio(id) {
        if (!id) return { exito: false, error: 'ID inválido' };
        try {
            const docRef = doc(db, `${this._getBasePath()}/inventario`, id);
            const batch = writeBatch(db);
            batch.delete(docRef);
            const resultado = await _commitConTimeout(batch);

            if (resultado?.__offlineTimeout) {
                console.warn('⏳ [AccesorioInventarioService] Eliminación en cola offline');
                return { exito: true, offline: true };
            }
            console.log(`✅ [AccesorioInventarioService] Accesorio eliminado: ${id}`);
            return { exito: true };
        } catch (error) {
            console.error('❌ [AccesorioInventarioService] Error al eliminar:', error);
            return { exito: false, error: error.message };
        }
    }

    // ── Integración con Ventas/Movimientos (Batch compartido) ─────────────────

    /**
     * Agrega operaciones de ajuste de stock a un writeBatch EXTERNO.
     *
     * Llamado desde InventarioService.commitVentaConInventario (y su inverso
     * commitEliminarVentaConInventario) para que el descuento de stock de
     * accesorios sea ATÓMICO con la venta del iPhone.
     *
     * @param {WriteBatch} batch            - El batch externo de Firestore.
     * @param {string}     nombre           - Tipo de accesorio (ej. 'Forro').
     * @param {string}     modelo           - Modelo iPhone (ej. 'iPhone 13').
     * @param {string}     tipoVariacion    - Subtipo (ej. 'Silicona').
     * @param {string|null} color           - Color o null.
     * @param {number}     cantidadDelta    - Positivo = sumar, Negativo = restar.
     *
     * Si el accesorio no existe en el inventario (solo en ventas):
     *   → Se auto-crea con cantidad = cantidadDelta (puede quedar negativo).
     *   → Esto es intencional: actúa como alerta de auditoría.
     */
    ajustarStockBatch(batch, nombre, modelo, tipoVariacion, color, cantidadDelta) {
        if (!batch || !nombre || cantidadDelta === 0) return;

        const sedeId = this._getSedeId();
        
        let variante = null;
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (modelo && (modelo.startsWith('acc-') || UUID_REGEX.test(modelo))) {
            variante = this.buscarPorId(modelo);
        }
        if (!variante) {
            variante = this.buscarVariante(nombre, modelo, tipoVariacion, color);
        }

        if (variante) {
            // Ya existe → incrementar/decrementar con FieldValue.increment
            const docRef = doc(db, `sedes/${sedeId}/inventario`, variante.id);
            batch.update(docRef, {
                cantidad: increment(cantidadDelta),
                fechaActualizacion: new Date().toISOString()
            });
        } else {
            // No existe → auto-crear con cantidad = delta (podría ser negativo)
            const nueva = new AccesorioInventario({
                nombre,
                modelo: modelo || 'Genérico',
                tipoVariacion: tipoVariacion || '',
                color: color || null,
                cantidad: cantidadDelta,
                creadoPor: sedeId
            });
            const docRef = doc(db, `sedes/${sedeId}/inventario`, nueva.id);
            batch.set(docRef, this._limpiar(nueva.toJSON()));
            console.warn(`⚠️ [AccesorioInventarioService] Auto-creando accesorio sin stock previo: ${nueva.etiqueta} (cantidad: ${cantidadDelta})`);
        }
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    _limpiar(obj) {
        if (obj === undefined) return null;
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(i => this._limpiar(i));
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = this._limpiar(v);
        }
        return result;
    }
}

export const accesorioInventarioService = new AccesorioInventarioService();
