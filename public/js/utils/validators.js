/**
 * Funciones de validación reutilizables
 */

/**
 * Valida que un campo no esté vacío.
 *
 * ⚠️ Importante: 0 se considera VÁLIDO (por ejemplo, caja inicial 0 al
 * empezar el día). La función distingue entre "ausente" (null/undefined/
 * string vacío/solo espacios) y "presente con valor 0".
 *
 * @param {*} valor
 * @param {string} nombreCampo
 * @returns {{valido: boolean, error?: string}}
 */
export function validarRequerido(valor, nombreCampo) {
    if (valor === undefined || valor === null) {
        return {
            valido: false,
            error: `${nombreCampo} es requerido`
        };
    }
    if (typeof valor === 'string' && valor.trim() === '') {
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

/**
 * Valida un IMEI: longitud exacta de 15 dígitos y unicidad
 * contra otras filas en la tabla y contra el inventario existente.
 *
 * @param {string} imei
 * @param {HTMLElement} filaActual - El <tr> que se excluye del chequeo de duplicados
 * @param {HTMLElement} tablaBody  - El <tbody> con todas las filas del lote
 * @param {Object}  inventarioService - Servicio con método buscarPorImei(imei)
 * @param {boolean} inventarioCargado - Si el servicio de inventario está inicializado
 * @returns {{ valido: boolean, duplicado: boolean, origen?: string, mensaje?: string, equipo?: Object }}
 */
export function validarIMEI(imei, filaActual, tablaBody, inventarioService, inventarioCargado) {
    if (!imei || imei.length !== 15) {
        return { valido: false, duplicado: false };
    }

    // Duplicado en otras filas del lote activo
    const filas = tablaBody.querySelectorAll('tr');
    for (const tr of filas) {
        if (tr === filaActual) continue;
        const otroImei = tr.querySelector('.campo-imei')?.value || '';
        if (otroImei === imei) {
            return {
                valido: false,
                duplicado: true,
                origen: 'lote',
                mensaje: '⚠️ IMEI duplicado en este lote'
            };
        }
    }

    // Duplicado en el inventario existente
    if (inventarioCargado && inventarioService) {
        const existente = inventarioService.buscarPorImei(imei);
        if (existente) {
            return {
                valido: false,
                duplicado: true,
                origen: 'inventario',
                mensaje: `⚠️ IMEI ya existe en inventario (${existente.estado})`,
                equipo: existente
            };
        }
    }

    return { valido: true, duplicado: false };
}