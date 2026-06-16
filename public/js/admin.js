/* import { authService } from './services/AuthService.js';
import { adminService } from './services/AdminService.js';

class AdminDashboard {
    constructor() {
        this.ventas = [];
        this.movimientos = [];
        this.registroPorDia = new Map();
        this.charts = {};
        this.init();
    }

    async init() {
        adminService.inicializar();
        adminService.onCambio(() => {
            this.cargarDatos();
            this.procesarDatos();
            this.renderizar();
        });

        this.cargarDatos();
        this.procesarDatos();
        this.renderizar();
        this.configurarEventos();
    }

    cargarDatos() {
        const sedeSeleccionada = document.getElementById('selectorSedeAdmin').value;
        this.ventas = adminService.obtenerVentas(sedeSeleccionada);
        this.movimientos = adminService.obtenerMovimientos(sedeSeleccionada);
    }

    procesarDatos() {
        this.registroPorDia.clear();

        // Procesar ventas
        this.ventas.forEach(venta => {
            const fecha = venta.fecha;
            if (!this.registroPorDia.has(fecha)) {
                this.registroPorDia.set(fecha, this.crearEstructuraDia(fecha));
            }

            const dia = this.registroPorDia.get(fecha);
            const efectivo = venta.calcularEfectivo();

            dia.operaciones.push({
                tipo: 'venta',
                hora: venta.hora,
                descripcion: this.obtenerDescripcionVenta(venta),
                monto: venta.montoTotal,
                efectivo: efectivo,
                detalles: venta,
                sedeNombre: venta.sedeNombre || 'Desconocida'
            });

            this.procesarAccesorios(venta, dia);

            if (venta.tipoTransaccion !== 'abono') {
                dia.totalVentas += venta.montoTotal;
                dia.cantidadVentas++;
            }
            dia.totalIngresos += efectivo;
        });

        // Procesar movimientos
        this.movimientos.forEach(movimiento => {
            const fecha = movimiento.fecha;
            if (!this.registroPorDia.has(fecha)) {
                this.registroPorDia.set(fecha, this.crearEstructuraDia(fecha));
            }

            const dia = this.registroPorDia.get(fecha);

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
                descripcion: movimiento.tipo,
                monto: Math.abs(impacto),
                efectivo: impacto,
                detalles: movimiento,
                sedeNombre: movimiento.sedeNombre || 'Desconocida'
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

                if (detalle.toLowerCase() === 'estandar' || detalle === 'Sin especificar') {
                    detalle = 'Estándar';
                }

                if (tipoAcc === "Lightning") {
                    tipoAcc = "Cable Lightning";
                } else if (tipoAcc === "USB-C a USB-C") {
                    tipoAcc = "Cable C+C";
                }

                if (tipoLower.includes('salida')) detalle += ' (Por Movimiento)';

                const destino = tipoLower.includes('salida')
                    ? dia.accesoriosSalidos
                    : dia.accesoriosIngresados;

                if (!destino[tipoAcc]) destino[tipoAcc] = {};
                if (datos.modelos && datos.modelos.length > 0) {
                    datos.modelos.forEach(m => {
                        let nombreModelo = m.modelo || 'Sin especificar';
                        if (tipoAcc === 'Caja' && m.color) {
                            nombreModelo = `${nombreModelo} ${m.color}`;
                        }
                        if (tipoLower.includes('salida')) nombreModelo += ' (Por Movimiento)';

                        if (!destino[tipoAcc][nombreModelo]) destino[tipoAcc][nombreModelo] = 0;
                        destino[tipoAcc][nombreModelo] += parseInt(m.cantidad) || 0;
                    });
                } else {
                    if (!destino[tipoAcc][detalle]) destino[tipoAcc][detalle] = 0;
                    destino[tipoAcc][detalle] += parseInt(datos.cantidad) || 1;
                }
            }
        });

        // Ordenar operaciones por hora dentro de cada día
        this.registroPorDia.forEach(dia => {
            dia.operaciones.sort((a, b) => a.hora.localeCompare(b.hora));
        });
    }

    crearEstructuraDia(fecha) {
        return {
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
        };
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
        if (acc.forro) {
            if (acc.forros && acc.forros.length > 0) {
                acc.forros.forEach(f => {
                    this.agregarAccesorio(dia, 'Forro', f.modelo || 'Sin especificar', f.cantidad);
                });
            } else if (acc.forroCantidad > 0) {
                this.agregarAccesorio(dia, 'Forro', acc.forroModelo || 'Sin especificar', acc.forroCantidad);
            }
        }

        // Cargador
        if (acc.cargador && acc.cargadorCantidad > 0) {
            this.agregarAccesorio(dia, 'Cargador', 'Estándar', acc.cargadorCantidad);
        }

        // Vidrio
        if (acc.vidrio) {
            if (acc.vidrios && acc.vidrios.length > 0) {
                acc.vidrios.forEach(v => {
                    this.agregarAccesorio(dia, 'Vidrio Templado', v.modelo || 'Sin especificar', v.cantidad);
                });
            } else if (acc.vidrioCantidad > 0) {
                this.agregarAccesorio(dia, 'Vidrio Templado', acc.vidrioModelo || 'Sin especificar', acc.vidrioCantidad);
            }
        }

        // Otros
        if (acc.otro && acc.otros && acc.otros.length > 0) {
            acc.otros.forEach(o => {
                this.agregarAccesorio(dia, 'Otro', o.nombre || 'Sin especificar', o.cantidad);
            });
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
        const periodoVal = document.getElementById('filtroPeriodoAdmin').value;
        const fechaDesde = document.getElementById('filtroDesdeAdmin').value;
        const fechaHasta = document.getElementById('filtroHastaAdmin').value;

        let diasFiltrados = Array.from(this.registroPorDia.values());

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
        // Filtrar por período predefinido
        else if (periodoVal !== 'todos') {
            let dias = 0;
            if (periodoVal === 'personalizado') {
                dias = parseInt(document.getElementById('diasPersonalizadoAdmin').value);
                if (!dias || dias < 1) return;
            } else {
                dias = parseInt(periodoVal);
            }

            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - dias);

            diasFiltrados = diasFiltrados.filter(dia => {
                const fechaDia = this.parsearFecha(dia.fecha);
                return fechaDia >= fechaLimite;
            });
        }

        // Ordenar por fecha descendente
        diasFiltrados.sort((a, b) => this.parsearFecha(b.fecha) - this.parsearFecha(a.fecha));

        this.renderizarResumen(diasFiltrados);
        this.renderizarDias(diasFiltrados);
        this.actualizarGraficos(diasFiltrados);
    }

    renderizarResumen(dias) {
        const totalDias = dias.length;
        const totalVentas = dias.reduce((sum, dia) => sum + dia.totalVentas, 0);
        const totalIngresos = dias.reduce((sum, dia) => sum + dia.totalIngresos, 0);
        const totalEgresos = dias.reduce((sum, dia) => sum + dia.totalEgresos, 0);
        const totalOperaciones = dias.reduce((sum, dia) => sum + dia.operaciones.length, 0);

        // Contar equipos vendidos (soporte multi-equipo: 1 venta puede tener N)
        let equiposVendidos = 0;
        dias.forEach(d => {
            d.operaciones.forEach(op => {
                if (op.tipo === 'venta' && op.detalles.tipoVenta === 'completa' && op.detalles.tipoTransaccion !== 'abono') {
                    equiposVendidos += (op.detalles.equipos && op.detalles.equipos.length) || (op.detalles.equipo ? 1 : 0);
                }
            });
        });

        // Actualizar KPIs
        document.getElementById('totalVentasAdmin').textContent = `$${totalVentas.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('totalIngresosAdmin').textContent = `$${(totalIngresos - totalEgresos).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('totalOperacionesAdmin').textContent = totalOperaciones;
        document.getElementById('equiposVendidosAdmin').textContent = equiposVendidos;

        // Renderizar resumen de accesorios
        this.renderizarResumenAccesorios(dias);
    }

    renderizarResumenAccesorios(dias) {
        const accesoriosTotales = {};
        const accesoriosIngresadosTotales = {};

        dias.forEach(dia => {
            if (dia.accesorios) {
                Object.entries(dia.accesorios).forEach(([tipo, modelos]) => {
                    if (!accesoriosTotales[tipo]) accesoriosTotales[tipo] = {};
                    Object.entries(modelos).forEach(([modelo, cantidad]) => {
                        if (!accesoriosTotales[tipo][modelo]) accesoriosTotales[tipo][modelo] = 0;
                        accesoriosTotales[tipo][modelo] += cantidad;
                    });
                });
            }
            if (dia.accesoriosSalidos) {
                Object.entries(dia.accesoriosSalidos).forEach(([tipo, modelos]) => {
                    if (!accesoriosTotales[tipo]) accesoriosTotales[tipo] = {};
                    Object.entries(modelos).forEach(([modelo, cantidad]) => {
                        if (!accesoriosTotales[tipo][modelo]) accesoriosTotales[tipo][modelo] = 0;
                        accesoriosTotales[tipo][modelo] += cantidad;
                    });
                });
            }
            if (dia.accesoriosIngresados) {
                Object.entries(dia.accesoriosIngresados).forEach(([tipo, modelos]) => {
                    if (!accesoriosIngresadosTotales[tipo]) accesoriosIngresadosTotales[tipo] = {};
                    Object.entries(modelos).forEach(([modelo, cantidad]) => {
                        if (!accesoriosIngresadosTotales[tipo][modelo]) accesoriosIngresadosTotales[tipo][modelo] = 0;
                        accesoriosIngresadosTotales[tipo][modelo] += cantidad;
                    });
                });
            }
        });

        const contenedor = document.getElementById('resumenAccesoriosPeriodoAdmin');
        if (!contenedor) return;

        const sinSalidos = Object.keys(accesoriosTotales).length === 0;
        const sinIngresados = Object.keys(accesoriosIngresadosTotales).length === 0;

        if (sinSalidos && sinIngresados) {
            contenedor.innerHTML = '<p class="text-gray-500 text-center py-6">No hay accesorios en este período</p>';
            return;
        }

        let html = '';
        if (!sinSalidos) {
            html += '<h4 class="text-sm font-bold text-red-600 mb-3">📦➡️ Accesorios Salidos (Ventas + Movimientos)</h4>';
            html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">';
            Object.entries(accesoriosTotales).forEach(([tipo, modelos]) => {
                const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
                html += `
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div class="font-bold text-gray-700 border-b pb-1 mb-2">${tipo} (${totalTipo})</div>
                        <div class="text-xs space-y-1.5 max-h-40 overflow-y-auto">
                `;
                Object.entries(modelos)
                    .sort(this.ordenarModelosPro)
                    .forEach(([modelo, cantidad]) => {
                        html += `
                            <div class="flex justify-between border-b border-gray-100 pb-0.5">
                                <span class="text-gray-600">${modelo}</span>
                                <span class="font-semibold text-gray-900">${cantidad}</span>
                            </div>
                        `;
                    });
                html += '</div></div>';
            });
            html += '</div>';
        }

        if (!sinIngresados) {
            html += '<h4 class="text-sm font-bold text-emerald-600 mb-3">📦⬅️ Accesorios Ingresados (Movimientos)</h4>';
            html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
            Object.entries(accesoriosIngresadosTotales).forEach(([tipo, modelos]) => {
                const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
                html += `
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div class="font-bold text-gray-700 border-b pb-1 mb-2">${tipo} (${totalTipo})</div>
                        <div class="text-xs space-y-1.5 max-h-40 overflow-y-auto">
                `;
                Object.entries(modelos)
                    .sort(this.ordenarModelosPro)
                    .forEach(([modelo, cantidad]) => {
                        html += `
                            <div class="flex justify-between border-b border-gray-100 pb-0.5">
                                <span class="text-gray-600">${modelo}</span>
                                <span class="font-semibold text-gray-900">${cantidad}</span>
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
        const contenedor = document.getElementById('contenedorRegistroAdmin');

        if (dias.length === 0) {
            contenedor.innerHTML = '<div class="text-center text-gray-500 py-12">No hay datos para mostrar en el período seleccionado</div>';
            return;
        }

        contenedor.innerHTML = dias.map(dia => this.crearTablaDia(dia)).join('');
    }

    crearTablaDia(dia) {
        const netoDia = dia.totalIngresos - dia.totalEgresos;
        const netoClase = netoDia >= 0 ? 'text-emerald-600' : 'text-red-600';

        return `
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
                    <div class="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <span>📅</span> ${dia.fecha}
                    </div>
                    <div class="flex items-center gap-6 text-sm font-semibold text-gray-600">
                        <span>Ventas: <b class="text-slate-900">$${dia.totalVentas.toFixed(2)}</b></span>
                        <span>Operaciones: <b class="text-slate-900">${dia.operaciones.length}</b></span>
                        <span>Neto: <b class="${netoClase}">$${netoDia.toFixed(2)}</b></span>
                    </div>
                </div>
                
                ${this.crearTablaAccesorios(dia)}
                
                <div class="overflow-x-auto rounded-xl border border-gray-200">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b">
                                <th class="py-3 px-4">Hora</th>
                                <th class="py-3 px-4">Sucursal</th>
                                <th class="py-3 px-4">Tipo</th>
                                <th class="py-3 px-4">Descripción</th>
                                <th class="py-3 px-4 text-right">Monto Total</th>
                                <th class="py-3 px-4 text-right">Impacto Caja</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-xs">
                            ${dia.operaciones.map(op => this.crearFilaOperacion(op)).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="bg-slate-50 font-bold text-slate-800 text-xs">
                                <td colspan="4" class="py-3 px-4 uppercase">TOTALES DEL DÍA</td>
                                <td class="py-3 px-4 text-right text-blue-600 font-extrabold">$${dia.totalVentas.toFixed(2)}</td>
                                <td class="py-3 px-4 text-right ${netoClase} font-extrabold">$${netoDia.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }

    crearTablaAccesorios(dia) {
        if (!dia.accesorios || Object.keys(dia.accesorios).length === 0) return '';

        let html = '<div class="p-4 bg-slate-50 rounded-xl border border-gray-100">';
        html += '<h5 class="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5"><span>🛡️</span> Accesorios Vendidos el Día</h5>';
        html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">';

        Object.entries(dia.accesorios).forEach(([tipo, modelos]) => {
            const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
            html += `
                <div class="bg-white rounded-lg p-2.5 border border-gray-200">
                    <div class="text-xs font-bold text-gray-700 border-b pb-0.5 mb-1.5">${tipo} (${totalTipo})</div>
                    <div class="text-[11px] space-y-1">
            `;
            Object.entries(modelos).forEach(([modelo, cantidad]) => {
                html += `
                    <div class="flex justify-between text-gray-600">
                        <span>${modelo}</span>
                        <span class="font-semibold">${cantidad}</span>
                    </div>
                `;
            });
            html += '</div></div>';
        });

        html += '</div></div>';
        return html;
    }

    crearFilaOperacion(operacion) {
        let tipoBadge = 'bg-slate-100 text-slate-800 border-slate-200';
        let tipoTexto = operacion.descripcion;

        if (operacion.tipo === 'venta') {
            if (operacion.detalles && operacion.detalles.tipoTransaccion === 'abono') {
                tipoTexto = '💰 Abono';
                tipoBadge = 'bg-amber-50 text-amber-800 border-amber-200';
            } else {
                tipoTexto = '💳 Venta';
                tipoBadge = 'bg-blue-50 text-blue-800 border-blue-200';
            }
        } else {
            const desc = operacion.descripcion.toLowerCase();
            if (desc.includes('salida') && desc.includes('efectivo')) {
                tipoTexto = '💸 Salida Efectivo';
                tipoBadge = 'bg-red-50 text-red-800 border-red-200';
            } else if (desc.includes('ingreso') && desc.includes('efectivo')) {
                tipoTexto = '💵 Ingreso Efectivo';
                tipoBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            } else if (desc.includes('salida') && desc.includes('equipo')) {
                tipoTexto = '📱➡️ Salida Equ.';
                tipoBadge = 'bg-orange-50 text-orange-800 border-orange-200';
            } else if (desc.includes('ingreso') && desc.includes('equipo')) {
                tipoTexto = '📱⬅️ Ingreso Equ.';
                tipoBadge = 'bg-teal-50 text-teal-800 border-teal-200';
            } else if (desc.includes('compra')) {
                tipoTexto = '📱⬅️ Compra Equ.';
                tipoBadge = 'bg-indigo-50 text-indigo-800 border-indigo-200';
            } else if (desc.includes('salida') && desc.includes('accesorio')) {
                tipoTexto = '🛡️➡️ Salida Acc.';
                tipoBadge = 'bg-rose-50 text-rose-800 border-rose-200';
            } else if (desc.includes('ingreso') && desc.includes('accesorio')) {
                tipoTexto = '🛡️⬅️ Ingreso Acc.';
                tipoBadge = 'bg-green-50 text-green-800 border-green-200';
            } else if (desc.includes('cambio')) {
                tipoTexto = '🔄 Garantía';
                tipoBadge = 'bg-violet-50 text-violet-800 border-violet-200';
            }
        }

        const montoClase = operacion.efectivo > 0 ? 'text-emerald-600 font-semibold' :
            operacion.efectivo < 0 ? 'text-red-600 font-semibold' : 'text-gray-500';

        const efectivoTexto = operacion.efectivo !== 0 ?
            `${operacion.efectivo > 0 ? '+' : ''}$${Math.abs(operacion.efectivo).toFixed(2)}` :
            '-';

        let detallesExtra = '';
        if (operacion.tipo === 'movimiento' && operacion.detalles) {
            try {
                const detalles = operacion.detalles.obtenerDetalles();
                if (detalles && detalles !== 'Sin detalles') {
                    detallesExtra = `<br><small class="text-gray-400 text-[10px]">${detalles}</small>`;
                }
            } catch (e) {}
        }

        const descripcionTexto = operacion.tipo === 'venta'
            ? operacion.descripcion
            : `<strong>${operacion.descripcion}</strong>${detallesExtra}`;

        // Color identificador por sede
        const sedeColores = {
            'Tienda Principal': 'bg-blue-600',
            'Sucursal Norte': 'bg-indigo-600',
            'Sucursal Centro': 'bg-purple-600',
            'Sucursal Sur': 'bg-orange-600',
            'Sucursal Oeste': 'bg-teal-600',
            'Sucursal Este': 'bg-pink-600'
        };
        const colorClase = sedeColores[operacion.sedeNombre] || 'bg-slate-600';
        const sedeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold text-white ${colorClase}">${operacion.sedeNombre}</span>`;

        return `
            <tr class="hover:bg-slate-50 transition border-b border-gray-100">
                <td class="py-3 px-4 text-gray-500 font-medium">${operacion.hora}</td>
                <td class="py-3 px-4">${sedeBadge}</td>
                <td class="py-3 px-4"><span class="px-2 py-1 rounded-md text-[10px] font-bold border ${tipoBadge}">${tipoTexto}</span></td>
                <td class="py-3 px-4 text-gray-700">${descripcionTexto}</td>
                <td class="py-3 px-4 text-right font-medium text-slate-800">$${operacion.monto.toFixed(2)}</td>
                <td class="py-3 px-4 text-right ${montoClase}">${efectivoTexto}</td>
            </tr>
        `;
    }

    actualizarGraficos(dias) {
        // 1. Agrupar Ventas por Sede
        const ventasPorSede = {};
        adminService.sedes.forEach(s => {
            ventasPorSede[adminService.sedeNombres[s] || s] = 0;
        });

        // 2. Agrupar Ventas por Forma de Pago
        const metodosPago = {
            'Efectivo': 0,
            'Zelle': 0,
            'Binance': 0,
            'Pago Móvil': 0,
            'Transferencia': 0,
            'Paypal': 0//,
            //'Mixto': 0 
        };

        dias.forEach(d => {
            d.operaciones.forEach(op => {
                if (op.tipo === 'venta' && op.detalles.tipoTransaccion !== 'abono') {
                    const sede = op.sedeNombre || 'Desconocida';
                    ventasPorSede[sede] = (ventasPorSede[sede] || 0) + op.monto;

                    const fp = op.detalles.formaPago;
                    if (fp === 'efectivo') metodosPago['Efectivo'] += op.monto;
                    else if (fp === 'zelle') metodosPago['Zelle'] += op.monto;
                    else if (fp === 'binance') metodosPago['Binance'] += op.monto;
                    else if (fp === 'pagomovil') metodosPago['Pago Móvil'] += op.monto;
                    else if (fp === 'transferencia') metodosPago['Transferencia'] += op.monto;
                    else if (fp === 'paypal') metodosPago['Paypal'] += op.monto;
                    else if (fp === 'mixto' && op.detalles.pagoMixto) {
                        const pm = op.detalles.pagoMixto;
                        // Desglosa cada componente del pago mixto en su categoría real
                        if (pm.efectivo > 0) metodosPago['Efectivo'] += pm.efectivo;
                        if (pm.zelle > 0) metodosPago['Zelle'] += pm.zelle;
                        if (pm.binance > 0) metodosPago['Binance'] += pm.binance;
                        if (pm.pagoMovil > 0) metodosPago['Pago Móvil'] += pm.pagoMovil;
                        if (pm.transferencia > 0) metodosPago['Transferencia'] += pm.transferencia;
                    }
                }
            });
        });

        // Destruir gráficos anteriores si existen para evitar solapamiento visual
        if (this.charts.ventasSede) this.charts.ventasSede.destroy();
        if (this.charts.metodosPago) this.charts.metodosPago.destroy();

        // 3. Crear Gráfico Ventas por Sucursal
        const ctxSede = document.getElementById('chartVentasSede').getContext('2d');
        this.charts.ventasSede = new Chart(ctxSede, {
            type: 'bar',
            data: {
                labels: Object.keys(ventasPorSede),
                datasets: [{
                    label: 'Ventas Totales ($)',
                    data: Object.values(ventasPorSede),
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(79, 70, 229, 0.8)',
                        'rgba(147, 51, 234, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(20, 184, 166, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // 4. Crear Gráfico Distribución Métodos de Pago
        const ctxPago = document.getElementById('chartMetodosPago').getContext('2d');
        this.charts.metodosPago = new Chart(ctxPago, {
            type: 'doughnut',
            data: {
                labels: Object.keys(metodosPago),
                datasets: [{
                    data: Object.values(metodosPago),
                    backgroundColor: [
                        '#10B981', // Efectivo
                        '#3B82F6', // Zelle
                        '#F59E0B', // Binance
                        '#8B5CF6', // Pago Móvil
                        '#6366F1', // Transferencia
                        '#EC4899', // Paypal
                        '#6B7280'  // Mixto
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, font: { size: 11 } }
                    }
                }
            }
        });
    }

    parsearFecha(fechaStr) {
        const partes = fechaStr.split('/');
        return new Date(partes[2], partes[1] - 1, partes[0]);
    }

    configurarEventos() {
        document.getElementById('selectorSedeAdmin').addEventListener('change', () => {
            this.cargarDatos();
            this.procesarDatos();
            this.renderizar();
        });

        document.getElementById('filtroPeriodoAdmin').addEventListener('change', (e) => {
            document.getElementById('filtroDesdeAdmin').value = '';
            document.getElementById('filtroHastaAdmin').value = '';
            const div = document.getElementById('diasPersonalizadoDivAdmin');
            if (e.target.value === 'personalizado') {
                div.classList.remove('hidden');
                document.getElementById('diasPersonalizadoAdmin').value = '';
                document.getElementById('diasPersonalizadoAdmin').focus();
            } else {
                div.classList.add('hidden');
                this.renderizar();
            }
        });

        document.getElementById('diasPersonalizadoAdmin').addEventListener('input', () => {
            this.renderizar();
        });

        document.getElementById('filtroDesdeAdmin').addEventListener('change', () => {
            this.renderizar();
        });
        document.getElementById('filtroHastaAdmin').addEventListener('change', () => {
            this.renderizar();
        });

        document.getElementById('btnExportarAdmin').addEventListener('click', () => {
            this.exportarDatos();
        });

        document.getElementById('btnLogoutAdmin').addEventListener('click', () => {
            authService.logout().then(() => {
                window.location.replace('login.html');
            });
        });
    }

    exportarDatos() {
        const datos = Array.from(this.registroPorDia.values());
        const json = JSON.stringify(datos, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-registro-diario-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    calcularPesoModelo(nombre) {
        const match = nombre.match(/\d+/);
        const numero = match ? parseInt(match[0]) : 0;
        if (numero === 0) return { numero: 999, jerarquia: 0 };
        const sufijo = nombre.toLowerCase();
        let jerarquia = 1;
        if (sufijo.includes('pro max')) jerarquia = 4;
        else if (sufijo.includes('pro')) jerarquia = 3;
        else if (sufijo.includes('plus')) jerarquia = 2;
        else if (sufijo.includes('mini')) jerarquia = 0;
        return { numero, jerarquia };
    }

    ordenarModelosPro = (a, b) => {
        const pesoA = this.calcularPesoModelo(a[0]);
        const pesoB = this.calcularPesoModelo(b[0]);
        if (pesoA.numero !== pesoB.numero) return pesoA.numero - pesoB.numero;
        if (pesoA.jerarquia !== pesoB.jerarquia) return pesoA.jerarquia - pesoB.jerarquia;
        return a[0].localeCompare(b[0]);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    authService.onAuthChange((user) => {
        if (!user) {
            window.location.replace('login.html');
        } else {
            const rol = localStorage.getItem('usuario_rol');
            if (rol !== 'admin') {
                window.location.replace('index.html');
            } else {
                if (!window.adminDashboardApp) {
                    window.adminDashboardApp = new AdminDashboard();
                }
            }
        }
    });
});
 */





