export class EquipoInventario {
    constructor({
        id = crypto.randomUUID(),
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
        this.modelo = modelo;
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
        return {
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
    }

    static fromJSON(json) {
        return new EquipoInventario(json);
    }
}
