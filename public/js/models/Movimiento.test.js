/**
 * Tests para Movimiento.validar() y Movimiento.calcularImpactoEfectivo()
 *
 * Cobertura: 7 tipos de movimiento (efectivo, equipo, accesorio, garantía)
 * más el cálculo de impacto en caja.
 *
 * Cómo ejecutar:
 *   npm test
 */

import { describe, it, expect } from 'vitest';
import { Movimiento } from './Movimiento.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════

function movimientoBase(overrides = {}) {
    return new Movimiento({
        tipo: 'Salida Efectivo',
        datos: {
            monto: 50,
            persona: 'Carlos López',
            nota: 'Pago de servicio eléctrico',
        },
        ...overrides,
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 1: Validaciones por tipo de movimiento
// ═══════════════════════════════════════════════════════════════════════════

describe('Movimiento.validar() — Salida de Efectivo', () => {
    it('✅ debe aceptar salida de efectivo con todos los datos', () => {
        const mov = movimientoBase();
        const resultado = mov.validar();

        expect(resultado.valido).toBe(true);
        expect(resultado.errores).toEqual([]);
    });

    it('❌ debe rechazar si NO se especifica el monto', () => {
        const mov = movimientoBase({ datos: { monto: 0, persona: 'Carlos', nota: 'motivo' } });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El monto debe ser mayor a $0.00');
    });

    it('❌ debe rechazar si NO se especifica quién retira el efectivo', () => {
        const mov = movimientoBase({
            datos: { monto: 50, persona: '', nota: 'motivo' },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar quién retira el efectivo');
    });

    it('❌ debe rechazar si NO se especifica el motivo', () => {
        const mov = movimientoBase({
            datos: { monto: 50, persona: 'Carlos', nota: '' },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el motivo del retiro');
    });
});

describe('Movimiento.validar() — Ingreso de Efectivo', () => {
    it('✅ debe aceptar ingreso de efectivo con monto y motivo', () => {
        const mov = new Movimiento({
            tipo: 'Ingreso Efectivo',
            datos: { monto: 200, nota: 'Reposición de caja' },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar si NO se especifica el motivo del ingreso', () => {
        const mov = new Movimiento({
            tipo: 'Ingreso Efectivo',
            datos: { monto: 200, nota: '' },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el motivo del ingreso');
    });

    it('❌ debe rechazar si el monto es negativo', () => {
        const mov = new Movimiento({
            tipo: 'Ingreso Efectivo',
            datos: { monto: -50, nota: 'motivo' },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El monto debe ser mayor a $0.00');
    });
});

describe('Movimiento.validar() — Salida de Equipo', () => {
    it('✅ debe aceptar salida de equipo con modelo, capacidad, color, destino y persona', () => {
        const mov = new Movimiento({
            tipo: 'Salida Equipo',
            datos: {
                modelo: 'iPhone 15',
                capacidad: '128gb',
                color: 'Negro',
                destino: 'Sede Norte',
                persona: 'Carlos López',
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar si falta el destino del equipo', () => {
        const mov = new Movimiento({
            tipo: 'Salida Equipo',
            datos: {
                modelo: 'iPhone 15',
                capacidad: '128gb',
                color: 'Negro',
                destino: '',
                persona: 'Carlos',
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el destino');
    });
});

describe('Movimiento.validar() — Ingreso de Equipo', () => {
    it('✅ debe aceptar ingreso de equipo con origen válido', () => {
        const mov = new Movimiento({
            tipo: 'Ingreso Equipo',
            datos: {
                modelo: 'iPhone 14',
                capacidad: '256gb',
                color: 'Azul',
                origen: 'Proveedor Apple',
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar si falta el origen del equipo', () => {
        const mov = new Movimiento({
            tipo: 'Ingreso Equipo',
            datos: {
                modelo: 'iPhone 14',
                capacidad: '256gb',
                color: 'Azul',
                origen: '',
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el origen');
    });
});

describe('Movimiento.validar() — Compra de Equipo', () => {
    it('✅ debe aceptar compra con precio y proveedor', () => {
        const mov = new Movimiento({
            tipo: 'Compra Equipo',
            datos: {
                modelo: 'iPhone 15',
                capacidad: '128gb',
                color: 'Negro',
                precio: 750,
                proveedor: 'Apple Inc.',
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar si falta el proveedor', () => {
        const mov = new Movimiento({
            tipo: 'Compra Equipo',
            datos: {
                modelo: 'iPhone 15',
                capacidad: '128gb',
                color: 'Negro',
                precio: 750,
                proveedor: '',
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el proveedor');
    });

    it('❌ debe rechazar si el precio es 0 o negativo', () => {
        const mov = new Movimiento({
            tipo: 'Compra Equipo',
            datos: {
                modelo: 'iPhone 15',
                capacidad: '128gb',
                color: 'Negro',
                precio: 0,
                proveedor: 'Apple',
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El precio debe ser mayor a $0.00');
    });
});

describe('Movimiento.validar() — Salida de Accesorio', () => {
    it('✅ debe aceptar salida de accesorio con tipo y destino', () => {
        const mov = new Movimiento({
            tipo: 'Salida Accesorio',
            datos: {
                tipo: 'Forro',
                destino: 'Sede Norte',
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar si falta el tipo de accesorio', () => {
        const mov = new Movimiento({
            tipo: 'Salida Accesorio',
            datos: { tipo: '', destino: 'Sede Norte' },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el tipo de accesorio');
    });
});

describe('Movimiento.validar() — Ingreso de Accesorio', () => {
    it('✅ debe aceptar ingreso de accesorio con tipo y proveedor', () => {
        const mov = new Movimiento({
            tipo: 'Ingreso Accesorio',
            datos: {
                tipo: 'Vidrio Templado',
                proveedor: 'Importadora XYZ',
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar si falta el proveedor', () => {
        const mov = new Movimiento({
            tipo: 'Ingreso Accesorio',
            datos: { tipo: 'Vidrio', proveedor: '' },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el proveedor');
    });
});

describe('Movimiento.validar() — Cambio por Garantía', () => {
    it('✅ debe aceptar cambio de garantía con cliente y equipos', () => {
        const mov = new Movimiento({
            tipo: 'Cambio Garantía',
            datos: {
                cliente: { nombre: 'Juan Pérez', cedula: 'V-12345678' },
                equipoDefectuoso: { modelo: 'iPhone 15', imei: '111111111111111' },
                equipoNuevo: { modelo: 'iPhone 15', imei: '222222222222222' },
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar si falta el cliente', () => {
        const mov = new Movimiento({
            tipo: 'Cambio Garantía',
            datos: {
                cliente: { nombre: '' },
                equipoDefectuoso: { modelo: 'iPhone 15' },
                equipoNuevo: { modelo: 'iPhone 15' },
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el cliente');
    });

    it('❌ debe rechazar si falta el equipo defectuoso', () => {
        const mov = new Movimiento({
            tipo: 'Cambio Garantía',
            datos: {
                cliente: { nombre: 'Juan' },
                equipoDefectuoso: { modelo: '' },
                equipoNuevo: { modelo: 'iPhone 15' },
            },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el equipo defectuoso');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 2: Validaciones generales (cualquier tipo)
// ═══════════════════════════════════════════════════════════════════════════

describe('Movimiento.validar() — validaciones generales', () => {
    it('❌ debe rechazar si NO se especifica el tipo de movimiento', () => {
        const mov = new Movimiento({
            tipo: '',
            datos: { monto: 50 },
        });
        const resultado = mov.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe especificar el tipo de movimiento');
    });
});

// ════════════════════════════════════════════
// GRUPO 3: Cálculo de impacto en efectivo (mueve dinero real)
// ════════════════════════════════════════════

describe('Movimiento.calcularImpactoEfectivo()', () => {
    it('💸 Salida Efectivo debe restar (devolver número NEGATIVO)', () => {
        const mov = new Movimiento({
            tipo: 'Salida Efectivo',
            datos: { monto: 100 },
        });

        const impacto = mov.calcularImpactoEfectivo();

        expect(impacto).toBe(-100);
    });

    it('💵 Ingreso Efectivo debe sumar (devolver número POSITIVO)', () => {
        const mov = new Movimiento({
            tipo: 'Ingreso Efectivo',
            datos: { monto: 200 },
        });

        const impacto = mov.calcularImpactoEfectivo();

        expect(impacto).toBe(200);
    });

    it('📱 Compra Equipo debe restar el precio al efectivo', () => {
        const mov = new Movimiento({
            tipo: 'Compra Equipo',
            datos: { precio: 750 },
        });

        const impacto = mov.calcularImpactoEfectivo();

        expect(impacto).toBe(-750);
    });

    it('🔄 Cambio Garantía a FAVOR DEL CLIENTE resta el monto', () => {
        const mov = new Movimiento({
            tipo: 'Cambio Garantía',
            datos: {
                diferencia: { tipo: 'favor-cliente', monto: 100 },
            },
        });

        const impacto = mov.calcularImpactoEfectivo();

        expect(impacto).toBe(-100);
    });

    it('🔄 Cambio Garantía a FAVOR DE LA TIENDA suma el monto', () => {
        const mov = new Movimiento({
            tipo: 'Cambio Garantía',
            datos: {
                diferencia: { tipo: 'favor-tienda', monto: 150 },
            },
        });

        const impacto = mov.calcularImpactoEfectivo();

        expect(impacto).toBe(150);
    });

    it('🔄 Cambio Garantía sin diferencia económica no afecta caja', () => {
        const mov = new Movimiento({
            tipo: 'Cambio Garantía',
            datos: {
                diferencia: { tipo: 'ninguna', monto: 0 },
            },
        });

        const impacto = mov.calcularImpactoEfectivo();

        expect(impacto).toBe(0);
    });
});

describe('Movimiento.calcularImpactoEfectivo() — tipos que NO afectan efectivo', () => {
    it('📤 Salida de Equipo NO afecta efectivo (impacto = 0)', () => {
        const mov = new Movimiento({
            tipo: 'Salida Equipo',
            datos: { modelo: 'iPhone 15' },
        });

        const impacto = mov.calcularImpactoEfectivo();

        expect(impacto).toBe(0);
    });

    it('📥 Ingreso de Equipo NO afecta efectivo (impacto = 0)', () => {
        const mov = new Movimiento({
            tipo: 'Ingreso Equipo',
            datos: { modelo: 'iPhone 15' },
        });

        const impacto = mov.calcularImpactoEfectivo();

        expect(impacto).toBe(0);
    });

    it('🛡️ Salida de Accesorio NO afecta efectivo (impacto = 0)', () => {
        const mov = new Movimiento({
            tipo: 'Salida Accesorio',
            datos: { tipo: 'Forro' },
        });

        const impacto = mov.calcularImpactoEfectivo();

        expect(impacto).toBe(0);
    });
});
