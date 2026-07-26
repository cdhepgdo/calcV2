/**
 * ModoConsulta — Pestaña de consulta y edición de inventario multi-sede
 *
 * Muestra una tabla con los equipos de TODAS las sedes, permite filtrar y,
 * si el usuario es admin, editar inline estado / batería / detalles y
 * trasladar entre sedes. Para empleados: solo lectura.
 *
 * Patrón: misma forma que initModoIngreso / initModoSalida
 *   initModoConsulta({ servicios, deps, callbacks }) → { recargar, setFiltros, esModoConsultaActivo }
 *
 * Dependencias inyectadas (no se acopla a módulos concretos):
 *   - consultaInventarioService: lectura multi-sede
 *   - inventarioService:         escritura (actualizar/trasladar)
 *   - authService:               para authService.esAdmin()
 *   - showToast, setLoading:     ya usados por Ingreso/Salida
 *
 * Filtros (filtros state local):
 *   sedeId | 'todos', estado, modelo, gb, color, imei (prefijo),
 *   fechaDesde, fechaHasta, incluirEliminados
 *
 * Paginación: 50 filas por página, server-free (en memoria).
 *
 * Edición inline admin-only:
 *   - Doble-click en celdas editables → input/select
 *   - Enter / blur → guardar via actualizarEquipoEnSede
 *   - Escape → cancelar
 *
 * Traslado admin-only:
 *   - Botón 🔀 en columna Acciones → modal con select de sede destino + motivo
 *   - Confirmar → inventarioService.trasladarEquipo (writeBatch atómico)
 */

import { MODELOS_CORTOS, COLORES_IPHONE, CAPACIDADES_IPHONE, ESTADOS_EQUIPO } from '../../config/constants.js';

const FILAS_POR_PAGINA = 50;

