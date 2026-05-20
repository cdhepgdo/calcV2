import { db } from '../config/firebase-config.js';
import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

import { Venta } from '../models/Venta.js';
import { Movimiento } from '../models/Movimiento.js';

class AdminService {
    constructor() {
        this.sedes = ['sede_1', 'sede_2', 'sede_3', 'sede_4', 'sede_5', 'sede_6'];
        this.sedeNombres = {
            'sede_1': 'Tienda Principal',
            'sede_2': 'Sucursal Norte',
            'sede_3': 'Sucursal Centro',
            'sede_4': 'Sucursal Sur',
            'sede_5': 'Sucursal Oeste',
            'sede_6': 'Sucursal Este'
        };

        this._cache = {};
        this.sedes.forEach(sedeId => {
            this._cache[sedeId] = {
                ventas: [],
                movimientos: []
            };
        });

        this._listeners = [];
        this._unsubscribes = [];
        this.isInitialized = false;
    }

    inicializar() {
        if (this.isInitialized) return;
        console.log('🚀 Inicializando AdminService para todas las sedes...');

        this.sedes.forEach(sedeId => {
            // Escuchar Ventas de cada sede
            const unsubscribeVentas = onSnapshot(
                collection(db, `sedes/${sedeId}/ventas`),
                (snapshot) => {
                    this._cache[sedeId].ventas = snapshot.docs.map(docSnap => Venta.fromJSON(docSnap.data()));
                    console.log(`✅ [Admin] Caché ventas ${sedeId}:`, this._cache[sedeId].ventas.length);
                    this._notificarCambio();
                },
                (error) => {
                    console.error(`❌ Error en listener de ventas de ${sedeId}:`, error);
                }
            );

            // Escuchar Movimientos de cada sede
            const unsubscribeMovimientos = onSnapshot(
                collection(db, `sedes/${sedeId}/movimientos`),
                (snapshot) => {
                    this._cache[sedeId].movimientos = snapshot.docs.map(docSnap => Movimiento.fromJSON(docSnap.data()));
                    console.log(`✅ [Admin] Caché movimientos ${sedeId}:`, this._cache[sedeId].movimientos.length);
                    this._notificarCambio();
                },
                (error) => {
                    console.error(`❌ Error en listener de movimientos de ${sedeId}:`, error);
                }
            );

            this._unsubscribes.push(unsubscribeVentas, unsubscribeMovimientos);
        });

        this.isInitialized = true;
    }

    onCambio(fn) {
        this._listeners.push(fn);
    }

    _notificarCambio() {
        this._listeners.forEach(fn => fn());
    }

    /**
     * Obtiene ventas filtradas por sede.
     * @param {string} sedeId 'todos' o ID de la sede específica.
     */
    obtenerVentas(sedeId = 'todos') {
        if (sedeId === 'todos') {
            let consolidadas = [];
            this.sedes.forEach(s => {
                // Inyectar el sedeId y nombre de sede en los objetos para identificarlos en listados
                const ventasSede = this._cache[s].ventas.map(v => {
                    v.sedeId = s;
                    v.sedeNombre = this.sedeNombres[s] || s;
                    return v;
                });
                consolidadas = consolidadas.concat(ventasSede);
            });
            return consolidadas;
        }

        return (this._cache[sedeId]?.ventas || []).map(v => {
            v.sedeId = sedeId;
            v.sedeNombre = this.sedeNombres[sedeId] || sedeId;
            return v;
        });
    }

    /**
     * Obtiene movimientos filtrados por sede.
     * @param {string} sedeId 'todos' o ID de la sede específica.
     */
    obtenerMovimientos(sedeId = 'todos') {
        if (sedeId === 'todos') {
            let consolizados = [];
            this.sedes.forEach(s => {
                const movsSede = this._cache[s].movimientos.map(m => {
                    m.sedeId = s;
                    m.sedeNombre = this.sedeNombres[s] || s;
                    return m;
                });
                consolizados = consolizados.concat(movsSede);
            });
            return consolizados;
        }

        return (this._cache[sedeId]?.movimientos || []).map(m => {
            m.sedeId = sedeId;
            m.sedeNombre = this.sedeNombres[sedeId] || sedeId;
            return m;
        });
    }

    destruir() {
        this._unsubscribes.forEach(unsub => unsub());
        this._unsubscribes = [];
        this._listeners = [];
        this.isInitialized = false;
        console.log('🔴 AdminService desconectado');
    }
}

export const adminService = new AdminService();
