/**
 * Modelo de Cambio por Garantía
 * Representa un cambio de equipo defectuoso por uno nuevo
 */

export class CambioGarantia {
    constructor(data = {}) {
        this.id = data.id || this.generarId();
        this.fecha = data.fecha || new Date().toLocaleDateString('es-ES');
        this.hora = data.hora || new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Cliente
        this.cliente = data.cliente || {
            nombre: '',
            cedula: '',
            telefono: ''
        };

        // Equipo defectuoso que recibimos
        this.equipoDefectuoso = data.equipoDefectuoso || {
            modelo: '',
            color: '',
            capacidad: '',
            bateria: '',
            imei: '',
            problema: ''
        };

        // Equipo nuevo que entregamos
        this.equipoNuevo = data.equipoNuevo || {
            modelo: '',
            color: '',
            capacidad: '',
            bateria: '',
            imei: ''
        };

        // Diferencia de precio
        this.diferencia = data.diferencia || {
            tipo: 'ninguna',  // 'ninguna', 'favor-cliente', 'favor-tienda'
            monto: 0
        };

        // Referencia a la venta original (opcional)
        this.ventaOriginalId = data.ventaOriginalId || null;
    }

    generarId() {
        return `cambio_garantia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }


    /**
     * Valida que el cambio tenga todos los datos requeridos
     */
    validar() {
        const errores = [];

        // Validar datos del cliente
        if (!this.cliente.nombre) {
            errores.push('Debe ingresar el nombre del cliente');
        }
        if (!this.cliente.cedula) {
            errores.push('Debe ingresar la cédula del cliente');
        }
        if (!this.cliente.telefono) {
            errores.push('Debe ingresar el teléfono del cliente');
        }

        // Validar equipo defectuoso
        if (!this.equipoDefectuoso.modelo) {
            errores.push('Debe seleccionar el modelo del equipo defectuoso');
        }
        if (!this.equipoDefectuoso.color) {
            errores.push('Debe seleccionar el color del equipo defectuoso');
        }
        if (!this.equipoDefectuoso.capacidad) {
            errores.push('Debe seleccionar la capacidad del equipo defectuoso');
        }
        if (!this.equipoDefectuoso.imei) {
            errores.push('Debe ingresar el IMEI del equipo defectuoso');
        }
        if (!this.equipoDefectuoso.problema) {
            errores.push('Debe describir el problema del equipo');
        }

        // Validar equipo nuevo
        if (!this.equipoNuevo.modelo) {
            errores.push('Debe seleccionar el modelo del equipo nuevo');
        }
        if (!this.equipoNuevo.color) {
            errores.push('Debe seleccionar el color del equipo nuevo');
        }
        if (!this.equipoNuevo.capacidad) {
            errores.push('Debe seleccionar la capacidad del equipo nuevo');
        }
        if (!this.equipoNuevo.imei) {
            errores.push('Debe ingresar el IMEI del equipo nuevo');
        }
        if (!this.equipoNuevo.bateria) {
            errores.push('Debe ingresar el porcentaje de batería del equipo nuevo');
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }

    /**
     * Convierte a objeto plano para almacenamiento
     */
    toJSON() {
        return {
            id: this.id,
            fecha: this.fecha,
            hora: this.hora,
            cliente: this.cliente,
            equipoDefectuoso: this.equipoDefectuoso,
            equipoNuevo: this.equipoNuevo,
            diferencia: this.diferencia,
            ventaOriginalId: this.ventaOriginalId
        };
    }

    /**
     * Crea una instancia desde un objeto plano
     */
    static fromJSON(json) {
        return new CambioGarantia(json);
    }
}