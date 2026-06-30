/**
 * Tests para Venta.validar()
 *
 * Cobertura: 12 escenarios críticos de la lógica de dinero.
 * Escenarios agrupados por "describe()" — cada grupo = una regla de negocio.
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
import { Venta } from './Venta.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: armar una venta "base válida" que se reutiliza en cada test
// (solo se modifican los campos que el test quiere probar)
// ═══════════════════════════════════════════════════════════════════════════

const clienteValido = {
    nombre: 'Juan Pérez',
    cedula: 'V-12345678',
    telefono: '0414-1234567',
};

const equipoValido = {
    modelo: 'iPhone 15',
    color: 'Negro',
    almacenamiento: '128gb',
    bateria: 95,
    imei: '123456789012345',
    garantia: '30 días',
    precio: 800,
};

function ventaBase(overrides = {}) {
    return new Venta({
        formaPago: 'efectivo',
        montoTotal: 800,
        tipoVenta: 'completa',
        cliente: clienteValido,
        equipo: equipoValido,
        ...overrides,
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 1: Validaciones de datos básicos (forma de pago, monto, cliente)
// ═══════════════════════════════════════════════════════════════════════════

describe('Venta.validar() — datos básicos', () => {
    it('✅ debe aceptar una venta completa con todos los datos correctos', () => {
        const venta = ventaBase();
        const resultado = venta.validar();

        expect(resultado.valido).toBe(true);
        expect(resultado.errores).toEqual([]);
    });

    it('❌ debe rechazar si NO se selecciona forma de pago', () => {
        const venta = ventaBase({ formaPago: '' });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe seleccionar una forma de pago');
    });

    it('❌ debe rechazar si el monto total es 0', () => {
        const venta = ventaBase({ montoTotal: 0 });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('El monto total debe ser mayor a $0.00');
    });

    it('❌ debe rechazar si falta el nombre del cliente', () => {
        const venta = ventaBase({
            cliente: { ...clienteValido, nombre: '' },
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('Debe ingresar el nombre del cliente');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 2: WEPPA (venta a crédito)
// Regla: con WEPPA, montoTotal debe ser >= lo que paga HOY (inicial)
// ═══════════════════════════════════════════════════════════════════════════

describe('Venta.validar() — WEPPA', () => {
    it('✅ debe aceptar WEPPA cuando montoTotal es MAYOR a inicial', () => {
        // Vende $1000, paga $200 hoy, debe $800 → OK
        const venta = ventaBase({
            formaPago: 'zelle',
            montoTotal: 1000,
            montoPago: 200,
            weppa: true,
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe RECHAZAR WEPPA cuando montoTotal es MENOR a inicial', () => {
        // Vende $150, paga $200 hoy → NO es crédito, es error de captura
        const venta = ventaBase({
            formaPago: 'zelle',
            montoTotal: 150,
            montoPago: 200,
            weppa: true,
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(false);
        const mencionWeppa = resultado.errores.some(e => e.includes('WEPPA'));
        expect(mencionWeppa).toBe(true);
    });

    it('✅ debe aceptar WEPPA con pago mixto si la inicial es menor al total', () => {
        // Vende $1000, paga $300 en efectivo + $200 en zelle = $500 hoy
        const venta = ventaBase({
            formaPago: 'mixto',
            montoTotal: 1000,
            weppa: true,
            pagoMixto: {
                efectivo: 300,
                zelle: 200,
                binance: 0,
                pagoMovil: 0,
                transferencia: 0,
            },
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 3: Pago mixto (suma de métodos = total)
// ═══════════════════════════════════════════════════════════════════════════

describe('Venta.validar() — pago mixto', () => {
    it('✅ debe aceptar pago mixto que cuadra exactamente con el total', () => {
        // $600 zelle + $200 binance + $200 efectivo = $1000
        const venta = ventaBase({
            formaPago: 'mixto',
            montoTotal: 1000,
            pagoMixto: {
                efectivo: 200,
                zelle: 600,
                binance: 200,
                pagoMovil: 0,
                transferencia: 0,
            },
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe RECHAZAR pago mixto que NO cuadra con el total', () => {
        // $500 + $200 + $200 = $900, pero el total es $1000 → falta $100
        const venta = ventaBase({
            formaPago: 'mixto',
            montoTotal: 1000,
            pagoMixto: {
                efectivo: 200,
                zelle: 500,
                binance: 200,
                pagoMovil: 0,
                transferencia: 0,
            },
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(false);
        const mencionTotal = resultado.errores.some(e => e.includes('no coincide'));
        expect(mencionTotal).toBe(true);
    });

    it('✅ debe aceptar pago mixto con trade-in incluido', () => {
        // Vende $1000, recibe equipo $300, paga $700 en zelle
        const venta = ventaBase({
            formaPago: 'mixto',
            montoTotal: 1000,
            pagoMixto: {
                efectivo: 0,
                zelle: 700,
                binance: 0,
                pagoMovil: 0,
                transferencia: 0,
            },
            equipoRecibido: {
                modelo: 'iPhone 11',
                color: 'Blanco',
                capacidad: '64gb',
                bateria: 85,
                imei: '987654321098765',
                valor: 300,
            },
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 4: Trade-in (equipo recibido)
// Regla: valor del equipo + pago = total
// ═══════════════════════════════════════════════════════════════════════════

describe('Venta.validar() — trade-in (equipo recibido)', () => {
    it('❌ debe rechazar trade-in con IMEI muy corto (< 15 chars)', () => {
        const venta = ventaBase({
            montoTotal: 800,
            equipoRecibido: {
                modelo: 'iPhone 11',
                color: 'Blanco',
                capacidad: '64gb',
                bateria: 85,
                imei: '12345',  // solo 5 dígitos
                valor: 200,
            },
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(false);
        const mencionImei = resultado.errores.some(e => e.includes('IMEI'));
        expect(mencionImei).toBe(true);
    });

    it('❌ debe rechazar trade-in sin valor asignado', () => {
        const venta = ventaBase({
            montoTotal: 800,
            equipoRecibido: {
                modelo: 'iPhone 11',
                color: 'Blanco',
                capacidad: '64gb',
                bateria: 85,
                imei: '987654321098765',
                valor: 0,  // sin valor
            },
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(false);
        const mencionValor = resultado.errores.some(e => e.includes('valor'));
        expect(mencionValor).toBe(true);
    });

    it('✅ debe aceptar multi-trade-in con 2 equipos recibidos', () => {
        const venta = ventaBase({
            formaPago: 'zelle',
            montoTotal: 1000,
            montoPago: 500,
            equiposRecibidos: [
                {
                    modelo: 'iPhone 11',
                    color: 'Blanco',
                    capacidad: '64gb',
                    bateria: 85,
                    imei: '111111111111111',
                    valor: 200,
                },
                {
                    modelo: 'iPhone 12',
                    color: 'Negro',
                    capacidad: '128gb',
                    bateria: 90,
                    imei: '222222222222222',
                    valor: 300,
                },
            ],
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 5: Multi-equipo vendido (varios iPhones en una sola venta)
// ═══════════════════════════════════════════════════════════════════════════

describe('Venta.validar() — multi-equipo vendido', () => {
    it('✅ debe aceptar venta con 2 iPhones del inventario', () => {
        const venta = ventaBase({
            montoTotal: 1200,  // 500 + 700
            equipos: [
                {
                    modelo: 'iPhone 14',
                    color: 'Azul',
                    almacenamiento: '128gb',
                    bateria: 92,
                    imei: '333333333333333',
                    garantia: '30 días',
                    precio: 500,
                },
                {
                    modelo: 'iPhone 15',
                    color: 'Negro',
                    almacenamiento: '256gb',
                    bateria: 98,
                    imei: '444444444444444',
                    garantia: '60 días',
                    precio: 700,
                },
            ],
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar multi-equipo si algún equipo no tiene IMEI', () => {
        const venta = ventaBase({
            montoTotal: 1200,
            equipos: [
                {
                    modelo: 'iPhone 14',
                    color: 'Azul',
                    almacenamiento: '128gb',
                    bateria: 92,
                    imei: '333333333333333',
                    garantia: '30 días',
                    precio: 500,
                },
                {
                    modelo: 'iPhone 15',
                    color: 'Negro',
                    almacenamiento: '256gb',
                    bateria: 98,
                    imei: '',  // sin IMEI
                    garantia: '60 días',
                    precio: 700,
                },
            ],
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(false);
        const mencionEquipo2 = resultado.errores.some(e =>
            e.includes('equipo #2') && e.includes('IMEI')
        );
        expect(mencionEquipo2).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 6: Solo accesorios (sin iPhone)
// ═══════════════════════════════════════════════════════════════════════════

describe('Venta.validar() — solo accesorios', () => {
    it('✅ debe aceptar venta solo de accesorios con forro y vidrio', () => {
        const venta = ventaBase({
            tipoVenta: 'accesorios',
            montoTotal: 50,
            equipo: null,  // sin equipo
            accesorios: {
                forro: true,
                forros: [{ modelo: 'iPhone 15', cantidad: 2 }],
                vidrio: true,
                vidrios: [{ modelo: 'iPhone 15', cantidad: 1 }],
                cargador: false,
                protectorCamara: false,
                cubo: false,
                cableLightning: false,
                cableCC: false,
                caja: false,
            },
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe rechazar venta solo de accesorios si no se marca ninguno', () => {
        const venta = ventaBase({
            tipoVenta: 'accesorios',
            montoTotal: 0,
            equipo: null,
            accesorios: {
                forro: false,
                vidrio: false,
                cargador: false,
                protectorCamara: false,
                cubo: false,
                cableLightning: false,
                cableCC: false,
                caja: false,
            },
        });
        const resultado = venta.validar();

        expect(resultado.valido).toBe(false);
        const mencionAccesorio = resultado.errores.some(e =>
            e.includes('accesorio')
        );
        expect(mencionAccesorio).toBe(true);
    });
});
