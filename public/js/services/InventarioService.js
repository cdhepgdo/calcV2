import { db } from '../config/firebase-config.js';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
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
    }

    _getBasePath() {
        const sedeId = localStorage.getItem('usuario_sede_id') || 'sede_1';
        return `sedes/${sedeId}`;
    }

    inicializar() {
        if (this._unsubscribe) return;
        
        console.log('🚀 Inicializando InventarioService (Sincronización en background)...');
        const q = query(
            collection(db, `${this._getBasePath()}/inventario`),
            where("tipoItem", "==", "equipo")
        );

        this._unsubscribe = onSnapshot(q, (snapshot) => {
            this._cacheInventario = snapshot.docs.map(docSnap =>
                EquipoInventario.fromJSON({ id: docSnap.id, ...docSnap.data() })
            );
            this._inventarioListo = true;
            console.log(`✅ Inventario sincronizado: ${this._cacheInventario.length} equipos`);
            this._notificarCambio();
        }, (error) => {
            console.error('❌ Error en listener de inventario:', error);
        });
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
            const docRef = doc(db, `${this._getBasePath()}/inventario`, equipo.id);
            const data = JSON.parse(JSON.stringify(equipo.toJSON())); 
            await setDoc(docRef, data);
            return { exito: true };
        } catch (error) {
            console.error('❌ Error al ingresar equipo individual:', error);
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
}

export const inventarioService = new InventarioService();
