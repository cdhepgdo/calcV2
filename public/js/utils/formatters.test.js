/**
 * Tests para formatters.js
 *
 * Cobertura: formateo de moneda, fecha, hora, teléfono, cédula,
 * capitalización, truncamiento, porcentaje y sanitización XSS.
 *
 * Cómo ejecutar:
 *   npm test
 */

import { describe, it, expect } from 'vitest';
import {
    formatearMoneda,
    formatearBolivares,
    formatearFecha,
    formatearHora,
    formatearTelefono,
    formatearCedula,
    capitalizarTexto,
    truncarTexto,
    formatearPorcentaje,
    sanitizar,
} from './formatters.js';

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 1: Formateo de moneda
// ═══════════════════════════════════════════════════════════════════════════

describe('formatearMoneda()', () => {
    it('✅ debe formatear número entero con 2 decimales y símbolo $', () => {
        expect(formatearMoneda(100)).toBe('$100.00');
    });

    it('✅ debe redondear a 2 decimales si vienen más', () => {
        expect(formatearMoneda(100.5)).toBe('$100.50');
        expect(formatearMoneda(99.999)).toBe('$100.00');  // toFixed redondea
    });

    it('✅ debe aceptar string numérico (viene de input HTML)', () => {
        expect(formatearMoneda('250.75')).toBe('$250.75');
    });

    it('✅ debe devolver $0.00 para null o undefined', () => {
        expect(formatearMoneda(null)).toBe('$0.00');
        expect(formatearMoneda(undefined)).toBe('$0.00');
    });

    it('✅ debe devolver $0.00 para NaN', () => {
        expect(formatearMoneda('no es número')).toBe('$0.00');
    });

    it('✅ debe aceptar números negativos (devoluciones)', () => {
        expect(formatearMoneda(-50)).toBe('$-50.00');
    });
});

