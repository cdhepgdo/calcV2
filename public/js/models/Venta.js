/**
 * Modelo de Venta
 * Representa una venta de iPhone y/o accesorios
 */

export class Venta {
    constructor(data = {}) {
        this.id = data.id || this.generarId();
        this.fecha = data.fecha || new Date().toLocaleDateString('es-ES');
        this.hora = data.hora || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        // Tipo de venta
        this.tipoVenta = data.tipoVenta || 'completa'; // 'completa' o 'accesorios'
        this.tipoTransaccion = data.tipoTransaccion || 'venta'; // 'venta' o 'abono'

        // Cliente
        this.cliente = data.cliente || {
            nombre: '',
            cedula: '',
            telefono: ''
        };

        // Equipo (si es venta completa)
        this.equipo = data.equipo || {
            modelo: '',
            color: '',
            almacenamiento: '',
            bateria: '',
            imei: '',
            garantia: ''
        };

        // Accesorios
        this.accesorios = data.accesorios || {
            forro: false,
            forros: [], // Array de {modelo, cantidad}
            cargador: false,
            cargadorCantidad: 0,
            vidrio: false,
            vidrios: [], // Array de {modelo, cantidad}
            otro: false,
            otros: [], // Array de {nombre, cantidad}
            protectorCamara: false,
            protectorCantidad: 0,
            cubo: false,
            cuboCantidad: 0,
            cableLightning: false,
            cableLightningCantidad: 0,
            cableCC: false,
            cableCCCantidad: 0,
            caja: false,
            cajaModelo: null,
            cajaColor: null,
            cajaCantidad: 0
        };

        // Pago
        this.formaPago = data.formaPago || '';
        this.montoTotal = data.montoTotal || 0;
        this.montoPago = data.montoPago || null; // Monto del pago (para WEPPA con efectivo/zelle/binance)
        this.pagoMixto = data.pagoMixto || null;
        this.pagoMovilDetalles = data.pagoMovilDetalles || null;
        this.transferenciaDetalles = data.transferenciaDetalles || null;

        // Equipo recibido
        this.equipoRecibido = data.equipoRecibido || null;

        // Abonos previos (para cierres)
        this.abonosPrevios = data.abonosPrevios || []; // Array de {fecha, monto}
        this.totalAbonosPrevios = data.totalAbonosPrevios || 0;

        // Extras
        this.weppa = data.weppa || false;
        this.notaVentaDetalles = data.notaVentaDetalles || null;
    }

