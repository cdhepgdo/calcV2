/* import { storageService } from './services/StorageService.js';

class RegistroDiario {
    constructor() {
        this.ventas = [];
        this.movimientos = [];
        this.registroPorDia = new Map();
        this.init();
    }

    init() {
        this.cargarDatos();
        this.procesarDatos();
        this.renderizar();
        this.configurarEventos();
    }

    cargarDatos() {
        this.ventas = storageService.obtenerVentas();
        this.movimientos = storageService.obtenerMovimientos();
    }

    procesarDatos() {
        this.registroPorDia.clear();

        // Procesar ventas
        this.ventas.forEach(venta => {
            const fecha = venta.fecha;
            if (!this.registroPorDia.has(fecha)) {
                this.registroPorDia.set(fecha, {
                    fecha,
                    operaciones: [],
                    accesorios: {},
                    totalVentas: 0,
                    totalIngresos: 0,
                    totalEgresos: 0,
                    cantidadVentas: 0,
                    cantidadMovimientos: 0
                });
            }

            const dia = this.registroPorDia.get(fecha);
            const efectivo = venta.calcularEfectivo();
            
            dia.operaciones.push({
                tipo: 'venta',
                hora: venta.hora,
                descripcion: this.obtenerDescripcionVenta(venta),
                monto: venta.montoTotal,
                efectivo: efectivo,
                detalles: venta
            });

            // Procesar accesorios de la venta
            this.procesarAccesorios(venta, dia);

            /* dia.totalVentas += venta.montoTotal;
            dia.totalIngresos += efectivo;
            dia.cantidadVentas++; */

            // Solo sumar al total de ventas si NO es un abono
            if (venta.tipoTransaccion !== 'abono') {
                dia.totalVentas += venta.montoTotal;
                dia.cantidadVentas++;
            }
            // Los abonos SÍ generan efectivo, así que esto se queda fuera del if
            dia.totalIngresos += efectivo;
        });

        // Procesar movimientos
        this.movimientos.forEach(movimiento => {
            const fecha = movimiento.fecha;
            if (!this.registroPorDia.has(fecha)) {
                this.registroPorDia.set(fecha, {
                    fecha,
                    operaciones: [],
                    accesorios: {},
                    totalVentas: 0,
                    totalIngresos: 0,
                    totalEgresos: 0,
                    cantidadVentas: 0,
                    cantidadMovimientos: 0
                });
            }

            const dia = this.registroPorDia.get(fecha);
            const impacto = movimiento.calcularImpactoEfectivo();
            
            dia.operaciones.push({
                tipo: 'movimiento',
                hora: movimiento.hora,
                descripcion: movimiento.obtenerTitulo(),
                monto: Math.abs(impacto),
                efectivo: impacto,
                detalles: movimiento
            });

            if (impacto > 0) {
                dia.totalIngresos += impacto;
            } else {
                dia.totalEgresos += Math.abs(impacto);
            }
            dia.cantidadMovimientos++;
        });

        // Ordenar operaciones por hora dentro de cada día
        this.registroPorDia.forEach(dia => {
            dia.operaciones.sort((a, b) => {
                return a.hora.localeCompare(b.hora);
            });
        });
    }

    obtenerDescripcionVenta(venta) {
        if (venta.tipoVenta === 'completa') {
            return `📱 Venta - ${venta.equipo.modelo} ${venta.equipo.almacenamiento} ${venta.equipo.color}`;
        } else {
            return `🛡️ Venta Accesorios`;
        }
    }

    procesarAccesorios(venta, dia) {
        const acc = venta.accesorios;
        
        // Forro
        if (acc.forro && acc.forroCantidad > 0) {
            const modelo = acc.forroModelo || 'Sin especificar';
            this.agregarAccesorio(dia, 'Forro', modelo, acc.forroCantidad);
        }
        
        // Cargador
        if (acc.cargador && acc.cargadorCantidad > 0) {
            this.agregarAccesorio(dia, 'Cargador', 'Estándar', acc.cargadorCantidad);
        }
        
        // Vidrio
        if (acc.vidrio && acc.vidrioCantidad > 0) {
            const modelo = acc.vidrioModelo || 'Sin especificar';
            this.agregarAccesorio(dia, 'Vidrio', modelo, acc.vidrioCantidad);
        }
        
        // Protector Cámara
        if (acc.protectorCamara && acc.protectorCantidad > 0) {
            this.agregarAccesorio(dia, 'Protector Cámara', 'Estándar', acc.protectorCantidad);
        }
        
        // Cubo
        if (acc.cubo && acc.cuboCantidad > 0) {
            this.agregarAccesorio(dia, 'Cubo', 'Estándar', acc.cuboCantidad);
        }
        
        // Cable Lightning
        if (acc.cableLightning && acc.cableLightningCantidad > 0) {
            this.agregarAccesorio(dia, 'Cable Lightning', 'Estándar', acc.cableLightningCantidad);
        }
        
        // Cable C+C
        if (acc.cableCC && acc.cableCCCantidad > 0) {
            this.agregarAccesorio(dia, 'Cable C+C', 'Estándar', acc.cableCCCantidad);
        }
        
        // Caja
        if (acc.caja && acc.cajaCantidad > 0) {
            const modelo = acc.cajaModelo || 'Sin especificar';
            const color = acc.cajaColor || '';
            const descripcion = color ? `${modelo} ${color}` : modelo;
            this.agregarAccesorio(dia, 'Caja', descripcion, acc.cajaCantidad);
        }
    }

    agregarAccesorio(dia, tipo, modelo, cantidad) {
        if (!dia.accesorios[tipo]) {
            dia.accesorios[tipo] = {};
        }
        if (!dia.accesorios[tipo][modelo]) {
            dia.accesorios[tipo][modelo] = 0;
        }
        dia.accesorios[tipo][modelo] += cantidad;
    }

    renderizar() {
        const periodo = parseInt(document.getElementById('filtroPeriodo').value);
        //const fechaFiltro = document.getElementById('filtroFecha').value;
        const fechaDesde = document.getElementById('filtroDesde').value;
        const fechaHasta = document.getElementById('filtroHasta').value;
        
        let diasFiltrados = Array.from(this.registroPorDia.values());

        /* // Filtrar por fecha específica
        if (fechaFiltro) {
            const fechaBuscada = this.convertirFechaInput(fechaFiltro);
            diasFiltrados = diasFiltrados.filter(dia => dia.fecha === fechaBuscada);
        } */
        // Filtrar por rango de fechas
        if (fechaDesde || fechaHasta) {
            diasFiltrados = diasFiltrados.filter(dia => {
                const fechaDia = this.parsearFecha(dia.fecha);
                if (fechaDesde) {
                    const desde = new Date(fechaDesde + 'T00:00:00');
                    if (fechaDia < desde) return false;
                }
                if (fechaHasta) {
                    const hasta = new Date(fechaHasta + 'T23:59:59');
                    if (fechaDia > hasta) return false;
                }
                return true;
            });
        }
        
        // Filtrar por período
        else if (periodo !== 'todos') {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - periodo);
            
            diasFiltrados = diasFiltrados.filter(dia => {
                const fechaDia = this.parsearFecha(dia.fecha);
                return fechaDia >= fechaLimite;
            });
        }

        // Ordenar por fecha descendente (más reciente primero)
        diasFiltrados.sort((a, b) => {
            const fechaA = this.parsearFecha(a.fecha);
            const fechaB = this.parsearFecha(b.fecha);
            return fechaB - fechaA;
        });

        this.renderizarResumen(diasFiltrados);
        this.renderizarDias(diasFiltrados);
    }

    renderizarResumen(dias) {
        const totalDias = dias.length;
        const totalVentas = dias.reduce((sum, dia) => sum + dia.totalVentas, 0);
        const totalOperaciones = dias.reduce((sum, dia) => sum + dia.operaciones.length, 0);

        document.getElementById('totalDias').textContent = totalDias;
        document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(2)}`;
        document.getElementById('totalOperaciones').textContent = totalOperaciones;

        // Calcular resumen de accesorios del período
        this.renderizarResumenAccesorios(dias);
    }

    renderizarResumenAccesorios(dias) {
        const accesoriosTotales = {};
        
        dias.forEach(dia => {
            // Validar que dia.accesorios exista
            if (!dia.accesorios || typeof dia.accesorios !== 'object') {
                return;
            }
            
            Object.entries(dia.accesorios).forEach(([tipo, modelos]) => {
                if (!accesoriosTotales[tipo]) {
                    accesoriosTotales[tipo] = {};
                }
                Object.entries(modelos).forEach(([modelo, cantidad]) => {
                    if (!accesoriosTotales[tipo][modelo]) {
                        accesoriosTotales[tipo][modelo] = 0;
                    }
                    accesoriosTotales[tipo][modelo] += cantidad;
                });
            });
        });

        // Crear HTML para el resumen
        const contenedor = document.getElementById('resumenAccesoriosPeriodo');
        if (!contenedor) return;

        if (Object.keys(accesoriosTotales).length === 0) {
            contenedor.innerHTML = '<p class="text-gray-500 text-center">No hay accesorios vendidos en este período</p>';
            return;
        }

        let html = '<div class="accesorios-grid">';
        
        Object.entries(accesoriosTotales).forEach(([tipo, modelos]) => {
            const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
            
            html += `
                <div class="accesorio-card">
                    <div class="accesorio-header">${tipo} (${totalTipo})</div>
                    <div class="accesorio-detalles">
            `;
            
            Object.entries(modelos)
                .sort((a, b) => b[1] - a[1]) // Ordenar por cantidad descendente
                .forEach(([modelo, cantidad]) => {
                    html += `
                        <div class="accesorio-item">
                            <span class="accesorio-modelo">${modelo}</span>
                            <span class="accesorio-cantidad">${cantidad}</span>
                        </div>
                    `;
                });
            
            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';
        contenedor.innerHTML = html;
    }

    renderizarDias(dias) {
        const contenedor = document.getElementById('contenedorRegistro');
        
        if (dias.length === 0) {
            contenedor.innerHTML = '<div class="sin-datos">No hay datos para mostrar en el período seleccionado</div>';
            return;
        }

        contenedor.innerHTML = dias.map(dia => this.crearTablaDia(dia)).join('');
    }

    crearTablaDia(dia) {
        const netoDia = dia.totalIngresos - dia.totalEgresos;
        const netoClase = netoDia >= 0 ? 'monto-positivo' : 'monto-negativo';

        return `
            <div class="dia-card">
                <div class="dia-header">
                    <div class="dia-fecha">📅 ${dia.fecha}</div>
                    <div class="dia-stats">
                        <span>💰 Ventas: $${dia.totalVentas.toFixed(2)}</span>
                        <span>📊 Operaciones: ${dia.operaciones.length}</span>
                        <span class="${netoClase}">💵 Neto: $${netoDia.toFixed(2)}</span>
                    </div>
                </div>
                
                ${this.crearTablaAccesorios(dia)}
                
                <div class="tabla-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Hora</th>
                                <th>Tipo</th>
                                <th>Descripción</th>
                                <th>Monto Total</th>
                                <th>Efectivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dia.operaciones.map(op => this.crearFilaOperacion(op)).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; background: #f7fafc;">
                                <td colspan="3">TOTALES DEL DÍA</td>
                                <td class="monto-positivo">$${dia.totalVentas.toFixed(2)}</td>
                                <td class="${netoClase}">$${netoDia.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }

    crearTablaAccesorios(dia) {
        // Validar que dia.accesorios exista
        if (!dia.accesorios || typeof dia.accesorios !== 'object') {
            return '';
        }
        
        const tiposAccesorios = Object.keys(dia.accesorios);
        
        if (tiposAccesorios.length === 0) {
            return '';
        }

        let html = '<div class="accesorios-section">';
        html += '<h3 class="accesorios-titulo">🛡️ Accesorios Vendidos</h3>';
        html += '<div class="accesorios-grid">';

        tiposAccesorios.forEach(tipo => {
            const modelos = dia.accesorios[tipo];
            const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
            
            html += `
                <div class="accesorio-card">
                    <div class="accesorio-header">${tipo} (${totalTipo})</div>
                    <div class="accesorio-detalles">
            `;
            
            Object.entries(modelos).forEach(([modelo, cantidad]) => {
                html += `
                    <div class="accesorio-item">
                        <span class="accesorio-modelo">${modelo}</span>
                        <span class="accesorio-cantidad">${cantidad}</span>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    /* crearFilaOperacion(operacion) {
        const tipoBadge = operacion.tipo === 'venta' ? 'tipo-venta' : 'tipo-movimiento';
        const tipoTexto = operacion.tipo === 'venta' ? 'Venta' : 'Movimiento';
        
        const montoClase = operacion.efectivo > 0 ? 'monto-positivo' : 
                          operacion.efectivo < 0 ? 'monto-negativo' : 'monto-neutral';
        
        const efectivoTexto = operacion.efectivo !== 0 ? 
            `${operacion.efectivo > 0 ? '+' : ''}$${operacion.efectivo.toFixed(2)}` : 
            '-';

        return `
            <tr>
                <td>${operacion.hora}</td>
                <td><span class="tipo-badge ${tipoBadge}">${tipoTexto}</span></td>
                <td>${operacion.descripcion}</td>
                <td class="monto-positivo">$${operacion.monto.toFixed(2)}</td>
                <td class="${montoClase}">${efectivoTexto}</td>
            </tr>
        `;
    } */
    crearFilaOperacion(operacion) {
        let tipoBadge = operacion.tipo === 'venta' ? 'tipo-venta' : 'tipo-movimiento';
        let tipoTexto = 'Movimiento';
    
        if (operacion.tipo === 'venta') {
            if (operacion.detalles && operacion.detalles.tipoTransaccion === 'abono') {
                tipoTexto = '💰 Abono';
            } else {
                tipoTexto = '💳 Venta';
            }
        }
        
        const montoClase = operacion.efectivo > 0 ? 'monto-positivo' : 
                          operacion.efectivo < 0 ? 'monto-negativo' : 'monto-neutral';
        
        const efectivoTexto = operacion.efectivo !== 0 ? 
            `${operacion.efectivo > 0 ? '+' : ''}$${operacion.efectivo.toFixed(2)}` : 
            '-';
    
        return `
            <tr>
                <td>${operacion.hora}</td>
                <td><span class="tipo-badge ${tipoBadge}">${tipoTexto}</span></td>
                <td>${operacion.descripcion}</td>
                <td class="monto-positivo">$${operacion.monto.toFixed(2)}</td>
                <td class="${montoClase}">${efectivoTexto}</td>
            </tr>
        `;
    }


    parsearFecha(fechaStr) {
        // Convierte "DD/MM/YYYY" a objeto Date
        const partes = fechaStr.split('/');
        return new Date(partes[2], partes[1] - 1, partes[0]);
    }

    convertirFechaInput(fechaInput) {
        // Convierte "YYYY-MM-DD" a "DD/MM/YYYY"
        const fecha = new Date(fechaInput + 'T00:00:00');
        return fecha.toLocaleDateString('es-ES');
    }

    configurarEventos() {
        document.getElementById('btnVolver').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('filtroPeriodo').addEventListener('change', () => {
            document.getElementById('filtroFecha').value = '';
            this.renderizar();
        });

        /* document.getElementById('filtroFecha').addEventListener('change', () => {
            this.renderizar();
        }); */
        document.getElementById('filtroDesde').addEventListener('change', () => {
            this.renderizar();
        });
        document.getElementById('filtroHasta').addEventListener('change', () => {
            this.renderizar();
        });

        document.getElementById('btnExportar').addEventListener('click', () => {
            this.exportarDatos();
        });
    }

    exportarDatos() {
        const datos = Array.from(this.registroPorDia.values());
        const json = JSON.stringify(datos, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registro-diario-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new RegistroDiario();
});
 */



import { storageService } from './services/StorageService.js';

class RegistroDiario {
    constructor() {
        this.ventas = [];
        this.movimientos = [];
        this.registroPorDia = new Map();
        this.init();
    }

    init() {
        this.cargarDatos();
        this.procesarDatos();
        this.renderizar();
        this.configurarEventos();
    }

    cargarDatos() {
        this.ventas = storageService.obtenerVentas();
        this.movimientos = storageService.obtenerMovimientos();
    }

    procesarDatos() {
        this.registroPorDia.clear();

        // Procesar ventas
        this.ventas.forEach(venta => {
            const fecha = venta.fecha;
            if (!this.registroPorDia.has(fecha)) {
                this.registroPorDia.set(fecha, {
                    fecha,
                    operaciones: [],
                    accesorios: {},
                    totalVentas: 0,
                    totalIngresos: 0,
                    totalEgresos: 0,
                    cantidadVentas: 0,
                    cantidadMovimientos: 0,
                    accesoriosSalidos: {},
                    accesoriosIngresados: {}
                });
            }

            const dia = this.registroPorDia.get(fecha);
            const efectivo = venta.calcularEfectivo();

            dia.operaciones.push({
                tipo: 'venta',
                hora: venta.hora,
                descripcion: this.obtenerDescripcionVenta(venta),
                monto: venta.montoTotal,
                efectivo: efectivo,
                detalles: venta
            });

            // Procesar accesorios de la venta
            this.procesarAccesorios(venta, dia);

            dia.totalVentas += venta.montoTotal;
            dia.totalIngresos += efectivo;
            dia.cantidadVentas++;
        });

        // Procesar movimientos
        this.movimientos.forEach(movimiento => {
            const fecha = movimiento.fecha;
            if (!this.registroPorDia.has(fecha)) {
                this.registroPorDia.set(fecha, {
                    fecha,
                    operaciones: [],
                    accesorios: {},
                    totalVentas: 0,
                    totalIngresos: 0,
                    totalEgresos: 0,
                    cantidadVentas: 0,
                    cantidadMovimientos: 0,
                    accesoriosSalidos: {},
                    accesoriosIngresados: {}
                });
            }

            const dia = this.registroPorDia.get(fecha);

            // Calcular impacto con string matching (los tipos se guardan como texto descriptivo)
            const tipoLower = movimiento.tipo.toLowerCase();
            let impacto = 0;
            if (tipoLower.includes('salida') && tipoLower.includes('efectivo')) {
                impacto = -(movimiento.datos.monto || 0);
            } else if (tipoLower.includes('ingreso') && tipoLower.includes('efectivo')) {
                impacto = movimiento.datos.monto || 0;
            } else if (tipoLower.includes('compra')) {
                impacto = -(movimiento.datos.precio || 0);
            }

            dia.operaciones.push({
                tipo: 'movimiento',
                hora: movimiento.hora,
                descripcion: movimiento.tipo, // el tipo ya es texto descriptivo
                monto: Math.abs(impacto),
                efectivo: impacto,
                detalles: movimiento
            });

            if (impacto > 0) {
                dia.totalIngresos += impacto;
            } else {
                dia.totalEgresos += Math.abs(impacto);
            }
            dia.cantidadMovimientos++;

            // Registrar accesorios movidos para el resumen visual
            if (tipoLower.includes('accesorio')) {
                const datos = movimiento.datos;
                let tipoAcc = datos.tipo || 'Desconocido';
                let detalle = datos.modelo || 'Sin especificar'; 

                
                 // 1. ESTANDARIZAR LOS NOMBRES ANTES DE INICIALIZAR
                if (detalle.toLowerCase() === 'estandar' || detalle === 'Sin especificar') {
                    detalle = 'Estándar';
                }
                
                if (tipoAcc === "Lightning") {
                    tipoAcc = "Cable Lightning";
                } else if (tipoAcc === "USB-C a USB-C") {
                    tipoAcc = "Cable C+C";
                } else if (tipoAcc === "Cargador") {
                    if (detalle === 'Sin especificar') detalle = "Estándar";
                }

                // -> AQUI ESTA LA EDICIÓN PARA IDENTIFICAR MOVIMIENTOS DISTINTOS A VENTAS <-
                // Si quisieras que el detalle diga "Estándar (Movimiento)" para diferenciarlo de "Estándar" (venta normal),
                // solo basta con revisar si incluye "salida" y agregar el sufijo. Descomenta la siguiente línea para activarlo:
                if (tipoLower.includes('salida')) detalle += ' (Por Movimiento)';
                
                const destino = tipoLower.includes('salida')
                    ? dia.accesoriosSalidos
                    : dia.accesoriosIngresados;
                /* if (!destino[tipoAcc]) destino[tipoAcc] = 0;
                if (datos.modelos && datos.modelos.length > 0) {
                    datos.modelos.forEach(m => { destino[tipoAcc] += parseInt(m.cantidad) || 0; });
                } else {
                    destino[tipoAcc] += parseInt(datos.cantidad) || 1;
                } */
                if (!destino[tipoAcc]) destino[tipoAcc] = {};   // ← objeto anidado, no número
                if (datos.modelos && datos.modelos.length > 0) {
                    /* CÓDIGO NUEVO (Reemplaza lo anterior por esto): */
                    datos.modelos.forEach(m => {
                        // Si es una Caja y tiene color, lo juntamos igual que en las ventas
                        let nombreModelo = m.modelo || 'Sin especificar';
                        if (tipoAcc === 'Caja' && m.color) {
                            nombreModelo = `${nombreModelo} ${m.color}`;
                        }

                        // -> Lo mismo aplicaría si tienen múltiples modelos y quieres distinguirlos <-
                        // Descomenta la siguiente línea para activarlo en multi-modelo:
                        if (tipoLower.includes('salida')) nombreModelo += ' (Por Movimiento)';
                        
                        if (!destino[tipoAcc][nombreModelo]) destino[tipoAcc][nombreModelo] = 0;
                        destino[tipoAcc][nombreModelo] += parseInt(m.cantidad) || 0;
                    });
                } else {
                    // Si no tiene lista de modelos, agrupa bajo "Sin especificar"
                    if (!destino[tipoAcc][detalle]) destino[tipoAcc][detalle] = 0;
                    destino[tipoAcc][detalle] += parseInt(datos.cantidad) || 1;
                }
            }
        });

        // Ordenar operaciones por hora dentro de cada día
        this.registroPorDia.forEach(dia => {
            dia.operaciones.sort((a, b) => {
                return a.hora.localeCompare(b.hora);
            });
        });
        ///////////////////////////////////////////////////////
        console.log('📊 registroPorDia:', this.registroPorDia);
        console.log('📋 Como array:', [...this.registroPorDia.values()]);
    }

    obtenerDescripcionVenta(venta) {
        if (venta.tipoVenta === 'completa') {
            return `📱 Venta - ${venta.equipo.modelo} ${venta.equipo.almacenamiento} ${venta.equipo.color}`;
        } else {
            return `🛡️ Venta Accesorios`;
        }
    }

    procesarAccesorios(venta, dia) {
        const acc = venta.accesorios;

        // Forro
        if (acc.forro && acc.forroCantidad > 0) {
            const modelo = acc.forroModelo || 'Sin especificar';
            this.agregarAccesorio(dia, 'Forro', modelo, acc.forroCantidad);
        }

        // Cargador
        if (acc.cargador && acc.cargadorCantidad > 0) {
            this.agregarAccesorio(dia, 'Cargador', 'Estándar', acc.cargadorCantidad);
        }

        // Vidrio
        if (acc.vidrio && acc.vidrioCantidad > 0) {
            const modelo = acc.vidrioModelo || 'Sin especificar';
            this.agregarAccesorio(dia, 'Vidrio Templado', modelo, acc.vidrioCantidad);
        }

        // Protector Cámara
        if (acc.protectorCamara && acc.protectorCantidad > 0) {
            this.agregarAccesorio(dia, 'Protector Cámara', 'Estándar', acc.protectorCantidad);
        }

        // Cubo
        if (acc.cubo && acc.cuboCantidad > 0) {
            this.agregarAccesorio(dia, 'Cubo', 'Estándar', acc.cuboCantidad);
        }

        // Cable Lightning
        if (acc.cableLightning && acc.cableLightningCantidad > 0) {
            this.agregarAccesorio(dia, 'Cable Lightning', 'Estándar', acc.cableLightningCantidad);
        }

        // Cable C+C
        if (acc.cableCC && acc.cableCCCantidad > 0) {
            this.agregarAccesorio(dia, 'Cable C+C', 'Estándar', acc.cableCCCantidad);
        }

        // Caja
        if (acc.caja && acc.cajaCantidad > 0) {
            const modelo = acc.cajaModelo || 'Sin especificar';
            const color = acc.cajaColor || '';
            const descripcion = color ? `${modelo} ${color}` : modelo;
            this.agregarAccesorio(dia, 'Caja', descripcion, acc.cajaCantidad);
        }
    }

    agregarAccesorio(dia, tipo, modelo, cantidad) {
        if (!dia.accesorios[tipo]) {
            dia.accesorios[tipo] = {};
        }
        if (!dia.accesorios[tipo][modelo]) {
            dia.accesorios[tipo][modelo] = 0;
        }
        dia.accesorios[tipo][modelo] += cantidad;
    }

    renderizar() {
        // AHORA: lee el valor como texto primero
        const periodoVal = document.getElementById('filtroPeriodo').value;
        const fechaFiltro = document.getElementById('filtroFecha').value;

        let diasFiltrados = Array.from(this.registroPorDia.values());

        // Filtrar por fecha específica
        if (fechaFiltro) {
            const fechaBuscada = this.convertirFechaInput(fechaFiltro);
            diasFiltrados = diasFiltrados.filter(dia => dia.fecha === fechaBuscada);
        }
        // Filtrar por período
        else if (periodoVal !== 'todos') {
            let dias = 0;
            if (periodoVal === 'personalizado') {
                // Lee el campo personalizado
                dias = parseInt(document.getElementById('diasPersonalizado').value);
                if (!dias || dias < 1) return; // Si está vacío o es 0, no hace nada
            } else {
                // Las opciones normales (7, 15, 30...) se convierten a número como antes
                dias = parseInt(periodoVal);
            }

            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - dias);

            diasFiltrados = diasFiltrados.filter(dia => {
                const fechaDia = this.parsearFecha(dia.fecha);
                return fechaDia >= fechaLimite;
            });
        }

        // Ordenar por fecha descendente (más reciente primero)
        diasFiltrados.sort((a, b) => {
            const fechaA = this.parsearFecha(a.fecha);
            const fechaB = this.parsearFecha(b.fecha);
            return fechaB - fechaA;
        });

        this.renderizarResumen(diasFiltrados);
        this.renderizarDias(diasFiltrados);
    }

    renderizarResumen(dias) {
        const totalDias = dias.length;
        const totalVentas = dias.reduce((sum, dia) => sum + dia.totalVentas, 0);
        const totalOperaciones = dias.reduce((sum, dia) => sum + dia.operaciones.length, 0);

        document.getElementById('totalDias').textContent = totalDias;
        document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(2)}`;
        document.getElementById('totalOperaciones').textContent = totalOperaciones;

        // Calcular resumen de accesorios del período
        this.renderizarResumenAccesorios(dias);
    }

    renderizarResumenAccesorios(dias) {
        const accesoriosTotales = {};
        const accesoriosIngresadosTotales = {};  // ← NUEVO: objeto para ingresados
        
        dias.forEach(dia => {
            // Validar que dia.accesorios exista
            if (!dia.accesorios || typeof dia.accesorios !== 'object') {
                return;
            }

            Object.entries(dia.accesorios).forEach(([tipo, modelos]) => {
                if (!accesoriosTotales[tipo]) {
                    accesoriosTotales[tipo] = {};
                }
                Object.entries(modelos).forEach(([modelo, cantidad]) => {
                    if (!accesoriosTotales[tipo][modelo]) {
                        accesoriosTotales[tipo][modelo] = 0;
                    }
                    accesoriosTotales[tipo][modelo] += cantidad;
                });
            });

            // ── 2. NUEVO: Acumular accesorios SALIDOS por movimientos ──
            //    Se suman al MISMO objeto accesoriosTotales
            //    porque salida = artículo que se fue (como una venta)
            if (dia.accesoriosSalidos && typeof dia.accesoriosSalidos === 'object') {
                Object.entries(dia.accesoriosSalidos).forEach(([tipo, modelos]) => {
                    if (!accesoriosTotales[tipo]) accesoriosTotales[tipo] = {};
                    Object.entries(modelos).forEach(([modelo, cantidad]) => {
                        if (!accesoriosTotales[tipo][modelo]) accesoriosTotales[tipo][modelo] = 0;
                        accesoriosTotales[tipo][modelo] += cantidad;
                    });
                });
            }
            // ── 3. NUEVO: Acumular accesorios INGRESADOS por movimientos ──
            //    Estos van en un objeto SEPARADO para mostrarlos aparte
            if (dia.accesoriosIngresados && typeof dia.accesoriosIngresados === 'object') {
                Object.entries(dia.accesoriosIngresados).forEach(([tipo, modelos]) => {
                    if (!accesoriosIngresadosTotales[tipo]) accesoriosIngresadosTotales[tipo] = {};
                    Object.entries(modelos).forEach(([modelo, cantidad]) => {
                        if (!accesoriosIngresadosTotales[tipo][modelo]) accesoriosIngresadosTotales[tipo][modelo] = 0;
                        accesoriosIngresadosTotales[tipo][modelo] += cantidad;
                    });
                });
            }
        });



        /* // Crear HTML para el resumen
        const contenedor = document.getElementById('resumenAccesoriosPeriodo');
        if (!contenedor) return;

        if (Object.keys(accesoriosTotales).length === 0) {
            contenedor.innerHTML = '<p class="text-gray-500 text-center">No hay accesorios vendidos en este período</p>';
            return;
        }

        let html = '<div class="accesorios-grid">';

        Object.entries(accesoriosTotales).forEach(([tipo, modelos]) => {
            const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);

            html += `
                <div class="accesorio-card">
                    <div class="accesorio-header">${tipo} (${totalTipo})</div>
                    <div class="accesorio-detalles">
            `;

            Object.entries(modelos)
                .sort((a, b) => b[1] - a[1]) // Ordenar por cantidad descendente
                .forEach(([modelo, cantidad]) => {
                    html += `
                        <div class="accesorio-item">
                            <span class="accesorio-modelo">${modelo}</span>
                            <span class="accesorio-cantidad">${cantidad}</span>
                        </div>
                    `;
                });

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';
        contenedor.innerHTML = html; */
        // ── Renderizar HTML ──
        const contenedor = document.getElementById('resumenAccesoriosPeriodo');
        if (!contenedor) return;
        const sinSalidos = Object.keys(accesoriosTotales).length === 0;
        const sinIngresados = Object.keys(accesoriosIngresadosTotales).length === 0;
        if (sinSalidos && sinIngresados) {
            contenedor.innerHTML = '<p class="text-gray-500 text-center">No hay accesorios en este período</p>';
            return;
        }
        let html = '';
        // ── Sección 1: Salidos (ventas + movimientos combinados) ──
        if (!sinSalidos) {
            html += '<h3 class="accesorios-titulo" style="color:#c53030;">📦➡️ Accesorios Salidos del Período (Ventas + Movimientos)</h3>';
            html += '<div class="accesorios-grid">';
            Object.entries(accesoriosTotales).forEach(([tipo, modelos]) => {
                const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
                html += `
                    <div class="accesorio-card">
                        <div class="accesorio-header">${tipo} (${totalTipo})</div>
                        <div class="accesorio-detalles">
                `;
                Object.entries(modelos)
                    //.sort((a, b) => b[1] - a[1])
                    .sort(ordenarModelosPro)
                    .forEach(([modelo, cantidad]) => {
                        html += `
                            <div class="accesorio-item">
                                <span class="accesorio-modelo">${modelo}</span>
                                <span class="accesorio-cantidad">${cantidad}</span>
                            </div>
                        `;
                    });
                html += '</div></div>';
            });
            html += '</div>';
        }
        // ── Sección 2: Ingresados (solo movimientos) ──
        if (!sinIngresados) {
            html += '<h3 class="accesorios-titulo" style="color:#276749; margin-top:1rem;">📦⬅️ Accesorios Ingresados del Período</h3>';
            html += '<div class="accesorios-grid">';
            Object.entries(accesoriosIngresadosTotales).forEach(([tipo, modelos]) => {
                const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
                html += `
                    <div class="accesorio-card">
                        <div class="accesorio-header">${tipo} (${totalTipo})</div>
                        <div class="accesorio-detalles">
                `;
                Object.entries(modelos)
                    //.sort((a, b) => b[1] - a[1])
                    .sort(ordenarModelosPro)
                    .forEach(([modelo, cantidad]) => {
                        html += `
                            <div class="accesorio-item">
                                <span class="accesorio-modelo">${modelo}</span>
                                <span class="accesorio-cantidad">${cantidad}</span>
                            </div>
                        `;
                    });
                html += '</div></div>';
            });
            html += '</div>';
        }
        contenedor.innerHTML = html;
    }

    renderizarDias(dias) {
        const contenedor = document.getElementById('contenedorRegistro');

        if (dias.length === 0) {
            contenedor.innerHTML = '<div class="sin-datos">No hay datos para mostrar en el período seleccionado</div>';
            return;
        }

        contenedor.innerHTML = dias.map(dia => this.crearTablaDia(dia)).join('');
    }

    crearTablaDia(dia) {
        const netoDia = dia.totalIngresos - dia.totalEgresos;
        const netoClase = netoDia >= 0 ? 'monto-positivo' : 'monto-negativo';

        return `
            <div class="dia-card">
                <div class="dia-header">
                    <div class="dia-fecha">📅 ${dia.fecha}</div>
                    <div class="dia-stats">
                        <span>💰 Ventas: $${dia.totalVentas.toFixed(2)}</span>
                        <span>📊 Operaciones: ${dia.operaciones.length}</span>
                        <span class="${netoClase}">💵 Neto: $${netoDia.toFixed(2)}</span>
                    </div>
                </div>
                
                ${this.crearTablaAccesorios(dia)}
                ${this.crearResumenAccesoriosMovidos(dia.accesoriosSalidos, '📦➡️ Accesorios Salidos', '#c53030')}
                ${this.crearResumenAccesoriosMovidos(dia.accesoriosIngresados, '📦⬅️ Accesorios Ingresados', '#276749')}
                
                <div class="tabla-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Hora</th>
                                <th>Tipo</th>
                                <th>Descripción</th>
                                <th>Monto Total</th>
                                <th>Efectivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dia.operaciones.map(op => this.crearFilaOperacion(op)).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; background: #f7fafc;">
                                <td colspan="3">TOTALES DEL DÍA</td>
                                <td class="monto-positivo">$${dia.totalVentas.toFixed(2)}</td>
                                <td class="${netoClase}">$${netoDia.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }

    crearTablaAccesorios(dia) {
        // Validar que dia.accesorios exista
        if (!dia.accesorios || typeof dia.accesorios !== 'object') {
            return '';
        }

        const tiposAccesorios = Object.keys(dia.accesorios);

        if (tiposAccesorios.length === 0) {
            return '';
        }

        let html = '<div class="accesorios-section">';
        html += '<h3 class="accesorios-titulo">🛡️ Accesorios Vendidos</h3>';
        html += '<div class="accesorios-grid">';

        tiposAccesorios.forEach(tipo => {
            const modelos = dia.accesorios[tipo];
            const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);

            html += `
                <div class="accesorio-card">
                    <div class="accesorio-header">${tipo} (${totalTipo})</div>
                    <div class="accesorio-detalles">
            `;

            Object.entries(modelos).forEach(([modelo, cantidad]) => {
                html += `
                    <div class="accesorio-item">
                        <span class="accesorio-modelo">${modelo}</span>
                        <span class="accesorio-cantidad">${cantidad}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    crearResumenAccesoriosMovidos(datos, titulo, color) {
        if (!datos || Object.keys(datos).length === 0) return '';

        let html = `<div class="accesorios-section">`;
        html += `<h3 class="accesorios-titulo" style="color:${color};">${titulo}</h3>`;
        html += `<div class="accesorios-grid">`;

        /* Object.entries(datos).forEach(([tipo, cantidad]) => {
            html += `
                <div class="accesorio-card">
                    <div class="accesorio-header">${tipo}</div>
                    <div class="accesorio-detalles">
                        <div class="accesorio-item">
                            <span class="accesorio-modelo">Cantidad</span>
                            <span class="accesorio-cantidad">${cantidad}</span>
                        </div>
                    </div>
                </div>
            `;
        }); */
        Object.entries(datos).forEach(([tipo, modelos]) => {
            const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
            html += `<div class="accesorio-card">
                <div class="accesorio-header">${tipo} (${totalTipo})</div>
                <div class="accesorio-detalles">`;
            Object.entries(modelos).forEach(([modelo, cantidad]) => {
                html += `<div class="accesorio-item">
                    <span class="accesorio-modelo">${modelo}</span>
                    <span class="accesorio-cantidad">${cantidad}</span>
                </div>`;
            });
            html += `</div></div>`;
        });

        html += `</div></div>`;
        return html;
    }

    crearFilaOperacion(operacion) {
        // Determinar badge y texto del tipo
        let tipoBadge = 'tipo-movimiento';
        let tipoTexto = operacion.descripcion;

        if (operacion.tipo === 'venta') {
            tipoBadge = 'tipo-venta';
            tipoTexto = '💳 Venta';
        } else {
            const desc = operacion.descripcion.toLowerCase();
            if (desc.includes('salida') && desc.includes('efectivo')) tipoTexto = '💸 Salida Efectivo';
            else if (desc.includes('ingreso') && desc.includes('efectivo')) tipoTexto = '💵 Ingreso Efectivo';
            else if (desc.includes('salida') && desc.includes('equipo')) tipoTexto = '📱➡️ Salida Equipo';
            else if (desc.includes('ingreso') && desc.includes('equipo')) tipoTexto = '📱⬅️ Ingreso Equipo';
            else if (desc.includes('compra')) tipoTexto = '📱⬅️ Compra Equipo';
            else if (desc.includes('salida') && desc.includes('accesorio')) tipoTexto = '🛡️➡️ Salida Acc.';
            else if (desc.includes('ingreso') && desc.includes('accesorio')) tipoTexto = '🛡️⬅️ Ingreso Acc.';
            else if (desc.includes('cambio')) tipoTexto = '🔄 Garantía';
        }

        const montoClase = operacion.efectivo > 0 ? 'monto-positivo' :
            operacion.efectivo < 0 ? 'monto-negativo' : 'monto-neutral';

        const efectivoTexto = operacion.efectivo !== 0 ?
            `${operacion.efectivo > 0 ? '+' : ''}$${Math.abs(operacion.efectivo).toFixed(2)}` :
            '-';

        // Obtener detalles del movimiento (persona, motivo, modelo, etc.)
        let detallesExtra = '';
        if (operacion.tipo === 'movimiento' && operacion.detalles) {
            try {
                const detalles = operacion.detalles.obtenerDetalles();
                if (detalles && detalles !== 'Sin detalles') {
                    detallesExtra = `<br><small style="color:#718096;font-size:0.8em;">${detalles}</small>`;
                }
            } catch (e) { /* ignorar */ }
        }

        const descripcionTexto = operacion.tipo === 'venta'
            ? operacion.descripcion
            : `<strong>${operacion.descripcion}</strong>${detallesExtra}`;

        return `
            <tr>
                <td>${operacion.hora}</td>
                <td><span class="tipo-badge ${tipoBadge}">${tipoTexto}</span></td>
                <td>${descripcionTexto}</td>
                <td class="monto-positivo">$${operacion.monto.toFixed(2)}</td>
                <td class="${montoClase}">${efectivoTexto}</td>
            </tr>
        `;
    }

    parsearFecha(fechaStr) {
        // Convierte "DD/MM/YYYY" a objeto Date
        const partes = fechaStr.split('/');
        return new Date(partes[2], partes[1] - 1, partes[0]);
    }

    convertirFechaInput(fechaInput) {
        // Convierte "YYYY-MM-DD" a "DD/MM/YYYY"
        const fecha = new Date(fechaInput + 'T00:00:00');
        return fecha.toLocaleDateString('es-ES');
    }

    configurarEventos() {
        document.getElementById('btnVolver').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        /* document.getElementById('filtroPeriodo').addEventListener('change', () => {
            document.getElementById('filtroFecha').value = '';
            this.renderizar();
        }); */
        // AHORA: detecta QUÉ opción elegiste
        document.getElementById('filtroPeriodo').addEventListener('change', (e) => {
            document.getElementById('filtroFecha').value = '';
            const div = document.getElementById('diasPersonalizadoDiv');
            if (e.target.value === 'personalizado') {
                // Si eligió "Personalizado" → MUESTRA el campo y lo enfoca
                div.style.display = 'block';
                document.getElementById('diasPersonalizado').value = '';
                document.getElementById('diasPersonalizado').focus();
                // ⚠️ No llama a renderizar() aquí, espera que el usuario escriba
            } else {
                // Si eligió cualquier otra opción → OCULTA el campo y filtra normal
                div.style.display = 'none';
                this.renderizar();
            }
        });
        // NUEVO: escucha mientras el usuario escribe en el campo personalizado
        document.getElementById('diasPersonalizado').addEventListener('input', () => {
            this.renderizar(); // filtra cada vez que escribe un dígito
            console.log("hol")
        });

        document.getElementById('filtroFecha').addEventListener('change', () => {
            this.renderizar();
        });

        document.getElementById('btnExportar').addEventListener('click', () => {
            this.exportarDatos();
        });
    }

    exportarDatos() {
        const datos = Array.from(this.registroPorDia.values());
        const json = JSON.stringify(datos, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registro-diario-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    

}
function calcularPesoModelo(nombre) {
        // 1. Extraemos el número principal del modelo
        const match = nombre.match(/\d+/);
        const numero = match ? parseInt(match[0]) : 0;
        
        // Si no es un teléfono (ej: "Estándar", "Sin especificar") le damos peso máximo para que vaya al final
        if (numero === 0) return { numero: 999, jerarquia: 0 }; 
    
        // 2. Extraemos el sufijo
        const sufijo = nombre.toLowerCase();
        
        // 3. Asignamos un peso de jerarquía según el estándar
        let jerarquia = 1; // Base
        if (sufijo.includes('pro max')) jerarquia = 4;
        else if (sufijo.includes('pro')) jerarquia = 3;
        else if (sufijo.includes('plus')) jerarquia = 2;
        else if (sufijo.includes('mini')) jerarquia = 0; // Mini va antes del base
    
        return { numero, jerarquia };
    }
    
    function ordenarModelosPro(a, b) {
        const pesoA = calcularPesoModelo(a[0]);
        const pesoB = calcularPesoModelo(b[0]);
    
        if (pesoA.numero !== pesoB.numero) return pesoA.numero - pesoB.numero;
        if (pesoA.jerarquia !== pesoB.jerarquia) return pesoA.jerarquia - pesoB.jerarquia;
        
        return a[0].localeCompare(b[0]);
    }
// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new RegistroDiario();
});
