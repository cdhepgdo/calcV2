/**
 * Servicio de Ventas
 * Maneja toda la lógica de negocio relacionada con ventas
 */

import { Venta } from '../models/Venta.js';
import { storageService } from './StorageService.js';
import { inventarioService } from './InventarioService.js';
import { MENSAJES } from '../config/constants.js';

class VentaService {
    /**
     * Crea y guarda una nueva venta
     */
    async crearVenta(datosVenta) {
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
        const resultado = await storageService.guardarVenta(venta);

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
    async actualizarVenta(datosVenta) {
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
        const resultado = await storageService.actualizarVenta(venta);

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
    async eliminarVenta(ventaId) {
        try {
            // 1. Primero obtener los datos de la venta antes de eliminarla
            const venta = await storageService.obtenerVentaPorId(ventaId);
            if (!venta) {
                return {
                    exito: false,
                    errores: ['❌ No se encontró la venta a eliminar']
                };
            }

            // 2. Si la venta tenía un equipo vendido del inventario, restaurarlo a "disponible"
            if (venta.equipo && venta.equipo.imei) {
                try {
                    const equipoExistente = inventarioService.buscarPorImei(venta.equipo.imei);
                    if (equipoExistente && equipoExistente.estado === 'vendido') {
                        await inventarioService.marcarDisponible(equipoExistente.id);
                        console.log(`✅ Equipo ${venta.equipo.imei} restaurado a "disponible" tras eliminar venta`);
                    }
                } catch (error) {
                    console.warn('⚠️ No se pudo restaurar equipo del inventario:', error);
                    // Continuamos con la eliminación aunque falle la restauración
                }
            }

            // 3. Si la venta tenía trade-in (equipo recibido), eliminarlo del inventario
            if (venta.equipoRecibido && venta.equipoRecibido.imei) {
                try {
                    const equipoTradeIn = inventarioService.buscarPorImei(venta.equipoRecibido.imei);
                    
                    if (equipoTradeIn) {
                        let debeEliminar = false;
                        
                        // CASO 1: Trade-in está "disponible" → Eliminar siempre
                        if (equipoTradeIn.estado === 'disponible') {
                            debeEliminar = true;
                            console.log(`ℹ️ Trade-in ${venta.equipoRecibido.imei} está disponible → se eliminará`);
                        }
                        
                        // CASO 2: Trade-in está "vendido" → Verificar si pertenece a OTRA venta
                        else if (equipoTradeIn.estado === 'vendido') {
                            // Verificar si fue vendido en otra venta diferente
                            const ventas = await storageService.obtenerVentas();
                            const fueVendidoEnOtraVenta = ventas.some(v => 
                                v.id !== ventaId && 
                                v.equipo?.imei === venta.equipoRecibido.imei
                            );
                            
                            if (fueVendidoEnOtraVenta) {
                                // El trade-in se vendió en otra venta → NO eliminar
                                debeEliminar = false;
                                console.log(`ℹ️ Trade-in ${venta.equipoRecibido.imei} fue vendido en otra venta → NO se eliminará`);
                            } else {
                                // El trade-in NO fue vendido en otra venta → Eliminar
                                debeEliminar = true;
                                console.log(`ℹ️ Trade-in ${venta.equipoRecibido.imei} no fue vendido en otra venta → se eliminará`);
                            }
                        }
                        
                        // CASO 3: Trade-in con cualquier otro estado (defectuoso, etc.) → Verificar origen
                        else {
                            const esDeEstaVenta = equipoTradeIn.origen && (
                                equipoTradeIn.origen.includes(`Venta: ${venta.id}`) ||
                                equipoTradeIn.origen.includes('Trade-in')
                            );
                            debeEliminar = esDeEstaVenta;
                            console.log(`ℹ️ Trade-in ${venta.equipoRecibido.imei} estado: ${equipoTradeIn.estado}, origen: ${equipoTradeIn.origen} → ${debeEliminar ? 'se eliminará' : 'NO se eliminará'}`);
                        }
                        
                        if (debeEliminar) {
                            await inventarioService.eliminarEquipo(equipoTradeIn.id);
                            console.log(`✅ Trade-in ${venta.equipoRecibido.imei} eliminado del inventario tras eliminar venta`);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ No se pudo eliminar trade-in del inventario:', error);
                    // Continuamos con la eliminación
                }
            }

            // 4. Ahora eliminar la venta
            const resultado = await storageService.eliminarVenta(ventaId);

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
        } catch (error) {
            console.error('❌ Error en el proceso de eliminación de venta:', error);
            return {
                exito: false,
                errores: ['❌ Error al eliminar la venta: ' + error.message]
            };
        }
    }

    /**
     * Obtiene todas las ventas
     */
    async obtenerVentas() {
        return await storageService.obtenerVentas();
    }

    /**
     * Obtiene una venta por ID
     */
    async obtenerVentaPorId(ventaId) {
        const ventas = await this.obtenerVentas();
        return ventas.find(v => v.id === ventaId);
    }

    /**
     * Calcula el total de ventas del día de HOY (excluyendo abonos)
     */
    async calcularTotalDia() {
        const ventas = await this.obtenerVentas();
        const fechaHoy = new Date().toLocaleDateString('es-ES');

        return ventas
            .filter(v => v.fecha === fechaHoy)
            .filter(v => v.tipoTransaccion !== 'abono')
            .reduce((total, venta) => total + venta.montoTotal, 0);
    }

    /**
     * Cuenta los equipos vendidos (excluyendo abonos y ventas solo de accesorios)
     */
    async contarEquiposVendidos() {
        const ventas = await this.obtenerVentas();
        const fechaHoy = new Date().toLocaleDateString('es-ES');

        return ventas.filter(v =>
            v.fecha === fechaHoy &&
            v.tipoVenta === 'completa' &&
            v.tipoTransaccion !== 'abono'
        ).length;
    }

    /**
     * Calcula el efectivo total del día
     */
    async calcularEfectivoDelDia() {
        const ventas = await this.obtenerVentas();
        return ventas.reduce((total, venta) => total + venta.calcularEfectivo(), 0);
    }

    /**
     * Obtiene ventas filtradas por criterios
     */
    async filtrarVentas(criterios = {}) {
        let ventas = await this.obtenerVentas();

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
    async obtenerEstadisticas() {
        const ventas = await this.obtenerVentas();
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
            montoTotal: await this.calcularTotalDia(),
            equiposVendidos: await this.contarEquiposVendidos(),
            ventasPorFormaPago,
            modelosVendidos
        };
    }
}

// Exportar una instancia única (Singleton)
export const ventaService = new VentaService();
