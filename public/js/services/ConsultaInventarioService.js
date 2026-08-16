/**
 * ConsultaInventarioService
 *
 * Servicio paralelo a InventarioService que mantiene un cache consolidado
 * del inventario de TODAS las sedes, escuchado en tiempo real via onSnapshot.
 *
 * Por qué existe como singleton separado (no extiende InventarioService):
 *   - InventarioService es mono-sede por diseño (asumido por Ingreso, Salida,
 *     cierree, validación de IMEI). Cambiar eso rompería esas páginas.
 *   - La pestaña Consulta necesita visión multi-sede, pero solo para LECTURA
 *     y para EDICIONES explícitas (actualizarEquipoEnSede/trasladarEquipo).
 *   - Mantener los dos servicios separados preserva los invariantes.
 *
 * Patrón inspirado en AdminService.js (mismo singleton, mismo bucle
 * de 6 onSnapshot), con dos diferencias:
 *   1. Escucha la colección 'inventario' (no ventas/movimientos).
 *   2. Notifica en cada snapshot de sede, no solo cuando las 6 están listas
 *      (carga progresiva — la UI pinta filas a medida que llegan).
 *
 * Cache offline: persiste cada sede a IndexedDB después de cada snapshot
 * exitoso, y la carga al iniciar() si existe. Así la pestaña Consulta
 * muestra datos al instante cuando el admin reabre la página.
 */

import { db } from '../config/firebase-config.js';
import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { EquipoInventario } from '../models/EquipoInventario.js';
import { SEDES, SEDES_NOMBRES } from '../config/constants.js';

// Nombre de la DB y store de IndexedDB
const IDB_NAME = 'calcv2_consulta_cache';
const IDB_VERSION = 1;
const IDB_STORE = 'inventario_por_sede';

// ──────────────────────────────────────────────────────────────────
// IndexedDB helper inline (sin dependencias externas)
// ──────────────────────────────────────────────────────────────────
function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB no disponible'));
            return;
        }
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn('[ConsultaCache] IDB get falló:', e.message);
        return null;
    }
}

async function idbSet(key, value) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn('[ConsultaCache] IDB set falló:', e.message);
    }
}

class ConsultaInventarioService {
    constructor() {
        this.sedes = SEDES;
        this._cache = {};                   // { sede_1: EquipoInventario[], ... }
        this.sedes.forEach(s => { this._cache[s] = []; });
        this._listeners = [];
        this._unsubscribes = [];
        this._sedesListas = new Set();
        this._listo = false;
        this._readyPromise = null;
        this._readyResolve = null;
        this._cacheLocalCargado = false;
    }

    /**
     * Carga cache local (IndexedDB) en this._cache antes de abrir listeners.
     * No bloquea: si IndexedDB no está disponible o está vacío, retorna.
     */
    async cargarCacheLocal() {
        if (this._cacheLocalCargado) return;
        let cacheHit = false;
        for (const sedeId of this.sedes) {
            const cached = await idbGet(`inventario_${sedeId}`);
            if (Array.isArray(cached) && cached.length > 0) {
                this._cache[sedeId] = cached.map(json => EquipoInventario.fromJSON(json));
                // FIX C2: marca la sede como lista para que renderTabla no muestre spinner
                // cuando el usuario está offline (los snapshots no llegan).
                this._sedesListas.add(sedeId);
                cacheHit = true;
            }
        }
        this._cacheLocalCargado = true;
        if (cacheHit) this._notificarCambio(); // primer paint con datos del cache
    }

    /**
     * Persiste el cache de una sede a IndexedDB.
     * No bloqueante (fire-and-forget); si falla, log warn.
     */
    async _persistirSede(sedeId) {
        if (!Array.isArray(this._cache[sedeId])) return;
        // Guardar el JSON plano, no las instancias (clases no se serializan)
        const jsonArray = this._cache[sedeId].map(eq => eq.toJSON());
        await idbSet(`inventario_${sedeId}`, jsonArray);
    }

    /**
     * Abre los 6 onSnapshot y notifica progresivamente.
     * Idempotente: si ya está inicializado, no hace nada.
     */
    inicializar() {
        if (this._unsubscribes.length > 0) return this._readyPromise;

        this._readyPromise = new Promise((resolve) => {
            this._readyResolve = resolve;
        });

        console.log('🚀 Inicializando ConsultaInventarioService (multi-sede)...');

        this.sedes.forEach(sedeId => {
            // Filtrar SOLO equipos (tipoItem === 'equipo').
            // Los accesorios personalizados viven en la misma colección pero
            // con tipoItem === 'accesorio' — sin este filtro aparecen como
            // filas vacías/erróneas en la tabla de teléfonos.
            const q = query(
                collection(db, `sedes/${sedeId}/inventario`),
                where('tipoItem', '==', 'equipo')
            );

            const unsub = onSnapshot(q, (snapshot) => {
                // Mapeo a EquipoInventario + enriquecimiento con metadatos de sede
                this._cache[sedeId] = snapshot.docs.map(d => {
                    const eq = EquipoInventario.fromJSON({ id: d.id, ...d.data() });
                    eq._sedeId = sedeId;
                    eq._sedeNombre = SEDES_NOMBRES[sedeId] || sedeId;
                    return eq;
                });

                // Marca la sede como sincronizada al menos una vez
                const esPrimeraVez = !this._sedesListas.has(sedeId);
                this._sedesListas.add(sedeId);

                // Persistir a IndexedDB (no bloqueante)
                this._persistirSede(sedeId);

                // Notificar a la UI — carga progresiva
                this._notificarCambio();

                // Resolver la promesa cuando las 6 sedes hayan emitido al menos una vez
                if (esPrimeraVez && this._sedesListas.size === this.sedes.length && !this._listo) {
                    this._listo = true;
                    console.log(`✅ ConsultaInventarioService listo: ${this.sedes.length} sedes sincronizadas`);
                    if (this._readyResolve) this._readyResolve();
                }
            }, (error) => {
                console.error(`❌ Error en listener de inventario de ${sedeId}:`, error);
                // No resolvemos la promesa: la UI mostrará "cargando" hasta que
                // el snapshot llegue. Si la sede no responde, igual podemos
                // mostrar las otras 5.
            });

            this._unsubscribes.push(unsub);
        });

        return this._readyPromise;
    }

