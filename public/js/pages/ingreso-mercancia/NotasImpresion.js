import logoUrl from '/width_200.webp';
export function initNotasImpresion({
    getModoActual,
    getEquiposSeleccionadosSalida,
    recolectarEquiposIngreso,
    inventarioService,
    showToast
}) {
    function escapeHTML(str) {
        if (!str || str.trim() === '') return '—';
        return str.trim().replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag));
    }

    function generarNotaIngresoHTML(equiposPredefinidos = null, origenPredefinido = null, notasPredefinidas = null) {
        const origenLote = escapeHTML(origenPredefinido !== null ? origenPredefinido : document.getElementById('origenLote')?.value);
        const notasLote = escapeHTML(notasPredefinidas !== null ? notasPredefinidas : document.getElementById('notasLote')?.value);
        const sede = escapeHTML(localStorage.getItem('usuario_sede_id') || 'sede_1');
        const fecha = new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const equipos = equiposPredefinidos || recolectarEquiposIngreso().equipos;

        if (equipos.length === 0) {
            showToast('⚠️ No hay equipos válidos para imprimir', 'error');
            return null;
        }

        // Ordenar por Modelo, luego GB, luego Batería (ascendente)
        equipos.sort((a, b) => {
            const m = (a.modelo || '').localeCompare(b.modelo || '');
            if (m !== 0) return m;
            const ga = parseInt(a.gb) || 0;
            const gb = parseInt(b.gb) || 0;
            if (ga !== gb) return ga - gb;
            const ba = parseInt(a.bateria) || 0;
            const bb = parseInt(b.bateria) || 0;
            return ba - bb;
        });

        const filasHTML = equipos.map((eq, idx) => `
            <tr>
                <td style="padding: 4px 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${idx + 1}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; font-size: 11px;">${eq.modelo}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${eq.gb}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; font-size: 11px;">${eq.color}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${eq.bateria}%</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; font-family: monospace; font-size: 12px; white-space: nowrap; letter-spacing: 0.3px;">${eq.imei}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; font-size: 10px;">${eq.detalles || '—'}</td>
            </tr>
        `).join('');

        return `
            <div style="padding: 15px; font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px;">
                    <div>
                        <img src="${logoUrl}" alt="Logo" style="width: 120px; max-height: 50px; object-fit: contain;">
                    </div>
                    <div style="text-align: right;">
                        <h1 style="margin: 0; font-size: 20px;">📦 NOTA DE INGRESO</h1>
                        <p style="margin: 3px 0; color: #666; font-size: 12px;">${fecha}</p>
                        <p style="margin: 3px 0; font-weight: bold; font-size: 12px;">Sede: ${sede}</p>
                    </div>
                </div>

                <div style="margin-bottom: 15px; background: #f5f5f5; padding: 10px; border-radius: 8px; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <div style="flex: 1;">
                            <strong>Origen / Proveedor:</strong> ${origenLote}
                        </div>
                        <div style="flex: 1; text-align: right;">
                            <strong>Total equipos:</strong> ${equipos.length}
                        </div>
                    </div>
                    ${notasLote !== '—' ? `
                    <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #ddd;">
                        <strong>Notas:</strong> ${notasLote}
                    </div>
                    ` : ''}
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #333; color: white; font-size: 12px;">
                            <th style="padding: 6px; border: 1px solid #333; width: 30px;">#</th>
                            <th style="padding: 6px; border: 1px solid #333;">Modelo</th>
                            <th style="padding: 6px; border: 1px solid #333; width: 50px;">GB</th>
                            <th style="padding: 6px; border: 1px solid #333;">Color</th>
                            <th style="padding: 6px; border: 1px solid #333; width: 45px;">Bat%</th>
                            <th style="padding: 6px; border: 1px solid #333;">IMEI</th>
                            <th style="padding: 6px; border: 1px solid #333;">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasHTML}
                    </tbody>
                </table>

                <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px;">
                    <div style="text-align: center; flex: 1;">
                        <div style="border-top: 2px solid #333; padding-top: 5px; margin: 0 30px;">
                            Entregado por
                        </div>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <div style="border-top: 2px solid #333; padding-top: 5px; margin: 0 30px;">
                            Recibido por
                        </div>
                    </div>
                </div>

                <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #666;">
                    <p>Documento generado automáticamente — Sistema de Inventario</p>
                </div>
            </div>
        `;
    }

    function generarNotaSalidaHTML(equiposPredefinidos = null, destinoPred = null, responsablePred = null, notasPred = null, fechaPred = null) {
        const destino = escapeHTML(destinoPred !== null ? destinoPred : document.getElementById('salidaDestino')?.value);
        const responsable = escapeHTML(responsablePred !== null ? responsablePred : document.getElementById('salidaResponsable')?.value);
        const notas = escapeHTML(notasPred !== null ? notasPred : document.getElementById('salidaNotas')?.value);
        const sede = escapeHTML(localStorage.getItem('usuario_sede_id') || 'sede_1');
        const fecha = fechaPred
            ? new Date(fechaPred).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        let equipos;
        if (equiposPredefinidos) {
            equipos = equiposPredefinidos;
        } else {
            const ids = getEquiposSeleccionadosSalida();
            if (ids.length === 0) {
                showToast('⚠️ No hay equipos seleccionados para imprimir', 'error');
                return null;
            }
            equipos = ids.map(id => inventarioService.obtenerDisponibles().find(e => e.id === id)).filter(Boolean);
        }

        if (!equipos || equipos.length === 0) {
            showToast('⚠️ No hay equipos para generar la nota', 'error');
            return null;
        }

        // Ordenar por Modelo, luego GB, luego Batería (ascendente)
        equipos.sort((a, b) => {
            const m = (a.modelo || '').localeCompare(b.modelo || '');
            if (m !== 0) return m;
            const ga = parseInt(a.gb) || 0;
            const gb = parseInt(b.gb) || 0;
            if (ga !== gb) return ga - gb;
            const ba = parseInt(a.bateria) || 0;
            const bb = parseInt(b.bateria) || 0;
            return ba - bb;
        });

        const filasHTML = equipos.map((eq, idx) => `
            <tr>
                <td style="padding: 4px 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${idx + 1}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; font-size: 11px;">${eq.modelo}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${eq.gb}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; font-size: 11px;">${eq.color}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${eq.bateria}%</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; font-family: monospace; font-size: 12px; white-space: nowrap; letter-spacing: 0.3px;">${eq.imei}</td>
                <td style="padding: 4px 6px; border: 1px solid #ddd; font-size: 10px;">${eq.detalles || '—'}</td>
            </tr>
        `).join('');

        return `
            <div style="padding: 15px; font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">
                    <div>
                        <img src="${logoUrl}" alt="Logo" style="width: 120px; max-height: 50px; object-fit: contain;">
                    </div>
                    <div style="text-align: right;">
                        <h1 style="margin: 0; font-size: 20px; color: #d32f2f;">📤 NOTA DE SALIDA</h1>
                        <p style="margin: 3px 0; color: #666; font-size: 12px;">${fecha}</p>
                        <p style="margin: 3px 0; font-weight: bold; font-size: 12px;">Origen: ${sede}</p>
                    </div>
                </div>

                <div style="margin-bottom: 15px; background: #ffebee; padding: 10px; border-radius: 8px; border-left: 4px solid #d32f2f; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
                        <div style="flex: 1; min-width: 200px;">
                            <strong>Destino:</strong> ${destino}
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <strong>Responsable:</strong> ${responsable}
                        </div>
                        <div style="flex: 1; min-width: 200px; text-align: right;">
                            <strong>Total equipos:</strong> ${equipos.length}
                        </div>
                    </div>
                    ${notas !== '—' ? `
                    <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #d32f2f;">
                        <strong>Notas / Detalles del Envío:</strong><br/>
                        ${notas}
                    </div>
                    ` : ''}
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #d32f2f; color: white; font-size: 12px;">
                            <th style="padding: 6px; border: 1px solid #d32f2f; width: 30px;">#</th>
                            <th style="padding: 6px; border: 1px solid #d32f2f;">Modelo</th>
                            <th style="padding: 6px; border: 1px solid #d32f2f; width: 50px;">GB</th>
                            <th style="padding: 6px; border: 1px solid #d32f2f;">Color</th>
                            <th style="padding: 6px; border: 1px solid #d32f2f; width: 45px;">Bat%</th>
                            <th style="padding: 6px; border: 1px solid #d32f2f;">IMEI</th>
                            <th style="padding: 6px; border: 1px solid #d32f2f;">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasHTML}
                    </tbody>
                </table>

                <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px;">
                    <div style="text-align: center; flex: 1;">
                        <div style="border-top: 2px solid #d32f2f; padding-top: 5px; margin: 0 30px;">
                            Entregado por
                        </div>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <div style="border-top: 2px solid #d32f2f; padding-top: 5px; margin: 0 30px;">
                            Recibido por
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #666;">
                    <p>Documento generado automáticamente — Sistema de Inventario</p>
                </div>
            </div>
        `;
    }

    /**
     * Inyecta el HTML en el printArea y espera a que todas las imágenes
     * carguen antes de abrir el diálogo de impresión. Evita la condición
     * de carrera que hace que el logo no aparezca en el PDF/impresión.
     */
    function imprimirConEspera(html) {
        const printArea = document.getElementById('printArea');
        printArea.innerHTML = html;
        printArea.style.display = 'block';

        const imgs = Array.from(printArea.querySelectorAll('img'));

        const ejecutarImpresion = () => {
            window.print();
            setTimeout(() => {
                printArea.style.display = 'none';
                printArea.innerHTML = '';
            }, 300);
        };

        if (imgs.length === 0) {
            ejecutarImpresion();
            return;
        }

        let pendientes = imgs.length;
        const onFinish = () => {
            pendientes--;
            if (pendientes === 0) ejecutarImpresion();
        };

        imgs.forEach(img => {
            if (img.complete && img.naturalWidth > 0) {
                onFinish();
            } else {
                img.addEventListener('load', onFinish, { once: true });
                img.addEventListener('error', onFinish, { once: true }); // Imprime aunque falle la imagen
            }
        });
    }

    function imprimirNota() {
        const modoActual = getModoActual();
        
        let html;
        if (modoActual === 'ingreso') {
            html = generarNotaIngresoHTML();
        } else {
            html = generarNotaSalidaHTML();
        }

        if (!html) return;
        
        imprimirConEspera(html);
    }

    function abrirModalHistorialLotes() {
        const todos = inventarioService.obtenerTodos();
        const conLote = todos.filter(e => e.loteId && e.fechaIngreso);
        
        if (conLote.length === 0) {
            showToast('⚠️ No hay lotes registrados en el inventario.', 'error');
            return;
        }

        // Agrupar por loteId
        const lotesMap = new Map();
        conLote.forEach(e => {
            if (!lotesMap.has(e.loteId)) {
                lotesMap.set(e.loteId, {
                    loteId: e.loteId,
                    fechaIngreso: e.fechaIngreso,
                    origen: e.origen || 'No especificado',
                    equipos: []
                });
            }
            lotesMap.get(e.loteId).equipos.push(e);
        });

        // Ordenar del más reciente al más antiguo y tomar los últimos 15
        const lotes = Array.from(lotesMap.values())
            .sort((a, b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime())
            .slice(0, 15);

        const backdrop = document.createElement('div');
        backdrop.className = 'consulta-modal-backdrop';
        
        backdrop.innerHTML = `
            <div class="consulta-modal" style="max-width: 500px; width: 95vw;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0; font-size: 1.1rem;" class="text-themed">🗂️ Historial de Lotes</h3>
                    <button id="historialCerrar" class="text-themed-muted hover:text-red-500 transition-colors" style="font-size: 1.25rem;">✕</button>
                </div>
                <p class="text-xs text-themed-muted mb-4">Mostrando los últimos ${lotes.length} lotes de ingreso. Selecciona uno para reimprimir su nota.</p>
                
                <div style="max-height: 60vh; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 0.25rem;" id="historialLista">
                    ${lotes.map((lote, i) => `
                        <div class="glass p-4 rounded-xl flex justify-between items-center transition-colors hover:bg-white/5 border border-white/10">
                            <div>
                                <div class="text-sm font-bold text-themed-secondary mb-0.5">${new Date(lote.fechaIngreso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                                <div class="text-xs text-themed-muted">Origen: ${escapeHTML(lote.origen)}</div>
                                <div class="text-xs font-mono text-themed-muted mt-1.5 flex items-center gap-1"><span class="resumen-titulo--lote px-1.5 py-0.5 rounded text-[10px]">📦 ${lote.equipos.length} eq</span></div>
                            </div>
                            <button class="btn-accion btn-accion--neutro text-xs flex items-center gap-1 px-3 py-2 btn-imprimir-lote" data-lote-index="${i}">
                                🖨️ Imprimir
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        // Listeners del modal
        backdrop.querySelector('#historialCerrar').addEventListener('click', () => backdrop.remove());
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) backdrop.remove();
        });

        const botonesImprimir = backdrop.querySelectorAll('.btn-imprimir-lote');
        botonesImprimir.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.getAttribute('data-lote-index');
                const loteElegido = lotes[index];
                
                const html = generarNotaIngresoHTML(
                    loteElegido.equipos, 
                    loteElegido.origen, 
                    'Lote recuperado de la base de datos (Reimpresión)'
                );
                
                if (!html) return;
                
                backdrop.remove(); // Cerrar modal antes de imprimir
                
                imprimirConEspera(html);
            });
        });
    }

    function abrirModalHistorialSalidas() {
        const todos = inventarioService.obtenerTodos();
        const conSalida = todos.filter(e => e.loteSalidaId && e.fechaTransferencia);

        if (conSalida.length === 0) {
            showToast('⚠️ No hay lotes de salida registrados.', 'error');
            return;
        }

        // Agrupar por loteSalidaId
        const lotesMap = new Map();
        conSalida.forEach(e => {
            if (!lotesMap.has(e.loteSalidaId)) {
                lotesMap.set(e.loteSalidaId, {
                    loteSalidaId: e.loteSalidaId,
                    fechaTransferencia: e.fechaTransferencia,
                    destino: e.destino || 'No especificado',
                    responsable: e.responsable || '—',
                    notasTraslado: e.notasTraslado || '',
                    equipos: []
                });
            }
            lotesMap.get(e.loteSalidaId).equipos.push(e);
        });

        const lotes = Array.from(lotesMap.values())
            .sort((a, b) => new Date(b.fechaTransferencia).getTime() - new Date(a.fechaTransferencia).getTime())
            .slice(0, 15);

        const backdrop = document.createElement('div');
        backdrop.className = 'consulta-modal-backdrop';

        backdrop.innerHTML = `
            <div class="consulta-modal" style="max-width: 500px; width: 95vw;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0; font-size: 1.1rem;" class="text-themed">📤 Historial de Salidas</h3>
                    <button id="historialSalidaCerrar" class="text-themed-muted hover:text-red-500 transition-colors" style="font-size: 1.25rem;">✕</button>
                </div>
                <p class="text-xs text-themed-muted mb-4">Últimos ${lotes.length} lotes de salida. Selecciona uno para reimprimir su nota.</p>
                <div style="max-height: 60vh; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 0.25rem;">
                    ${lotes.map((lote, i) => `
                        <div class="glass p-4 rounded-xl flex justify-between items-center transition-colors hover:bg-white/5 border border-white/10">
                            <div>
                                <div class="text-sm font-bold text-themed-secondary mb-0.5">${new Date(lote.fechaTransferencia).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                                <div class="text-xs text-themed-muted">Destino: ${escapeHTML(lote.destino)}</div>
                                <div class="text-xs text-themed-muted">Responsable: ${escapeHTML(lote.responsable)}</div>
                                <div class="text-xs font-mono text-themed-muted mt-1.5 flex items-center gap-1"><span class="resumen-titulo--lote px-1.5 py-0.5 rounded text-[10px]">📤 ${lote.equipos.length} eq</span></div>
                            </div>
                            <button class="btn-accion btn-accion--neutro text-xs flex items-center gap-1 px-3 py-2 btn-reimprimir-salida" data-lote-index="${i}">
                                🖨️ Imprimir
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        backdrop.querySelector('#historialSalidaCerrar').addEventListener('click', () => backdrop.remove());
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

        backdrop.querySelectorAll('.btn-reimprimir-salida').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const loteElegido = lotes[e.currentTarget.getAttribute('data-lote-index')];
                const html = generarNotaSalidaHTML(
                    loteElegido.equipos,
                    loteElegido.destino,
                    loteElegido.responsable,
                    loteElegido.notasTraslado,
                    loteElegido.fechaTransferencia
                );
                if (!html) return;
                backdrop.remove();
                imprimirConEspera(html);
            });
        });
    }

    document.getElementById('btnImprimirLote')?.addEventListener('click', imprimirNota);
    document.getElementById('btnHistorialLotes')?.addEventListener('click', () => {
        if (getModoActual() === 'salida') {
            abrirModalHistorialSalidas();
        } else {
            abrirModalHistorialLotes();
        }
    });
}
