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
