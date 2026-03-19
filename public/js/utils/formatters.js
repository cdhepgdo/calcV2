/**
 * Funciones de formateo reutilizables
 */

/**
 * Formatea un número como moneda en dólares
 */
export function formatearMoneda(valor) {
    const numero = parseFloat(valor) || 0;
    return `$${numero.toFixed(2)}`;
}

/**
 * Formatea un número como moneda en bolívares
 */
export function formatearBolivares(valor) {
    const numero = parseFloat(valor) || 0;
    return `${numero.toFixed(2)} Bs`;
}

/**
 * Formatea una fecha en formato legible
 */
export function formatearFecha(fecha) {
    if (fecha instanceof Date) {
        return fecha.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    return fecha;
}

/**
 * Formatea una hora en formato 12h
 */
export function formatearHora(fecha) {
    if (fecha instanceof Date) {
        return fecha.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return fecha;
}

/**
 * Formatea un número de teléfono
 */
export function formatearTelefono(telefono) {
    // Eliminar caracteres no numéricos
    const numeros = telefono.replace(/\D/g, '');
    
    // Formatear como 0414-1234567
    if (numeros.length === 11) {
        return `${numeros.slice(0, 4)}-${numeros.slice(4)}`;
    }
    
    return telefono;
}

/**
 * Formatea una cédula
 */
export function formatearCedula(cedula) {
    // Si ya tiene el formato correcto, devolverla
    if (cedula.includes('-')) {
        return cedula.toUpperCase();
    }
    
    // Intentar formatear
    const match = cedula.match(/^([VEJPvejp])(\d+)$/);
    if (match) {
        return `${match[1].toUpperCase()}-${match[2]}`;
    }
    
    return cedula.toUpperCase();
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizarTexto(texto) {
    return texto
        .toLowerCase()
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncarTexto(texto, longitudMaxima = 50) {
    if (texto.length <= longitudMaxima) {
        return texto;
    }
    return texto.slice(0, longitudMaxima) + '...';
}

/**
 * Formatea un porcentaje
 */
export function formatearPorcentaje(valor) {
    const numero = parseFloat(valor) || 0;
    return `${numero}%`;
}

/**
 * Sanitiza texto para evitar XSS al insertar en innerHTML
 * Convierte caracteres HTML peligrosos en entidades seguras
 */
export function sanitizar(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
