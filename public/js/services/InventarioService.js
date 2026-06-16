import { db } from '../config/firebase-config.js';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { EquipoInventario } from '../models/EquipoInventario.js';

class InventarioService {
    constructor() {
        this._cacheInventario = [];
        this._listeners = [];
        this._unsubscribe = null;
        this._inventarioListo = false;
        this._imeisRecienIngresados = new Set(); // Para evitar duplicados por doble submit
        this._readyPromise = null;
        this._readyResolve = null;
    }

    _getBasePath() {
        const sedeId = localStorage.getItem('usuario_sede_id') || 'sede_1';
        return `sedes/${sedeId}`;
    }

    inicializar() {
        if (this._unsubscribe) return this._readyPromise;
        
        // Crear promesa que se resolverá cuando el inventario esté listo
        this._readyPromise = new Promise((resolve) => {
            this._readyResolve = resolve;
        });
        
        console.log('🚀 Inicializando InventarioService (Sincronización en background)...');
        const q = query(
            collection(db, `${this._getBasePath()}/inventario`),
            where("tipoItem", "==", "equipo")
        );

        this._unsubscribe = onSnapshot(q, (snapshot) => {
            this._cacheInventario = snapshot.docs.map(docSnap =>
                EquipoInventario.fromJSON({ id: docSnap.id, ...docSnap.data() })
            );
            
            const wasReady = this._inventarioListo;
            this._inventarioListo = true;
            
            console.log(`✅ Inventario sincronizado: ${this._cacheInventario.length} equipos`);
            
            // Resolver la promesa solo la primera vez
            if (!wasReady && this._readyResolve) {
                this._readyResolve();
            }
            
            this._notificarCambio();
        }, (error) => {
            console.error('❌ Error en listener de inventario:', error);
        });
        
        return this._readyPromise;
    }
    
    // Método para esperar a que el inventario esté listo
    async esperarListo() {
        if (this._inventarioListo) return true;
        if (!this._readyPromise) {
            this.inicializar();
        }
        await this._readyPromise;
        return true;
    }
    
    // Método público para saber si está listo
    estaListo() {
        return this._inventarioListo;
    }

    onCambio(fn) {
        this._listeners.push(fn);
    }

    _notificarCambio() {
        this._listeners.forEach(fn => fn());
    }

    obtenerTodos() {
        return this._cacheInventario;
    }

    obtenerDisponibles() {
        return this._cacheInventario.filter(e => e.estado === 'disponible');
    }

    buscarPorImei(imei) {
        return this._cacheInventario.find(e => e.imei === imei);
    }

    buscarPorModelo(texto) {
        if(!texto) return [];
        const txt = texto.toLowerCase();
        return this.obtenerDisponibles().filter(e => e.modelo.toLowerCase().includes(txt));
    }

    async guardarLote(equiposArray, origenLote = "") {
        try {
            // ⚠️ VALIDACIÓN CRÍTICA: Esperar a que el inventario esté sincronizado
            if (!this._inventarioListo) {
                console.warn('⏳ Esperando sincronización del inventario...');
                await this.esperarListo();
            }
            
            // Validación 1: Verificar IMEIs duplicados dentro del mismo lote
            const imeisEnLote = new Set();
            const duplicadosEnLote = [];
            
            equiposArray.forEach((eq, index) => {
                if (eq.imei && eq.imei.length >= 15) {
                    if (imeisEnLote.has(eq.imei)) {
                        duplicadosEnLote.push({
                            fila: index + 1,
                            imei: eq.imei,
                            modelo: eq.modelo
                        });
                    } else {
                        imeisEnLote.add(eq.imei);
                    }
                }
            });
            
            if (duplicadosEnLote.length > 0) {
                const mensaje = duplicadosEnLote.map(d => 
                    `Fila ${d.fila} (IMEI ${d.imei}, ${d.modelo})`
                ).join(', ');
                return { 
                    exito: false, 
                    error: `❌ IMEIs duplicados en el mismo lote: ${mensaje}. Cada equipo debe tener un IMEI único.` 
                };
            }
            
            // Validación 2: Verificar IMEIs que ya existen en el inventario
            const imeisDuplicados = [];
            equiposArray.forEach((eq, index) => {
                if (eq.imei && eq.imei.length >= 15) {
                    const existente = this.buscarPorImei(eq.imei);
                    if (existente) {
                        imeisDuplicados.push({
                            fila: index + 1,
                            imei: eq.imei,
                            modelo: eq.modelo,
                            estadoExistente: existente.estado,
                            idExistente: existente.id
                        });
                    }
                }
            });
            
            if (imeisDuplicados.length > 0) {
                const mensaje = imeisDuplicados.map(d => 
                    `Fila ${d.fila} (IMEI ${d.imei}, ${d.modelo}) ya existe como ${d.estadoExistente} (ID: ${d.idExistente})`
                ).join(', ');
                return { 
                    exito: false, 
                    error: `❌ IMEIs ya existen en el inventario: ${mensaje}. No se puede ingresar equipos con IMEI duplicado.` 
                };
            }
            
            const batch = writeBatch(db);
            const loteId = `LOTE-${new Date().toISOString().replace(/[:.]/g, '-').substring(0,19)}`;
            
            equiposArray.forEach(eq => {
                eq.loteId = loteId;
                if(origenLote && !eq.origen) eq.origen = origenLote;
                
                const docRef = doc(db, `${this._getBasePath()}/inventario`, eq.id);
                // Usamos toJSON y nos aseguramos de no enviar undefined
                const data = JSON.parse(JSON.stringify(eq.toJSON())); 
                batch.set(docRef, data);
            });

            await batch.commit();
            console.log(`✅ Lote ${loteId} guardado con ${equiposArray.length} equipos.`);
            return { exito: true, loteId };
        } catch (error) {
            console.error('❌ Error al guardar lote de inventario:', error);
            return { exito: false, error: error.message };
        }
    }

