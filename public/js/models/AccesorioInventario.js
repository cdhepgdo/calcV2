// Fallback para crypto.randomUUID (no disponible en file:// o HTTP no-seguro)
const generarUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'acc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
};

/**
 * Modelo de un ítem de inventario de accesorios.
 *
 * Convive en la colección sedes/{sedeId}/inventario con los equipos (iPhones),
 * diferenciados por el discriminador tipoItem === 'accesorio'.
 *
 * Para máxima escalabilidad, cada variante es un documento propio, de forma
 * que se puede tener, por ejemplo:
 *   - { nombre:'Forro', modelo:'iPhone 13', tipoVariacion:'Silicona', color:'Azul' }
 *   - { nombre:'Forro', modelo:'iPhone 13', tipoVariacion:'Cuero',    color:'Negro' }
 *   - { nombre:'Vidrio Templado', modelo:'iPhone 14 Pro', tipoVariacion:'Antiespía', color:null }
 *   - { nombre:'Cargador', modelo:'Genérico', tipoVariacion:'20W', color:null }
 */
export class AccesorioInventario {
    constructor({
        id = generarUUID(),
        tipoItem = 'accesorio',

        // Clasificación de la variante
        nombre = '',             // Tipo principal: Forro, Vidrio Templado, Cargador, Cable, Cubo, Caja, etc.
        modelo = 'Genérico',     // Modelo de iPhone aplicable o 'Genérico'
        tipoVariacion = '',      // Subtipo: Silicona, Cuero, 360, Antiespía, Privacidad, 20W, etc.
        color = null,            // Color del accesorio (null si no aplica)

        // Stock
        cantidad = 0,            // Unidades disponibles en este momento

        // Precios
        precio = 0,              // Precio de venta al cliente
        costo = 0,               // Costo de adquisición (para rentabilidad)

        // Metadatos
        detalles = '',           // Notas adicionales
        fechaIngreso = new Date().toISOString(),
        fechaActualizacion = null,
        creadoPor = localStorage.getItem('usuario_sede_id') || 'sistema',
        actualizadoPor = null
    } = {}) {
        this.id = id;
        this.tipoItem = tipoItem;

        this.nombre = (nombre || '').trim();
        this.modelo = (modelo || 'Genérico').trim();
        this.tipoVariacion = (tipoVariacion || '').trim();
        this.color = color ? color.trim() : null;

        this.cantidad = parseInt(cantidad) || 0;
        this.precio = parseFloat(precio) || 0;
        this.costo = parseFloat(costo) || 0;

        this.detalles = detalles || '';
        this.fechaIngreso = fechaIngreso;
        this.fechaActualizacion = fechaActualizacion || null;
        this.creadoPor = creadoPor;
        this.actualizadoPor = actualizadoPor || null;
    }

    /**
     * Clave de unicidad de esta variante dentro de la sede.
     * Útil para buscar el documento en el caché sin hacer queries.
     * Se normaliza en minúsculas para comparación insensible a mayúsculas.
     */
    get clave() {
        return AccesorioInventario.generarClave(
            this.nombre, this.modelo, this.tipoVariacion, this.color
        );
    }

    static generarClave(nombre, modelo, tipoVariacion, color) {
        const norm = s => (s || '').toLowerCase().trim();
        return `${norm(nombre)}|${norm(modelo)}|${norm(tipoVariacion)}|${norm(color)}`;
    }

    /**
     * Validación básica antes de guardar.
     */
    validar() {
        const errores = [];
        if (!this.nombre) errores.push('El nombre del accesorio es obligatorio');
        if (this.cantidad < -9999 || this.cantidad > 99999) errores.push('La cantidad debe estar entre -9999 y 99999');
        if (this.precio < 0) errores.push('El precio no puede ser negativo');
        if (this.costo < 0) errores.push('El costo no puede ser negativo');
        return { valido: errores.length === 0, errores };
    }

    toJSON() {
        return {
            id: this.id,
            tipoItem: this.tipoItem,
            nombre: this.nombre,
            modelo: this.modelo,
            tipoVariacion: this.tipoVariacion,
            color: this.color,
            cantidad: this.cantidad,
            precio: this.precio,
            costo: this.costo,
            detalles: this.detalles,
            fechaIngreso: this.fechaIngreso,
            fechaActualizacion: this.fechaActualizacion,
            creadoPor: this.creadoPor,
            actualizadoPor: this.actualizadoPor
        };
    }

    static fromJSON(json) {
        return new AccesorioInventario(json || {});
    }

    /**
     * Etiqueta legible para mostrar en tablas o selects.
     */
    get etiqueta() {
        const partes = [this.nombre];
        if (this.modelo && this.modelo !== 'Genérico') partes.push(this.modelo);
        if (this.tipoVariacion) partes.push(this.tipoVariacion);
        if (this.color) partes.push(this.color);
        return partes.join(' — ');
    }
}
