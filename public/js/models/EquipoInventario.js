// Fallback para crypto.randomUUID (no disponible en file:// o HTTP no-seguro)
const generarUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback RFC4122-ish: time-based + random
    return 'eq-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
};

export class EquipoInventario {
    constructor({
        id = generarUUID(),
        tipoItem = 'equipo',
        modelo = '',
        gb = '',
        color = '',
        bateria = 100,
        imei = '',
        tieneCaja = false,
        cajaModelo = '',
        cajaColor = '',
        detalles = '',
        origen = '',
        estado = 'disponible', // disponible, abonado, vendido, defectuoso, transferido, eliminado
        fechaIngreso = new Date().toISOString(),
        loteId = '',
        creadoPor = localStorage.getItem('usuario_sede_id') || 'sistema',
        // ── Abonos ──────────────────────────────────────────────────────────
        // historialAbonos acumula TODOS los pagos parciales que el cliente ha
        // hecho sobre este equipo. Cada entrada es:
        //   { ventaId, fecha, monto, cliente: {nombre, cedula, telefono}, fechaRegistro, sedeId }
        // Se inicializa como [] para que `fromJSON` de docs viejos no rompa.
        historialAbonos = [],
        // ID de la primera venta que creó el abono. Útil para detectar
        // "finalización" cuando una venta tipo 'venta' se aplica sobre un
        // equipo que ya estaba 'abonado'.
        abonoInicialId = null,
        // Sello ISO de cuándo se cerró el ciclo (abonado → vendido).
        // null mientras sigue en 'abonado' o 'disponible'.
        fechaFinalizacion = null
    }) {
        this.id = id;
        this.tipoItem = tipoItem;
        this.modelo = modelo.replace(/^iPhone\s+/i, '').trim();
        this.gb = gb;
        this.color = color;
        this.bateria = parseInt(bateria) || 0;
        this.imei = imei;
        this.tieneCaja = Boolean(tieneCaja);
        this.cajaModelo = cajaModelo;
        this.cajaColor = cajaColor;
        this.detalles = detalles;
        this.origen = origen;
        this.estado = estado;
        this.fechaIngreso = fechaIngreso;
        this.loteId = loteId;
        this.creadoPor = creadoPor;
        this.historialAbonos = Array.isArray(historialAbonos) ? historialAbonos : [];
        this.abonoInicialId = abonoInicialId || null;
        this.fechaFinalizacion = fechaFinalizacion || null;
    }

    validar() {
        const errores = [];
        if (!this.modelo) errores.push("El modelo es obligatorio");
        if (!this.gb) errores.push("La capacidad (GB) es obligatoria");
        if (!this.color) errores.push("El color es obligatorio");
        if (this.bateria < 0 || this.bateria > 100) errores.push("La batería debe estar entre 0 y 100");
        if (!this.imei || this.imei.length < 15) errores.push("El IMEI debe tener al menos 15 caracteres");
        
        return {
            valido: errores.length === 0,
            errores
        };
    }

    toJSON() {
        const json = {
            id: this.id,
            tipoItem: this.tipoItem,
            modelo: this.modelo,
            gb: this.gb,
            color: this.color,
            bateria: this.bateria,
            imei: this.imei,
            tieneCaja: this.tieneCaja,
            cajaModelo: this.cajaModelo,
            cajaColor: this.cajaColor,
            detalles: this.detalles,
            origen: this.origen,
            estado: this.estado,
            fechaIngreso: this.fechaIngreso,
            loteId: this.loteId,
            creadoPor: this.creadoPor,
            // Persistir el historial completo de abonos. Almacenarlo junto al
            // doc del equipo (en lugar de solo en la Venta) garantiza que la
            // búsqueda y el autollenado funcionen offline (IndexedDB) sin
            // tener que cruzar colecciones.
            historialAbonos: this.historialAbonos || [],
            abonoInicialId: this.abonoInicialId || null,
            fechaFinalizacion: this.fechaFinalizacion || null
        };
        // FIX M1: persistir metadatos de sede cuando están presentes (no-enumerables
        // en la instancia). ConsultaInventarioService los setea tras el snapshot;
        // persistirlos en IDB permite que la edición admin funcione offline.
        if (this._sedeId) json.__sedeId = this._sedeId;
        if (this._sedeNombre) json.__sedeNombre = this._sedeNombre;
        return json;
    }

    static fromJSON(json) {
        const inst = new EquipoInventario(json);
        // FIX M1: restaurar metadatos de sede como propiedades no-enumerables
        // para que la UI tenga data-sede tras un reload offline.
        if (json && json.__sedeId) {
            Object.defineProperty(inst, '_sedeId', { value: json.__sedeId, writable: true, enumerable: false });
        }
        if (json && json.__sedeNombre) {
            Object.defineProperty(inst, '_sedeNombre', { value: json.__sedeNombre, writable: true, enumerable: false });
        }
        return inst;
    }
}
