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
        estado = 'disponible', // disponible, vendido, defectuoso
        fechaIngreso = new Date().toISOString(),
        loteId = '',
        creadoPor = localStorage.getItem('usuario_sede_id') || 'sistema'
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
            creadoPor: this.creadoPor
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