    async esperarListo() {
        if (this._listo) return;
        if (this._readyPromise) await this._readyPromise;
    }

    /**
     * Suscribe callback al refresh. Se llama CADA VEZ que una sede emite,
     * no solo cuando las 6 están listas → carga progresiva.
     */
    onCambio(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(l => l !== fn);
        };
    }

    _notificarCambio() {
        this._listeners.forEach(fn => {
            try { fn(); } catch (e) {
                console.error('[ConsultaInventario] Error en listener:', e);
            }
        });
    }

    /**
     * Devuelve array consolidado de equipos, aplicando filtros en memoria.
     *
     * No espera a esperarListo(): si una sede aún no sincronizó, simplemente
     * no aparece en el resultado. La UI pinta filas a medida que llegan.
     *
     * @param {Object} filtros
     * @param {string} [filtros.sedeId]     'todos' o sede específica
     * @param {string} [filtros.estado]     '' = todos
     * @param {string} [filtros.modelo]     substring match (case-insensitive)
     * @param {string} [filtros.gb]         exacto
     * @param {string} [filtros.color]      exacto
     * @param {string} [filtros.imei]       prefijo
     * @param {string} [filtros.fechaDesde] YYYY-MM-DD (inclusive)
     * @param {string} [filtros.fechaHasta] YYYY-MM-DD (inclusive)
     * @param {boolean} [filtros.incluirEliminados=false]
     * @returns {Array} lista de EquipoInventario enriquecidos con _sedeId/_sedeNombre
     */
    obtenerTodos(filtros = {}) {
        const {
            sedeId = 'todos',
            estado = '',
            modelo = '',
            gb = '',
            color = '',
            imei = '',
            fechaDesde = '',
            fechaHasta = '',
            incluirEliminados = false
        } = filtros;

        // Consolidar todas las sedes
        let todos = [];
        this.sedes.forEach(s => {
            if (sedeId !== 'todos' && sedeId !== s) return;
            todos = todos.concat(this._cache[s] || []);
        });

        // Aplicar filtros
        if (estado) {
            if (estado === 'en-tienda') {
                todos = todos.filter(e => {
                    const est = (e.estado || '').toLowerCase();
                    return est === 'disponible' || est === 'abonado' || est === 'defectuoso';
                });
            } else {
                todos = todos.filter(e => e.estado === estado);
            }
        }
        if (modelo) {
            const m = modelo.toLowerCase();
            todos = todos.filter(e => (e.modelo || '').toLowerCase().includes(m));
        }
        if (gb) {
            todos = todos.filter(e => e.gb === gb);
        }
        if (color) {
            todos = todos.filter(e => e.color === color);
        }
        if (imei) {
            // FIX A2: normalizar espacios/guiones en el filtro y en el campo.
            const imeiNorm = String(imei).replace(/[\s-]/g, '').toLowerCase();
            todos = todos.filter(e => String(e.imei || '').replace(/[\s-]/g, '').toLowerCase().includes(imeiNorm));
        }
        if (fechaDesde) {
            const desde = new Date(fechaDesde + 'T00:00:00');
            todos = todos.filter(e => {
                if (!e.fechaIngreso) return false;
                return new Date(e.fechaIngreso) >= desde;
            });
        }
        if (fechaHasta) {
            const hasta = new Date(fechaHasta + 'T23:59:59.999');
            todos = todos.filter(e => {
                if (!e.fechaIngreso) return false;
                return new Date(e.fechaIngreso) <= hasta;
            });
        }
        if (!incluirEliminados) {
            todos = todos.filter(e => e.estado !== 'eliminado');
        }

        // Ordenar: más recientes primero
        todos.sort((a, b) => {
            const fa = a.fechaIngreso ? new Date(a.fechaIngreso).getTime() : 0;
            const fb = b.fechaIngreso ? new Date(b.fechaIngreso).getTime() : 0;
            return fb - fa;
        });

        return todos;
    }

    /**
     * Para diagnóstico: cuántas sedes han sincronizado.
     */
    getProgresoCarga() {
        return {
            sedesListas: Array.from(this._sedesListas),
            totalSedes: this.sedes.length,
            completo: this._sedesListas.size === this.sedes.length
        };
    }

    destruir() {
        this._unsubscribes.forEach(unsub => unsub());
        this._unsubscribes = [];
        this._listeners = [];
        this._sedesListas.clear();
        this._listo = false;
        this._cacheLocalCargado = false;
        this.sedes.forEach(s => { this._cache[s] = []; });
        console.log('🔴 ConsultaInventarioService desconectado');
    }
}

export const consultaInventarioService = new ConsultaInventarioService();
