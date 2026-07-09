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
            cajas: [], // Array de {modelo, color, cantidad}
            cajaModelo: null,
            cajaColor: null,
            cajaCantidad: 0
        };

        // Pago
        this.formaPago = data.formaPago || '';
        this.montoTotal = data.montoTotal || 0;
        this.montoPago = (data.montoPago !== undefined && data.montoPago !== null) ? data.montoPago : null; // Preserva 0 explícito
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

        // ==========================================
        // VALIDACIÓN DE PAGO
        // ==========================================
        const deudaTotal = this.equipos.reduce((sum, e) => sum + (parseFloat(e.precio) || 0), 0);
        const equipoRecibidoValor = this.sumarValoresRecibidos();

        // ── Validar tasa obligatoria para Pago Móvil y Transferencia ──
        if (this.formaPago === 'pagomovil') {
            if (!this.pagoMovilDetalles || !this.pagoMovilDetalles.tasa || this.pagoMovilDetalles.tasa <= 0) {
                errores.push('Coloca la tasa del Pago Móvil.');
            }
        }
        if (this.formaPago === 'transferencia') {
            if (!this.transferenciaDetalles || !this.transferenciaDetalles.tasa || this.transferenciaDetalles.tasa <= 0) {
                errores.push('Coloca la tasa de la Transferencia.');
            }
        }

        // ── Calcular el pago inicial (lo que el cliente entrega HOY) ──
        let pagoHoy = equipoRecibidoValor + (this.totalAbonosPrevios || 0);
        if (this.formaPago === 'mixto' && this.pagoMixto) {
            pagoHoy += (this.pagoMixto.efectivo || 0) + (this.pagoMixto.zelle || 0) +
                       (this.pagoMixto.binance || 0) + (this.pagoMixto.pagoMovil || 0) +
                       (this.pagoMixto.transferencia || 0);
        } else if (this.formaPago === 'pagomovil' && this.pagoMovilDetalles) {
            pagoHoy += this.pagoMovilDetalles.dolares || 0;
        } else if (this.formaPago === 'transferencia' && this.transferenciaDetalles) {
            pagoHoy += this.transferenciaDetalles.dolares || 0;
        } else if (['efectivo', 'zelle', 'binance', 'paypal'].includes(this.formaPago)) {
            pagoHoy += this.montoPago !== null ? this.montoPago : this.montoTotal;
        }

        if (!this.weppa) {
            // ── Venta Normal: el pago de hoy debe cubrir exactamente la deuda total ──
            // montoTotal en venta normal = pagoHoy (lo establece calcularYMostrarTotal)
            if (deudaTotal > 0 && this.montoTotal < deudaTotal - 0.01) {
                errores.push(`Faltan pagos: El total cancelado ($${this.montoTotal.toFixed(2)}) es menor al precio de los equipos ($${deudaTotal.toFixed(2)}). Active WEPPA si es intencional.`);
            }
        } else {
            // ── WEPPA: montoTotal es la DEUDA PACTADA (precio equipo). pagoHoy es el inicial ──
            // El montoTotal (deuda) debe ser >= precio de los equipos
            if (deudaTotal > 0 && this.montoTotal < deudaTotal - 0.01) {
                errores.push(`WEPPA: el monto de crédito pactado ($${this.montoTotal.toFixed(2)}) es menor al precio de los equipos ($${deudaTotal.toFixed(2)}). Revisa el campo de crédito.`);
            }
            // El pago inicial no puede superar la deuda pactada
            if (pagoHoy > this.montoTotal + 0.01) {
                errores.push(`WEPPA: el pago inicial ($${pagoHoy.toFixed(2)}) no puede ser mayor al crédito pactado ($${this.montoTotal.toFixed(2)}).`);
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
            if (this.accesorios.cajas && this.accesorios.cajas.length > 0) {
                this.accesorios.cajas.forEach(c => {
                    accesorios.push(`Caja ${c.modelo || 'N/A'} ${c.color || 'N/A'} (${c.cantidad})`);
                });
            } else {
                accesorios.push(`Caja ${this.accesorios.cajaModelo || 'N/A'} ${this.accesorios.cajaColor || 'N/A'} (${this.accesorios.cajaCantidad})`);
            }
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
