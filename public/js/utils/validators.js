/**
 * Funciones de validación reutilizables
 */

/**
 * Valida que un campo no esté vacío
 */
export function validarRequerido(valor, nombreCampo) {
    if (!valor || valor.toString().trim() === '') {
        return {
            valido: false,
            error: `${nombreCampo} es requerido`
        };
    }
    return { valido: true };
}

/**
 * Valida que un número sea positivo
 */
export function validarNumeroPositivo(valor, nombreCampo) {
    const numero = parseFloat(valor);
    if (isNaN(numero) || numero <= 0) {
        return {
            valido: false,
            error: `${nombreCampo} debe ser un número mayor a 0`
        };
    }
    return { valido: true };
}

/**
 * Valida que un número esté en un rango
 */
export function validarRango(valor, min, max, nombreCampo) {
    const numero = parseFloat(valor);
    if (isNaN(numero) || numero < min || numero > max) {
        return {
            valido: false,
            error: `${nombreCampo} debe estar entre ${min} y ${max}`
        };
    }
    return { valido: true };
}

/**
 * Valida formato de cédula venezolana
 */
export function validarCedula(cedula) {
    const regex = /^[VEJPvejp]-?\d{6,8}$/;
    if (!regex.test(cedula)) {
        return {
            valido: false,
            error: 'Formato de cédula inválido (Ej: V-12345678)'
        };
    }
    return { valido: true };
}

/**
 * Valida formato de teléfono venezolano
 */
export function validarTelefono(telefono) {
    const regex = /^(0414|0424|0412|0416|0426)-?\d{7}$/;
    if (!regex.test(telefono)) {
        return {
            valido: false,
            error: 'Formato de teléfono inválido (Ej: 0414-1234567)'
        };
    }
    return { valido: true };
}

/**
 * Valida que un email sea válido
 */
export function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
        return {
            valido: false,
            error: 'Formato de email inválido'
        };
    }
    return { valido: true };
}

/**
 * Valida múltiples campos a la vez
 */
export function validarCampos(validaciones) {
    const errores = [];

    validaciones.forEach(validacion => {
        if (!validacion.valido) {
            errores.push(validacion.error);
        }
    });

    return {
        valido: errores.length === 0,
        errores
    };
}