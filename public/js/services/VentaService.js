/**
 * Servicio de Ventas
 * Maneja toda la lógica de negocio relacionada con ventas
 */

import { Venta } from '../models/Venta.js';
import { storageService } from './StorageService.js';
import { MENSAJES } from '../config/constants.js';

class VentaService {
    /**
     * Crea y guarda una nueva venta
     */
    crearVenta(datosVenta) {
        const venta = new Venta(datosVenta);
        
        // Validar
        const validacion = venta.validar();
        if (!validacion.valido) {
            return {
                exito: false,
                errores: validacion.errores
            };
        }
        
        // Guardar
        const resultado = storageService.guardarVenta(venta);
        
        if (resultado.exito) {
            return {
                exito: true,
                mensaje: MENSAJES.VENTA_REGISTRADA,
                venta
            };
        } else {
            return {
                exito: false,
                errores: [resultado.error]
            };
        }
    }
    
    /**
     * Actualiza una venta existente
     */
    actualizarVenta(datosVenta) {
        const venta = new Venta(datosVenta);
        
        // Validar
        const validacion = venta.validar();
        if (!validacion.valido) {
            return {
                exito: false,
                errores: validacion.errores
            };
        }
        
        // Actualizar
        const resultado = storageService.actualizarVenta(venta);
        
        if (resultado.exito) {
            return {
                exito: true,
                mensaje: MENSAJES.VENTA_ACTUALIZADA,
                venta
            };
        } else {
            return {
                exito: false,
                errores: [resultado.error]
            };
        }
    }
    
    /**
     * Elimina una venta
     */
    eliminarVenta(ventaId) {
        const resultado = storageService.eliminarVenta(ventaId);
        
        if (resultado.exito) {
            return {
                exito: true,
                mensaje: MENSAJES.VENTA_ELIMINADA
            };
        } else {
            return {
                exito: false,
                errores: [resultado.error]
            };
        }
    }
    
    /**
     * Obtiene todas las ventas
     */
    obtenerVentas() {
        return storageService.obtenerVentas();
    }
    
    /**
     * Obtiene una venta por ID
     */
    obtenerVentaPorId(ventaId) {
        const ventas = this.obtenerVentas();
        return ventas.find(v => v.id === ventaId);
    }
    
    /**
     * Calcula el total de ventas del día (excluyendo abonos)
     */
    calcularTotalDia() {
        const ventas = this.obtenerVentas();
        return ventas
            .filter(v => v.tipoTransaccion !== 'abono')
            .reduce((total, venta) => total + venta.montoTotal, 0);
    }
    
    /**
     * Cuenta los equipos vendidos (excluyendo abonos y ventas solo de accesorios)
     */
    contarEquiposVendidos() {
        const ventas = this.obtenerVentas();
        return ventas.filter(v => 
            v.tipoVenta === 'completa' && v.tipoTransaccion !== 'abono'
        ).length;
    }
    
    /**
     * Calcula el efectivo total del día
     */
    calcularEfectivoDelDia() {
        const ventas = this.obtenerVentas();
        return ventas.reduce((total, venta) => total + venta.calcularEfectivo(), 0);
    }
    
    /**
     * Obtiene ventas filtradas por criterios
     */
    filtrarVentas(criterios = {}) {
        let ventas = this.obtenerVentas();
        
        if (criterios.fecha) {
            ventas = ventas.filter(v => v.fecha === criterios.fecha);
        }
        
        if (criterios.formaPago) {
            ventas = ventas.filter(v => v.formaPago === criterios.formaPago);
        }
        
        if (criterios.tipoVenta) {
            ventas = ventas.filter(v => v.tipoVenta === criterios.tipoVenta);
        }
        
        if (criterios.tipoTransaccion) {
            ventas = ventas.filter(v => v.tipoTransaccion === criterios.tipoTransaccion);
        }
        
        if (criterios.busqueda) {
            const busqueda = criterios.busqueda.toLowerCase();
            ventas = ventas.filter(v => 
                v.cliente.nombre.toLowerCase().includes(busqueda) ||
                v.cliente.cedula.toLowerCase().includes(busqueda) ||
                v.equipo.modelo.toLowerCase().includes(busqueda)
            );
        }
        
        return ventas;
    }
    
    /**
     * Obtiene estadísticas de ventas
     */
    obtenerEstadisticas() {
        const ventas = this.obtenerVentas();
        const ventasCompletas = ventas.filter(v => v.tipoTransaccion !== 'abono');
        
        // Ventas por forma de pago
        const ventasPorFormaPago = {};
        ventasCompletas.forEach(v => {
            if (!ventasPorFormaPago[v.formaPago]) {
                ventasPorFormaPago[v.formaPago] = { cantidad: 0, monto: 0 };
            }
            ventasPorFormaPago[v.formaPago].cantidad++;
            ventasPorFormaPago[v.formaPago].monto += v.montoTotal;
        });
        
        // Modelos más vendidos
        const modelosVendidos = {};
        ventasCompletas
            .filter(v => v.tipoVenta === 'completa')
            .forEach(v => {
                const modelo = v.equipo.modelo;
                modelosVendidos[modelo] = (modelosVendidos[modelo] || 0) + 1;
            });
        
        return {
            totalVentas: ventasCompletas.length,
            montoTotal: this.calcularTotalDia(),
            equiposVendidos: this.contarEquiposVendidos(),
            ventasPorFormaPago,
            modelosVendidos
        };
    }
}

// Exportar una instancia única (Singleton)
export const ventaService = new VentaService();