    async ingresarEquipo(equipo) {
        try {
            // Verificar duplicado en memoria para evitar doble submit
            if (equipo.imei && this._imeisRecienIngresados.has(equipo.imei)) {
                console.warn(`⚠️ IMEI ${equipo.imei} ya fue ingresado recientemente, ignorando duplicado`);
                return { exito: false, error: 'Equipo ya ingresado recientemente' };
            }

            // Verificar si ya existe en el inventario
            const existente = this.buscarPorImei(equipo.imei);
            if (existente) {
                const errorMsg = `❌ El equipo con IMEI ${equipo.imei} ya existe en el inventario (estado: ${existente.estado})`;
                return { exito: false, error: errorMsg };
            }

            const docRef = doc(db, `${this._getBasePath()}/inventario`, equipo.id);
            const data = JSON.parse(JSON.stringify(equipo.toJSON())); 
            await setDoc(docRef, data);
            
            // Registrar en memoria para evitar duplicados en la misma sesión
            if (equipo.imei) {
                this._imeisRecienIngresados.add(equipo.imei);
            }
            
            return { exito: true };
        } catch (error) {
            console.error('❌ Error al ingresar equipo individual:', error);
            return { exito: false, error: error.message };
        }
    }

    async actualizarEquipo(equipoId, cambios) {
        if (!equipoId) return { exito: false, error: 'ID inválido' };
        try {
            const docRef = doc(db, `${this._getBasePath()}/inventario`, equipoId);
            // Solo actualizar los campos que se envían
            await updateDoc(docRef, cambios);
            console.log(`✅ Equipo ${equipoId} actualizado`);
            return { exito: true };
        } catch (error) {
            console.error(`❌ Error al actualizar equipo ${equipoId}:`, error);
            return { exito: false, error: error.message };
        }
    }

    async procesarSalidaLote(equipoIds, nuevoEstado, datosExtra = {}) {
        if (!equipoIds || !equipoIds.length) return { exito: false, error: 'Lista de equipos vacía' };
        try {
            const batch = writeBatch(db);
            const fecha = new Date().toISOString();
            
            equipoIds.forEach(equipoId => {
                const docRef = doc(db, `${this._getBasePath()}/inventario`, equipoId);
                batch.update(docRef, {
                    estado: nuevoEstado,
                    fechaActualizacion: fecha,
                    ...datosExtra
                });
            });

            await batch.commit();
            console.log(`✅ Salida de ${equipoIds.length} equipos procesada exitosamente en batch.`);
            return { exito: true };
        } catch (error) {
            console.error('❌ Error al procesar salida en lote:', error);
            return { exito: false, error: error.message };
        }
    }

    async cambiarEstado(equipoId, nuevoEstado, datosExtra = {}) {
        if(!equipoId) return {exito: false, error: "ID inválido"};
        try {
            const docRef = doc(db, `${this._getBasePath()}/inventario`, equipoId);
            await updateDoc(docRef, {
                estado: nuevoEstado,
                ...datosExtra
            });
            return { exito: true };
        } catch (error) {
            console.error(`❌ Error al cambiar estado a ${nuevoEstado}:`, error);
            return { exito: false, error: error.message };
        }
    }

    async marcarVendido(equipoId, ventaId = "") {
        return await this.cambiarEstado(equipoId, 'vendido', { 
            ventaAsociadaId: ventaId,
            fechaVenta: new Date().toISOString()
        });
    }

    async marcarDisponible(equipoId) {
        return await this.cambiarEstado(equipoId, 'disponible', {
            ventaAsociadaId: null,
            fechaVenta: null
        });
    }

