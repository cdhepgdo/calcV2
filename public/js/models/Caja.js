/**
 * Modelo de Caja
 * Gestiona los cálculos de caja inicial, movimientos y caja final
 */

export class Caja {
    constructor(cajaInicial = 0) {
        this.cajaInicial = cajaInicial;
        this.fecha = new Date().toLocaleDateString('es-ES');
    }

    /**
     * Calcula la caja final basándose en ventas y movimientos
     */
    calcularCajaFinal(ventas = [], movimientos = []) {
        let efectivoVentas = 0;
        let ingresosEfectivo = 0;
        let salidasEfectivo = 0;
        let comprasEquipos = 0;
        let diferenciasGarantia = 0;  // Nuevo

        // Sumar efectivo de ventas
        ventas.forEach(venta => {
            if (venta.formaPago === 'efectivo') {
                if (venta.montoPago !== null && venta.montoPago !== undefined) {
                    efectivoVentas += venta.montoPago;
                } else {
                    efectivoVentas += venta.montoTotal - (venta.equipoRecibido ? venta.equipoRecibido.valor : 0) - (venta.totalAbonosPrevios || 0);
                }
            } else if (venta.formaPago === 'mixto' && venta.pagoMixto) {
                efectivoVentas += venta.pagoMixto.efectivo || 0;
            }
        });

        // Procesar movimientos
        movimientos.forEach(mov => {
            if (mov.tipo === 'Salida Efectivo') {
                salidasEfectivo += mov.datos.monto || 0;
            } else if (mov.tipo === 'Ingreso Efectivo') {
                ingresosEfectivo += mov.datos.monto || 0;
            } else if (mov.tipo === 'Compra Equipo') {
                comprasEquipos += mov.datos.precio || 0;
            } else if (mov.tipo === 'Cambio Garantía') {
                // Procesar diferencia de garantía
                const diferencia = mov.datos.diferencia || {};
                if (diferencia.tipo === 'favor-cliente') {
                    // Devolvemos dinero al cliente (resta)
                    diferenciasGarantia -= diferencia.monto || 0;
                } else if (diferencia.tipo === 'favor-tienda') {
                    // Cliente nos paga (suma)
                    diferenciasGarantia += diferencia.monto || 0;
                }
            }
        });

        return this.cajaInicial + efectivoVentas + ingresosEfectivo - salidasEfectivo - comprasEquipos + diferenciasGarantia;
    }

    /**
     * Obtiene un desglose detallado de la caja
     */
    obtenerDesglose(ventas = [], movimientos = []) {
        let efectivoVentas = 0;
        let ingresosEfectivo = 0;
        let salidasEfectivo = 0;
        let comprasEquipos = 0;
        let diferenciasGarantia = 0;  // Nuevo

        ventas.forEach(venta => {
            if (venta.formaPago === 'efectivo') {
                if (venta.montoPago !== null && venta.montoPago !== undefined) {
                    efectivoVentas += venta.montoPago;
                } else {
                    efectivoVentas += venta.montoTotal - (venta.equipoRecibido ? venta.equipoRecibido.valor : 0) - (venta.totalAbonosPrevios || 0);
                }
            } else if (venta.formaPago === 'mixto' && venta.pagoMixto) {
                efectivoVentas += venta.pagoMixto.efectivo || 0;
            }
        });

        movimientos.forEach(mov => {
            if (mov.tipo === 'Salida Efectivo') {
                salidasEfectivo += mov.datos.monto || 0;
            } else if (mov.tipo === 'Ingreso Efectivo') {
                ingresosEfectivo += mov.datos.monto || 0;
            } else if (mov.tipo === 'Compra Equipo') {
                comprasEquipos += mov.datos.precio || 0;
            } else if (mov.tipo === 'Cambio Garantía') {
                const diferencia = mov.datos.diferencia || {};
                if (diferencia.tipo === 'favor-cliente') {
                    diferenciasGarantia -= diferencia.monto || 0;
                } else if (diferencia.tipo === 'favor-tienda') {
                    diferenciasGarantia += diferencia.monto || 0;
                }
            }
        });

        const cajaFinal = this.cajaInicial + efectivoVentas + ingresosEfectivo - salidasEfectivo - comprasEquipos + diferenciasGarantia;

        return {
            cajaInicial: this.cajaInicial,
            efectivoVentas,
            ingresosEfectivo,
            salidasEfectivo,
            comprasEquipos,
            diferenciasGarantia,  // Nuevo
            cajaFinal
        };
    }

    /**
     * Valida que la caja inicial sea válida
     */
    validar() {
        const errores = [];

        if (this.cajaInicial < 0) {
            errores.push('La caja inicial no puede ser negativa');
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }

    /**
     * Convierte la caja a un objeto plano para almacenamiento
     */
    toJSON() {
        return {
            cajaInicial: this.cajaInicial,
            fecha: this.fecha
        };
    }

    /**
     * Crea una instancia de Caja desde un objeto plano
     */
    static fromJSON(json) {
        const caja = new Caja(json.cajaInicial);
        caja.fecha = json.fecha;
        return caja;
    }
}