import { db } from '../config/firebase-config.js';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    writeBatch,
    onSnapshot,
    query,
    where,
    arrayUnion,
    arrayRemove
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

    /**
     * Devuelve el cache completo de equipos.
     *
     * @param {string[]} [estados]  Si se pasa, filtra por esos estados.
     *   Ej: `obtenerTodos(['disponible', 'abonado'])` para que el buscador
     *   de cierree muestre tanto stock libre como equipos con anticipo.
     *   Si se omite (compat con llamadas viejas), devuelve TODOS los equipos.
     */
    obtenerTodos(estados = null) {
        if (!Array.isArray(estados) || estados.length === 0) {
            return this._cacheInventario;
        }
        return this._cacheInventario.filter(e => estados.includes(e.estado));
    }

    obtenerDisponibles() {
        return this._cacheInventario.filter(e => e.estado === 'disponible');
    }

    /**
     * Devuelve los equipos físicamente presentes en tienda:
     *   - 'disponible' → stock normal
     *   - 'abonado'    → reservado por un cliente, pero sigue en tienda
     *   - 'defectuoso' → recibido por garantía, en tienda hasta ser reparado o desechado
     *
     * Usar este método para conteos de stock físico y banners de "sin stock".
     */
    obtenerEnTienda() {
        return this._cacheInventario.filter(e =>
            e.estado === 'disponible' ||
            e.estado === 'abonado' ||
            e.estado === 'defectuoso'
        );
    }

    /**
     * Devuelve los equipos en estado 'abonado'. Usado para badges morados
     * y para la vista "Cierre de abonos" en cierree.
     */
    obtenerAbonados() {
        return this._cacheInventario.filter(e => e.estado === 'abonado');
    }

    /**
     * Devuelve el último cliente que abonó un equipo (o null si no hay).
     * Helper de UI: el badge del buscador muestra el nombre del cliente.
     */
    obtenerUltimoClienteAbono(equipo) {
        if (!equipo || !Array.isArray(equipo.historialAbonos) || equipo.historialAbonos.length === 0) {
            return null;
        }
        return equipo.historialAbonos[equipo.historialAbonos.length - 1].cliente || null;
    }

    buscarPorImei(imei) {
        return this._cacheInventario.find(e => e.imei === imei);
    }

    buscarPorModelo(texto) {
        if(!texto) return [];
        const txt = texto.toLowerCase();
        return this.obtenerDisponibles().filter(e => e.modelo.toLowerCase().includes(txt));
    }

    async guardarLote(equiposArray, origenLote = "", opciones = {}) {
        try {
            const permitirReingreso = opciones.permitirReingreso || false;

            if (!Array.isArray(equiposArray) || equiposArray.length === 0) {
                return { exito: false, error: 'No hay equipos para guardar' };
            }

            // ⚠️ VALIDACIÓN CRÍTICA: Esperar a que el inventario esté sincronizado
            if (!this._inventarioListo) {
                console.warn('⏳ Esperando sincronización del inventario...');
                await this.esperarListo();
            }
            
            // Validación 1: Verificar duplicados DENTRO del mismo lote
            const imeisEnLote = new Set();
            const imeisDuplicadosLote = [];
            
            for (const eq of equiposArray) {
                if (eq.imei && eq.imei.length >= 15) {
                    if (imeisEnLote.has(eq.imei)) {
                        imeisDuplicadosLote.push(eq.imei);
                    } else {
                        imeisEnLote.add(eq.imei);
                    }
                }
            }
            
            if (imeisDuplicadosLote.length > 0) {
                return { 
                    exito: false, 
                    error: `❌ Hay IMEIs duplicados dentro del mismo lote: ${imeisDuplicadosLote.join(', ')}` 
                };
            }
            
            // Validación 2: Verificar IMEIs que ya existen en el inventario
            const imeisDuplicados = [];
            equiposArray.forEach((eq, index) => {
                if (eq.imei && eq.imei.length >= 15) {
                    const existente = this.buscarPorImei(eq.imei);
                    if (existente) {
                        // 'disponible' y 'abonado' están físicamente en tienda → no se pueden reingresar
                        if (!permitirReingreso || existente.estado === 'disponible' || existente.estado === 'abonado') {
                            imeisDuplicados.push({
                                fila: index + 1,
                                imei: eq.imei,
                                modelo: eq.modelo,
                                estadoExistente: existente.estado,
                                idExistente: existente.id
                            });
                        } else {
                            // Reingreso permitido: usar el ID del equipo original
                            eq.id = existente.id;
                        }
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

    async ingresarEquipo(equipo, opciones = {}) {
        try {
            const permitirReingreso = opciones.permitirReingreso || false;

            // Verificar duplicado en memoria para evitar doble submit
            if (equipo.imei && this._imeisRecienIngresados.has(equipo.imei)) {
                console.warn(`⚠️ IMEI ${equipo.imei} ya fue ingresado recientemente, ignorando duplicado`);
                return { exito: false, error: 'Equipo ya ingresado recientemente' };
            }

            // Verificar si ya existe en el inventario
            const existente = this.buscarPorImei(equipo.imei);
            if (existente) {
                // 'disponible' y 'abonado' están físicamente en tienda → no se pueden reingresar
                if (!permitirReingreso || existente.estado === 'disponible' || existente.estado === 'abonado') {
                    const errorMsg = `❌ El equipo con IMEI ${equipo.imei} ya existe en el inventario (estado: ${existente.estado})`;
                    return { exito: false, error: errorMsg };
                }
                // Si es reingreso, usamos el ID del equipo original para sobreescribir/actualizar
                equipo.id = existente.id;
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

    /**
     * Variante multi-sede de actualizarEquipo.
     *
     * Por qué existe: el método original usa _getBasePath() (la sede del
     * usuario logueado). La pestaña Consulta puede mostrar equipos de
     * OTRAS sedes; al editarlos necesitamos escribir en la sede dueña
     * del documento, no en la del operador.
     *
     * Diferencias vs actualizarEquipo():
     *   - Recibe sedeId explícito
     *   - Sella fechaActualizacion y actualizadoPor automáticamente
     *   - El método original se mantiene por retrocompat con Ingreso/Salida
     *
     * Concurrencia: last-write-wins (Firestore no hace check de versión).
     * Documentado en plan §6 pregunta 3.
     */
    async actualizarEquipoEnSede(sedeId, equipoId, cambios) {
        if (!sedeId || !equipoId) {
            return { exito: false, error: 'sedeId y equipoId son obligatorios' };
        }
        try {
            const docRef = doc(db, `sedes/${sedeId}/inventario`, equipoId);
            await updateDoc(docRef, {
                ...cambios,
                fechaActualizacion: new Date().toISOString(),
                actualizadoPor: localStorage.getItem('usuario_sede_id') || 'sistema'
            });
            return { exito: true };
        } catch (error) {
            console.error(`❌ Error al actualizar ${equipoId} en ${sedeId}:`, error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Mueve un equipo de una sede a otra de forma atómica.
     *
     * Por qué existe: hoy no hay forma de "trasladar" un equipo entre
     * sedes. El estado 'transferido' (vía procesarSalidaLote) es un
     * soft-delete dentro de la misma sede, no un movimiento real.
     *
     * Operación (todo en un writeBatch → o se aplica todo o nada):
     *   1. delete   sedes/<sedeOrigen>/inventario/<id>
     *   2. set      sedes/<sedeDestino>/inventario/<id>     (mismo id, nuevos metadatos)
     *   3. set      sedes/<sedeDestino>/movimientos/<newId> (auditoría)
     *
     * Restricciones:
     *   - El equipo no puede estar 'vendido' (rompería la trazabilidad
     *     de la venta) ni 'eliminado' (ya está soft-deleted).
     *   - El doc destino mantiene el mismo `id` para que los FKs
     *     (ventaAsociadaId, loteId) sigan siendo válidos.
     *
     * @returns {Promise<{exito: boolean, error?: string}>}
     */
    async trasladarEquipo(equipoId, sedeOrigen, sedeDestino, motivo = '', usuario = null) {
        if (!equipoId || !sedeOrigen || !sedeDestino) {
            return { exito: false, error: 'equipoId, sedeOrigen y sedeDestino son obligatorios' };
        }
        if (sedeOrigen === sedeDestino) {
            return { exito: false, error: 'La sede de origen y destino son la misma' };
        }

        try {
            const origenRef = doc(db, `sedes/${sedeOrigen}/inventario`, equipoId);
            const origenSnap = await getDoc(origenRef);

            if (!origenSnap.exists()) {
                return { exito: false, error: `El equipo ${equipoId} no existe en ${sedeOrigen}` };
            }

            const data = origenSnap.data();
            if (data.estado === 'vendido') {
                return { exito: false, error: 'No se puede trasladar un equipo vendido. Libérelo primero de la venta.' };
            }
            if (data.estado === 'eliminado') {
                return { exito: false, error: 'No se puede trasladar un equipo eliminado.' };
            }

            const ahora = new Date().toISOString();
            const usuarioTraslado = usuario || localStorage.getItem('usuario_sede_id') || 'sistema';

            // Doc de destino: mismo id, metadatos actualizados
            const nuevoDoc = {
                ...data,
                creadoPor: sedeDestino,
                sedeOrigenAnterior: sedeOrigen,
                fechaTraslado: ahora,
                motivoTraslado: motivo || '',
                trasladadoPor: usuarioTraslado,
                fechaActualizacion: ahora,
                actualizadoPor: usuarioTraslado
            };

            const destinoRef = doc(db, `sedes/${sedeDestino}/inventario`, equipoId);

            // Auditoría: doc de Movimiento en la sede destino
            const movRef = doc(collection(db, `sedes/${sedeDestino}/movimientos`));
            const fechaLocal = new Date().toLocaleDateString('es-ES');
            const horaLocal = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const movimiento = {
                id: movRef.id,
                tipo: 'Traslado',
                fecha: fechaLocal,
                hora: horaLocal,
                datos: {
                    equipoId,
                    imei: data.imei || '',
                    modelo: data.modelo || '',
                    gb: data.gb || '',
                    color: data.color || '',
                    sedeOrigen,
                    sedeDestino,
                    motivo: motivo || 'Traslado entre sedes',
                    trasladadoPor: usuarioTraslado
                }
            };

            const batch = writeBatch(db);
            batch.delete(origenRef);
            batch.set(destinoRef, this._cleanForFirestore(nuevoDoc));
            batch.set(movRef, this._cleanForFirestore(movimiento));

            await batch.commit();

            console.log(`✅ Traslado atómico: ${equipoId} ${sedeOrigen} → ${sedeDestino} (mov: ${movRef.id})`);
            return { exito: true, movimientoId: movRef.id };
        } catch (error) {
            console.error(`❌ Error al trasladar ${equipoId}:`, error);
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

    /**
     * Marca un equipo como 'abonado' y agrega una entrada a su historial.
     *
     * Por qué existe: necesitamos un estado intermedio entre 'disponible' y
     * 'vendido' para ventas con anticipo parcial. El equipo NO se descuenta
     * del stock "vendible" pero tampoco se muestra como libre.
     *
     * Atómicos críticos:
     *   - estado = 'abonado'
     *   - arrayUnion en historialAbonos (concurrencia-safe: dos ventas de
     *     abono simultáneas sobre el mismo equipo no se pisan entre sí)
     *   - Si el doc no tenía historialAbonos (equipo viejo), Firestore crea
     *     el array con el primer elemento automáticamente.
     *   - abonoInicialId se setea solo la primera vez (otro campo aparte,
     *     no se sobreescribe si ya existía).
     *
     * @param {string} equipoId
     * @param {Object} datosAbono
     * @param {string} datosAbono.ventaId     ID de la venta tipo 'abono'
     * @param {string} datosAbono.fecha       Fecha del pago (formato es-ES, ej '9/7/2026')
     * @param {number} datosAbono.monto       Monto abonado en USD
     * @param {Object} datosAbono.cliente     {nombre, cedula, telefono}
     * @returns {Promise<{exito: boolean, error?: string}>}
     */
    async marcarAbonado(equipoId, datosAbono) {
        if (!equipoId) return { exito: false, error: 'ID inválido' };
        if (!datosAbono || !datosAbono.ventaId) {
            return { exito: false, error: 'Falta ventaId en datosAbono' };
        }
        try {
            const docRef = doc(db, `${this._getBasePath()}/inventario`, equipoId);
            const entradaHistorial = {
                ventaId: datosAbono.ventaId,
                fecha: datosAbono.fecha || new Date().toLocaleDateString('es-ES'),
                monto: Number(datosAbono.monto) || 0,
                cliente: datosAbono.cliente || {},
                fechaRegistro: new Date().toISOString(),
                sedeId: localStorage.getItem('usuario_sede_id') || 'sede_1'
            };

            // 1) Set estado + append al historial en una sola escritura
            await updateDoc(docRef, {
                estado: 'abonado',
                historialAbonos: arrayUnion(entradaHistorial),
                fechaUltimoAbono: entradaHistorial.fechaRegistro
            });

            // 2) Si no tiene abonoInicialId todavía, lo seteamos en una 2da
            // escritura (no se puede hacer en el mismo updateDoc porque solo
            // aplicaría si el campo NO existe, y Firestore no tiene upsert
            // condicional simple para eso). Es idempotente: el 2do updateDoc
            // sobreescribe con el mismo valor si ya estaba seteado.
            const snap = await getDoc(docRef);
            if (snap.exists() && !snap.data().abonoInicialId) {
                await updateDoc(docRef, { abonoInicialId: datosAbono.ventaId });
            }

            console.log(`✅ Equipo ${equipoId} marcado como ABONADO (venta ${datosAbono.ventaId}, $${entradaHistorial.monto})`);
            return { exito: true };
        } catch (error) {
            console.error(`❌ Error al marcar abonado ${equipoId}:`, error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Cierra el ciclo de abonos: un equipo que estaba 'abonado' pasa a 'vendido'.
     *
     * Por qué existe: cuando el cliente paga el resto, el operador registra
     * una nueva venta tipo 'venta' sobre el mismo equipo. commitVentaConInventario
     * detecta esta transición y llama a finalizarAbono.
     *
     * Garantías:
     *   - estado: 'abonado' → 'vendido'
     *   - historialAbonos se MANTIENE (auditoría: el operador puede ver
     *     después cuánto se pagó en cada abono)
     *   - fechaFinalizacion se sella con el momento del cierre
     *   - abonoInicialId se limpia (el ciclo se cerró)
     *
     * @param {string} equipoId
     * @param {string} ventaFinalId  ID de la venta tipo 'venta' que cierra el ciclo
     */
    async finalizarAbono(equipoId, ventaFinalId) {
        if (!equipoId) return { exito: false, error: 'ID inválido' };
        try {
            const docRef = doc(db, `${this._getBasePath()}/inventario`, equipoId);
            const ahora = new Date().toISOString();
            await updateDoc(docRef, {
                estado: 'vendido',
                fechaFinalizacion: ahora,
                ventaAsociadaId: ventaFinalId || null,
                fechaVenta: ahora,
                // NO tocamos historialAbonos — es histórico
                // SÍ limpiamos abonoInicialId: el ciclo está cerrado
                abonoInicialId: null
            });
            console.log(`✅ Abono de ${equipoId} finalizado → VENDIDO (venta ${ventaFinalId})`);
            return { exito: true };
        } catch (error) {
            console.error(`❌ Error al finalizar abono ${equipoId}:`, error);
            return { exito: false, error: error.message };
        }
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
        tradeInsEliminar = [],
        abonadoAFinalizar = null
    }) {
        try {
            const batch = writeBatch(db);
            const sedePath = this._getBasePath();
            const ahora = new Date().toISOString();
            const esAbono = venta && venta.tipoTransaccion === 'abono';
            const datosAbono = esAbono ? {
                ventaId: venta.id,
                fecha: venta.fecha,
                // Solo el pago NUEVO de esta transacción: montoTotal incluye los abonos
                // previos precargados (totalAbonosPrevios), así que los restamos para
                // obtener únicamente lo que el cliente pagó HOY en este abono.
                monto: Math.max(0, (Number(venta.montoTotal) || 0) - (Number(venta.totalAbonosPrevios) || 0)),
                cliente: venta.cliente || {}
            } : null;

            // 1) Set venta
            const ventaJSON = typeof venta.toJSON === 'function' ? venta.toJSON() : venta;
            const ventaRef = doc(db, `${sedePath}/ventas`, venta.id);
            batch.set(ventaRef, this._cleanForFirestore(ventaJSON));

            // 2) Marcar cada equipo vendido (o abonado, según tipoTransaccion)
            equiposIds.forEach(id => {
                if (!id) return;
                const ref = doc(db, `${sedePath}/inventario`, id);
                if (esAbono) {
                    // Venta tipo 'abono' → estado 'abonado' + append historial
                    // ⚠️ arrayUnion NO se puede usar en writeBatch (es server-only),
                    // pero sí en updateDoc. Por eso la lógica pesada de append
                    // histórico se hace FUERA del batch, en un paso posterior.
                    // Acá solo seteamos estado + flags básicos.
                    batch.update(ref, {
                        estado: 'abonado',
                        fechaActualizacion: ahora,
                        fechaUltimoAbono: ahora
                    });
                } else {
                    // Venta normal: detecta si es el CIERRE de un equipo abonado
                    // usando la metadata `abonadoAFinalizar` que envía la UI cuando
                    // el operador usó _cargarAbonadoParaFinalizar().
                    const esCierreDeAbono = abonadoAFinalizar
                        && abonadoAFinalizar.equipoId === id;

                    if (esCierreDeAbono) {
                        // CIERRE de abono → 'vendido' pero MANTENIENDO historialAbonos
                        // y sellando fechaFinalizacion. NO resetea el historial.
                        batch.update(ref, {
                            estado: 'vendido',
                            ventaAsociadaId: venta.id,
                            fechaVenta: ahora,
                            fechaFinalizacion: ahora,
                            // historialAbonos NO se toca (auditoría)
                            // abonoInicialId se limpia: el ciclo terminó
                            abonoInicialId: null
                        });
                    } else {
                        // Venta normal sobre equipo disponible
                        batch.update(ref, {
                            estado: 'vendido',
                            ventaAsociadaId: venta.id,
                            fechaVenta: ahora
                        });
                    }
                }
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

            // ════════════════════════════════════════════════════════════════
            // POST-BATCH: append al historial de abonos (FUERA del batch)
            // ────────────────────────────────────────────────────────────────
            // Por qué se hace aparte:
            //   - writeBatch NO soporta arrayUnion (es operación server-only)
            //   - Necesitamos append atómico, no overwrite (concurrencia)
            //   - Si este paso falla, el batch ya commiteó estado='abonado'
            //     pero el historial no creció. El operador lo verá en el
            //     próximo render como un equipo abonado sin entradas (raro
            //     pero recuperable manualmente). Loggeamos para auditoría.
            // ════════════════════════════════════════════════════════════════
            if (esAbono) {
                for (const id of equiposIds) {
                    if (!id) continue;
                    const entrada = {
                        ventaId: venta.id,
                        fecha: datosAbono.fecha,
                        monto: datosAbono.monto,
                        cliente: datosAbono.cliente,
                        fechaRegistro: ahora,
                        sedeId: localStorage.getItem('usuario_sede_id') || 'sede_1'
                    };
                    const res = await this.agregarEntradaHistorialAbono(id, entrada);
                    if (!res.exito) {
                        console.warn(`⚠️ No se pudo append al historial de abonos para ${id}:`, res.error);
                    }
                }
            }

            console.log(`✅ Batch venta+inventario commiteado: ${equiposIds.length} ${esAbono ? 'abonados' : 'vendidos'}, ${tradeInsNuevos.length} trade-ins nuevos, ${equiposLiberar.length} liberados, ${tradeInsEliminar.length} eliminados`);
            return { exito: true };
        } catch (error) {
            console.error('❌ Error en batch venta+inventario:', error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Append atómico a historialAbonos de un equipo.
     *
     * Helper interno usado por commitVentaConInventario cuando la venta es
     * de tipo 'abono'. Por qué está fuera del batch: arrayUnion no se puede
     * mezclar con writeBatch (es una operación de FieldValue, no un doc ref).
     *
     * Idempotencia: si dos operadores hacen abonos simultáneos sobre el mismo
     * equipo, Firestore serializa las operaciones arrayUnion y ambas entradas
     * se conservan (no se pisan).
     *
     * Si el doc no tiene el campo historialAbonos (equipo viejo), Firestore
     * lo crea automáticamente con la primera entrada.
     */
    async agregarEntradaHistorialAbono(equipoId, entrada) {
        if (!equipoId) return { exito: false, error: 'ID inválido' };
        try {
            const docRef = doc(db, `${this._getBasePath()}/inventario`, equipoId);
            await updateDoc(docRef, {
                historialAbonos: arrayUnion(entrada)
            });
            // Sellar abonoInicialId si todavía no existe
            const snap = await getDoc(docRef);
            if (snap.exists() && !snap.data().abonoInicialId) {
                await updateDoc(docRef, { abonoInicialId: entrada.ventaId });
            }
            return { exito: true };
        } catch (error) {
            console.error(`❌ Error al agregar entrada de historial de abono:`, error);
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

            // 2) Restaurar equipos vendidos/abonados a "disponible"
            // Soporta tanto singular (venta.equipo) como plural (venta.equipos[])
            const equipos = [];
            if (Array.isArray(venta.equipos) && venta.equipos.length > 0) {
                equipos.push(...venta.equipos);
            } else if (venta.equipo && venta.equipo.imei) {
                equipos.push(venta.equipo);
            }

            const esEliminacionDeAbono = venta.tipoTransaccion === 'abono';

            equipos.forEach(eq => {
                if (!eq || !eq.imei) return;
                const inv = this.buscarPorImei(eq.imei);
                if (!inv) return;

                if (inv.estado === 'vendido') {
                    // Caso legacy: venta normal → libera el equipo
                    const ref = doc(db, `${sedePath}/inventario`, inv.id);
                    batch.update(ref, {
                        estado: 'disponible',
                        ventaAsociadaId: null,
                        fechaVenta: null
                    });
                } else if (inv.estado === 'abonado') {
                    // Caso nuevo: eliminando una venta de tipo 'abono'
                    // → el equipo vuelve a 'disponible' y removemos
                    //   la entrada del historial correspondiente a esta venta.
                    // ⚠️ arrayRemove tampoco se puede usar en writeBatch,
                    //   así que lo hacemos post-batch abajo.
                    const ref = doc(db, `${sedePath}/inventario`, inv.id);
                    // Decidir si es el ÚLTIMO abono o no:
                    //   - Si era el único → vuelve a 'disponible' y limpia
                    //     historialAbonos completo
                    //   - Si hay varios → queda en 'abonado' y quitamos
                    //     solo esta entrada (post-batch)
                    const esUltimoAbono = !Array.isArray(inv.historialAbonos)
                        || inv.historialAbonos.length <= 1
                        || (inv.historialAbonos.length === 1
                            && inv.historialAbonos[0].ventaId === venta.id);

                    if (esUltimoAbono) {
                        batch.update(ref, {
                            estado: 'disponible',
                            historialAbonos: [],
                            abonoInicialId: null,
                            fechaUltimoAbono: null
                        });
                    }
                    // Si no es el último, solo el estado se queda en 'abonado'
                    // y el filtro del historial se hace post-batch.
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

            // ════════════════════════════════════════════════════════════════
            // POST-BATCH: si era un abono NO-último, removemos la entrada
            // específica del historialAbonos con arrayRemove.
            // (arrayRemove no funciona dentro de writeBatch, por eso esto
            //  se hace aquí, fuera del batch).
            // ════════════════════════════════════════════════════════════════
            if (esEliminacionDeAbono) {
                for (const eq of equipos) {
                    if (!eq || !eq.imei) continue;
                    const inv = this.buscarPorImei(eq.imei);
                    if (!inv || inv.estado !== 'abonado') continue;
                    if (!Array.isArray(inv.historialAbonos) || inv.historialAbonos.length === 0) continue;

                    // Buscar la entrada exacta de esta venta
                    const entrada = inv.historialAbonos.find(h => h.ventaId === venta.id);
                    if (entrada) {
                        try {
                            const ref = doc(db, `${sedePath}/inventario`, inv.id);
                            await updateDoc(ref, {
                                historialAbonos: arrayRemove(entrada)
                            });
                            // Si después de quitar ya no queda ninguna entrada, dejar el array []
                            // (Firestore ya lo deja así con arrayRemove sobre el último elemento,
                            //  pero por seguridad verificamos que el campo siga vacío)
                        } catch (e) {
                            console.warn(`⚠️ No se pudo remover entrada del historial de ${eq.imei}:`, e.message);
                        }
                    }
                }
            }

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
