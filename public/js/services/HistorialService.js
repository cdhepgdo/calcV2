/**
 * Servicio de Historial e Inventario
 * Gestiona el historial de movimientos y genera reportes de inventario
 */

import { storageService } from './StorageService.js';

class HistorialService {
    constructor() {
        this.STORAGE_KEY_HISTORIAL = 'historial_inventario';
        this.inicializarHistorial();
    }
    
    /**
     * Inicializa el historial si no existe
     */
    inicializarHistorial() {
        if (!localStorage.getItem(this.STORAGE_KEY_HISTORIAL)) {
            localStorage.setItem(this.STORAGE_KEY_HISTORIAL, JSON.stringify({
                movimientos: [],
                ultimoCorte: null
            }));
        }
    }
    
    /**
     * Registra un movimiento en el historial
     * @param {Object} movimiento - Movimiento a registrar
     */
    registrarEnHistorial(movimiento) {
        try {
            const historial = this.obtenerHistorial();
            
            const registro = {
                id: movimiento.id,
                tipo: movimiento.tipo,
                fecha: movimiento.fecha,
                hora: movimiento.hora,
                timestamp: new Date().getTime(),
                datos: movimiento.toJSON(),
                impactoEfectivo: movimiento.calcularImpactoEfectivo()
            };
            
            historial.movimientos.push(registro);
            localStorage.setItem(this.STORAGE_KEY_HISTORIAL, JSON.stringify(historial));
            
            return { exito: true };
        } catch (error) {
            console.error('Error al registrar en historial:', error);
            return { exito: false, error: error.message };
        }
    }
    
    /**
     * Obtiene todo el historial
     */
    obtenerHistorial() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY_HISTORIAL);
            return JSON.parse(data) || { movimientos: [], ultimoCorte: null };
        } catch (error) {
            console.error('Error al obtener historial:', error);
            return { movimientos: [], ultimoCorte: null };
        }
    }
    
    /**
     * Obtiene movimientos por rango de fechas
     */
    obtenerPorRango(fechaInicio, fechaFin) {
        const historial = this.obtenerHistorial();
        const inicio = new Date(fechaInicio).getTime();
        const fin = new Date(fechaFin).getTime();
        
        return historial.movimientos.filter(m => {
            const timestamp = m.timestamp;
            return timestamp >= inicio && timestamp <= fin;
        });
    }
    
    /**
     * Genera reporte semanal de inventario
     */
    generarReporteSemanal(fechaInicio = null) {
        const hoy = new Date();
        const inicio = fechaInicio ? new Date(fechaInicio) : new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const movimientos = this.obtenerPorRango(inicio, hoy);
        
        // Agrupar por tipo
        const resumen = {
            periodo: {
                inicio: inicio.toLocaleDateString('es-ES'),
                fin: hoy.toLocaleDateString('es-ES')
            },
            totalMovimientos: movimientos.length,
            porTipo: {},
            impactoEfectivo: 0,
            detalles: []
        };
        
        movimientos.forEach(mov => {
            // Contar por tipo
            if (!resumen.porTipo[mov.tipo]) {
                resumen.porTipo[mov.tipo] = {
                    cantidad: 0,
                    impacto: 0
                };
            }
            resumen.porTipo[mov.tipo].cantidad++;
            resumen.porTipo[mov.tipo].impacto += mov.impactoEfectivo;
            
            // Sumar impacto total
            resumen.impactoEfectivo += mov.impactoEfectivo;
            
            // Agregar detalle
            resumen.detalles.push({
                fecha: mov.fecha,
                hora: mov.hora,
                tipo: mov.tipo,
                impacto: mov.impactoEfectivo
            });
        });
        
        return resumen;
    }
    
    /**
     * Genera reporte de inventario con conteo de productos
     */
    generarReporteInventario(fechaInicio = null) {
        const movimientos = fechaInicio 
            ? this.obtenerPorRango(new Date(fechaInicio), new Date())
            : this.obtenerHistorial().movimientos;
        
        const inventario = {
            entradas: 0,
            salidas: 0,
            cambios: 0,
            ventasRealizadas: 0,
            garantiasAplicadas: 0,
            movimientoEfectivo: 0
        };
        
        movimientos.forEach(mov => {
            switch(mov.tipo) {
                case 'Entrada':
                    inventario.entradas++;
                    break;
                case 'Salida':
                    inventario.salidas++;
                    break;
                case 'Venta':
                    inventario.ventasRealizadas++;
                    inventario.salidas++;
                    break;
                case 'Cambio Garantía':
                    inventario.cambios++;
                    inventario.garantiasAplicadas++;
                    break;
            }
            inventario.movimientoEfectivo += mov.impactoEfectivo;
        });
        
        inventario.movimientoNeto = inventario.entradas - inventario.salidas;
        
        return inventario;
    }
    
    /**
     * Exporta historial a JSON descargable
     */
    exportarHistorial() {
        const historial = this.obtenerHistorial();
        const dataStr = JSON.stringify(historial, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historial_inventario_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Exporta reporte semanal a CSV
     */
    exportarReporteSemanalCSV() {
        const reporte = this.generarReporteSemanal();
        
        let csv = 'Fecha,Hora,Tipo,Impacto Efectivo\n';
        reporte.detalles.forEach(detalle => {
            csv += `${detalle.fecha},${detalle.hora},${detalle.tipo},${detalle.impacto}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_semanal_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Realiza un corte de inventario
     * Guarda el estado actual y marca como punto de referencia
     */
    realizarCorteInventario() {
        const historial = this.obtenerHistorial();
        const reporte = this.generarReporteInventario();
        
        const corte = {
            fecha: new Date().toISOString(),
            reporte: reporte,
            totalMovimientos: historial.movimientos.length
        };
        
        historial.ultimoCorte = corte;
        localStorage.setItem(this.STORAGE_KEY_HISTORIAL, JSON.stringify(historial));
        
        return corte;
    }
    
    /**
     * Obtiene el último corte de inventario
     */
    obtenerUltimoCorte() {
        const historial = this.obtenerHistorial();
        return historial.ultimoCorte;
    }
    
    /**
     * Limpia historial antiguo (mantiene últimos N días)
     */
    limpiarHistorialAntiguo(diasAMantener = 90) {
        const historial = this.obtenerHistorial();
        const fechaLimite = new Date().getTime() - (diasAMantener * 24 * 60 * 60 * 1000);
        
        historial.movimientos = historial.movimientos.filter(m => m.timestamp >= fechaLimite);
        localStorage.setItem(this.STORAGE_KEY_HISTORIAL, JSON.stringify(historial));
        
        return {
            exito: true,
            movimientosRestantes: historial.movimientos.length
        };
    }
}

// Exportar instancia única (Singleton)
export const historialService = new HistorialService();
