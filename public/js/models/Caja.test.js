/**
 * Tests para Caja.calcularCajaFinal() y Caja.obtenerDesglose()
 *
 * Caja es el modelo más crítico del proyecto: su cálculo decide cuánto
 * dinero debe haber en la caja al final del día. Si la fórmula está mal,
 * TODO el sistema miente.
 *
 * Fórmula (de Caja.js línea 56):
 *   cajaFinal = cajaInicial
 *             + efectivoVentas
 *             + ingresosEfectivo
 *             - salidasEfectivo
 *             - comprasEquipos
 *             ± diferenciasGarantia
 *
 * Cómo ejecutar:
 *   npm test
 */

import { describe, it, expect } from 'vitest';
import { Caja } from './Caja.js';

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 1: Validación de caja inicial
// ═══════════════════════════════════════════════════════════════════════════

describe('Caja.validar()', () => {
    it('✅ debe aceptar caja inicial positiva', () => {
        const caja = new Caja(500);
        const resultado = caja.validar();

        expect(resultado.valido).toBe(true);
    });

    it('✅ debe aceptar caja inicial en 0 (caja vacía al empezar el día)', () => {
        const caja = new Caja(0);
        const resultado = caja.validar();

        expect(resultado.valido).toBe(true);
    });

    it('❌ debe RECHAZAR caja inicial negativa', () => {
        const caja = new Caja(-100);
        const resultado = caja.validar();

        expect(resultado.valido).toBe(false);
        expect(resultado.errores).toContain('La caja inicial no puede ser negativa');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 2: Cálculo de caja final — casos básicos
// ═══════════════════════════════════════════════════════════════════════════

describe('Caja.calcularCajaFinal() — casos básicos', () => {
    it('✅ con caja vacía y sin ventas, debe devolver la caja inicial', () => {
        const caja = new Caja(200);

        const final = caja.calcularCajaFinal([], []);

        expect(final).toBe(200);
    });

    it('✅ con caja vacía debe devolver 0', () => {
        const caja = new Caja(0);

        const final = caja.calcularCajaFinal([], []);

        expect(final).toBe(0);
    });

    it('✅ venta en efectivo suma al monto en caja', () => {
        const caja = new Caja(100);
        const ventas = [{
            formaPago: 'efectivo',
            montoTotal: 500,
            montoPago: 500,  // paga 500 en efectivo
        }];

        const final = caja.calcularCajaFinal(ventas, []);

        expect(final).toBe(600);  // 100 inicial + 500 venta
    });

    it('✅ venta en ZELLE NO suma a la caja (no es efectivo)', () => {
        const caja = new Caja(100);
        const ventas = [{
            formaPago: 'zelle',
            montoTotal: 500,
            montoPago: 500,
        }];

        const final = caja.calcularCajaFinal(ventas, []);

        expect(final).toBe(100);  // solo la inicial
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 3: Movimientos de efectivo (entradas y salidas)
// ═══════════════════════════════════════════════════════════════════════════

describe('Caja.calcularCajaFinal() — movimientos de efectivo', () => {
    it('✅ Salida de Efectivo RESTA del monto en caja', () => {
        const caja = new Caja(500);
        const movimientos = [{
            tipo: 'Salida Efectivo',
            datos: { monto: 100 },
        }];

        const final = caja.calcularCajaFinal([], movimientos);

        expect(final).toBe(400);  // 500 - 100
    });

    it('✅ Ingreso de Efectivo SUMA al monto en caja', () => {
        const caja = new Caja(200);
        const movimientos = [{
            tipo: 'Ingreso Efectivo',
            datos: { monto: 300 },
        }];

        const final = caja.calcularCajaFinal([], movimientos);

        expect(final).toBe(500);  // 200 + 300
    });

    it('✅ Compra de Equipo RESTA el precio al efectivo', () => {
        const caja = new Caja(1000);
        const movimientos = [{
            tipo: 'Compra Equipo',
            datos: { precio: 750 },
        }];

        const final = caja.calcularCajaFinal([], movimientos);

        expect(final).toBe(250);  // 1000 - 750
    });

    it('✅ múltiples movimientos se acumulan correctamente', () => {
        const caja = new Caja(500);
        const movimientos = [
            { tipo: 'Ingreso Efectivo', datos: { monto: 200 } },
            { tipo: 'Salida Efectivo', datos: { monto: 50 } },
            { tipo: 'Compra Equipo', datos: { precio: 300 } },
            { tipo: 'Ingreso Efectivo', datos: { monto: 100 } },
        ];

        const final = caja.calcularCajaFinal([], movimientos);

        // 500 + 200 - 50 - 300 + 100 = 450
        expect(final).toBe(450);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 4: Pago mixto y trade-in (casos complejos)
// ═══════════════════════════════════════════════════════════════════════════

describe('Caja.calcularCajaFinal() — casos complejos', () => {
    it('✅ pago mixto suma SOLO la parte de efectivo a la caja', () => {
        const caja = new Caja(100);
        const ventas = [{
            formaPago: 'mixto',
            montoTotal: 1000,
            pagoMixto: {
                efectivo: 200,  // solo esto entra a caja
                zelle: 500,
                binance: 300,
            },
        }];

        const final = caja.calcularCajaFinal(ventas, []);

        expect(final).toBe(300);  // 100 + 200 de la parte en efectivo
    });

    it('✅ venta con trade-in: solo el monto en efectivo entra a caja', () => {
        const caja = new Caja(50);
        const ventas = [{
            formaPago: 'efectivo',
            montoTotal: 1000,  // total de la venta
            montoPago: 700,    // paga 700 en efectivo
            equipoRecibido: {
                modelo: 'iPhone 11',
                valor: 300,  // el resto lo cubre el trade-in
            },
        }];

        const final = caja.calcularCajaFinal(ventas, []);

        expect(final).toBe(750);  // 50 + 700 en efectivo
    });

    it('✅ venta con WEPPA (abonos previos) NO suma los abonos a la caja', () => {
        const caja = new Caja(100);
        const ventas = [{
            formaPago: 'efectivo',
            montoTotal: 1000,
            montoPago: 200,  // paga 200 hoy
            totalAbonosPrevios: 400,  // 400 ya pagados antes
            equipoRecibido: {
                modelo: 'iPhone 11',
                valor: 400,
            },
        }];

        const final = caja.calcularCajaFinal(ventas, []);

        // cajaInicial + montoPago = 100 + 200 = 300
        // (abonos previos NO entran a caja, ya entraron en su día)
        expect(final).toBe(300);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 5: Cambio por garantía (afecta caja según diferencia)
// ═══════════════════════════════════════════════════════════════════════════

describe('Caja.calcularCajaFinal() — cambio por garantía', () => {
    it('✅ diferencia a FAVOR DEL CLIENTE RESTA (tienda paga)', () => {
        const caja = new Caja(500);
        const movimientos = [{
            tipo: 'Cambio Garantía',
            datos: {
                diferencia: { tipo: 'favor-cliente', monto: 100 },
            },
        }];

        const final = caja.calcularCajaFinal([], movimientos);

        expect(final).toBe(400);  // 500 - 100
    });

    it('✅ diferencia a FAVOR DE LA TIENDA SUMA (cliente paga)', () => {
        const caja = new Caja(500);
        const movimientos = [{
            tipo: 'Cambio Garantía',
            datos: {
                diferencia: { tipo: 'favor-tienda', monto: 150 },
            },
        }];

        const final = caja.calcularCajaFinal([], movimientos);

        expect(final).toBe(650);  // 500 + 150
    });

    it('✅ cambio sin diferencia económica no afecta la caja', () => {
        const caja = new Caja(500);
        const movimientos = [{
            tipo: 'Cambio Garantía',
            datos: {
                diferencia: { tipo: 'ninguna', monto: 0 },
            },
        }];

        const final = caja.calcularCajaFinal([], movimientos);

        expect(final).toBe(500);  // sin cambio
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 6: obtenerDesglose() debe devolver TODAS las partes de la fórmula
// ═══════════════════════════════════════════════════════════════════════════

describe('Caja.obtenerDesglose()', () => {
    it('✅ debe devolver el desglose completo con todas las partes', () => {
        const caja = new Caja(100);
        const ventas = [{
            formaPago: 'efectivo',
            montoTotal: 500,
            montoPago: 500,
        }];
        const movimientos = [
            { tipo: 'Ingreso Efectivo', datos: { monto: 50 } },
            { tipo: 'Salida Efectivo', datos: { monto: 20 } },
        ];

        const desglose = caja.obtenerDesglose(ventas, movimientos);

        expect(desglose).toEqual({
            cajaInicial: 100,
            efectivoVentas: 500,
            ingresosEfectivo: 50,
            salidasEfectivo: 20,
            comprasEquipos: 0,
            diferenciasGarantia: 0,
            cajaFinal: 630,  // 100 + 500 + 50 - 20
        });
    });

    it('✅ caja vacía debe devolver todos los componentes en 0', () => {
        const caja = new Caja(0);

        const desglose = caja.obtenerDesglose([], []);

        expect(desglose.cajaInicial).toBe(0);
        expect(desglose.efectivoVentas).toBe(0);
        expect(desglose.ingresosEfectivo).toBe(0);
        expect(desglose.salidasEfectivo).toBe(0);
        expect(desglose.comprasEquipos).toBe(0);
        expect(desglose.diferenciasGarantia).toBe(0);
        expect(desglose.cajaFinal).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 7: Escenario completo del día (integración)
// ═══════════════════════════════════════════════════════════════════════════

describe('Caja.calcularCajaFinal() — escenario completo del día', () => {
    it('✅ simulación de un día típico: caja inicial, ventas, gastos, compras', () => {
        // Empezamos el día con $200 en caja
        const caja = new Caja(200);

        const ventas = [
            // Venta 1: iPhone en efectivo por $800
            { formaPago: 'efectivo', montoTotal: 800, montoPago: 800 },
            // Venta 2: en zelle (no entra a caja)
            { formaPago: 'zelle', montoTotal: 1000, montoPago: 1000 },
            // Venta 3: pago mixto, $300 en efectivo + $200 en zelle
            {
                formaPago: 'mixto',
                montoTotal: 500,
                pagoMixto: { efectivo: 300, zelle: 200 },
            },
        ];

        const movimientos = [
            // Gasto de luz
            { tipo: 'Salida Efectivo', datos: { monto: 30 } },
            // Compra de iPhone al proveedor
            { tipo: 'Compra Equipo', datos: { precio: 600 } },
            // Devolución de un cliente anterior
            { tipo: 'Ingreso Efectivo', datos: { monto: 50 } },
        ];

        const final = caja.calcularCajaFinal(ventas, movimientos);

        // cajaInicial (200)
        // + efectivoVentas (800 + 0 + 300 = 1100)
        // + ingresosEfectivo (50)
        // - salidasEfectivo (30)
        // - comprasEquipos (600)
        // = 200 + 1100 + 50 - 30 - 600 = 720
        expect(final).toBe(720);
    });
});
