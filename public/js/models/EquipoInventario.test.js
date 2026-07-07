/**
 * Tests para EquipoInventario.validar()
 *
 * Cobertura: validación de campos obligatorios y rangos numéricos.
 * Modelo puro, sin mocks de DOM/Firestore.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EquipoInventario } from './EquipoInventario.js';

// EquipoInventario.constructor usa localStorage y crypto. En Node puro
// no existen, así que los stubamos antes de los tests.
beforeEach(() => {
    if (typeof globalThis.localStorage === 'undefined') {
        const store = {};
        globalThis.localStorage = {
            getItem: (k) => store[k] ?? null,
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; },
            clear: () => { Object.keys(store).forEach(k => delete store[k]); }
        };
    }
    if (typeof globalThis.crypto === 'undefined') {
        globalThis.crypto = { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) };
    }
});

function equipoBase(overrides = {}) {
    return new EquipoInventario({
        modelo: 'iPhone 13',
        gb: '128GB',
        color: 'Negro',
        bateria: 95,
        imei: '123456789012345',
        ...overrides,
    });
}

describe('EquipoInventario.validar()', () => {
    it('✅ debe aceptar un equipo con todos los datos válidos', () => {
        const equipo = equipoBase();
        const resultado = equipo.validar();
        expect(resultado.valido).toBe(true);
        expect(resultado.errores).toEqual([]);
    });

    it('❌ debe rechazar si falta el modelo', () => {
        const equipo = equipoBase({ modelo: '' });
        const resultado = equipo.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El modelo es obligatorio');
    });

    it('❌ debe rechazar si falta la capacidad (GB)', () => {
        const equipo = equipoBase({ gb: '' });
        const resultado = equipo.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('La capacidad (GB) es obligatoria');
    });

    it('❌ debe rechazar si falta el color', () => {
        const equipo = equipoBase({ color: '' });
        const resultado = equipo.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El color es obligatorio');
    });

    it('❌ debe rechazar batería mayor a 100', () => {
        const equipo = equipoBase({ bateria: 150 });
        const resultado = equipo.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('La batería debe estar entre 0 y 100');
    });

    it('❌ debe rechazar batería negativa', () => {
        const equipo = equipoBase({ bateria: -5 });
        const resultado = equipo.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('La batería debe estar entre 0 y 100');
    });

    it('❌ debe rechazar IMEI de menos de 15 caracteres', () => {
        const equipo = equipoBase({ imei: '12345' });
        const resultado = equipo.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El IMEI debe tener al menos 15 caracteres');
    });

    it('❌ debe rechazar IMEI vacío', () => {
        const equipo = equipoBase({ imei: '' });
        const resultado = equipo.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El IMEI debe tener al menos 15 caracteres');
    });
});
