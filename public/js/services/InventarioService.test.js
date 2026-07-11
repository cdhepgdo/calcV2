/**
 * Tests para InventarioService — focus en detección de duplicados
 *
 * Contexto:
 *   El bug "equipo fantasma" se originaba en callers que no chequeaban
 *   el retorno de `ingresarEquipo()`. Estos tests cubren la lógica de
 *   detección de duplicados del servicio:
 *     1. IMEI en cache → rechaza
 *     2. IMEI en _imeisRecienIngresados (anti-doble-submit) → rechaza
 *     3. IMEI nuevo → acepta
 *
 * Mocking:
 *   InventarioService importa Firestore desde el CDN. Usamos `vi.mock`
 *   con la URL del CDN. Si Vitest 1.6 no soporta mockear URLs, los
 *   tests de la sección "sin Firestore" siguen siendo válidos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// EquipoInventario.constructor usa localStorage y crypto. Stubamos
// antes de los tests.
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

// Mockear Firestore ANTES de importar el servicio.
// Si este mock no funciona en Vitest 1.6, los tests fallarán al cargar
// el módulo; en ese caso, usar plan B (mocks manuales en beforeEach).
vi.mock('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js', () => ({
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    setDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
    writeBatch: vi.fn(() => ({
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn(() => Promise.resolve())
    })),
    onSnapshot: vi.fn((q, onNext) => {
        // Inmediatamente invoca onNext con snapshot vacío
        if (onNext) onNext({ docs: [] });
        return vi.fn(); // unsubscribe
    }),
    query: vi.fn((c) => c),
    where: vi.fn(() => ({})),
    arrayUnion: vi.fn((v) => ({ __arrayUnion: v })),
    arrayRemove: vi.fn((v) => ({ __arrayRemove: v }))
}));

vi.mock('../config/firebase-config.js', () => ({ db: {} }));

import { inventarioService as svcBase } from './InventarioService.js';
import { EquipoInventario } from '../models/EquipoInventario.js';

// Helper: resetear el singleton entre tests
function resetInventarioService() {
    svcBase._cacheInventario = [];
    svcBase._imeisRecienIngresados = new Set();
    svcBase._inventarioListo = true;
    svcBase._listeners = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 1: Métodos sin Firestore (lecturas en cache)
// ═══════════════════════════════════════════════════════════════════════════

describe('InventarioService — búsquedas en cache', () => {
    beforeEach(() => {
        resetInventarioService();
    });

    it('✅ buscarPorImei() debe encontrar un equipo existente', () => {
        svcBase._cacheInventario = [
            new EquipoInventario({ id: 'a', imei: '111111111111111', estado: 'disponible' }),
            new EquipoInventario({ id: 'b', imei: '222222222222222', estado: 'vendido' })
        ];
        const resultado = svcBase.buscarPorImei('222222222222222');
        expect(resultado).toBeDefined();
        expect(resultado.id).toBe('b');
    });

    it('✅ buscarPorImei() debe retornar undefined si no existe', () => {
        svcBase._cacheInventario = [
            new EquipoInventario({ id: 'a', imei: '111111111111111' })
        ];
        const resultado = svcBase.buscarPorImei('999999999999999');
        expect(resultado).toBeUndefined();
    });

    it('✅ obtenerTodos() debe retornar el cache completo', () => {
        svcBase._cacheInventario = [
            new EquipoInventario({ id: 'a', imei: '1' }),
            new EquipoInventario({ id: 'b', imei: '2' })
        ];
        expect(svcBase.obtenerTodos()).toHaveLength(2);
    });

    it('✅ obtenerDisponibles() debe filtrar por estado', () => {
        svcBase._cacheInventario = [
            new EquipoInventario({ id: 'a', estado: 'disponible' }),
            new EquipoInventario({ id: 'b', estado: 'vendido' }),
            new EquipoInventario({ id: 'c', estado: 'disponible' })
        ];
        const disponibles = svcBase.obtenerDisponibles();
        expect(disponibles).toHaveLength(2);
        expect(disponibles.every(e => e.estado === 'disponible')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 2: Detección de duplicados en ingresarEquipo()
// (CRÍTICO para el bug del equipo fantasma)
// ═══════════════════════════════════════════════════════════════════════════

describe('InventarioService.ingresarEquipo() — duplicados', () => {
    beforeEach(() => {
        resetInventarioService();
    });

    it('✅ debe retornar exito:true al ingresar un equipo con IMEI nuevo', async () => {
        const eq = new EquipoInventario({
            imei: '111111111111111',
            modelo: 'iPhone 13',
            gb: '128GB',
            color: 'Negro',
            bateria: 95
        });
        const resultado = await svcBase.ingresarEquipo(eq);
        expect(resultado.exito).toBe(true);
    });

    it('❌ debe retornar exito:false si el IMEI ya existe en el cache', async () => {
        svcBase._cacheInventario = [
            new EquipoInventario({ id: 'eq-1', imei: '222222222222222', estado: 'disponible' })
        ];
        const eq = new EquipoInventario({
            imei: '222222222222222',
            modelo: 'iPhone 14',
            gb: '256GB',
            color: 'Azul',
            bateria: 100
        });
        const resultado = await svcBase.ingresarEquipo(eq);
        expect(resultado.exito).toBe(false);
        expect(resultado.error).toContain('ya existe');
        expect(resultado.error).toContain('disponible');
    });

    it('❌ debe rechazar duplicado aunque el estado sea diferente (vendido)', async () => {
        // Caso típico del bug: el operador ingresa un IMEI que ya está
        // vendido, esperando "reabrir" el equipo. El servicio debe rechazar.
        svcBase._cacheInventario = [
            new EquipoInventario({ id: 'eq-1', imei: '333333333333333', estado: 'vendido' })
        ];
        const eq = new EquipoInventario({ imei: '333333333333333' });
        const resultado = await svcBase.ingresarEquipo(eq);
        expect(resultado.exito).toBe(false);
    });

    it('❌ debe rechazar duplicado aunque el estado sea "defectuoso"', async () => {
        // Otro caso del bug: el operador tipea un IMEI que ya está
        // marcado como defectuoso.
        svcBase._cacheInventario = [
            new EquipoInventario({ id: 'eq-1', imei: '444444444444444', estado: 'defectuoso' })
        ];
        const eq = new EquipoInventario({ imei: '444444444444444' });
        const resultado = await svcBase.ingresarEquipo(eq);
        expect(resultado.exito).toBe(false);
    });

    it('❌ debe rechazar si el IMEI fue recién ingresado (anti-doble-submit)', async () => {
        // El operador hace doble click en "Guardar". El primer ingreso
        // registra el IMEI en _imeisRecienIngresados. El segundo es bloqueado.
        const eq1 = new EquipoInventario({ imei: '555555555555555' });
        await svcBase.ingresarEquipo(eq1);
        const eq2 = new EquipoInventario({ imei: '555555555555555' });
        const resultado = await svcBase.ingresarEquipo(eq2);
        expect(resultado.exito).toBe(false);
        expect(resultado.error).toContain('recientemente');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO 3: Estado "abonado" + historial multi-pago
// ═══════════════════════════════════════════════════════════════════════════

describe('InventarioService — estado abonado e historial', () => {
    beforeEach(() => {
        resetInventarioService();
    });

    it('✅ obtenerTodos(["disponible", "abonado"]) filtra por múltiples estados', () => {
        svcBase._cacheInventario = [
            new EquipoInventario({ id: 'a', estado: 'disponible' }),
            new EquipoInventario({ id: 'b', estado: 'abonado' }),
            new EquipoInventario({ id: 'c', estado: 'vendido' }),
            new EquipoInventario({ id: 'd', estado: 'abonado' })
        ];
        const candidatos = svcBase.obtenerTodos(['disponible', 'abonado']);
        expect(candidatos).toHaveLength(3);
        expect(candidatos.every(e => ['disponible', 'abonado'].includes(e.estado))).toBe(true);
    });

    it('✅ obtenerAbonados() retorna solo los equipos en estado "abonado"', () => {
        svcBase._cacheInventario = [
            new EquipoInventario({ id: 'a', estado: 'disponible' }),
            new EquipoInventario({ id: 'b', estado: 'abonado' }),
            new EquipoInventario({ id: 'c', estado: 'vendido' })
        ];
        const abonados = svcBase.obtenerAbonados();
        expect(abonados).toHaveLength(1);
        expect(abonados[0].id).toBe('b');
    });

    it('✅ obtenerUltimoClienteAbono() retorna el cliente del último abono', () => {
        const eq = new EquipoInventario({
            id: 'eq-1',
            estado: 'abonado',
            historialAbonos: [
                { ventaId: 'v1', fecha: '15/06/2026', monto: 200, cliente: { nombre: 'Juan' } },
                { ventaId: 'v2', fecha: '22/06/2026', monto: 150, cliente: { nombre: 'Juan', telefono: '0414' } }
            ]
        });
        const cliente = svcBase.obtenerUltimoClienteAbono(eq);
        expect(cliente).toBeDefined();
        expect(cliente.nombre).toBe('Juan');
        expect(cliente.telefono).toBe('0414');
    });

    it('✅ obtenerUltimoClienteAbono() retorna null si no hay historial', () => {
        const eq = new EquipoInventario({ id: 'eq-1', estado: 'abonado' });
        expect(svcBase.obtenerUltimoClienteAbono(eq)).toBeNull();
    });

    it('✅ marcarAbonado() retorna exito:true con datos válidos', async () => {
        const res = await svcBase.marcarAbonado('eq-1', {
            ventaId: 'venta-abc',
            fecha: '9/7/2026',
            monto: 200,
            cliente: { nombre: 'Juan', cedula: 'V-12345', telefono: '0414-1234567' }
        });
        expect(res.exito).toBe(true);
    });

    it('❌ marcarAbonado() rechaza si falta ventaId', async () => {
        const res = await svcBase.marcarAbonado('eq-1', { monto: 100 });
        expect(res.exito).toBe(false);
        expect(res.error).toContain('ventaId');
    });

    it('❌ marcarAbonado() rechaza si no hay equipoId', async () => {
        const res = await svcBase.marcarAbonado(null, { ventaId: 'v1' });
        expect(res.exito).toBe(false);
    });

    it('✅ finalizarAbono() retorna exito:true con datos válidos', async () => {
        const res = await svcBase.finalizarAbono('eq-1', 'venta-final');
        expect(res.exito).toBe(true);
    });

    it('✅ agregarEntradaHistorialAbono() retorna exito:true', async () => {
        const res = await svcBase.agregarEntradaHistorialAbono('eq-1', {
            ventaId: 'v1',
            fecha: '9/7/2026',
            monto: 200,
            cliente: { nombre: 'Juan' }
        });
        expect(res.exito).toBe(true);
    });
});
