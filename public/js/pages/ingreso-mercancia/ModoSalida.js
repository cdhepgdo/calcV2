export function initModoSalida({
    inventarioService,
    movimientoService,
    showToast,
    setLoading,
    onInventarioCargado
}) {
    let equiposSeleccionadosSalida = [];

    function buscarEquiposSalida(query) {
        if (!onInventarioCargado()) return [];
        let disponibles = inventarioService.obtenerDisponibles();
        
        const filtroFecha = document.getElementById('salidaFiltroFecha')?.value || 'todos';
        if (filtroFecha !== 'todos') {
            const ahora = new Date();
            let diasAtras;
            
            if (filtroFecha === 'personalizado') {
                diasAtras = parseInt(document.getElementById('diasPersonalizados')?.value || '0');
                if (diasAtras <= 0) {
                    diasAtras = 30;
                }
            } else {
                diasAtras = filtroFecha === 'ultimos7' ? 7 : filtroFecha === 'ultimos30' ? 30 : 90;
            }
            
            const fechaLimite = new Date(ahora.setDate(ahora.getDate() - diasAtras));
            
            disponibles = disponibles.filter(eq => {
                const fechaIngreso = eq.fechaIngreso ? new Date(eq.fechaIngreso) : null;
                return fechaIngreso && fechaIngreso >= fechaLimite;
            });
        }
        
        if (query) {
            const q = query.toLowerCase();
            disponibles = disponibles.filter(eq => {
                return eq.modelo.toLowerCase().includes(q) ||
                    eq.color.toLowerCase().includes(q) ||
                    eq.imei.includes(q) ||
                    eq.gb.toLowerCase().includes(q);
            });
        }
        
        return disponibles.slice(0, 20);
    }

    function actualizarListaSugerenciasSalida() {
        const query = document.getElementById('salidaBuscadorInput').value.trim();
        const sugerencias = document.getElementById('salidaSugerencias');
        const equipos = buscarEquiposSalida(query);

        if (equipos.length === 0) {
            sugerencias.innerHTML = '<p class="text-slate-500 text-xs text-center italic py-4">No se encontraron equipos disponibles</p>';
            return;
        }

        sugerencias.innerHTML = equipos.map(eq => {
            const yaSeleccionado = equiposSeleccionadosSalida.includes(eq.id);
            return `
                <div class="equipo-sugerencia ${yaSeleccionado ? 'opacity-40 cursor-not-allowed' : ''}" 
                     data-equipo-id="${eq.id}" 
                     ${yaSeleccionado ? '' : `onclick="agregarEquipoSalida('${eq.id}')"`}>
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <p class="text-white text-xs font-bold truncate">${eq.modelo} ${eq.gb} — ${eq.color}</p>
                            <p class="text-slate-400 text-xs font-mono mt-0.5">${eq.imei}</p>
                            <p class="text-slate-500 text-xs mt-0.5">Bat: ${eq.bateria}%</p>
                        </div>
                        ${yaSeleccionado ? 
                            '<span class="text-yellow-400 text-xs shrink-0">✓ Seleccionado</span>' : 
                            '<span class="text-indigo-300 text-xs shrink-0">+ Agregar</span>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    function actualizarListaSeleccionadosSalida() {
        const lista = document.getElementById('listaSalidaSeleccionados');
        const listaResumen = document.getElementById('listaResumenSalida');
        const totalResumen = document.getElementById('totalEquiposSalidaResumen');
        
        if (equiposSeleccionadosSalida.length === 0) {
            lista.innerHTML = '<p class="text-slate-500 text-xs text-center italic py-4">Sin equipos seleccionados</p>';
            listaResumen.innerHTML = '<p class="text-slate-500 text-xs text-center italic">Sin equipos seleccionados...</p>';
            totalResumen.textContent = '0';
            return;
        }

        const equipos = equiposSeleccionadosSalida.map(id => {
            return inventarioService.obtenerDisponibles().find(e => e.id === id);
        }).filter(Boolean);

        totalResumen.textContent = equipos.length;

        lista.innerHTML = equipos.map((eq, idx) => `
            <div class="equipo-seleccionado">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-slate-500 text-xs font-mono">${idx + 1}</span>
                            <p class="text-white text-sm font-bold truncate">${eq.modelo} ${eq.gb} — ${eq.color}</p>
                        </div>
                        <p class="text-slate-400 text-xs font-mono">IMEI: ${eq.imei}</p>
                        <p class="text-slate-500 text-xs mt-1">Bat: ${eq.bateria}% ${eq.detalles ? `| ${eq.detalles}` : ''}</p>
                    </div>
                    <button onclick="quitarEquipoSalida('${eq.id}')" 
                            class="text-red-400 hover:text-red-300 text-lg leading-none transition shrink-0" 
                            title="Quitar">✕</button>
                </div>
            </div>
        `).join('');

        const modelos = {};
        equipos.forEach(eq => {
            const key = `${eq.modelo} ${eq.gb}`;
            modelos[key] = (modelos[key] || 0) + 1;
        });

        listaResumen.innerHTML = Object.entries(modelos).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
            `<div class="flex justify-between items-center text-xs">
                <span class="text-slate-300 truncate">${k}</span>
                <span class="text-red-300 font-bold ml-2 shrink-0">×${v}</span>
            </div>`
        ).join('');
    }

    // Exponer globalmente
    window.agregarEquipoSalida = function(equipoId) {
        if (equiposSeleccionadosSalida.includes(equipoId)) return;
        const equipo = inventarioService.obtenerDisponibles().find(e => e.id === equipoId);
        if (!equipo) return;

        equiposSeleccionadosSalida.push(equipoId);
        actualizarListaSeleccionadosSalida();
        actualizarListaSugerenciasSalida();
    };

    window.quitarEquipoSalida = function(equipoId) {
        equiposSeleccionadosSalida = equiposSeleccionadosSalida.filter(id => id !== equipoId);
        actualizarListaSeleccionadosSalida();
        actualizarListaSugerenciasSalida();
    };

    // Listeners
    document.getElementById('salidaBuscadorInput')?.addEventListener('input', () => {
        actualizarListaSugerenciasSalida();
    });

    document.getElementById('salidaFiltroFecha')?.addEventListener('change', (e) => {
        const diasContainer = document.getElementById('diasPersonalizadosContainer');
        if (e.target.value === 'personalizado') {
            diasContainer?.classList.remove('hidden');
        } else {
            diasContainer?.classList.add('hidden');
            actualizarListaSugerenciasSalida();
        }
    });

    document.getElementById('diasPersonalizados')?.addEventListener('input', () => {
        if (document.getElementById('salidaFiltroFecha')?.value === 'personalizado') {
            actualizarListaSugerenciasSalida();
        }
    });

    document.getElementById('btnConfirmarSalida')?.addEventListener('click', async () => {
        if (equiposSeleccionadosSalida.length === 0) {
            showToast('⚠️ Selecciona al menos un equipo', 'error');
            return;
        }

        const destino = document.getElementById('salidaDestino').value.trim();
        const responsable = document.getElementById('salidaResponsable').value.trim();

        if (!destino || !responsable) {
            showToast('⚠️ Completa el destino y responsable del traslado', 'error');
            return;
        }

        if (!confirm(`¿Confirmar salida de ${equiposSeleccionadosSalida.length} equipos?`)) return;

        setLoading(true);
        const notas = document.getElementById('salidaNotas').value.trim();
        const registrarMovimiento = document.getElementById('chkRegistrarMovimientoSalida').checked;

        try {
            const equipos = equiposSeleccionadosSalida.map(id => 
                inventarioService.obtenerDisponibles().find(e => e.id === id)
            ).filter(Boolean);

            const res = await inventarioService.procesarSalidaLote(equiposSeleccionadosSalida, 'transferido', {
                destino,
                responsable,
                notasTraslado: notas,
                fechaTransferencia: new Date().toISOString(),
                sedeOrigen: localStorage.getItem('usuario_sede_id') || 'sede_1'
            });
            if (!res.exito) throw new Error(res.error);

            if (registrarMovimiento) {
                for (const equipo of equipos) {
                    await movimientoService.crearMovimiento({
                        tipo: 'Salida Equipo',
                        datos: {
                            modelo: equipo.modelo,
                            capacidad: equipo.gb,
                            color: equipo.color,
                            imei: equipo.imei,
                            destino: destino,
                            persona: responsable,
                            bateria: equipo.bateria,
                            notas: notas
                        }
                    });
                }
            }

            showToast(`✅ ${equiposSeleccionadosSalida.length} equipos marcados como salida`, 'success');
            
            equiposSeleccionadosSalida = [];
            actualizarListaSeleccionadosSalida();
            document.getElementById('salidaDestino').value = '';
            document.getElementById('salidaResponsable').value = '';
            document.getElementById('salidaNotas').value = '';
            document.getElementById('salidaBuscadorInput').value = '';
            
            actualizarListaSugerenciasSalida();
        } catch (error) {
            console.error('Error en salida:', error);
            showToast('❌ Error al procesar la salida', 'error');
        } finally {
            setLoading(false);
        }
    });

    return {
        actualizarListaSugerenciasSalida,
        getEquiposSeleccionados: () => equiposSeleccionadosSalida
    };
}
