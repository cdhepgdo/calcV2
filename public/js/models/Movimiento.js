/**
 * Modelo de Movimiento
 * Representa un movimiento de inventario (entrada/salida de efectivo, equipos o accesorios)
 */

import { TIPOS_MOVIMIENTO } from '../config/constants.js';

export class Movimiento {
    constructor(data = {}) {
        this.id = data.id || this.generarId();
        this.tipo = data.tipo || '';
        this.fecha = data.fecha || new Date().toLocaleDateString('es-ES');
        this.hora = data.hora || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        this.datos = data.datos || {};
    }
    
    generarId() {
        return `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Valida que el movimiento tenga todos los datos requeridos
     */
    validar() {
        const errores = [];
        
        if (!this.tipo) {
            errores.push('Debe especificar el tipo de movimiento');
            return { valido: false, errores };
        }
        
        const tipoLower = this.tipo.toLowerCase();
        
        // SALIDA DE EFECTIVO
        if (tipoLower.includes('salida') && tipoLower.includes('efectivo')) {
            if (!this.datos.monto || isNaN(this.datos.monto) || this.datos.monto <= 0) {
                errores.push('El monto debe ser mayor a $0.00');
            }
            if (!this.datos.persona || this.datos.persona.trim() === '') {
                errores.push('Debe especificar quién retira el efectivo');
            }
            if (!this.datos.nota || this.datos.nota.trim() === '') {
                errores.push('Debe especificar el motivo del retiro');
            }
        }
        
        // INGRESO DE EFECTIVO
        else if (tipoLower.includes('ingreso') && tipoLower.includes('efectivo')) {
            if (!this.datos.monto || isNaN(this.datos.monto) || this.datos.monto <= 0) {
                errores.push('El monto debe ser mayor a $0.00');
            }
            if (!this.datos.nota || this.datos.nota.trim() === '') {
                errores.push('Debe especificar el motivo del ingreso');
            }
        }
        
        // SALIDA DE EQUIPO
        else if (tipoLower.includes('salida') && tipoLower.includes('equipo')) {
            if (!this.datos.modelo || this.datos.modelo.trim() === '') {
                errores.push('Debe especificar el modelo');
            }
            if (!this.datos.capacidad || this.datos.capacidad.trim() === '') {
                errores.push('Debe especificar la capacidad');
            }
            if (!this.datos.color || this.datos.color.trim() === '') {
                errores.push('Debe especificar el color');
            }
            if (!this.datos.destino || this.datos.destino.trim() === '') {
                errores.push('Debe especificar el destino');
            }
            if (!this.datos.persona || this.datos.persona.trim() === '') {
                errores.push('Debe especificar quién retira el equipo');
            }
        }
        
        // INGRESO DE EQUIPO
        else if (tipoLower.includes('ingreso') && tipoLower.includes('equipo')) {
            if (!this.datos.modelo || this.datos.modelo.trim() === '') {
                errores.push('Debe especificar el modelo');
            }
            if (!this.datos.capacidad || this.datos.capacidad.trim() === '') {
                errores.push('Debe especificar la capacidad');
            }
            if (!this.datos.color || this.datos.color.trim() === '') {
                errores.push('Debe especificar el color');
            }
            if (!this.datos.origen || this.datos.origen.trim() === '') {
                errores.push('Debe especificar el origen');
            }
        }
        
        // COMPRA DE EQUIPO
        else if (tipoLower.includes('compra')) {
            if (!this.datos.modelo || this.datos.modelo.trim() === '') {
                errores.push('Debe especificar el modelo');
            }
            if (!this.datos.capacidad || this.datos.capacidad.trim() === '') {
                errores.push('Debe especificar la capacidad');
            }
            if (!this.datos.color || this.datos.color.trim() === '') {
                errores.push('Debe especificar el color');
            }
            if (!this.datos.precio || isNaN(this.datos.precio) || this.datos.precio <= 0) {
                errores.push('El precio debe ser mayor a $0.00');
            }
            if (!this.datos.proveedor || this.datos.proveedor.trim() === '') {
                errores.push('Debe especificar el proveedor');
            }
        }
        
        // SALIDA DE ACCESORIO
        else if (tipoLower.includes('salida') && tipoLower.includes('accesorio')) {
            if (!this.datos.tipo || this.datos.tipo.trim() === '') {
                errores.push('Debe especificar el tipo de accesorio');
            }
            if (!this.datos.destino || this.datos.destino.trim() === '') {
                errores.push('Debe especificar el destino');
            }
        }
        
        // INGRESO DE ACCESORIO
        else if (tipoLower.includes('ingreso') && tipoLower.includes('accesorio')) {
            if (!this.datos.tipo || this.datos.tipo.trim() === '') {
                errores.push('Debe especificar el tipo de accesorio');
            }
            if (!this.datos.proveedor || this.datos.proveedor.trim() === '') {
                errores.push('Debe especificar el proveedor');
            }
        }
        
        // CAMBIO POR GARANTÍA
        else if (tipoLower.includes('cambio') && tipoLower.includes('garantía')) {
            // Ya se valida en CambioGarantia.validar()
            // Aquí solo verificamos que existan los datos básicos
            if (!this.datos.cliente || !this.datos.cliente.nombre) {
                errores.push('Debe especificar el cliente');
            }
            if (!this.datos.equipoDefectuoso || !this.datos.equipoDefectuoso.modelo) {
                errores.push('Debe especificar el equipo defectuoso');
            }
            if (!this.datos.equipoNuevo || !this.datos.equipoNuevo.modelo) {
                errores.push('Debe especificar el equipo nuevo');
            }
        }
        
        return {
            valido: errores.length === 0,
            errores
        };
    }
    
    /**
     * Calcula el impacto en efectivo de este movimiento
     */
    calcularImpactoEfectivo() {
        switch (this.tipo) {
            case TIPOS_MOVIMIENTO.SALIDA_EFECTIVO:
                return -this.datos.monto;
            case TIPOS_MOVIMIENTO.INGRESO_EFECTIVO:
                return this.datos.monto;
            case TIPOS_MOVIMIENTO.COMPRA_EQUIPO:
                return -this.datos.precio;
            default:
                return 0;
        }
    }
    
    /**
     * Obtiene un título descriptivo del movimiento
     */
    obtenerTitulo() {
        const iconos = {
            [TIPOS_MOVIMIENTO.SALIDA_EFECTIVO]: '💸',
            [TIPOS_MOVIMIENTO.INGRESO_EFECTIVO]: '💵',
            [TIPOS_MOVIMIENTO.SALIDA_EQUIPO]: '📱➡️',
            [TIPOS_MOVIMIENTO.INGRESO_EQUIPO]: '📱⬅️',
            [TIPOS_MOVIMIENTO.SALIDA_ACCESORIO]: '🛡️➡️',
            [TIPOS_MOVIMIENTO.INGRESO_ACCESORIO]: '🛡️⬅️',
            [TIPOS_MOVIMIENTO.COMPRA_EQUIPO]: '📱⬅️'
        };
        
        const icono = iconos[this.tipo] || '📦';
        
        // Manejar Cambio Garantía antes del switch
        const tipoLower = this.tipo.toLowerCase();
        if (tipoLower.includes('cambio') && tipoLower.includes('garantía')) {
            const cliente = this.datos.cliente || {};
            return `🔄 Cambio por Garantía - ${cliente.nombre || 'Cliente'}`;
        }
        
        switch (this.tipo) {
            case TIPOS_MOVIMIENTO.SALIDA_EFECTIVO:
                return `${icono} Salida de Efectivo - $${this.datos.monto}`;
            case TIPOS_MOVIMIENTO.INGRESO_EFECTIVO:
                return `${icono} Ingreso de Efectivo - $${this.datos.monto}`;
            case TIPOS_MOVIMIENTO.SALIDA_EQUIPO:
                return `${icono} Salida de Equipo - ${this.datos.modelo}`;
            case TIPOS_MOVIMIENTO.INGRESO_EQUIPO:
                return `${icono} Ingreso de Equipo - ${this.datos.modelo}`;
            case TIPOS_MOVIMIENTO.SALIDA_ACCESORIO:
                return `${icono} Salida de Accesorio - ${this.datos.tipo}`;
            case TIPOS_MOVIMIENTO.INGRESO_ACCESORIO:
                return `${icono} Ingreso de Accesorio - ${this.datos.tipo}`;
            case TIPOS_MOVIMIENTO.COMPRA_EQUIPO:
                return `${icono} Compra de Equipo - ${this.datos.modelo}`;
            default:
                return `${icono} Movimiento`;
        }
    }
    
    /**
     * Obtiene detalles legibles del movimiento
     */
    obtenerDetalles() {
        switch (this.tipo) {
            case TIPOS_MOVIMIENTO.SALIDA_EFECTIVO:
                return `Retirado por: ${this.datos.persona} | Motivo: ${this.datos.nota}`;
                
            case TIPOS_MOVIMIENTO.INGRESO_EFECTIVO:
                return `Motivo: ${this.datos.nota}`;
                
            case TIPOS_MOVIMIENTO.SALIDA_EQUIPO:
                return `${this.datos.modelo} ${this.datos.capacidad} ${this.datos.color} | Destino: ${this.datos.destino} | Retirado por: ${this.datos.persona}`;
                
            case TIPOS_MOVIMIENTO.INGRESO_EQUIPO:
                return `${this.datos.modelo} ${this.datos.capacidad} ${this.datos.color} | Origen: ${this.datos.origen}`;
                
            case TIPOS_MOVIMIENTO.COMPRA_EQUIPO:
                return `${this.datos.modelo} ${this.datos.capacidad} ${this.datos.color} | Precio: $${this.datos.precio} | Proveedor: ${this.datos.proveedor}`;
                
            case TIPOS_MOVIMIENTO.SALIDA_ACCESORIO:
            case TIPOS_MOVIMIENTO.INGRESO_ACCESORIO:
                let detalles = `Tipo: ${this.datos.tipo}`;
                if (this.datos.cantidad) {
                    detalles += ` | Cantidad: ${this.datos.cantidad}`;
                }
                if (this.datos.modelos && this.datos.modelos.length > 0) {
                    const modelosTexto = this.datos.modelos.map(m => 
                        m.color ? `${m.modelo} ${m.color} (${m.cantidad})` : `${m.modelo} (${m.cantidad})`
                    ).join(', ');
                    detalles += ` | Modelos: ${modelosTexto}`;
                }
                return detalles;
                
            default:
                return 'Sin detalles';
        }
    }
    
    /**
     * Convierte el movimiento a un objeto plano para almacenamiento
     */
    toJSON() {
        return {
            id: this.id,
            tipo: this.tipo,
            fecha: this.fecha,
            hora: this.hora,
            datos: this.datos
        };
    }
    
    /**
     * Crea una instancia de Movimiento desde un objeto plano
     */
    static fromJSON(json) {
        return new Movimiento(json);
    }
}

// Sobrescribir el método obtenerDetalles para soportar tipos con espacios
Movimiento.prototype.obtenerDetalles = function() {
    const tipoLower = this.tipo.toLowerCase();
    
    if (tipoLower.includes('salida') && tipoLower.includes('efectivo')) {
        console.log(this.datos)
        return `💵-${this.datos.monto}$ | Retirado por: ${this.datos.persona || 'N/A'} | 📝Motivo: ${this.datos.nota || 'N/A'}`;
    }
    
    if (tipoLower.includes('ingreso') && tipoLower.includes('efectivo')) {
        return `💵+${this.datos.monto}$ | 📝Motivo: ${this.datos.nota || 'N/A'}`;
    }
    
    if (tipoLower.includes('salida') && tipoLower.includes('equipo')) {
        return `${this.datos.modelo || ''} ${this.datos.capacidad || ''} ${this.datos.color || ''} ${this.datos.bateria || ''}% ${this.datos.imei || ''} | Destino: ${this.datos.destino || 'N/A'} | Retirado por: ${this.datos.persona || 'N/A'}`;
    }

    if (tipoLower.includes('ingreso') && tipoLower.includes('equipo')) {
        return `${this.datos.modelo || ''} ${this.datos.capacidad || ''} ${this.datos.color || ''} ${this.datos.bateria || ''}% ${this.datos.imei || ''} | Origen: ${this.datos.origen || 'N/A'}`;
    }
    
    if (tipoLower.includes('compra')) {
        return `${this.datos.modelo || ''} ${this.datos.capacidad || ''} ${this.datos.color || ''} | Precio: $${this.datos.precio || 0} | Proveedor: ${this.datos.proveedor || 'N/A'}`;
    }
    
    if (tipoLower.includes('accesorio')) {
        let detalles = `Tipo: ${this.datos.tipo || 'N/A'}`;
        if (this.datos.cantidad) {
            detalles += ` | Cantidad: ${this.datos.cantidad}`;
        }
        if (this.datos.modelos && this.datos.modelos.length > 0) {
            const modelosTexto = this.datos.modelos.map(m => 
                m.color ? `${m.modelo} ${m.color} (${m.cantidad})` : `${m.modelo} (${m.cantidad})`
            ).join(', ');
            detalles += ` | Modelos: ${modelosTexto}`;
        }
        if (tipoLower.includes('salida') && this.datos.destino) {
            detalles += ` | Destino: ${this.datos.destino}`;
        }
        if (tipoLower.includes('ingreso') && this.datos.proveedor) {
            detalles += ` | Proveedor: ${this.datos.proveedor}`;
        }
        return detalles;
    }
    
    // CASO PARA CAMBIO POR GARANTÍA
    if (tipoLower.includes('cambio') && tipoLower.includes('garantía')) {
        const cliente = this.datos.cliente || {};
        const equipoDefectuoso = this.datos.equipoDefectuoso || {};
        const equipoNuevo = this.datos.equipoNuevo || {};
        const diferencia = this.datos.diferencia || {};
        
        let detalles = `👤 ${cliente.nombre || 'N/A'} (${cliente.cedula || 'N/A'})`;
        detalles += ` | 📱❌ ${equipoDefectuoso.modelo || 'N/A'} ${equipoDefectuoso.capacidad || ''} ${equipoDefectuoso.color || ''}"${equipoDefectuoso.imei || ''}" | `;
        detalles += ` ➡️ 📱✅ ${equipoNuevo.modelo || 'N/A'} ${equipoNuevo.capacidad || ''} ${equipoNuevo.color || ''}(${equipoDefectuoso.imei || ''})`;
        
        if (diferencia.tipo && diferencia.tipo !== 'ninguna') {
            const simbolo = diferencia.tipo === 'favor-cliente' ? '💰➡️👤' : '💰➡️🏪';
            detalles += ` | ${simbolo} $${diferencia.monto || 0}`;
        }
        
        if (equipoDefectuoso.problema) {
            detalles += ` | ⚠️ ${equipoDefectuoso.problema}`;
        }
        
        return detalles;
    }
    
    return 'Sin detalles';
};


