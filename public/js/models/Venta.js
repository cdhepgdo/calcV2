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

        // Equipo (si es venta completa) — singular (compatibilidad con ventas viejas)
        this.equipo = data.equipo || {
            modelo: '',
            color: '',
            almacenamiento: '',
            bateria: '',
            imei: '',
            garantia: ''
        };

        // ════════════════════════════════════════════════════════════════
        // MULTI-EQUIPO: normalizar plural ↔ singular
        // Compatibilidad: ventas viejas (solo `equipo`) siguen funcionando.
        // Ventas nuevas usan el array `equipos`.
        // ════════════════════════════════════════════════════════════════
        if (Array.isArray(data.equipos)) {
            this.equipos = data.equipos;
        } else if (data.equipo) {
            this.equipos = [data.equipo];
        } else {
            this.equipos = [];
        }

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

        // Equipo recibido — singular (compatibilidad con ventas viejas)
        this.equipoRecibido = data.equipoRecibido || null;

        // MULTI-TRADE-IN: normalizar plural ↔ singular
        if (Array.isArray(data.equiposRecibidos)) {
            this.equiposRecibidos = data.equiposRecibidos;
        } else if (data.equipoRecibido) {
            this.equiposRecibidos = [data.equipoRecibido];
        } else {
            this.equiposRecibidos = [];
        }

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
            // Sincronizar singular con el primer elemento del array (compat multi-equipo)
            const eqPrincipal = (this.equipos && this.equipos[0]) || this.equipo;
            if (eqPrincipal) this.equipo = eqPrincipal;

            // Validar que haya al menos 1 equipo seleccionado
            if (!this.equipo || !this.equipo.modelo) {
                errores.push('Debe seleccionar al menos un equipo del inventario para la venta');
            } else {
                if (!this.equipo.color) errores.push('Debe seleccionar un color');
                if (!this.equipo.almacenamiento) errores.push('Debe seleccionar capacidad de almacenamiento');
                if (!this.equipo.bateria) errores.push('Falta el porcentaje de batería del equipo');
                if (!this.equipo.garantia) errores.push('Debe seleccionar el tipo de garantía');
                if (!this.equipo.imei) errores.push('Falta el IMEI del equipo');
            }

            // Validar datos del cliente
            if (!this.cliente.nombre) errores.push('Debe ingresar el nombre del cliente');
            if (!this.cliente.cedula) errores.push('Debe ingresar la cédula del cliente');
            if (!this.cliente.telefono) errores.push('Debe ingresar el teléfono del cliente');

            // Validar que cada equipo del array tenga los datos mínimos
            if (Array.isArray(this.equipos)) {
                this.equipos.forEach((eq, idx) => {
                    if (!eq || !eq.modelo) return; // ya reportado arriba
                    if (!eq.imei) errores.push(`El equipo #${idx + 1} no tiene IMEI`);
                    if (!eq.almacenamiento) errores.push(`El equipo #${idx + 1} no tiene capacidad de almacenamiento`);
                    if (eq.precio == null || eq.precio < 0) errores.push(`El equipo #${idx + 1} no tiene precio asignado`);
                });
            }
        }

        // Sincronizar singular con el primer elemento del array (compat multi-trade-in)
        if (this.equiposRecibidos && this.equiposRecibidos.length > 0) {
            this.equipoRecibido = this.equiposRecibidos[0];
        }

        if (this.equipoRecibido) {
            if (!this.equipoRecibido.modelo) errores.push('Debe seleccionar un modelo de iPhone recibido');
            if (!this.equipoRecibido.color) errores.push('Debe seleccionar un color del equipo recibido');
            if (!this.equipoRecibido.capacidad) errores.push('Debe seleccionar capacidad de almacenamiento del equipo recibido');
            if (!this.equipoRecibido.bateria) errores.push('Debe ingresar el porcentaje de batería del equipo recibido');
            if (!this.equipoRecibido.imei) errores.push('Debe ingresar el imei del equipo recibido');
            if (this.equipoRecibido.imei && this.equipoRecibido.imei.length < 15) {
                errores.push('El IMEI del equipo recibido debe tener al menos 15 caracteres');
            }
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

            // Sumar TODOS los equipos recibidos (plural o singular)
            const equipoRecibidoValor = this.sumarValoresRecibidos();
            const totalEsperado = totalPagoMixto + equipoRecibidoValor + (this.totalAbonosPrevios || 0);
            const diferencia = Math.abs(totalEsperado - this.montoTotal);

            if (diferencia > 0.01 && !this.weppa) {
                errores.push(`El total del pago mixto ($${totalPagoMixto.toFixed(2)}) + equipo(s) recibido(s) ($${equipoRecibidoValor.toFixed(2)}) no coincide con el monto total ($${this.montoTotal.toFixed(2)}). Active WEPPA si es intencional.`);
            }

        } else if (this.formaPago === 'pagomovil') {
            if (!this.pagoMovilDetalles) {
                errores.push(`Coloca la tasa`)
            } else {
                // VALIDACIÓN PAGO MÓVIL
                const equipoRecibidoValor = this.sumarValoresRecibidos();
                const totalEsperado = this.pagoMovilDetalles.dolares + equipoRecibidoValor + (this.totalAbonosPrevios || 0);
                const diferencia = this.montoTotal - totalEsperado;
                console.log('pagomovilio', diferencia)
                if (diferencia > 0.01 && !this.weppa) {
                    errores.push(`El monto total ($${this.montoTotal.toFixed(2)}) no puede ser mayor al pago móvil ($${this.pagoMovilDetalles.dolares.toFixed(2)}) + equipo(s) recibido(s) ($${equipoRecibidoValor.toFixed(2)}). Active WEPPA si es intencional.`);
                } else if (diferencia < 0 && !this.weppa) {
                    errores.push(`El monto total ($${this.montoTotal.toFixed(2)}) no puede ser menor al pago móvil ($${this.pagoMovilDetalles.dolares.toFixed(2)}) + equipo(s) recibido(s) ($${equipoRecibidoValor.toFixed(2)}). Active WEPPA si es intencional.`);
                }
            }

        } else if (this.formaPago === 'transferencia') {
            if (!this.transferenciaDetalles) {
                errores.push(`Coloca la Tasa`)
            } else {
                // VALIDACIÓN TRANSFERENCIA
                const equipoRecibidoValor = this.sumarValoresRecibidos();
                const totalEsperado = this.transferenciaDetalles.dolares + equipoRecibidoValor + (this.totalAbonosPrevios || 0);
                const diferencia = this.montoTotal - totalEsperado;

                if (diferencia > 0.01 && !this.weppa) {
                    errores.push(`El monto total ($${this.montoTotal.toFixed(2)}) no puede ser mayor a la transferencia ($${this.transferenciaDetalles.dolares.toFixed(2)}) + equipo(s) recibido(s) ($${equipoRecibidoValor.toFixed(2)}). Active WEPPA si es intencional.`);
                } else if (diferencia < 0 && !this.weppa) {
                    errores.push(`El monto total ($${this.montoTotal.toFixed(2)}) no puede ser menor a la transferencia ($${this.transferenciaDetalles.dolares.toFixed(2)}) + equipo(s) recibido(s) ($${equipoRecibidoValor.toFixed(2)}). Active WEPPA si es intencional.`);
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

        // WEPPA: la deuda total (montoTotal) debe ser >= a lo que el cliente paga HOY (inicial).
        // Si montoTotal < inicial, no es un crédito real, es un error de captura.
        if (this.weppa) {
            let inicial = this.sumarValoresRecibidos() + (this.totalAbonosPrevios || 0);

            if (this.formaPago === 'mixto' && this.pagoMixto) {
                inicial += (this.pagoMixto.efectivo || 0)
                         + (this.pagoMixto.zelle || 0)
                         + (this.pagoMixto.binance || 0)
                         + (this.pagoMixto.pagoMovil || 0)
                         + (this.pagoMixto.transferencia || 0);
            } else if (this.formaPago === 'pagomovil' && this.pagoMovilDetalles) {
                inicial += this.pagoMovilDetalles.dolares || 0;
            } else if (this.formaPago === 'transferencia' && this.transferenciaDetalles) {
                inicial += this.transferenciaDetalles.dolares || 0;
            } else if (['efectivo', 'zelle', 'binance', 'paypal'].includes(this.formaPago)) {
                inicial += this.montoPago || 0;
            }

            if (this.montoTotal < inicial - 0.01) {
                errores.push(
                    `WEPPA: el monto total ($${this.montoTotal.toFixed(2)}) no puede ser menor a lo que el cliente paga HOY ($${inicial.toFixed(2)}). La deuda debe ser mayor o igual a la inicial.`
                );
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
     * Suma el valor de TODOS los equipos recibidos (plural) o del singular
     */
    sumarValoresRecibidos() {
        const lista = (this.equiposRecibidos && this.equiposRecibidos.length > 0)
            ? this.equiposRecibidos
            : (this.equipoRecibido ? [this.equipoRecibido] : []);
        return lista.reduce((s, e) => s + (e && e.valor ? Number(e.valor) : 0), 0);
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
                efectivo = this.montoTotal - this.sumarValoresRecibidos() - (this.totalAbonosPrevios || 0);
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
     * Persiste AMBOS formatos (singular + plural) para retrocompatibilidad.
     * - `equipo` / `equipoRecibido` (singular): primer elemento del array
     * - `equipos` / `equiposRecibidos` (plural): array completo
     */
    toJSON() {
        // Sincronizar singular con el primer elemento del array
        // (para que `equipo` siempre sea coherente con `equipos[0]`)
        if (Array.isArray(this.equipos) && this.equipos.length > 0) {
            this.equipo = this.equipos[0];
        }
        if (Array.isArray(this.equiposRecibidos) && this.equiposRecibidos.length > 0) {
            this.equipoRecibido = this.equiposRecibidos[0];
        }

        return {
            id: this.id,
            fecha: this.fecha,
            hora: this.hora,
            tipoVenta: this.tipoVenta,
            tipoTransaccion: this.tipoTransaccion,
            cliente: this.cliente,
            // Compat singular (lectores viejos: admin.js, registro.js)
            equipo: this.equipo,
            equipoRecibido: this.equipoRecibido,
            // Nuevos plurales (multi-equipo / multi-trade-in)
            equipos: this.equipos || [],
            equiposRecibidos: this.equiposRecibidos || [],
            accesorios: this.accesorios,
            formaPago: this.formaPago,
            montoTotal: this.montoTotal,
            montoPago: this.montoPago,
            pagoMixto: this.pagoMixto,
            pagoMovilDetalles: this.pagoMovilDetalles,
            transferenciaDetalles: this.transferenciaDetalles,
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
