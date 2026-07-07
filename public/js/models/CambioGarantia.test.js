/**
 * Tests para CambioGarantia.validar()
 *
 * Cobertura: 12 escenarios críticos de la lógica de cambio por garantía.
 * Escenarios agrupados por "describe()" — cada grupo = una regla de negocio.
 *
 * Contexto:
 *   Este modelo valida los datos de un cambio de equipo defectuoso por uno
 *   nuevo. La validación es la primera línea de defensa contra el bug de
 *   "equipo fantasma" (cambio guardado sin contraparte en inventario).
 *
 * Cómo ejecutar:
 *   npm test              → corre una vez y termina
 *   npm run test:watch    → corre y se queda escuchando cambios
 *
 * Cómo leer un test:
 *   describe('grupo', ...)  → "estoy probando este grupo de reglas"
 *   it('caso', ...)         → "este caso específico debe pasar"
 *   expect(algo).toBe(X)    → "aseguro que `algo` es exactamente X"
 */

import { describe, it, expect } from 'vitest';
import { CambioGarantia } from './CambioGarantia.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: armar un cambio "base válido" que se reutiliza en cada test
// (solo se modifican los campos que el test quiere probar)
// ═══════════════════════════════════════════════════════════════════════════

const clienteValido = {
    nombre: 'Juan Pérez',
    cedula: 'V-12345678',
    telefono: '0414-1234567',
};

const defectuosoValido = {
    modelo: 'iPhone 13',
    color: 'Negro',
    capacidad: '128GB',
    bateria: '50',
    imei: '111111111111111',
    problema: 'Pantalla rota',
};

const nuevoValido = {
    modelo: 'iPhone 14',
    color: 'Azul',
    capacidad: '256GB',
    bateria: '100',
    imei: '222222222222222',
};

function cambioBase(overrides = {}) {
    return new CambioGarantia({
        cliente: { ...clienteValido },
        equipoDefectuoso: { ...defectuosoValido },
        equipoNuevo: { ...nuevoValido },
        diferencia: { tipo: 'ninguna', monto: 0 },
        ...overrides,
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 1: Validaciones de datos básicos (cliente, equipos completos)
// ═══════════════════════════════════════════════════════════════════════════

describe('CambioGarantia.validar() — datos básicos', () => {
    it('✅ debe aceptar un cambio completo con todos los datos correctos', () => {
        const cambio = cambioBase();
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(true);
        expect(resultado.errores).toEqual([]);
    });

    it('❌ debe rechazar si falta el nombre del cliente', () => {
        const cambio = cambioBase({ cliente: { ...clienteValido, nombre: '' } });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe ingresar el nombre del cliente');
    });

    it('❌ debe rechazar si falta la cédula del cliente', () => {
        const cambio = cambioBase({ cliente: { ...clienteValido, cedula: '' } });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe ingresar la cédula del cliente');
    });

    it('❌ debe rechazar si falta el teléfono del cliente', () => {
        const cambio = cambioBase({ cliente: { ...clienteValido, telefono: '' } });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe ingresar el teléfono del cliente');
    });

    it('❌ debe rechazar si falta el modelo del equipo defectuoso', () => {
        const cambio = cambioBase({
            equipoDefectuoso: { ...defectuosoValido, modelo: '' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe seleccionar el modelo del equipo defectuoso');
    });

    it('❌ debe rechazar si falta el modelo del equipo nuevo', () => {
        const cambio = cambioBase({
            equipoNuevo: { ...nuevoValido, modelo: '' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe seleccionar el modelo del equipo nuevo');
    });

    it('❌ debe rechazar si falta la descripción del problema', () => {
        const cambio = cambioBase({
            equipoDefectuoso: { ...defectuosoValido, problema: '' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe describir el problema del equipo');
    });

    it('❌ debe rechazar si falta la batería del equipo nuevo', () => {
        const cambio = cambioBase({
            equipoNuevo: { ...nuevoValido, bateria: '' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe ingresar el porcentaje de batería del equipo nuevo');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 2: Validaciones de IMEI (longitud mínima, formato)
// ═══════════════════════════════════════════════════════════════════════════

describe('CambioGarantia.validar() — IMEI', () => {
    it('❌ debe rechazar si falta el IMEI del equipo defectuoso', () => {
        const cambio = cambioBase({
            equipoDefectuoso: { ...defectuosoValido, imei: '' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe ingresar el IMEI del equipo defectuoso');
    });

    it('❌ debe rechazar si el IMEI del equipo defectuoso tiene menos de 15 caracteres', () => {
        const cambio = cambioBase({
            equipoDefectuoso: { ...defectuosoValido, imei: '123' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El IMEI del equipo defectuoso debe tener al menos 15 caracteres');
    });

    it('❌ debe rechazar si falta el IMEI del equipo nuevo', () => {
        const cambio = cambioBase({
            equipoNuevo: { ...nuevoValido, imei: '' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe ingresar el IMEI del equipo nuevo');
    });

    it('❌ debe rechazar si el IMEI del equipo nuevo tiene menos de 15 caracteres', () => {
        const cambio = cambioBase({
            equipoNuevo: { ...nuevoValido, imei: 'abc123' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El IMEI del equipo nuevo debe tener al menos 15 caracteres');
    });

    it('✅ debe aceptar IMEIs de exactamente 15 caracteres', () => {
        const cambio = cambioBase({
            equipoDefectuoso: { ...defectuosoValido, imei: '123456789012345' },
            equipoNuevo: { ...nuevoValido, imei: '987654321098765' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 3: Acumulación de errores
// ═══════════════════════════════════════════════════════════════════════════

describe('CambioGarantia.validar() — múltiples errores', () => {
    it('❌ debe acumular todos los errores, no solo el primero', () => {
        const cambio = cambioBase({
            cliente: { ...clienteValido, nombre: '', cedula: '' },
            equipoDefectuoso: { ...defectuosoValido, imei: '' }
        });
        const resultado = cambio.validar();
        expect(resultado.valido).toBe(false);
        expect(resultado.errores.length).toBeGreaterThanOrEqual(3);
    });
});