export function initModoConsulta({
    consultaInventarioService,
    inventarioService,
    authService,
    showToast,
    setLoading,
    SEDES,
    SEDES_NOMBRES,
    onInventarioCargado
}) {
    const seccion = document.getElementById('seccionConsulta');
    if (!seccion) {
        console.error('[ModoConsulta] No se encontró #seccionConsulta en el DOM');
        return { recargar: () => {}, setFiltros: () => {}, esModoConsultaActivo: () => false };
    }

    const esAdmin = () => authService?.esAdmin() === true;

    // ── Estado de filtros (se inicializa desde los inputs al primer render) ──
    const filtros = {
        sedeId: 'todos',
        estado: '',
        modelo: '',
        gb: '',
        color: '',
        imei: '',
        fechaDesde: '',
        fechaHasta: '',
        incluirEliminados: false
    };

    let paginaActual = 1;
    let cacheEquipos = [];           // último resultado de obtenerTodos()
    let modalTrasladoAbierto = null; // { equipo, resolver }

    // ── Estado de ordenamiento ──
    let ordenColumna = 'fecha';
    let ordenAscendente = false;

    // ── Helpers ──
    function formatFechaCorta(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
        } catch {
            return '—';
        }
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>'"]/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[c] || c));
    }

    // ── Pintar barra de progreso de carga ──
    function renderProgreso() {
        const progreso = consultaInventarioService.getProgresoCarga();
        const el = document.getElementById('consultaProgresoCarga');
        if (!el) return;
        if (progreso.completo) {
            el.textContent = '';
            el.style.display = 'none';
        } else {
            el.textContent = `Sincronizando sedes: ${progreso.sedesListas.length}/${progreso.totalSedes}…`;
            el.style.display = 'block';
        }
    }

    // ── Estado vacío / cargando ──
    function renderCargando() {
        return `
            <div class="consulta-cargando">
                <div class="consulta-cargando-spinner"></div>
                <p>Cargando inventario consolidado…</p>
                <p id="consultaProgresoCarga" class="consulta-progreso"></p>
            </div>
        `;
    }

    function renderVacio() {
        return `
            <div class="consulta-cargando">
                <p>📭 Sin equipos para los filtros aplicados</p>
            </div>
        `;
    }

    // ── Render principal ──
    function renderTabla() {
        const tbody = document.getElementById('consultaTablaBody');
        const paginador = document.getElementById('consultaPaginador');
        const totalEl = document.getElementById('consultaTotalEquipos');
        if (!tbody) return;

        // Recalcular filtros desde inputs (por si cambiaron)
        leerFiltrosDeInputs();

        // Si el servicio no ha cargado NADA todavía, mostrar spinner
        const progreso = consultaInventarioService.getProgresoCarga();
        if (progreso.sedesListas.size === 0) {
            tbody.innerHTML = `<tr><td colspan="11">${renderCargando()}</td></tr>`;
            if (paginador) paginador.innerHTML = '';
            if (totalEl) totalEl.textContent = '0';
            return;
        }

        // Consultar
        cacheEquipos = consultaInventarioService.obtenerTodos(filtros);

        if (cacheEquipos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11">${renderVacio()}</td></tr>`;
            if (paginador) paginador.innerHTML = '';
            if (totalEl) totalEl.textContent = '0';
            return;
        }

        // ── Ordenamiento ──
        cacheEquipos.sort((a, b) => {
            let valA, valB;
            switch (ordenColumna) {
                case 'fecha':
                    valA = new Date(a.createdAt || 0).getTime();
                    valB = new Date(b.createdAt || 0).getTime();
                    break;
                case 'modelo':
                    valA = (a.modelo || '').toLowerCase();
                    valB = (b.modelo || '').toLowerCase();
                    break;
                case 'gb':
                    valA = parseInt(a.gb) || 0;
                    valB = parseInt(b.gb) || 0;
                    break;
                case 'bateria':
                    valA = parseInt(a.bateria) || 0;
                    valB = parseInt(b.bateria) || 0;
                    break;
                default:
                    return 0;
            }
            if (valA < valB) return ordenAscendente ? -1 : 1;
            if (valA > valB) return ordenAscendente ? 1 : -1;
            return 0;
        });

        // Paginación
        const totalPaginas = Math.ceil(cacheEquipos.length / FILAS_POR_PAGINA);
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;
        if (paginaActual < 1) paginaActual = 1;
        const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
        const fin = inicio + FILAS_POR_PAGINA;
        const pagina = cacheEquipos.slice(inicio, fin);

        tbody.innerHTML = pagina.map((eq, idx) => renderFila(eq, inicio + idx + 1)).join('');

        if (totalEl) totalEl.textContent = cacheEquipos.length;
        if (paginador) paginador.innerHTML = renderPaginador(totalPaginas);
        renderProgreso();
    }

    // ── Render de una fila ──
    function renderFila(eq, numero) {
        const editable = esAdmin() ? 'consulta-celda-editable' : '';
        const attrs = esAdmin() ? 'title="Doble click para editar"' : '';

        const sedeNombre = eq._sedeNombre || SEDES_NOMBRES[eq.creadoPor] || eq.creadoPor;
        const sedeDesconocida = !SEDES_NOMBRES[eq.creadoPor] && !eq._sedeNombre;
        const sedeClass = sedeDesconocida ? 'consulta-sede-badge consulta-sede-badge--desconocida' : 'consulta-sede-badge';
        const sedeHTML = `<span class="${sedeClass}">📍 ${escapeHTML(sedeNombre)}</span>`;

        const estadoClass = `consulta-chip-estado consulta-chip-estado--${eq.estado || 'disponible'}`;
        const estadoHTML = `<span class="${estadoClass}" ${esAdmin() ? `data-editar-estado="${eq.id}" data-sede="${eq._sedeId}"` : ''}>${escapeHTML(eq.estado || '—')}</span>`;

        const detallesHTML = eq.detalles
            ? escapeHTML(eq.detalles)
            : '<span class="texto-vacio">—</span>';

        const bateriaHTML = `${eq.bateria ?? 0}%`;

        const accionesHTML = esAdmin()
            ? `<button class="consulta-btn-accion" data-trasladar="${eq.id}" data-sede="${eq._sedeId}" title="Trasladar a otra sede">🔀 Trasladar</button>`
            : '<span class="texto-vacio text-xs">—</span>';

        return `
            <tr class="consulta-fila" data-equipo-id="${escapeHTML(eq.id)}" data-sede="${escapeHTML(eq._sedeId || '')}">
                <td class="text-xs text-themed-muted font-mono">${numero}</td>
                <td class="text-xs">${formatFechaCorta(eq.fechaIngreso)}</td>
                <td>${sedeHTML}</td>
                <td>${escapeHTML(eq.modelo)}</td>
                <td>${escapeHTML(eq.gb)}</td>
                <td>${escapeHTML(eq.color)}</td>
                <td ${esAdmin() ? `data-editar-bateria="${eq.id}" data-sede="${eq._sedeId}"` : ''} class="${editable}" ${attrs}>${bateriaHTML}</td>
                <td class="font-mono text-xs">${escapeHTML(eq.imei)}</td>
                <td>${estadoHTML}</td>
                <td class="text-xs ${editable}" ${esAdmin() ? `data-editar-detalles="${eq.id}" data-sede="${eq._sedeId}"` : ''} ${attrs} title="${escapeHTML(eq.detalles || '')}">${detallesHTML}</td>
                <td>${accionesHTML}</td>
            </tr>
        `;
    }

    // ── Paginador ──
    function renderPaginador(totalPaginas) {
        if (totalPaginas <= 1) {
            return '';
        }

        const botones = [];
        const maxVisibles = 5;
        let inicio = Math.max(1, paginaActual - Math.floor(maxVisibles / 2));
        let fin = Math.min(totalPaginas, inicio + maxVisibles - 1);
        if (fin - inicio < maxVisibles - 1) {
            inicio = Math.max(1, fin - maxVisibles + 1);
        }

        botones.push(`<button ${paginaActual === 1 ? 'disabled' : ''} data-pagina="prev">← Anterior</button>`);
        if (inicio > 1) {
            botones.push(`<button data-pagina="1">1</button>`);
            if (inicio > 2) botones.push(`<span class="consulta-paginador-info">…</span>`);
        }
        for (let i = inicio; i <= fin; i++) {
            botones.push(`<button class="${i === paginaActual ? 'activo' : ''}" data-pagina="${i}">${i}</button>`);
        }
        if (fin < totalPaginas) {
            if (fin < totalPaginas - 1) botones.push(`<span class="consulta-paginador-info">…</span>`);
            botones.push(`<button data-pagina="${totalPaginas}">${totalPaginas}</button>`);
        }
        botones.push(`<button ${paginaActual === totalPaginas ? 'disabled' : ''} data-pagina="next">Siguiente →</button>`);

        return botones.join('');
    }

    // ── Lectura de filtros desde los inputs ──
    function leerFiltrosDeInputs() {
        filtros.sedeId = document.getElementById('consultaFiltroSede')?.value || 'todos';
        filtros.estado = document.getElementById('consultaFiltroEstado')?.value || '';
        filtros.modelo = document.getElementById('consultaFiltroModelo')?.value.trim() || '';
        filtros.gb = document.getElementById('consultaFiltroGb')?.value || '';
        filtros.color = document.getElementById('consultaFiltroColor')?.value || '';
        filtros.imei = document.getElementById('consultaFiltroImei')?.value.trim() || '';
        filtros.fechaDesde = document.getElementById('consultaFiltroFechaDesde')?.value || '';
        filtros.fechaHasta = document.getElementById('consultaFiltroFechaHasta')?.value || '';
        filtros.incluirEliminados = document.getElementById('consultaFiltroIncluirEliminados')?.checked || false;
    }

    // ── Llenar selects de filtro con las constantes ──
    function popularFiltros() {
        const selSede = document.getElementById('consultaFiltroSede');
        if (selSede) {
            selSede.innerHTML = '<option value="todos">🌍 Todas las sedes</option>' +
                SEDES.map(s => `<option value="${s}">${escapeHTML(SEDES_NOMBRES[s] || s)}</option>`).join('');
        }

        const selEstado = document.getElementById('consultaFiltroEstado');
        if (selEstado) {
            selEstado.innerHTML = '<option value="">Todos los estados</option>' +
                '<option value="en-tienda">En Tienda (Disp+Abon+Defect)</option>' +
                ESTADOS_EQUIPO.map(e => `<option value="${e}">${e}</option>`).join('');
        }

        const selGb = document.getElementById('consultaFiltroGb');
        if (selGb) {
            selGb.innerHTML = '<option value="">Todas las capacidades</option>' +
                CAPACIDADES_IPHONE.map(g => `<option value="${g.valor}">${g.valor}</option>`).join('');
        }

        const selColor = document.getElementById('consultaFiltroColor');
        if (selColor) {
            selColor.innerHTML = '<option value="">Todos los colores</option>' +
                COLORES_IPHONE.map(c => `<option value="${c.valor}">${escapeHTML(c.etiqueta)}</option>`).join('');
        }

        // Datalist de modelos
        const dlModelos = document.getElementById('consultaListaModelos');
        if (dlModelos) {
            dlModelos.innerHTML = MODELOS_CORTOS.map(m => `<option value="${m}">`).join('');
        }
    }

    // ── Edición inline: helpers ──
    function activarInputEnCelda(td, valorInicial, onCommit, onCancel, opciones = {}) {
        const valor = valorInicial ?? td.textContent.trim();
        const tr = td.closest('tr');
        if (!tr) return;
        tr.classList.add('consulta-fila-editando');

        const input = document.createElement('input');
        input.type = opciones.type || 'text';
        input.className = 'consulta-input-inline';
        input.value = opciones.tipo === 'select' ? valor : valor;
        if (opciones.placeholder) input.placeholder = opciones.placeholder;
        if (opciones.min !== undefined) input.min = opciones.min;
        if (opciones.max !== undefined) input.max = opciones.max;
        if (opciones.tipo === 'numero') {
            input.type = 'number';
            input.value = valorInicial ?? td.textContent.replace('%', '').trim();
        }

        const original = td.innerHTML;
        td.innerHTML = '';
        td.appendChild(input);
        input.focus();
        if (input.select) input.select();

        let cerrado = false;
        async function cerrar(commit) {
            if (cerrado) return;
            cerrado = true;
            tr.classList.remove('consulta-fila-editando');
            if (commit) {
                // FIX C1: onCommit es async (devuelve Promise). La comparación
                // `resultado === false` fallaba siempre porque la Promise no es `false`.
                // Resolvemos la Promise y comparamos: si devuelve `false` o lanza,
                // restauramos el contenido original de la celda.
                let ok;
                try {
                    ok = await Promise.resolve(onCommit(input.value));
                } catch (e) {
                    ok = false;
                }
                if (ok === false) {
                    // Falló la validación o el commit — restaurar contenido original
                    td.innerHTML = original;
                } else {
                    // Éxito: restaurar el HTML viejo y dejar que el re-render (por
                    // snapshot de Firestore) pinte el valor nuevo. Evita el flash
                    // de celda vacía durante los 100-500ms que tarda el snapshot.
                    td.innerHTML = original;
                }
            } else {
                td.innerHTML = original;
                if (onCancel) onCancel();
            }
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                cerrar(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cerrar(false);
            }
        });
        input.addEventListener('blur', () => cerrar(true));
    }

    function activarSelectEnCelda(td, valorActual, opciones, onChange) {
        const tr = td.closest('tr');
        if (!tr) return;
        tr.classList.add('consulta-fila-editando');

        const select = document.createElement('select');
        select.className = 'consulta-input-inline';
        opciones.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (opt === valorActual) o.selected = true;
            select.appendChild(o);
        });

        td.innerHTML = '';
        td.appendChild(select);
        select.focus();

        let cerrado = false;
        async function cerrar(commit) {
            if (cerrado) return;
            cerrado = true;
            tr.classList.remove('consulta-fila-editando');
            if (commit) {
                // FIX C1: onChange es async — esperar el resultado de forma segura
                try {
                    await Promise.resolve(onChange(select.value));
                } catch (e) {
                    console.error('[ModoConsulta] Error en onChange:', e);
                }
            }
        }

        select.addEventListener('change', () => cerrar(true));
        select.addEventListener('blur', () => cerrar(true));
        select.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cerrar(false);
            }
        });
    }

    // ── Handlers de edición ──
    async function editarBateria(equipoId, sedeId, td) {
        const eq = cacheEquipos.find(e => e.id === equipoId);
        if (!eq) return;
        const valorOriginal = eq.bateria;

        activarInputEnCelda(
            td,
            valorOriginal,
            async (nuevoValor) => {
                const n = parseInt(nuevoValor);
                if (isNaN(n) || n < 0 || n > 100) {
                    showToast('⚠️ Batería debe ser 0-100', 'error');
                    return false;
                }
                if (n === valorOriginal) return true; // sin cambios

                setLoading(true);
                const r = await inventarioService.actualizarEquipoEnSede(sedeId, equipoId, { bateria: n });
                setLoading(false);

                if (r.exito) {
                    showToast('✅ Batería actualizada', 'success');
                    return true; // el re-render pintará el valor nuevo
                } else {
                    showToast(`❌ ${r.error}`, 'error');
                    return false; // restaurar
                }
            },
            null,
            { type: 'number', min: 0, max: 100, tipo: 'numero' }
        );
    }

    async function editarDetalles(equipoId, sedeId, td) {
        const eq = cacheEquipos.find(e => e.id === equipoId);
        if (!eq) return;
        const valorOriginal = eq.detalles || '';

        activarInputEnCelda(
            td,
            valorOriginal,
            async (nuevoValor) => {
                const nuevo = nuevoValor.trim();
                if (nuevo === valorOriginal) return true;

                setLoading(true);
                const r = await inventarioService.actualizarEquipoEnSede(sedeId, equipoId, { detalles: nuevo });
                setLoading(false);

                if (r.exito) {
                    showToast('✅ Detalles actualizados', 'success');
                    return true;
                } else {
                    showToast(`❌ ${r.error}`, 'error');
                    return false;
                }
            }
        );
    }

    async function editarEstado(equipoId, sedeId, td) {
        const eq = cacheEquipos.find(e => e.id === equipoId);
        if (!eq) return;
        const estadoActual = eq.estado || 'disponible';

        activarSelectEnCelda(
            td,
            estadoActual,
            ESTADOS_EQUIPO,
            async (nuevoEstado) => {
                if (nuevoEstado === estadoActual) return;
                setLoading(true);
                const r = await inventarioService.actualizarEquipoEnSede(sedeId, equipoId, { estado: nuevoEstado });
                setLoading(false);

                if (r.exito) {
                    showToast(`✅ Estado → ${nuevoEstado}`, 'success');
                    return true;
                } else {
                    showToast(`❌ ${r.error}`, 'error');
                    return false;
                }
            }
        );
    }

    // ── Modal de traslado ──
    function abrirModalTraslado(equipo) {
        return new Promise((resolve) => {
            // Cerrar modal anterior si existe
            if (modalTrasladoAbierto) {
                const { backdrop } = modalTrasladoAbierto;
                backdrop.remove();
            }

            const backdrop = document.createElement('div');
            backdrop.className = 'consulta-modal-backdrop';

            const otrasSedes = SEDES.filter(s => s !== equipo._sedeId);
            backdrop.innerHTML = `
                <div class="consulta-modal">
                    <h3>🔀 Trasladar equipo</h3>
                    <p class="text-sm text-themed-muted mb-3">
                        ${escapeHTML(equipo.modelo)} ${escapeHTML(equipo.gb)} ${escapeHTML(equipo.color)}
                        <br><span class="font-mono text-xs">IMEI: ${escapeHTML(equipo.imei)}</span>
                        <br>De: <strong>${escapeHTML(equipo._sedeNombre)}</strong> → A:
                    </p>
                    <div class="consulta-filtro-grupo" style="margin-bottom: 0.75rem;">
                        <label>Sede destino</label>
                        <select id="trasladoSedeDestino">
                            ${otrasSedes.map(s => `<option value="${s}">${escapeHTML(SEDES_NOMBRES[s] || s)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="consulta-filtro-grupo">
                        <label>Motivo (opcional)</label>
                        <input type="text" id="trasladoMotivo" placeholder="Ej: Cliente lo retiró en sede_2">
                    </div>
                    <div class="consulta-modal-acciones">
                        <button class="consulta-btn-accion" id="trasladoCancelar">Cancelar</button>
                        <button class="consulta-btn-accion consulta-btn-accion--primario" id="trasladoConfirmar">✅ Confirmar traslado</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);

            modalTrasladoAbierto = { backdrop, resolve };

            const cerrar = (resultado) => {
                backdrop.remove();
                modalTrasladoAbierto = null;
                resolve(resultado);
            };

            document.getElementById('trasladoCancelar').addEventListener('click', () => cerrar(null));
            document.getElementById('trasladoConfirmar').addEventListener('click', async () => {
                const sedeDestino = document.getElementById('trasladoSedeDestino').value;
                const motivo = document.getElementById('trasladoMotivo').value.trim();
                if (!sedeDestino) {
                    showToast('⚠️ Selecciona sede destino', 'error');
                    return;
                }
                cerrar({ sedeDestino, motivo });
            });

            // Click en backdrop cierra
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) cerrar(null);
            });

            // Escape cierra
            const escListener = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escListener);
                    cerrar(null);
                }
            };
            document.addEventListener('keydown', escListener);
        });
    }

    async function ejecutarTraslado(equipoId, sedeId) {
        const eq = cacheEquipos.find(e => e.id === equipoId);
        if (!eq) return;

        const resultado = await abrirModalTraslado(eq);
        if (!resultado) return; // cancelado

        setLoading(true);
        const r = await inventarioService.trasladarEquipo(
            equipoId,
            sedeId,
            resultado.sedeDestino,
            resultado.motivo
        );
        setLoading(false);

        if (r.exito) {
            showToast(`✅ Trasladado a ${SEDES_NOMBRES[resultado.sedeDestino] || resultado.sedeDestino}`, 'success');
            // FIX A3: forzar re-render inmediato. El batch de Firestore es
            // atómico, pero el onSnapshot tarda 100-500ms en propagarse.
            // Sin este notify, el equipo trasladado sigue visible en la
            // sede origen durante esa ventana — el usuario podría re-editarlo.
            consultaInventarioService._notificarCambio();
        } else {
            showToast(`❌ ${r.error}`, 'error');
        }
    }

    // ── Exportar CSV ──
    function exportarCSV() {
        if (cacheEquipos.length === 0) {
            showToast('⚠️ No hay datos para exportar', 'error');
            return;
        }

        const headers = ['Fecha', 'Sede', 'Modelo', 'GB', 'Color', 'Bateria', 'IMEI', 'Estado', 'Detalles', 'Origen'];
        const filas = cacheEquipos.map(eq => [
            formatFechaCorta(eq.fechaIngreso),
            eq._sedeNombre || eq.creadoPor || '',
            eq.modelo,
            eq.gb,
            eq.color,
            eq.bateria,
            eq.imei,
            eq.estado,
            eq.detalles || '',
            eq.origen || ''
        ]);

        // Escapar comillas y envolver en comillas
        const csv = [headers, ...filas].map(row =>
            row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const fecha = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `inventario_consulta_${fecha}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`📥 Exportadas ${cacheEquipos.length} filas`, 'success');
    }

    function exportarWhatsApp() {
        if (cacheEquipos.length === 0) {
            showToast('⚠️ No hay equipos para exportar', 'error');
            return;
        }

        // 1. Agrupar equipos
        const grupos = new Map();
        
        cacheEquipos.forEach(eq => {
            const mod = (eq.modelo || '').toLowerCase().trim();
            const match = mod.match(/(\d+)/);
            const num = match ? match[1] : '';
            
            let grupo = 'Otros';
            
            if (mod.includes('plus')) {
                grupo = num ? `${num} Plus` : 'Plus';
            } else if (mod.includes('pro') || mod.includes('pm') || mod.includes('max')) {
                grupo = num ? `${num}pro/ ${num}pm` : 'Pro / Pro Max';
            } else if (mod.includes('mini')) {
                grupo = num ? `${num} Mini` : 'Mini';
            } else if (mod.includes('se') || mod.match(/\be\b/)) {
                grupo = 'SE / E';
            } else if (num) {
                grupo = num;
            } else if (mod.includes('xr')) {
                grupo = 'XR';
            } else if (mod.includes('xs')) {
                grupo = 'XS';
            } else if (mod.includes('x')) {
                grupo = 'X';
            }
            
            if (!grupos.has(grupo)) {
                grupos.set(grupo, []);
            }
            grupos.get(grupo).push(eq);
        });

        // 2. Ordenar los grupos por nombre
        const gruposOrdenados = Array.from(grupos.keys()).sort((a, b) => {
            const numA = parseInt(a.match(/(\d+)/)?.[1] || 0);
            const numB = parseInt(b.match(/(\d+)/)?.[1] || 0);
            if (numA !== numB) return numA - numB; // Ascendente: 11, 12, 13
            
            const getPriority = (g) => {
                if (g.includes('pro') || g.includes('pm')) return 4;
                if (g.includes('Plus')) return 3;
                if (g.includes('Mini')) return 2;
                return 1; // Base
            };
            return getPriority(a) - getPriority(b);
        });

        // 3. Construir el texto
        let texto = '';
        
        gruposOrdenados.forEach(grupo => {
            const eqGrupo = grupos.get(grupo);
            
            // Separador de grupo
            texto += `///////////////// ${grupo} //////////////////////////\n`;
            
            // Sub-agrupar por modeloCorto, gb y color
            const identicos = new Map();
            
            eqGrupo.forEach(eq => {
                let modCorto = (eq.modelo || '').toLowerCase();
                modCorto = modCorto.replace('iphone', '').trim();
                modCorto = modCorto.replace('pro max', 'pm').replace('promax', 'pm');
                modCorto = modCorto.replace(/\s+/g, '');
                
                const gb = (eq.gb || '').toLowerCase();
                const colorNorm = (eq.color || '').toLowerCase().trim();
                
                const key = `${modCorto}|${gb}|${colorNorm}`;
                if (!identicos.has(key)) {
                    identicos.set(key, { 
                        modCorto, 
                        gb, 
                        colorDisplay: eq.color || '', 
                        equipos: [] 
                    });
                }
                identicos.get(key).equipos.push(eq);
            });
            
            // Funciones auxiliares para ordenamiento avanzado
            const getModelPriority = (mod) => {
                const m = (mod || '').toLowerCase();
                if (m.includes('pm') || m.includes('promax') || m.includes('pro max')) return 5;
                if (m.includes('pro')) return 4;
                if (m.includes('plus')) return 3;
                if (m.includes('mini')) return 2;
                return 1; // Normal
            };

            const getGBValue = (gbStr) => {
                const s = (gbStr || '').toLowerCase();
                if (s.includes('tb')) return (parseInt(s) || 0) * 1024;
                return parseInt(s) || 0;
            };

            // Ordenar por Modelo (Prioridad: Normal -> Mini -> Plus -> Pro -> PM) -> Almacenamiento (GB) -> Color
            const listaAgrupada = Array.from(identicos.values()).sort((a, b) => {
                const prioA = getModelPriority(a.modCorto);
                const prioB = getModelPriority(b.modCorto);
                if (prioA !== prioB) return prioA - prioB;

                const gbA = getGBValue(a.gb);
                const gbB = getGBValue(b.gb);
                if (gbA !== gbB) return gbA - gbB;

                return (a.colorDisplay || '').localeCompare(b.colorDisplay || '');
            });
            
            listaAgrupada.forEach(item => {
                // Obtener baterías y detalles acoplados (ej: 80(rayon)/83/100(sellado))
                const bateriasYDetalles = item.equipos
                    .map(e => ({
                        batNum: parseInt(e.bateria) || 0,
                        batStr: e.bateria || '0',
                        det: (e.detalles || '').trim()
                    }))
                    .sort((a, b) => a.batNum - b.batNum)
                    .map(e => {
                        return e.det ? `${e.batStr}(${e.det})` : e.batStr;
                    })
                    .join('/');
                
                texto += `${item.modCorto} ${item.gb} ${item.colorDisplay} ${bateriasYDetalles}\n`;
            });
            
            texto += '\n'; // Salto de línea extra entre grupos
        });

        // 4. Copiar al portapapeles
        navigator.clipboard.writeText(texto.trim())
            .then(() => showToast('✅ Copiado al portapapeles', 'success'))
            .catch(err => {
                console.error('Error al copiar:', err);
                showToast('❌ Error al copiar al portapapeles', 'error');
            });
    }

    // ── Bind de eventos (delegación en la sección) ──
    function wireEventos() {
        // Filtros: cualquier cambio → reset página + re-render
        const inputsFiltro = [
            'consultaFiltroSede', 'consultaFiltroEstado', 'consultaFiltroModelo',
            'consultaFiltroGb', 'consultaFiltroColor', 'consultaFiltroImei',
            'consultaFiltroFechaDesde', 'consultaFiltroFechaHasta',
            'consultaFiltroIncluirEliminados'
        ];
        inputsFiltro.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const ev = el.type === 'checkbox' ? 'change' : 'input';
            el.addEventListener(ev, () => {
                paginaActual = 1;
                renderTabla();
            });
        });

        // Botón refrescar
        document.getElementById('consultaBtnRefrescar')?.addEventListener('click', () => {
            renderTabla();
            showToast('🔄 Vista refrescada', 'success');
        });

        // Botón CSV
        document.getElementById('consultaBtnExportar')?.addEventListener('click', exportarCSV);
        document.getElementById('consultaBtnExportarWhatsApp')?.addEventListener('click', exportarWhatsApp);

        // Cabeceras de tabla (Ordenamiento)
        document.querySelectorAll('th[data-ordenar]').forEach(th => {
            th.addEventListener('click', () => {
                const columna = th.dataset.ordenar;
                if (ordenColumna === columna) {
                    ordenAscendente = !ordenAscendente;
                } else {
                    ordenColumna = columna;
                    ordenAscendente = false; 
                }
                
                // Actualizar visualmente los íconos (flechas ↑ o ↓)
                document.querySelectorAll('th[data-ordenar] .orden-icono').forEach(icon => icon.textContent = '');
                th.querySelector('.orden-icono').textContent = ordenAscendente ? ' ↑' : ' ↓';
                
                renderTabla();
            });
        });

        // Paginador (delegación)
        document.getElementById('consultaPaginador')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-pagina]');
            if (!btn || btn.disabled) return;
            const val = btn.dataset.pagina;
            if (val === 'prev') {
                paginaActual = Math.max(1, paginaActual - 1);
            } else if (val === 'next') {
                paginaActual = Math.min(Math.ceil(cacheEquipos.length / FILAS_POR_PAGINA), paginaActual + 1);
            } else {
                paginaActual = parseInt(val);
            }
            renderTabla();
        });

        // Tabla (delegación para edición + traslado)
        const tbody = document.getElementById('consultaTablaBody');
        if (tbody) {
            tbody.addEventListener('dblclick', (e) => {
                if (!esAdmin()) return;

                const td = e.target.closest('td');
                if (!td) return;
                const tr = td.closest('tr');
                if (!tr || tr.classList.contains('consulta-fila-editando')) return;

                if (td.dataset.editarBateria) {
                    editarBateria(td.dataset.editarBateria, td.dataset.sede, td);
                } else if (td.dataset.editarDetalles) {
                    editarDetalles(td.dataset.editarDetalles, td.dataset.sede, td);
                }
            });

            // Click en chip de estado → editar (admin)
            tbody.addEventListener('click', (e) => {
                if (!esAdmin()) return;
                const chip = e.target.closest('[data-editar-estado]');
                if (chip) {
                    const td = chip.closest('td');
                    editarEstado(chip.dataset.editarEstado, chip.dataset.sede, td);
                    return;
                }
                // Botón trasladar
                const btnTras = e.target.closest('[data-trasladar]');
                if (btnTras) {
                    ejecutarTraslado(btnTras.dataset.trasladar, btnTras.dataset.sede);
                }
            });
        }
    }

    // ── Init ──
    popularFiltros();
    wireEventos();

    // Cargar cache local primero (instantáneo), luego abrir listeners
    consultaInventarioService.cargarCacheLocal().then(() => {
        renderTabla();
    });

    // Re-render reactivo cuando lleguen snapshots
    consultaInventarioService.onCambio(renderTabla);

    return {
        recargar: renderTabla,
        setFiltros: (nuevos) => {
            Object.assign(filtros, nuevos);
            // Reflejar en inputs
            if ('sedeId' in nuevos) document.getElementById('consultaFiltroSede').value = nuevos.sedeId;
            if ('estado' in nuevos) document.getElementById('consultaFiltroEstado').value = nuevos.estado;
            // ... (más mapeos si los necesitas desde fuera)
            renderTabla();
        },
        esModoConsultaActivo: () => !seccion.classList.contains('hidden')
    };
}