describe('formatearBolivares()', () => {
    it('✅ debe formatear con 2 decimales y sufijo Bs', () => {
        expect(formatearBolivares(36000)).toBe('36000.00 Bs');
    });

    it('✅ debe manejar decimales', () => {
        expect(formatearBolivares(36500.50)).toBe('36500.50 Bs');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 2: Formateo de fecha y hora
// ═══════════════════════════════════════════════════════════════════════════

describe('formatearFecha()', () => {
    it('✅ debe formatear objeto Date como string largo en español', () => {
        const fecha = new Date('2026-06-15T12:00:00');
        const resultado = formatearFecha(fecha);

        // El formato exacto depende del locale, verificamos partes clave
        expect(resultado).toContain('2026');
        expect(resultado).toContain('junio');
    });

    it('✅ debe devolver el string tal cual si no es un Date', () => {
        expect(formatearFecha('15/06/2026')).toBe('15/06/2026');
    });
});

describe('formatearHora()', () => {
    it('✅ debe formatear objeto Date como hora HH:MM', () => {
        const fecha = new Date('2026-06-15T14:30:00');
        const resultado = formatearHora(fecha);

        // Verificamos que tenga formato HH:MM (puede variar por locale)
        expect(resultado).toMatch(/\d{1,2}:\d{2}/);
    });

    it('✅ debe devolver el string tal cual si no es un Date', () => {
        expect(formatearHora('14:30')).toBe('14:30');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 3: Formateo de teléfono y cédula
// ═══════════════════════════════════════════════════════════════════════════

describe('formatearTelefono()', () => {
    it('✅ debe agregar guion después del cuarto dígito', () => {
        expect(formatearTelefono('04141234567')).toBe('0414-1234567');
    });

    it('✅ debe remover caracteres no numéricos antes de formatear', () => {
        expect(formatearTelefono('(0414) 123-4567')).toBe('0414-1234567');
        expect(formatearTelefono('0414.123.4567')).toBe('0414-1234567');
    });

    it('✅ debe devolver el string original si no tiene 11 dígitos', () => {
        expect(formatearTelefono('123')).toBe('123');
        expect(formatearTelefono('123456789012')).toBe('123456789012');  // 12 dígitos
    });
});

describe('formatearCedula()', () => {
    it('✅ debe agregar guion si no lo tiene', () => {
        expect(formatearCedula('V12345678')).toBe('V-12345678');
    });

    it('✅ debe normalizar a mayúscula', () => {
        expect(formatearCedula('v12345678')).toBe('V-12345678');
        expect(formatearCedula('e12345678')).toBe('E-12345678');
    });

    it('✅ debe mantener el formato si ya tiene guion', () => {
        expect(formatearCedula('V-12345678')).toBe('V-12345678');
        expect(formatearCedula('v-12345678')).toBe('V-12345678');
    });

    it('✅ debe devolver en mayúscula si el formato es irreconocible', () => {
        expect(formatearCedula('xx123')).toBe('XX123');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 4: capitalizarTexto y truncarTexto
// ═══════════════════════════════════════════════════════════════════════════

describe('capitalizarTexto()', () => {
    it('✅ debe capitalizar primera letra de cada palabra', () => {
        expect(capitalizarTexto('juan perez')).toBe('Juan Perez');
    });

    it('✅ debe funcionar con mayúsculas mezcladas (normaliza a Title Case)', () => {
        expect(capitalizarTexto('jUaN pErEz')).toBe('Juan Perez');
    });

    it('✅ debe manejar múltiples espacios', () => {
        expect(capitalizarTexto('juan   perez   lopez')).toBe('Juan   Perez   Lopez');
    });

    it('✅ debe manejar string vacío', () => {
        expect(capitalizarTexto('')).toBe('');
    });
});

describe('truncarTexto()', () => {
    it('✅ debe devolver el texto tal cual si es más corto que el límite', () => {
        expect(truncarTexto('Hola', 10)).toBe('Hola');
    });

    it('✅ debe truncar y agregar "..." si excede el límite', () => {
        expect(truncarTexto('Este es un texto muy largo', 10)).toBe('Este es un...');
    });

    it('✅ debe respetar exactamente el límite de caracteres', () => {
        const resultado = truncarTexto('Hola mundo', 4);
        // 'Hola' son 4 chars + '...' = 7 chars total
        expect(resultado.length).toBe(7);
        expect(resultado).toBe('Hola...');
    });

    it('✅ debe usar 50 como límite por defecto', () => {
        const textoLargo = 'a'.repeat(60);
        const resultado = truncarTexto(textoLargo);
        expect(resultado.length).toBe(53);  // 50 + '...'
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 5: formatearPorcentaje
// ═══════════════════════════════════════════════════════════════════════════

describe('formatearPorcentaje()', () => {
    it('✅ debe agregar el símbolo de porcentaje', () => {
        expect(formatearPorcentaje(95)).toBe('95%');
    });

    it('✅ debe aceptar string numérico', () => {
        expect(formatearPorcentaje('85.5')).toBe('85.5%');
    });

    it('✅ debe devolver 0% para null/undefined', () => {
        expect(formatearPorcentaje(null)).toBe('0%');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 6: sanitizar (anti-XSS)
// ═══════════════════════════════════════════════════════════════════════════

describe('sanitizar()', () => {
    it('✅ debe devolver string vacío para null', () => {
        expect(sanitizar(null)).toBe('');
    });

    it('✅ debe devolver string vacío para undefined', () => {
        expect(sanitizar(undefined)).toBe('');
    });

    it('✅ debe escapar < y >', () => {
        expect(sanitizar('<script>')).toBe('&lt;script&gt;');
    });

    it('✅ debe escapar comillas dobles', () => {
        expect(sanitizar('Hola "mundo"')).toBe('Hola &quot;mundo&quot;');
    });

    it('✅ debe escapar comillas simples', () => {
        expect(sanitizar("Hola 'mundo'")).toBe('Hola &#x27;mundo&#x27;');
    });

    it('✅ debe escapar ampersand', () => {
        expect(sanitizar('Juan & Pedro')).toBe('Juan &amp; Pedro');
    });

    it('✅ debe escapar múltiples caracteres en combinación', () => {
        // Caso clásico de XSS: alguien escribe código malicioso en un campo
        const inputPeligroso = '<img src=x onerror="alert(1)">';
        const resultado = sanitizar(inputPeligroso);
        expect(resultado).not.toContain('<');
        expect(resultado).not.toContain('>');
        expect(resultado).not.toContain('"');
    });

    it('✅ debe dejar pasar texto normal sin cambios', () => {
        expect(sanitizar('Juan Pérez López')).toBe('Juan Pérez López');
        expect(sanitizar('0414-1234567')).toBe('0414-1234567');
    });
});
