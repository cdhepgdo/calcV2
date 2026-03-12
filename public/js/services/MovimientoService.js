/**
 * Servicio de Movimientos
 * Maneja toda la lógica de negocio relacionada con movimientos de inventario
 */

import { Movimiento } from '../models/Movimiento.js';
import { storageService } from './StorageService.js';
import { MENSAJES } from '../config/constants.js';

class MovimientoService {
    constructor() {
        // Inicializar array de movimientos
        this.movimientos = [];
    }
    
    /**
     * Crea y guarda un nuevo movimiento
     */
    crearMovimiento(datosMovimiento) {
        const movimiento = new Movimiento(datosMovimiento);
        
        // Validar
        const validacion = movimiento.validar();
        if (!validacion.valido) {
            return {
                exito: false,
                errores: validacion.errores
            };
        }
        
        // Guardar
        const resultado = storageService.guardarMovimiento(movimiento);
        
        if (resultado.exito) {
            return {
                exito: true,
                mensaje: MENSAJES.MOVIMIENTO_REGISTRADO,
                movimiento
            };
        } else {
            return {
                exito: false,
                errores: [resultado.error]
            };
        }
    }

    /**
     * Registra un cambio por garantía
     * @param {CambioGarantia} cambioGarantia - Datos del cambio
     * @returns {Object} - Resultado de la operación
     */
    registrarCambioGarantia(cambioGarantia) {
        // Validar datos
        const validacion = cambioGarantia.validar();
        if (!validacion.valido) {
            return {
                exito: false,
                errores: validacion.errores
            };
        }
        
        // Crear movimiento de tipo "Cambio Garantía"
        const movimiento = new Movimiento({
            tipo: 'Cambio Garantía',
            datos: cambioGarantia.toJSON()
        });
        
        // Guardar usando el mismo método que crearMovimiento
        const resultado = storageService.guardarMovimiento(movimiento);
        
        if (resultado.exito) {
            return {
                exito: true,
                mensaje: '✅ Cambio por garantía registrado correctamente',
                movimiento: movimiento
            };
        } else {
            return {
                exito: false,
                errores: ['Error al guardar el cambio por garantía']
            };
        }
    }

    
    /**
     * Obtiene todos los movimientos como instancias de Movimiento
     */
    obtenerMovimientos() {
        const movimientos = storageService.obtenerMovimientos();
        // Convertir cada objeto plano en instancia de Movimiento
        return movimientos.map(mov => {
            if (mov instanceof Movimiento) {
                return mov;
            }
            return Movimiento.fromJSON(mov);
        });
    }
    
    /**
     * Calcula el impacto total en efectivo de todos los movimientos
     */
    /* calcularImpactoEfectivo() {
        const movimientos = this.obtenerMovimientos();
        return movimientos.reduce((total, mov) => total + mov.calcularImpactoEfectivo(), 0);
    } */
    calcularImpactoEfectivo() {
        const movimientos = this.obtenerMovimientos();
        const fechaHoy = new Date().toLocaleDateString('es-ES');
        
        return movimientos
            .filter(mov => mov.fecha === fechaHoy) // Filtramos por hoy antes de sumar
            .reduce((total, mov) => total + mov.calcularImpactoEfectivo(), 0);
    }
    
    /**
     * Obtiene movimientos filtrados por tipo
     */
    filtrarPorTipo(tipo) {
        const movimientos = this.obtenerMovimientos();
        return movimientos.filter(m => m.tipo === tipo);
    }
    
    /**
     * Obtiene movimientos filtrados por fecha
     */
    filtrarPorFecha(fecha) {
        const movimientos = this.obtenerMovimientos();
        return movimientos.filter(m => m.fecha === fecha);
    }
    
    /**
     * Obtiene movimientos por fecha (formato Date)
     */
    obtenerPorFecha(fecha) {
        const fechaStr = fecha.toISOString().split('T')[0];
        const movimientos = this.obtenerMovimientos();
        return movimientos.filter(m => {
            const movFecha = new Date(m.fecha).toISOString().split('T')[0];
            return movFecha === fechaStr;
        });
    }
}

// Exportar una instancia única (Singleton)
export const movimientoService = new MovimientoService();

