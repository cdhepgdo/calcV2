/**
 * Servicio de Almacenamiento
 * Maneja toda la persistencia de datos en LocalStorage
 */

import { STORAGE_KEYS } from '../config/constants.js';
import { Venta } from '../models/Venta.js';
import { Movimiento } from '../models/Movimiento.js';
import { Caja } from '../models/Caja.js';

class StorageService {
    constructor() {
        this.inicializarStorage();
    }
    
    /**
     * Inicializa el storage si no existe
     */
    inicializarStorage() {
        if (!localStorage.getItem(STORAGE_KEYS.VENTAS)) {
            localStorage.setItem(STORAGE_KEYS.VENTAS, JSON.stringify([]));
        }
        if (!localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS)) {
            localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify([]));
        }
        if (!localStorage.getItem(STORAGE_KEYS.CAJA_INICIAL)) {
            localStorage.setItem(STORAGE_KEYS.CAJA_INICIAL, JSON.stringify({ cajaInicial: 0, fecha: new Date().toLocaleDateString('es-ES') }));
        }
    }
    
    // ========== VENTAS ==========
    
    /**
     * Obtiene todas las ventas
     */
    obtenerVentas() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.VENTAS);
            const ventasJSON = JSON.parse(data) || [];
            return ventasJSON.map(v => Venta.fromJSON(v));
        } catch (error) {
            console.error('Error al obtener ventas:', error);
            return [];
        }
    }
    
    /**
     * Guarda una nueva venta
     */
    guardarVenta(venta) {
        try {
            const ventas = this.obtenerVentas();
            ventas.push(venta);
            localStorage.setItem(STORAGE_KEYS.VENTAS, JSON.stringify(ventas.map(v => v.toJSON())));
            return { exito: true };
        } catch (error) {
            console.error('Error al guardar venta:', error);
            return { exito: false, error: error.message };
        }
    }
    
    /**
     * Actualiza una venta existente
     */
    actualizarVenta(ventaActualizada) {
        try {
            const ventas = this.obtenerVentas();
            const index = ventas.findIndex(v => v.id === ventaActualizada.id);
            
            if (index === -1) {
                return { exito: false, error: 'Venta no encontrada' };
            }
            
            ventas[index] = ventaActualizada;
            localStorage.setItem(STORAGE_KEYS.VENTAS, JSON.stringify(ventas.map(v => v.toJSON())));
            return { exito: true };
        } catch (error) {
            console.error('Error al actualizar venta:', error);
            return { exito: false, error: error.message };
        }
    }
    
    /**
     * Elimina una venta
     */
    eliminarVenta(ventaId) {
        try {
            const ventas = this.obtenerVentas();
            const ventasFiltradas = ventas.filter(v => v.id !== ventaId);
            localStorage.setItem(STORAGE_KEYS.VENTAS, JSON.stringify(ventasFiltradas.map(v => v.toJSON())));
            return { exito: true };
        } catch (error) {
            console.error('Error al eliminar venta:', error);
            return { exito: false, error: error.message };
        }
    }
    
    // ========== MOVIMIENTOS ==========
    
    /**
     * Obtiene todos los movimientos
     */
    obtenerMovimientos() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS);
            const movimientosJSON = JSON.parse(data) || [];
            return movimientosJSON.map(m => Movimiento.fromJSON(m));
        } catch (error) {
            console.error('Error al obtener movimientos:', error);
            return [];
        }
    }
    
    /**
     * Guarda un nuevo movimiento
     */
    guardarMovimiento(movimiento) {
        try {
            const movimientos = this.obtenerMovimientos();
            movimientos.push(movimiento);
            localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(movimientos.map(m => m.toJSON())));
            return { exito: true };
        } catch (error) {
            console.error('Error al guardar movimiento:', error);
            return { exito: false, error: error.message };
        }
    }
    
    // ========== CAJA ==========
    
    /**
     * Obtiene la caja inicial
     */
    obtenerCajaInicial() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CAJA_INICIAL);
            const cajaJSON = JSON.parse(data);
            return Caja.fromJSON(cajaJSON);
        } catch (error) {
            console.error('Error al obtener caja inicial:', error);
            return new Caja(0);
        }
    }
    
    /**
     * Guarda la caja inicial
     */
    guardarCajaInicial(caja) {
        try {
            localStorage.setItem(STORAGE_KEYS.CAJA_INICIAL, JSON.stringify(caja.toJSON()));
            return { exito: true };
        } catch (error) {
            console.error('Error al guardar caja inicial:', error);
            return { exito: false, error: error.message };
        }
    }

    // ========== CIERRE DE CAJA ==========
        
    /**
     * Guarda el cierre de caja del día
     */
    guardarCierreCaja(monto) {
        try {
            const datosCierre = {
                monto: monto,
                fecha: new Date().toLocaleDateString('es-ES')
            };
            localStorage.setItem(STORAGE_KEYS.CIERRE_CAJA, JSON.stringify(datosCierre));
            return { exito: true };
        } catch (error) {
            console.error('Error al guardar cierre de caja:', error);
            return { exito: false, error: error.message };
        }
    }
    /**
     * Obtiene el último cierre de caja
     */
    obtenerCierreCaja() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CIERRE_CAJA);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error al obtener cierre de caja:', error);
            return null;
        }
    }
    
    // ========== UTILIDADES ==========
    
    /**
     * Limpia todos los datos (usar con precaución)
     */
    limpiarTodo() {
        try {
            localStorage.removeItem(STORAGE_KEYS.VENTAS);
            localStorage.removeItem(STORAGE_KEYS.MOVIMIENTOS);
            localStorage.removeItem(STORAGE_KEYS.CAJA_INICIAL);
            this.inicializarStorage();
            return { exito: true };
        } catch (error) {
            console.error('Error al limpiar storage:', error);
            return { exito: false, error: error.message };
        }
    }
    
    /**
     * Exporta todos los datos como JSON
     */
    exportarDatos() {
        return {
            ventas: this.obtenerVentas().map(v => v.toJSON()),
            movimientos: this.obtenerMovimientos().map(m => m.toJSON()),
            cajaInicial: this.obtenerCajaInicial().toJSON(),
            fechaExportacion: new Date().toISOString()
        };
    }
    
    /**
     * Importa datos desde un JSON
     */
    importarDatos(datos) {
        try {
            if (datos.ventas) {
                localStorage.setItem(STORAGE_KEYS.VENTAS, JSON.stringify(datos.ventas));
            }
            if (datos.movimientos) {
                localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(datos.movimientos));
            }
            if (datos.cajaInicial) {
                localStorage.setItem(STORAGE_KEYS.CAJA_INICIAL, JSON.stringify(datos.cajaInicial));
            }
            return { exito: true };
        } catch (error) {
            console.error('Error al importar datos:', error);
            return { exito: false, error: error.message };
        }
    }
}

// Exportar una instancia única (Singleton)
export const storageService = new StorageService();