    destruir() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        this._listeners = [];
        this._cacheInventario = [];
        this._inventarioListo = false;
        console.log('🔴 InventarioService desconectado');
    }

    /**
     * Crea/actualiza una venta Y sincroniza el inventario en UNA sola operación atómica.
     *
     * Por qué esto es importante:
     * ──────────────────────────
     * Antes se hacían 3 llamadas separadas:
     *   1) guardarVenta()         → fire-and-forget
     *   2) marcarVendido(eq1)     → fire-and-forget
     *   3) marcarVendido(eq2)     → fire-and-forget
     *
     * Si el WiFi se caía entre (1) y (2), la venta quedaba guardada
     * pero el inventario desincronizado. Con este batch, Firestore
     * aplica TODO o NADA: o se commitea la venta con su inventario
     * actualizado, o no se aplica nada.
     *
     * Patrón local-first se mantiene:
     * - El batch se dispara sin await bloqueante
     * - IndexedDB persiste todo al instante
     * - Sincronización al servidor en background
     * - onSnapshot refresca la UI
     *
     * @param {Object} params
     * @param {Object} params.venta              Instancia de Venta (o el JSON)
     * @param {Array}  params.equiposIds        IDs de inventario a marcar como vendido
     * @param {Array}  params.tradeInsNuevos    Array de {id, datos} para nuevos trade-ins a ingresar
     * @param {Array}  params.tradeInsActualizar Array de {id, datos} para trade-ins ya en inventario
     * @param {string} [params.ventaAnteriorId] Si es edición, ID de la venta anterior
     * @param {Array}  [params.equiposLiberar]  IDs a liberar (volver a disponible) en edición
     * @param {Array}  [params.tradeInsEliminar] IDs de trade-ins a soft-deleted en edición/eliminación
     * @returns {Promise<{exito: boolean, error?: string}>}
     */
    async commitVentaConInventario({
        venta,
        equiposIds = [],
        tradeInsNuevos = [],
        tradeInsActualizar = [],
        equiposLiberar = [],
        tradeInsEliminar = []
    }) {
        try {
            const batch = writeBatch(db);
            const sedePath = this._getBasePath();
            const ahora = new Date().toISOString();

            // 1) Set venta
            const ventaJSON = typeof venta.toJSON === 'function' ? venta.toJSON() : venta;
            const ventaRef = doc(db, `${sedePath}/ventas`, venta.id);
            batch.set(ventaRef, this._cleanForFirestore(ventaJSON));

            // 2) Marcar cada equipo vendido
            equiposIds.forEach(id => {
                if (!id) return;
                const ref = doc(db, `${sedePath}/inventario`, id);
                batch.update(ref, {
                    estado: 'vendido',
                    ventaAsociadaId: venta.id,
                    fechaVenta: ahora
                });
            });

            // 3) Liberar equipos (edición: equipo que se quitó de la venta)
            equiposLiberar.forEach(({ id }) => {
                if (!id) return;
                const ref = doc(db, `${sedePath}/inventario`, id);
                batch.update(ref, {
                    estado: 'disponible',
                    ventaAsociadaId: null,
                    fechaVenta: null
                });
            });

            // 4) Ingresar trade-ins nuevos (los que el cliente entrega y no estaban en inventario)
            tradeInsNuevos.forEach(({ id, datos }) => {
                if (!id || !datos) return;
                const ref = doc(db, `${sedePath}/inventario`, id);
                const equipo = { ...datos, id, estado: 'disponible' };
                batch.set(ref, this._cleanForFirestore(equipo));
            });

            // 5) Actualizar trade-ins ya existentes (edición: se modifican campos)
            tradeInsActualizar.forEach(({ id, datos }) => {
                if (!id || !datos) return;
                const ref = doc(db, `${sedePath}/inventario`, id);
                batch.update(ref, this._cleanForFirestore(datos));
            });

            // 6) Soft-delete trade-ins (venta eliminada o trade-in removido en edición)
            tradeInsEliminar.forEach(({ id, motivo }) => {
                if (!id) return;
                const ref = doc(db, `${sedePath}/inventario`, id);
                batch.update(ref, {
                    estado: 'eliminado',
                    motivo: motivo || 'Eliminado',
                    fechaEliminacion: ahora
                });
            });

            await batch.commit();
            console.log(`✅ Batch venta+inventario commiteado: ${equiposIds.length} vendidos, ${tradeInsNuevos.length} trade-ins nuevos, ${equiposLiberar.length} liberados, ${tradeInsEliminar.length} eliminados`);
            return { exito: true };
        } catch (error) {
            console.error('❌ Error en batch venta+inventario:', error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Elimina una venta Y restaura el inventario en UNA sola operación atómica.
     *
     * Caso de uso: operador elimina una venta del registro de cierree.html.
     *
     * Reglas (las que pediste):
     *   - Equipos vendidos en esa venta → vuelven a `disponible`
     *     (pueden volver a venderse o asignarse como trade-in)
     *   - Trade-ins que fueron ingresados POR ESTA VENTA → soft-delete
     *     (estado = 'eliminado', motivo documentado, fecha documentada)
     *     NO se borran físicamente para mantener trazabilidad.
     *   - Trade-ins que NO pertenecen a esta venta (caso raro: ya
     *     referenciados o vendidos en otra venta) → NO se tocan.
     *
     * Todo se hace en un writeBatch: o se aplica todo (delete venta +
     * restore inventario + soft-delete trade-ins) o nada.
     *
     * @param {Object} params
     * @param {Object} params.venta   Objeto venta (JSON) con .equipos[] y .equiposRecibidos[]
     * @returns {Promise<{exito: boolean, error?: string}>}
     */
    async commitEliminarVentaConInventario({ venta }) {
        try {
            if (!venta || !venta.id) {
                return { exito: false, error: 'Venta inválida' };
            }

            const batch = writeBatch(db);
            const sedePath = this._getBasePath();
            const ahora = new Date().toISOString();

            // 1) Eliminar la venta
            const ventaRef = doc(db, `${sedePath}/ventas`, venta.id);
            batch.delete(ventaRef);

            // 2) Restaurar equipos vendidos a "disponible"
            // Soporta tanto singular (venta.equipo) como plural (venta.equipos[])
            const equipos = [];
            if (Array.isArray(venta.equipos) && venta.equipos.length > 0) {
                equipos.push(...venta.equipos);
            } else if (venta.equipo && venta.equipo.imei) {
                equipos.push(venta.equipo);
            }

            equipos.forEach(eq => {
                if (!eq || !eq.imei) return;
                const inv = this.buscarPorImei(eq.imei);
                if (inv && inv.estado === 'vendido') {
                    const ref = doc(db, `${sedePath}/inventario`, inv.id);
                    batch.update(ref, {
                        estado: 'disponible',
                        ventaAsociadaId: null,
                        fechaVenta: null
                    });
                }
            });

            // 3) Soft-delete de trade-ins que fueron ingresados por ESTA venta
            const recibidos = [];
            if (Array.isArray(venta.equiposRecibidos) && venta.equiposRecibidos.length > 0) {
                recibidos.push(...venta.equiposRecibidos);
            } else if (venta.equipoRecibido && venta.equipoRecibido.imei) {
                recibidos.push(venta.equipoRecibido);
            }

            recibidos.forEach(r => {
                if (!r || !r.imei) return;
                const inv = this.buscarPorImei(r.imei);
                if (!inv) return;

                // Solo tocar los que fueron ingresados por esta venta
                const esDeEstaVenta = inv.origen && (
                    inv.origen.includes(`Venta: ${venta.id}`) ||
                    inv.origen.toLowerCase().includes('trade-in')
                );
                if (!esDeEstaVenta) {
                    console.log(`ℹ️ Trade-in ${r.imei} no pertenece a la venta ${venta.id} → NO se elimina`);
                    return;
                }

                const ref = doc(db, `${sedePath}/inventario`, inv.id);
                batch.update(ref, {
                    estado: 'eliminado',
                    motivo: `Venta ${venta.id} eliminada`,
                    fechaEliminacion: ahora
                });
            });

            await batch.commit();
            console.log(`✅ Batch eliminar venta+inventario commiteado: ${equipos.length} equipos restaurados, ${recibidos.length} trade-ins procesados`);
            return { exito: true };
        } catch (error) {
            console.error('❌ Error en batch eliminar venta+inventario:', error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Sanitiza un objeto para Firestore (reemplaza undefined por null).
     * Equivalente al _sanitize de StorageService.
     */
    _cleanForFirestore(obj) {
        if (obj === undefined) return null;
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this._cleanForFirestore(item));
        const clean = {};
        for (const [key, value] of Object.entries(obj)) {
            clean[key] = this._cleanForFirestore(value);
        }
        return clean;
    }

    async eliminarEquipo(equipoId) {
        if (!equipoId) return { exito: false, error: 'ID inválido' };
        try {
            const docRef = doc(db, `${this._getBasePath()}/inventario`, equipoId);
            await deleteDoc(docRef);
            console.log(`✅ Equipo ${equipoId} eliminado del inventario`);
            return { exito: true };
        } catch (error) {
            console.error('❌ Error al eliminar equipo:', error);
            return { exito: false, error: error.message };
        }
    }
}

export const inventarioService = new InventarioService();