import { authService } from './services/AuthService.js';
import { adminService } from './services/AdminService.js';

class AdminDashboard {
    constructor() {
        this.ventas = [];
        this.movimientos = [];
        this.registroPorDia = new Map();
        this.charts = {};
        this.init();
    }

    async init() {
        adminService.inicializar();
        adminService.onCambio(() => {
            this.cargarDatos();
            this.procesarDatos();
            this.renderizar();
        });

        this.cargarDatos();
        this.procesarDatos();
        this.renderizar();
        this.configurarEventos();
    }

    cargarDatos() {
        const sedeSeleccionada = document.getElementById('selectorSedeAdmin').value;
        this.ventas = adminService.obtenerVentas(sedeSeleccionada);
        this.movimientos = adminService.obtenerMovimientos(sedeSeleccionada);
    }

    procesarDatos() {
        this.registroPorDia.clear();

        // Procesar ventas
        this.ventas.forEach(venta => {
            const fecha = venta.fecha;
            if (!this.registroPorDia.has(fecha)) {
                this.registroPorDia.set(fecha, this.crearEstructuraDia(fecha));
            }

            const dia = this.registroPorDia.get(fecha);
            const efectivo = venta.calcularEfectivo();

            dia.operaciones.push({
                tipo: 'venta',
                hora: venta.hora,
                descripcion: this.obtenerDescripcionVenta(venta),
                monto: venta.montoTotal,
                efectivo: efectivo,
                detalles: venta,
                sedeNombre: venta.sedeNombre || 'Desconocida'
            });

            this.procesarAccesorios(venta, dia);

            if (venta.tipoTransaccion !== 'abono') {
                dia.totalVentas += venta.montoTotal;
                dia.cantidadVentas++;
            }
            dia.totalIngresos += efectivo;
        });

        // Procesar movimientos
        this.movimientos.forEach(movimiento => {
            const fecha = movimiento.fecha;
            if (!this.registroPorDia.has(fecha)) {
                this.registroPorDia.set(fecha, this.crearEstructuraDia(fecha));
            }

            const dia = this.registroPorDia.get(fecha);

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
                descripcion: movimiento.tipo,
                monto: Math.abs(impacto),
                efectivo: impacto,
                detalles: movimiento,
                sedeNombre: movimiento.sedeNombre || 'Desconocida'
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

                if (detalle.toLowerCase() === 'estandar' || detalle === 'Sin especificar') {
                    detalle = 'Estándar';
                }

                if (tipoAcc === "Lightning") {
                    tipoAcc = "Cable Lightning";
                } else if (tipoAcc === "USB-C a USB-C") {
                    tipoAcc = "Cable C+C";
                }

                if (tipoLower.includes('salida')) detalle += ' (Por Movimiento)';

                const destino = tipoLower.includes('salida')
                    ? dia.accesoriosSalidos
                    : dia.accesoriosIngresados;

                if (!destino[tipoAcc]) destino[tipoAcc] = {};
                if (datos.modelos && datos.modelos.length > 0) {
                    datos.modelos.forEach(m => {
                        let nombreModelo = m.modelo || 'Sin especificar';
                        if (tipoAcc === 'Caja' && m.color) {
                            nombreModelo = `${nombreModelo} ${m.color}`;
                        }
                        if (tipoLower.includes('salida')) nombreModelo += ' (Por Movimiento)';

                        if (!destino[tipoAcc][nombreModelo]) destino[tipoAcc][nombreModelo] = 0;
                        destino[tipoAcc][nombreModelo] += parseInt(m.cantidad) || 0;
                    });
                } else {
                    if (!destino[tipoAcc][detalle]) destino[tipoAcc][detalle] = 0;
                    destino[tipoAcc][detalle] += parseInt(datos.cantidad) || 1;
                }
            }
        });

