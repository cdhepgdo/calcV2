/**
 * Tests para validators.js
 *
 * Cobertura: validación de campos requeridos, números, cédula venezolana,
 * teléfono venezolano, email y agregador de errores.
 *
 * Cómo ejecutar:
 *   npm test
 *
 * NOTA: validarIMEI se excluye de estos tests porque depende del DOM
 * (querySelector, HTMLElement). Eso requeriría un entorno jsdom o similar.
 * Se cubre de forma visual/manual en la página de ingreso de mercancía.
 */

import { describe, it, expect } from 'vitest';
import {
    validarRequerido,
    validarNumeroPositivo,
    validarRango,
    validarCedula,
    validarTelefono,
    validarEmail,
    validarCampos,
} from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 1: validarRequerido
// ═══════════════════════════════════════════════════════════════════════════

describe('validarRequerido()', () => {
    it('✅ debe aceptar texto no vacío', () => {
        const resultado = validarRequerido('Juan', 'Nombre');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar número 0 como "presente" (caja inicial 0 al empezar el día)', () => {
        // Caso real: el día puede empezar con caja en $0.
        // 0 es un valor válido y NO debe rechazarse.
        const resultado = validarRequerido(0, 'Caja inicial');
        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar string vacío', () => {
        const resultado = validarRequerido('', 'Nombre');
        expect(resultado.valido).toBe(false);
        expect(resultado.error).toContain('Nombre');
        expect(resultado.error).toContain('requerido');
    });

    it('❌ debe rechazar solo espacios en blanco', () => {
        const resultado = validarRequerido('   ', 'Nombre');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar null', () => {
        const resultado = validarRequerido(null, 'Nombre');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar undefined', () => {
        const resultado = validarRequerido(undefined, 'Nombre');
        expect(resultado.valido).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 2: validarNumeroPositivo
// ═══════════════════════════════════════════════════════════════════════════

describe('validarNumeroPositivo()', () => {
    it('✅ debe aceptar número mayor a 0', () => {
        const resultado = validarNumeroPositivo(100, 'Monto');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar string numérico mayor a 0 (viene de input HTML)', () => {
        const resultado = validarNumeroPositivo('250.50', 'Monto');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar número con decimales', () => {
        const resultado = validarNumeroPositivo(0.01, 'Monto');
        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar 0', () => {
        const resultado = validarNumeroPositivo(0, 'Monto');
        expect(resultado.valido).toBe(false);
        expect(resultado.error).toContain('mayor a 0');
    });

    it('❌ debe rechazar número negativo', () => {
        const resultado = validarNumeroPositivo(-50, 'Monto');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar NaN', () => {
        const resultado = validarNumeroPositivo('no es número', 'Monto');
        expect(resultado.valido).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 3: validarRango
// ═══════════════════════════════════════════════════════════════════════════

describe('validarRango()', () => {
    it('✅ debe aceptar número dentro del rango', () => {
        const resultado = validarRango(50, 0, 100, 'Batería');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar el límite inferior (inclusivo)', () => {
        const resultado = validarRango(0, 0, 100, 'Batería');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar el límite superior (inclusivo)', () => {
        const resultado = validarRango(100, 0, 100, 'Batería');
        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar número por debajo del rango', () => {
        const resultado = validarRango(-5, 0, 100, 'Batería');
        expect(resultado.valido).toBe(false);
        expect(resultado.error).toContain('entre 0 y 100');
    });

    it('❌ debe rechazar número por encima del rango', () => {
        const resultado = validarRango(150, 0, 100, 'Batería');
        expect(resultado.valido).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 4: validarCedula (formato venezolano)
// ═══════════════════════════════════════════════════════════════════════════

describe('validarCedula()', () => {
    it('✅ debe aceptar V-12345678 (formato venezolano natural)', () => {
        const resultado = validarCedula('V-12345678');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar V12345678 (sin guion)', () => {
        const resultado = validarCedula('V12345678');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar E-12345678 (extranjero)', () => {
        const resultado = validarCedula('E-12345678');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar J-12345678 (jurídico/empresa)', () => {
        const resultado = validarCedula('J-12345678');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar P-12345678 (pasaporte)', () => {
        const resultado = validarCedula('P-12345678');
        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar cédula sin prefijo V/E/J/P', () => {
        const resultado = validarCedula('12345678');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar cédula con prefijo X inválido', () => {
        const resultado = validarCedula('X-12345678');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar cédula con muy pocos dígitos', () => {
        const resultado = validarCedula('V-1234');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar cédula con demasiados dígitos', () => {
        const resultado = validarCedula('V-123456789012345');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar string vacío', () => {
        const resultado = validarCedula('');
        expect(resultado.valido).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 5: validarTelefono (formato venezolano)
// ═══════════════════════════════════════════════════════════════════════════

describe('validarTelefono()', () => {
    it('✅ debe aceptar 0414-1234567 (formato estándar)', () => {
        const resultado = validarTelefono('0414-1234567');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar 04141234567 (sin guion)', () => {
        const resultado = validarTelefono('04141234567');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar 0424-1234567 (Movistar)', () => {
        const resultado = validarTelefono('0424-1234567');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar 0412-1234567 (Movilnet)', () => {
        const resultado = validarTelefono('0412-1234567');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar 0416-1234567 (Movilnet)', () => {
        const resultado = validarTelefono('0416-1234567');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar 0426-1234567 (Digitel)', () => {
        const resultado = validarTelefono('0426-1234567');
        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar número que no empieza con prefijo venezolano', () => {
        const resultado = validarTelefono('0514-1234567');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar número con muy pocos dígitos', () => {
        const resultado = validarTelefono('0414-123');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar string vacío', () => {
        const resultado = validarTelefono('');
        expect(resultado.valido).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 6: validarEmail
// ═══════════════════════════════════════════════════════════════════════════

describe('validarEmail()', () => {
    it('✅ debe aceptar email simple', () => {
        const resultado = validarEmail('usuario@ejemplo.com');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar email con subdominio', () => {
        const resultado = validarEmail('usuario@mail.ejemplo.com');
        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar email con puntos y signos', () => {
        const resultado = validarEmail('juan.perez+trabajo@gmail.com');
        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar email sin @', () => {
        const resultado = validarEmail('usuarioejemplo.com');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar email sin dominio', () => {
        const resultado = validarEmail('usuario@');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar email sin extensión', () => {
        const resultado = validarEmail('usuario@ejemplo');
        expect(resultado.valido).toBe(false);
    });

    it('❌ debe rechazar string vacío', () => {
        const resultado = validarEmail('');
        expect(resultado.valido).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 7: validarCampos (agregador)
// ═══════════════════════════════════════════════════════════════════════════

describe('validarCampos()', () => {
    it('✅ debe devolver válido si todas las validaciones pasan', () => {
        const validaciones = [
            { valido: true },
            { valido: true },
            { valido: true },
        ];
        const resultado = validarCampos(validaciones);

        expect(resultado.valido).toBe(true);
        expect(resultado.errores).toEqual([]);
    });

    it('❌ debe acumular TODOS los errores, no solo el primero', () => {
        const validaciones = [
            { valido: false, error: 'Error 1' },
            { valido: true },
            { valido: false, error: 'Error 3' },
        ];
        const resultado = validarCampos(validaciones);

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toEqual(['Error 1', 'Error 3']);
    });

    it('✅ debe manejar array vacío sin error', () => {
        const resultado = validarCampos([]);

        expect(resultado.valido).toBe(true);
        expect(resultado.errores).toEqual([]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 8: Escenarios de integración (uso combinado)
// ═══════════════════════════════════════════════════════════════════════════

describe('Casos reales — formulario de cliente', () => {
    it('✅ un cliente venezolano completo debe pasar todas las validaciones', () => {
        const validaciones = [
            validarRequerido('Juan Pérez', 'Nombre'),
            validarCedula('V-12345678'),
            validarTelefono('0414-1234567'),
            validarEmail('juan@ejemplo.com'),
        ];
        const resultado = validarCampos(validaciones);

        expect(resultado.valido).toBe(true);
    });

    it('❌ un cliente con datos mal escritos debe reportar TODOS los errores', () => {
        const validaciones = [
            validarRequerido('', 'Nombre'),          // ❌
            validarCedula('12345678'),               // ❌ sin prefijo
            validarTelefono('0514-1234567'),         // ❌ prefijo incorrecto
            validarEmail('juan@'),                   // ❌ sin extensión
        ];
        const resultado = validarCampos(validaciones);

        expect(resultado.valido).toBe(false);
        expect(resultado.errores.length).toBe(4);
    });
});