    generarId() {
        return `venta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Valida que la venta tenga todos los datos requeridos
     */
    validar() {
        const errores = [];

        // Validar forma de pago
        if (!this.formaPago) {
            errores.push('Debe seleccionar una forma de pago');
        }

        // Validar monto
        if (!this.montoTotal || this.montoTotal <= 0) {
            errores.push('El monto total debe ser mayor a $0.00');
        }

        // Validar datos del equipo si es venta completa
        if (this.tipoVenta === 'completa') {
            if (!this.equipo.modelo) errores.push('Debe seleccionar un modelo de iPhone');
            if (!this.equipo.color) errores.push('Debe seleccionar un color');
            if (!this.equipo.almacenamiento) errores.push('Debe seleccionar capacidad de almacenamiento');
            if (!this.equipo.bateria) errores.push('Debe ingresar el porcentaje de batería');
            if (!this.equipo.garantia) errores.push('Debe seleccionar el tipo de garantía');

            // Validar datos del cliente
            if (!this.cliente.nombre) errores.push('Debe ingresar el nombre del cliente');
            if (!this.cliente.cedula) errores.push('Debe ingresar la cédula del cliente');
            if (!this.cliente.telefono) errores.push('Debe ingresar el teléfono del cliente');
        }
        if (this.equipoRecibido) {
            if (!this.equipoRecibido.modelo) errores.push('Debe seleccionar un modelo de iPhone recibido');
            if (!this.equipoRecibido.color) errores.push('Debe seleccionar un color del equipo recibido');
            if (!this.equipoRecibido.capacidad) errores.push('Debe seleccionar capacidad de almacenamiento del equipo recibido');
            if (!this.equipoRecibido.bateria) errores.push('Debe ingresar el porcentaje de batería del equipo recibido');
            if (!this.equipoRecibido.imei) errores.push('Debe ingresar el imei del equipo recibido');
            if (!this.equipoRecibido.valor) errores.push('Debe ingresar el valor del equipo recibido');

        }

        // Validar montos según forma de pago
        if (this.formaPago === 'mixto' && this.pagoMixto) {
            // VALIDACIÓN PAGO MIXTO
            const totalPagoMixto = (this.pagoMixto.efectivo || 0) +
                (this.pagoMixto.zelle || 0) +
                (this.pagoMixto.binance || 0) +
                (this.pagoMixto.pagoMovil || 0) +
                (this.pagoMixto.transferencia || 0);

            // Agregar equipo recibido al cálculo
            const equipoRecibidoValor = this.equipoRecibido ? this.equipoRecibido.valor : 0;
            const totalEsperado = totalPagoMixto + equipoRecibidoValor + (this.totalAbonosPrevios || 0);
            const diferencia = Math.abs(totalEsperado - this.montoTotal);

            if (diferencia > 0.01 && !this.weppa) {
                errores.push(`El total del pago mixto ($${totalPagoMixto.toFixed(2)}) + equipo recibido ($${equipoRecibidoValor.toFixed(2)}) no coincide con el monto total ($${this.montoTotal.toFixed(2)}). Active WEPPA si es intencional.`);
            }

        } else if (this.formaPago === 'pagomovil') {
            if (!this.pagoMovilDetalles) {
                errores.push(`Coloca la tasa`)
            } else {
                // VALIDACIÓN PAGO MÓVIL
                const equipoRecibidoValor = this.equipoRecibido ? this.equipoRecibido.valor : 0;
                const totalEsperado = this.pagoMovilDetalles.dolares + equipoRecibidoValor + (this.totalAbonosPrevios || 0);
                const diferencia = this.montoTotal - totalEsperado;
                console.log('pagomovilio', diferencia)
                if (diferencia > 0.01 && !this.weppa) {
                    errores.push(`El monto total ($${this.montoTotal.toFixed(2)}) no puede ser mayor al pago móvil ($${this.pagoMovilDetalles.dolares.toFixed(2)}) + equipo recibido ($${equipoRecibidoValor.toFixed(2)}). Active WEPPA si es intencional.`);
                } else if (diferencia < 0 && !this.weppa) {
                    errores.push(`El monto total ($${this.montoTotal.toFixed(2)}) no puede ser menor al pago móvil ($${this.pagoMovilDetalles.dolares.toFixed(2)}) + equipo recibido ($${equipoRecibidoValor.toFixed(2)}). Active WEPPA si es intencional.`);
                }
            }

        } else if (this.formaPago === 'transferencia') {
            if (!this.transferenciaDetalles) {
                errores.push(`Coloca la Tasa`)
            } else {
                // VALIDACIÓN TRANSFERENCIA
                const equipoRecibidoValor = this.equipoRecibido ? this.equipoRecibido.valor : 0;
                const totalEsperado = this.transferenciaDetalles.dolares + equipoRecibidoValor + (this.totalAbonosPrevios || 0);
                const diferencia = this.montoTotal - totalEsperado;

                if (diferencia > 0.01 && !this.weppa) {
                    errores.push(`El monto total ($${this.montoTotal.toFixed(2)}) no puede ser mayor a la transferencia ($${this.transferenciaDetalles.dolares.toFixed(2)}) + equipo recibido ($${equipoRecibidoValor.toFixed(2)}). Active WEPPA si es intencional.`);
                } else if (diferencia < 0 && !this.weppa) {
                    errores.push(`El monto total ($${this.montoTotal.toFixed(2)}) no puede ser menor a la transferencia ($${this.transferenciaDetalles.dolares.toFixed(2)}) + equipo recibido ($${equipoRecibidoValor.toFixed(2)}). Active WEPPA si es intencional.`);
                }
            }

        } else if (['efectivo', 'zelle', 'binance'].includes(this.formaPago)) {
            // VALIDACIÓN PAGOS SIMPLES (efectivo, zelle, binance)
            // Para estos métodos, el montoTotal debe ser igual o menor al ingresado
            // La validación principal ya se hace en el submit con calcularMontoTotal()
            // Aquí solo validamos que sea positivo
            if (this.montoTotal <= 0) {
                errores.push('El monto total debe ser mayor a cero.');
            }
        }

        // validar accesorios
         // validar accesorios
        if (this.tipoVenta === 'accesorios') {
            const acc = this.accesorios;
            const tieneAccesorios = acc.forro || acc.cargador || acc.vidrio || 
                                  acc.otro || acc.protectorCamara || acc.cubo || 
                                  acc.cableLightning || acc.cableCC || acc.caja;
            if (!tieneAccesorios) {
                errores.push('Debe seleccionar al menos un accesorio para la venta.');
            }
        }
        if (this.accesorios.forro) {
            if (!this.accesorios.forros || this.accesorios.forros.length === 0) errores.push('Debe seleccionar al menos un modelo de Forro');
        }
        if (this.accesorios.vidrio) {
            if (!this.accesorios.vidrios || this.accesorios.vidrios.length === 0) errores.push('Debe seleccionar al menos un modelo de Vidrio');
        }
        if (this.accesorios.otro) {
            if (!this.accesorios.otros || this.accesorios.otros.length === 0) errores.push('Debe especificar al menos un accesorio en la opción Otro');
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }

    /**
     * Calcula el efectivo involucrado en esta venta
     */
    calcularEfectivo() {
        let efectivo = 0;

        if (this.formaPago === 'efectivo') {
            if (this.montoPago !== null && this.montoPago !== undefined) {
                efectivo = this.montoPago;
            } else {
                efectivo = this.montoTotal - (this.equipoRecibido ? this.equipoRecibido.valor : 0) - (this.totalAbonosPrevios || 0);
            }
        } else if (this.formaPago === 'mixto' && this.pagoMixto) {
            efectivo = this.pagoMixto.efectivo || 0;
        }

        return efectivo;
    }

    /**
     * Obtiene un resumen legible de los accesorios
     */
    obtenerResumenAccesorios() {
        const accesorios = [];

        if (this.accesorios.forro && this.accesorios.forros) {
            this.accesorios.forros.forEach(f => {
                accesorios.push(`Forro ${f.modelo || 'N/A'} (${f.cantidad})`);
            });
        }
        if (this.accesorios.cargador) {
            accesorios.push(`Cargador (${this.accesorios.cargadorCantidad})`);
        }
        if (this.accesorios.vidrio && this.accesorios.vidrios) {
            this.accesorios.vidrios.forEach(v => {
                accesorios.push(`Vidrio ${v.modelo || 'N/A'} (${v.cantidad})`);
            });
        }
        if (this.accesorios.otro && this.accesorios.otros) {
            this.accesorios.otros.forEach(o => {
                accesorios.push(`${o.nombre || 'Otro'} (${o.cantidad})`);
            });
        }
        if (this.accesorios.protectorCamara) {
            accesorios.push(`Protector Cámara (${this.accesorios.protectorCantidad})`);
        }
        if (this.accesorios.cubo) {
            accesorios.push(`Cubo (${this.accesorios.cuboCantidad})`);
        }
        if (this.accesorios.cableLightning) {
            accesorios.push(`Cable Lightning (${this.accesorios.cableLightningCantidad})`);
        }
        if (this.accesorios.cableCC) {
            accesorios.push(`Cable C+C (${this.accesorios.cableCCCantidad})`);
        }
        if (this.accesorios.caja) {
            accesorios.push(`Caja ${this.accesorios.cajaModelo || 'N/A'} ${this.accesorios.cajaColor || 'N/A'} (${this.accesorios.cajaCantidad})`);
        }

        return accesorios;
    }

    /**
     * Convierte la venta a un objeto plano para almacenamiento
     */
    toJSON() {
        return {
            id: this.id,
            fecha: this.fecha,
            hora: this.hora,
            tipoVenta: this.tipoVenta,
            tipoTransaccion: this.tipoTransaccion,
            cliente: this.cliente,
            equipo: this.equipo,
            accesorios: this.accesorios,
            formaPago: this.formaPago,
            montoTotal: this.montoTotal,
            montoPago: this.montoPago,
            pagoMixto: this.pagoMixto,
            pagoMovilDetalles: this.pagoMovilDetalles,
            transferenciaDetalles: this.transferenciaDetalles,
            equipoRecibido: this.equipoRecibido,
            abonosPrevios: this.abonosPrevios,
            totalAbonosPrevios: this.totalAbonosPrevios,
            weppa: this.weppa,
            notaVentaDetalles: this.notaVentaDetalles
        };
    }

    /**
     * Crea una instancia de Venta desde un objeto plano
     */
    static fromJSON(json) {
        return new Venta(json);
    }
}