        // Ordenar operaciones por hora dentro de cada día
        this.registroPorDia.forEach(dia => {
            dia.operaciones.sort((a, b) => a.hora.localeCompare(b.hora));
        });
    }

    crearEstructuraDia(fecha) {
        return {
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
        };
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
        if (acc.forro) {
            if (acc.forros && acc.forros.length > 0) {
                acc.forros.forEach(f => {
                    this.agregarAccesorio(dia, 'Forro', f.modelo || 'Sin especificar', f.cantidad);
                });
            } else if (acc.forroCantidad > 0) {
                this.agregarAccesorio(dia, 'Forro', acc.forroModelo || 'Sin especificar', acc.forroCantidad);
            }
        }

        // Cargador
        if (acc.cargador && acc.cargadorCantidad > 0) {
            this.agregarAccesorio(dia, 'Cargador', 'Estándar', acc.cargadorCantidad);
        }

        // Vidrio
        if (acc.vidrio) {
            if (acc.vidrios && acc.vidrios.length > 0) {
                acc.vidrios.forEach(v => {
                    this.agregarAccesorio(dia, 'Vidrio Templado', v.modelo || 'Sin especificar', v.cantidad);
                });
            } else if (acc.vidrioCantidad > 0) {
                this.agregarAccesorio(dia, 'Vidrio Templado', acc.vidrioModelo || 'Sin especificar', acc.vidrioCantidad);
            }
        }

        // Otros
        if (acc.otro && acc.otros && acc.otros.length > 0) {
            acc.otros.forEach(o => {
                this.agregarAccesorio(dia, 'Otro', o.nombre || 'Sin especificar', o.cantidad);
            });
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
        const periodoVal = document.getElementById('filtroPeriodoAdmin').value;
        const fechaDesde = document.getElementById('filtroDesdeAdmin').value;
        const fechaHasta = document.getElementById('filtroHastaAdmin').value;

        let diasFiltrados = Array.from(this.registroPorDia.values());

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
        // Filtrar por período predefinido
        else if (periodoVal !== 'todos') {
            let dias = 0;
            if (periodoVal === 'personalizado') {
                dias = parseInt(document.getElementById('diasPersonalizadoAdmin').value);
                if (!dias || dias < 1) return;
            } else {
                dias = parseInt(periodoVal);
            }

            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - dias);

            diasFiltrados = diasFiltrados.filter(dia => {
                const fechaDia = this.parsearFecha(dia.fecha);
                return fechaDia >= fechaLimite;
            });
        }

        // Ordenar por fecha descendente
        diasFiltrados.sort((a, b) => this.parsearFecha(b.fecha) - this.parsearFecha(a.fecha));

        this.renderizarResumen(diasFiltrados);
        this.renderizarDias(diasFiltrados);
        this.actualizarGraficos(diasFiltrados);
    }

    renderizarResumen(dias) {
        const totalDias = dias.length;
        const totalVentas = dias.reduce((sum, dia) => sum + dia.totalVentas, 0);
        const totalIngresos = dias.reduce((sum, dia) => sum + dia.totalIngresos, 0);
        const totalEgresos = dias.reduce((sum, dia) => sum + dia.totalEgresos, 0);
        const totalOperaciones = dias.reduce((sum, dia) => sum + dia.operaciones.length, 0);

        // Contar equipos vendidos (soporte multi-equipo: 1 venta puede tener N)
        let equiposVendidos = 0;
        dias.forEach(d => {
            d.operaciones.forEach(op => {
                if (op.tipo === 'venta' && op.detalles.tipoVenta === 'completa' && op.detalles.tipoTransaccion !== 'abono') {
                    equiposVendidos += (op.detalles.equipos && op.detalles.equipos.length) || (op.detalles.equipo ? 1 : 0);
                }
            });
        });

        // Actualizar KPIs
        document.getElementById('totalVentasAdmin').textContent = `$${totalVentas.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('totalIngresosAdmin').textContent = `$${(totalIngresos - totalEgresos).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('totalOperacionesAdmin').textContent = totalOperaciones;
        document.getElementById('equiposVendidosAdmin').textContent = equiposVendidos;

        // Renderizar resumen de accesorios
        this.renderizarResumenAccesorios(dias);
    }

    renderizarResumenAccesorios(dias) {
        const accesoriosTotales = {};
        const accesoriosIngresadosTotales = {};

        dias.forEach(dia => {
            if (dia.accesorios) {
                Object.entries(dia.accesorios).forEach(([tipo, modelos]) => {
                    if (!accesoriosTotales[tipo]) accesoriosTotales[tipo] = {};
                    Object.entries(modelos).forEach(([modelo, cantidad]) => {
                        if (!accesoriosTotales[tipo][modelo]) accesoriosTotales[tipo][modelo] = 0;
                        accesoriosTotales[tipo][modelo] += cantidad;
                    });
                });
            }
            if (dia.accesoriosSalidos) {
                Object.entries(dia.accesoriosSalidos).forEach(([tipo, modelos]) => {
                    if (!accesoriosTotales[tipo]) accesoriosTotales[tipo] = {};
                    Object.entries(modelos).forEach(([modelo, cantidad]) => {
                        if (!accesoriosTotales[tipo][modelo]) accesoriosTotales[tipo][modelo] = 0;
                        accesoriosTotales[tipo][modelo] += cantidad;
                    });
                });
            }
            if (dia.accesoriosIngresados) {
                Object.entries(dia.accesoriosIngresados).forEach(([tipo, modelos]) => {
                    if (!accesoriosIngresadosTotales[tipo]) accesoriosIngresadosTotales[tipo] = {};
                    Object.entries(modelos).forEach(([modelo, cantidad]) => {
                        if (!accesoriosIngresadosTotales[tipo][modelo]) accesoriosIngresadosTotales[tipo][modelo] = 0;
                        accesoriosIngresadosTotales[tipo][modelo] += cantidad;
                    });
                });
            }
        });

        const contenedor = document.getElementById('resumenAccesoriosPeriodoAdmin');
        if (!contenedor) return;

        const sinSalidos = Object.keys(accesoriosTotales).length === 0;
        const sinIngresados = Object.keys(accesoriosIngresadosTotales).length === 0;

        if (sinSalidos && sinIngresados) {
            contenedor.innerHTML = '<p class="text-gray-500 text-center py-6">No hay accesorios en este período</p>';
            return;
        }

        let html = '';
        if (!sinSalidos) {
            html += '<h4 class="text-sm font-bold text-red-600 mb-3">📦➡️ Accesorios Salidos (Ventas + Movimientos)</h4>';
            html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">';
            Object.entries(accesoriosTotales).forEach(([tipo, modelos]) => {
                const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
                html += `
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div class="font-bold text-gray-700 border-b pb-1 mb-2">${tipo} (${totalTipo})</div>
                        <div class="text-xs space-y-1.5 max-h-40 overflow-y-auto">
                `;
                Object.entries(modelos)
                    .sort(this.ordenarModelosPro)
                    .forEach(([modelo, cantidad]) => {
                        html += `
                            <div class="flex justify-between border-b border-gray-100 pb-0.5">
                                <span class="text-gray-600">${modelo}</span>
                                <span class="font-semibold text-gray-900">${cantidad}</span>
                            </div>
                        `;
                    });
                html += '</div></div>';
            });
            html += '</div>';
        }

        if (!sinIngresados) {
            html += '<h4 class="text-sm font-bold text-emerald-600 mb-3">📦⬅️ Accesorios Ingresados (Movimientos)</h4>';
            html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
            Object.entries(accesoriosIngresadosTotales).forEach(([tipo, modelos]) => {
                const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
                html += `
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div class="font-bold text-gray-700 border-b pb-1 mb-2">${tipo} (${totalTipo})</div>
                        <div class="text-xs space-y-1.5 max-h-40 overflow-y-auto">
                `;
                Object.entries(modelos)
                    .sort(this.ordenarModelosPro)
                    .forEach(([modelo, cantidad]) => {
                        html += `
                            <div class="flex justify-between border-b border-gray-100 pb-0.5">
                                <span class="text-gray-600">${modelo}</span>
                                <span class="font-semibold text-gray-900">${cantidad}</span>
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
        const contenedor = document.getElementById('contenedorRegistroAdmin');

        if (dias.length === 0) {
            contenedor.innerHTML = '<div class="text-center text-gray-500 py-12">No hay datos para mostrar en el período seleccionado</div>';
            return;
        }

        contenedor.innerHTML = dias.map(dia => this.crearTablaDia(dia)).join('');
    }

    crearTablaDia(dia) {
        const netoDia = dia.totalIngresos - dia.totalEgresos;
        const netoClase = netoDia >= 0 ? 'text-emerald-600' : 'text-red-600';

        return `
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
                    <div class="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <span>📅</span> ${dia.fecha}
                    </div>
                    <div class="flex items-center gap-6 text-sm font-semibold text-gray-600">
                        <span>Ventas: <b class="text-slate-900">$${dia.totalVentas.toFixed(2)}</b></span>
                        <span>Operaciones: <b class="text-slate-900">${dia.operaciones.length}</b></span>
                        <span>Neto: <b class="${netoClase}">$${netoDia.toFixed(2)}</b></span>
                    </div>
                </div>
                
                ${this.crearTablaAccesorios(dia)}
                
                <div class="overflow-x-auto rounded-xl border border-gray-200">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b">
                                <th class="py-3 px-4">Hora</th>
                                <th class="py-3 px-4">Sucursal</th>
                                <th class="py-3 px-4">Tipo</th>
                                <th class="py-3 px-4">Descripción</th>
                                <th class="py-3 px-4 text-right">Monto Total</th>
                                <th class="py-3 px-4 text-right">Impacto Caja</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-xs">
                            ${dia.operaciones.map(op => this.crearFilaOperacion(op)).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="bg-slate-50 font-bold text-slate-800 text-xs">
                                <td colspan="4" class="py-3 px-4 uppercase">TOTALES DEL DÍA</td>
                                <td class="py-3 px-4 text-right text-blue-600 font-extrabold">$${dia.totalVentas.toFixed(2)}</td>
                                <td class="py-3 px-4 text-right ${netoClase} font-extrabold">$${netoDia.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }

    crearTablaAccesorios(dia) {
        if (!dia.accesorios || Object.keys(dia.accesorios).length === 0) return '';

        let html = '<div class="p-4 bg-slate-50 rounded-xl border border-gray-100">';
        html += '<h5 class="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5"><span>🛡️</span> Accesorios Vendidos el Día</h5>';
        html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">';

        Object.entries(dia.accesorios).forEach(([tipo, modelos]) => {
            const totalTipo = Object.values(modelos).reduce((sum, cant) => sum + cant, 0);
            html += `
                <div class="bg-white rounded-lg p-2.5 border border-gray-200">
                    <div class="text-xs font-bold text-gray-700 border-b pb-0.5 mb-1.5">${tipo} (${totalTipo})</div>
                    <div class="text-[11px] space-y-1">
            `;
            Object.entries(modelos).forEach(([modelo, cantidad]) => {
                html += `
                    <div class="flex justify-between text-gray-600">
                        <span>${modelo}</span>
                        <span class="font-semibold">${cantidad}</span>
                    </div>
                `;
            });
            html += '</div></div>';
        });

        html += '</div></div>';
        return html;
    }

    crearFilaOperacion(operacion) {
        let tipoBadge = 'bg-slate-100 text-slate-800 border-slate-200';
        let tipoTexto = operacion.descripcion;

        if (operacion.tipo === 'venta') {
            if (operacion.detalles && operacion.detalles.tipoTransaccion === 'abono') {
                tipoTexto = '💰 Abono';
                tipoBadge = 'bg-amber-50 text-amber-800 border-amber-200';
            } else {
                tipoTexto = '💳 Venta';
                tipoBadge = 'bg-blue-50 text-blue-800 border-blue-200';
            }
        } else {
            const desc = operacion.descripcion.toLowerCase();
            if (desc.includes('salida') && desc.includes('efectivo')) {
                tipoTexto = '💸 Salida Efectivo';
                tipoBadge = 'bg-red-50 text-red-800 border-red-200';
            } else if (desc.includes('ingreso') && desc.includes('efectivo')) {
                tipoTexto = '💵 Ingreso Efectivo';
                tipoBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            } else if (desc.includes('salida') && desc.includes('equipo')) {
                tipoTexto = '📱➡️ Salida Equ.';
                tipoBadge = 'bg-orange-50 text-orange-800 border-orange-200';
            } else if (desc.includes('ingreso') && desc.includes('equipo')) {
                tipoTexto = '📱⬅️ Ingreso Equ.';
                tipoBadge = 'bg-teal-50 text-teal-800 border-teal-200';
            } else if (desc.includes('compra')) {
                tipoTexto = '📱⬅️ Compra Equ.';
                tipoBadge = 'bg-indigo-50 text-indigo-800 border-indigo-200';
            } else if (desc.includes('salida') && desc.includes('accesorio')) {
                tipoTexto = '🛡️➡️ Salida Acc.';
                tipoBadge = 'bg-rose-50 text-rose-800 border-rose-200';
            } else if (desc.includes('ingreso') && desc.includes('accesorio')) {
                tipoTexto = '🛡️⬅️ Ingreso Acc.';
                tipoBadge = 'bg-green-50 text-green-800 border-green-200';
            } else if (desc.includes('cambio')) {
                tipoTexto = '🔄 Garantía';
                tipoBadge = 'bg-violet-50 text-violet-800 border-violet-200';
            }
        }

        const montoClase = operacion.efectivo > 0 ? 'text-emerald-600 font-semibold' :
            operacion.efectivo < 0 ? 'text-red-600 font-semibold' : 'text-gray-500';

        const efectivoTexto = operacion.efectivo !== 0 ?
            `${operacion.efectivo > 0 ? '+' : ''}$${Math.abs(operacion.efectivo).toFixed(2)}` :
            '-';

        let detallesExtra = '';
        if (operacion.tipo === 'movimiento' && operacion.detalles) {
            try {
                const detalles = operacion.detalles.obtenerDetalles();
                if (detalles && detalles !== 'Sin detalles') {
                    detallesExtra = `<br><small class="text-gray-400 text-[10px]">${detalles}</small>`;
                }
            } catch (e) { }
        }

        const descripcionTexto = operacion.tipo === 'venta'
            ? operacion.descripcion
            : `<strong>${operacion.descripcion}</strong>${detallesExtra}`;

        // Color identificador por sede
        const sedeColores = {
            'Tienda Principal': 'bg-blue-600',
            'Sucursal Norte': 'bg-indigo-600',
            'Sucursal Centro': 'bg-purple-600',
            'Sucursal Sur': 'bg-orange-600',
            'Sucursal Oeste': 'bg-teal-600',
            'Sucursal Este': 'bg-pink-600'
        };
        const colorClase = sedeColores[operacion.sedeNombre] || 'bg-slate-600';
        const sedeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold text-white ${colorClase}">${operacion.sedeNombre}</span>`;

        return `
            <tr class="hover:bg-slate-50 transition border-b border-gray-100">
                <td class="py-3 px-4 text-gray-500 font-medium">${operacion.hora}</td>
                <td class="py-3 px-4">${sedeBadge}</td>
                <td class="py-3 px-4"><span class="px-2 py-1 rounded-md text-[10px] font-bold border ${tipoBadge}">${tipoTexto}</span></td>
                <td class="py-3 px-4 text-gray-700">${descripcionTexto}</td>
                <td class="py-3 px-4 text-right font-medium text-slate-800">$${operacion.monto.toFixed(2)}</td>
                <td class="py-3 px-4 text-right ${montoClase}">${efectivoTexto}</td>
            </tr>
        `;
    }

    actualizarGraficos(dias) {
        // 1. Agrupar Ventas por Sede
        const ventasPorSede = {};
        adminService.sedes.forEach(s => {
            ventasPorSede[adminService.sedeNombres[s] || s] = 0;
        });

        // 2. Agrupar Ventas por Forma de Pago
        const metodosPago = {
            'Efectivo': 0,
            'Zelle': 0,
            'Binance': 0,
            'Pago Móvil': 0,
            'Transferencia': 0,
            'Paypal': 0//,
            //'Mixto': 0 
        };

        dias.forEach(d => {
            d.operaciones.forEach(op => {
                if (op.tipo === 'venta' && op.detalles.tipoTransaccion !== 'abono') {
                    const sede = op.sedeNombre || 'Desconocida';
                    ventasPorSede[sede] = (ventasPorSede[sede] || 0) + op.monto;

                    const venta = op.detalles;
                    const fp = venta.formaPago;
                    
                    // 1. Extraer Equipo Recibido y Abonos Previos
                    const equipoRecibidoValor = venta.equipoRecibido ? venta.equipoRecibido.valor : 0;
                    const abonosPreviosValor = venta.totalAbonosPrevios || 0;
                    
                    if (equipoRecibidoValor > 0) metodosPago['Equipo Recibido'] = (metodosPago['Equipo Recibido'] || 0) + equipoRecibidoValor;
                    if (abonosPreviosValor > 0) metodosPago['Abonos Previos'] = (metodosPago['Abonos Previos'] || 0) + abonosPreviosValor;

                    // 2. Extraer montos pagados por métodos físicos/digitales
                    let totalPagadoDigitalFisico = 0;

                    if (fp === 'mixto' && venta.pagoMixto) {
                        const pm = venta.pagoMixto;
                        if (pm.efectivo > 0) { metodosPago['Efectivo'] += pm.efectivo; totalPagadoDigitalFisico += pm.efectivo; }
                        if (pm.zelle > 0) { metodosPago['Zelle'] += pm.zelle; totalPagadoDigitalFisico += pm.zelle; }
                        if (pm.binance > 0) { metodosPago['Binance'] += pm.binance; totalPagadoDigitalFisico += pm.binance; }
                        if (pm.pagoMovil > 0) {
                            const pmDolares = venta.pagoMovilDetalles ? venta.pagoMovilDetalles.dolares : pm.pagoMovil;
                            metodosPago['Pago Móvil'] += pmDolares;
                            totalPagadoDigitalFisico += pmDolares;
                        }
                        if (pm.transferencia > 0) {
                            const trDolares = venta.transferenciaDetalles ? venta.transferenciaDetalles.dolares : pm.transferencia;
                            metodosPago['Transferencia'] += trDolares;
                            totalPagadoDigitalFisico += trDolares;
                        }
                    } else if (fp === 'pagomovil') {
                        const montoPM = venta.pagoMovilDetalles ? venta.pagoMovilDetalles.dolares : (venta.montoPago !== null ? venta.montoPago : op.monto - equipoRecibidoValor - abonosPreviosValor);
                        metodosPago['Pago Móvil'] += montoPM;
                        totalPagadoDigitalFisico += montoPM;
                    } else if (fp === 'transferencia') {
                        const montoTR = venta.transferenciaDetalles ? venta.transferenciaDetalles.dolares : (venta.montoPago !== null ? venta.montoPago : op.monto - equipoRecibidoValor - abonosPreviosValor);
                        metodosPago['Transferencia'] += montoTR;
                        totalPagadoDigitalFisico += montoTR;
                    } else {
                        // Pagos simples (Efectivo, Zelle, Binance, Paypal)
                        let pagoReal = 0;
                        if (venta.montoPago !== null && venta.montoPago !== undefined) {
                            pagoReal = venta.montoPago;
                        } else {
                            pagoReal = op.monto - equipoRecibidoValor - abonosPreviosValor;
                        }
                        
                        if (fp === 'efectivo') metodosPago['Efectivo'] += pagoReal;
                        else if (fp === 'zelle') metodosPago['Zelle'] += pagoReal;
                        else if (fp === 'binance') metodosPago['Binance'] += pagoReal;
                        else if (fp === 'paypal') metodosPago['Paypal'] += pagoReal;
                        
                        totalPagadoDigitalFisico += pagoReal;
                    }

                    // 3. Extraer deuda (WEPPA)
                    if (venta.weppa) {
                        const totalPagado = equipoRecibidoValor + abonosPreviosValor + totalPagadoDigitalFisico;
                        const porCobrar = op.monto - totalPagado;
                        if (porCobrar > 0) {
                            metodosPago['Por Cobrar (WEPPA)'] = (metodosPago['Por Cobrar (WEPPA)'] || 0) + porCobrar;
                        }
                    }
                }
            });
        });

        // Destruir gráficos anteriores si existen para evitar solapamiento visual
        if (this.charts.ventasSede) this.charts.ventasSede.destroy();
        if (this.charts.metodosPago) this.charts.metodosPago.destroy();

        // 3. Crear Gráfico Ventas por Sucursal
        const ctxSede = document.getElementById('chartVentasSede').getContext('2d');
        this.charts.ventasSede = new Chart(ctxSede, {
            type: 'bar',
            data: {
                labels: Object.keys(ventasPorSede),
                datasets: [{
                    label: 'Ventas Totales ($)',
                    data: Object.values(ventasPorSede),
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(79, 70, 229, 0.8)',
                        'rgba(147, 51, 234, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(20, 184, 166, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // 4. Crear Gráfico Distribución Métodos de Pago
        const ctxPago = document.getElementById('chartMetodosPago').getContext('2d');
        this.charts.metodosPago = new Chart(ctxPago, {
            type: 'doughnut',
            data: {
                labels: Object.keys(metodosPago),
                datasets: [{
                    data: Object.values(metodosPago),
                    backgroundColor: [
                        '#10B981', // Efectivo
                        '#3B82F6', // Zelle
                        '#F59E0B', // Binance
                        '#8B5CF6', // Pago Móvil
                        '#6366F1', // Transferencia
                        '#EC4899', // Paypal
                        '#059669', // Equipo Recibido (verde oscuro)
                        '#4F46E5', // Abonos Previos (indigo oscuro)
                        '#EF4444'  // Por Cobrar WEPPA (rojo)
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, font: { size: 11 } }
                    }
                }
            }
        });
    }

    parsearFecha(fechaStr) {
        const partes = fechaStr.split('/');
        return new Date(partes[2], partes[1] - 1, partes[0]);
    }

    configurarEventos() {
        document.getElementById('selectorSedeAdmin').addEventListener('change', () => {
            this.cargarDatos();
            this.procesarDatos();
            this.renderizar();
        });

        document.getElementById('filtroPeriodoAdmin').addEventListener('change', (e) => {
            document.getElementById('filtroDesdeAdmin').value = '';
            document.getElementById('filtroHastaAdmin').value = '';
            const div = document.getElementById('diasPersonalizadoDivAdmin');
            if (e.target.value === 'personalizado') {
                div.classList.remove('hidden');
                document.getElementById('diasPersonalizadoAdmin').value = '';
                document.getElementById('diasPersonalizadoAdmin').focus();
            } else {
                div.classList.add('hidden');
                this.renderizar();
            }
        });

        document.getElementById('diasPersonalizadoAdmin').addEventListener('input', () => {
            this.renderizar();
        });

        document.getElementById('filtroDesdeAdmin').addEventListener('change', () => {
            this.renderizar();
        });
        document.getElementById('filtroHastaAdmin').addEventListener('change', () => {
            this.renderizar();
        });

        document.getElementById('btnExportarAdmin').addEventListener('click', () => {
            this.exportarDatos();
        });

        document.getElementById('btnLogoutAdmin').addEventListener('click', () => {
            authService.logout().then(() => {
                window.location.replace('login.html');
            });
        });
    }

    exportarDatos() {
        const datos = Array.from(this.registroPorDia.values());
        const json = JSON.stringify(datos, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-registro-diario-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    calcularPesoModelo(nombre) {
        const match = nombre.match(/\d+/);
        const numero = match ? parseInt(match[0]) : 0;
        if (numero === 0) return { numero: 999, jerarquia: 0 };
        const sufijo = nombre.toLowerCase();
        let jerarquia = 1;
        if (sufijo.includes('pro max')) jerarquia = 4;
        else if (sufijo.includes('pro')) jerarquia = 3;
        else if (sufijo.includes('plus')) jerarquia = 2;
        else if (sufijo.includes('mini')) jerarquia = 0;
        return { numero, jerarquia };
    }

    ordenarModelosPro = (a, b) => {
        const pesoA = this.calcularPesoModelo(a[0]);
        const pesoB = this.calcularPesoModelo(b[0]);
        if (pesoA.numero !== pesoB.numero) return pesoA.numero - pesoB.numero;
        if (pesoA.jerarquia !== pesoB.jerarquia) return pesoA.jerarquia - pesoB.jerarquia;
        return a[0].localeCompare(b[0]);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    authService.onAuthChange((user) => {
        if (!user) {
            window.location.replace('login.html');
        } else {
            const rol = localStorage.getItem('usuario_rol');
            if (rol !== 'admin') {
                window.location.replace('index.html');
            } else {
                if (!window.adminDashboardApp) {
                    window.adminDashboardApp = new AdminDashboard();
                }
            }
        }
    });
});
