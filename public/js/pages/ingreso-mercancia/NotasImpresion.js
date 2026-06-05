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

    function generarNotaIngresoHTML() {
        const origenLote = escapeHTML(document.getElementById('origenLote')?.value);
        const notasLote = escapeHTML(document.getElementById('notasLote')?.value);
        const sede = escapeHTML(localStorage.getItem('usuario_sede_id') || 'sede_1');
        const fecha = new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const { equipos } = recolectarEquiposIngreso();
        
        if (equipos.length === 0) {
            showToast('⚠️ No hay equipos válidos para imprimir', 'error');
            return null;
        }

        const filasHTML = equipos.map((eq, idx) => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${eq.modelo}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${eq.gb}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${eq.color}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${eq.bateria}%</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; font-size: 11px;">${eq.imei}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;">${eq.detalles || '—'}</td>
            </tr>
        `).join('');

        return `
            <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px;">
                    <h1 style="margin: 0; font-size: 24px;">📦 NOTA DE INGRESO DE MERCANCÍA</h1>
                    <p style="margin: 5px 0; color: #666;">${fecha}</p>
                    <p style="margin: 5px 0; font-weight: bold;">Sede: ${sede}</p>
                </div>

                <div style="margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <strong>Origen / Proveedor:</strong> ${origenLote}
                        </div>
                        <div style="flex: 1; text-align: right;">
                            <strong>Total equipos:</strong> ${equipos.length}
                        </div>
                    </div>
                    ${notasLote !== '—' ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                        <strong>Notas:</strong> ${notasLote}
                    </div>
                    ` : ''}
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background: #333; color: white;">
                            <th style="padding: 10px; border: 1px solid #333; width: 40px;">#</th>
                            <th style="padding: 10px; border: 1px solid #333;">Modelo</th>
                            <th style="padding: 10px; border: 1px solid #333; width: 80px;">GB</th>
                            <th style="padding: 10px; border: 1px solid #333;">Color</th>
                            <th style="padding: 10px; border: 1px solid #333; width: 60px;">Bat%</th>
                            <th style="padding: 10px; border: 1px solid #333;">IMEI</th>
                            <th style="padding: 10px; border: 1px solid #333;">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasHTML}
                    </tbody>
                </table>

                <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                    <div style="text-align: center; flex: 1;">
                        <div style="border-top: 2px solid #333; padding-top: 5px; margin: 0 20px;">
                            Entregado por
                        </div>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <div style="border-top: 2px solid #333; padding-top: 5px; margin: 0 20px;">
                            Recibido por
                        </div>
                    </div>
                </div>

                <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #666;">
                    <p>Documento generado automáticamente — Sistema de Inventario</p>
                </div>
            </div>
        `;
    }

    function generarNotaSalidaHTML() {
        const destino = escapeHTML(document.getElementById('salidaDestino')?.value);
        const responsable = escapeHTML(document.getElementById('salidaResponsable')?.value);
        const notas = escapeHTML(document.getElementById('salidaNotas')?.value);
        const sede = escapeHTML(localStorage.getItem('usuario_sede_id') || 'sede_1');
        const fecha = new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const ids = getEquiposSeleccionadosSalida();
        if (ids.length === 0) {
            showToast('⚠️ No hay equipos seleccionados para imprimir', 'error');
            return null;
        }

        const equipos = ids.map(id => {
            return inventarioService.obtenerDisponibles().find(e => e.id === id);
        }).filter(Boolean);

        const filasHTML = equipos.map((eq, idx) => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${eq.modelo}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${eq.gb}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${eq.color}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${eq.bateria}%</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; font-size: 11px;">${eq.imei}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;">${eq.detalles || '—'}</td>
            </tr>
        `).join('');

        return `
            <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #d32f2f; padding-bottom: 15px;">
                    <h1 style="margin: 0; font-size: 24px; color: #d32f2f;">📤 NOTA DE SALIDA DE EQUIPOS</h1>
                    <p style="margin: 5px 0; color: #666;">${fecha}</p>
                    <p style="margin: 5px 0; font-weight: bold;">Origen: ${sede}</p>
                </div>

                <div style="margin-bottom: 20px; background: #ffebee; padding: 15px; border-radius: 8px; border-left: 4px solid #d32f2f;">
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
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #d32f2f;">
                        <strong>Notas / Detalles del Envío:</strong><br/>
                        ${notas}
                    </div>
                    ` : ''}
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background: #d32f2f; color: white;">
                            <th style="padding: 10px; border: 1px solid #d32f2f; width: 40px;">#</th>
                            <th style="padding: 10px; border: 1px solid #d32f2f;">Modelo</th>
                            <th style="padding: 10px; border: 1px solid #d32f2f; width: 80px;">GB</th>
                            <th style="padding: 10px; border: 1px solid #d32f2f;">Color</th>
                            <th style="padding: 10px; border: 1px solid #d32f2f; width: 60px;">Bat%</th>
                            <th style="padding: 10px; border: 1px solid #d32f2f;">IMEI</th>
                            <th style="padding: 10px; border: 1px solid #d32f2f;">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasHTML}
                    </tbody>
                </table>

                <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                    <div style="text-align: center; flex: 1;">
                        <div style="border-top: 2px solid #d32f2f; padding-top: 5px; margin: 0 20px;">
                            Entregado por
                        </div>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <div style="border-top: 2px solid #d32f2f; padding-top: 5px; margin: 0 20px;">
                            Recibido por
                        </div>
                    </div>
                </div>

                <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #666;">
                    <p>Documento generado automáticamente — Sistema de Inventario</p>
                </div>
            </div>
        `;
    }

    function imprimirNota() {
        const printArea = document.getElementById('printArea');
        const modoActual = getModoActual();
        
        let html;
        if (modoActual === 'ingreso') {
            html = generarNotaIngresoHTML();
        } else {
            html = generarNotaSalidaHTML();
        }

        if (!html) return;
        
        printArea.innerHTML = html;
        printArea.style.display = 'block';
        window.print();
        setTimeout(() => {
            printArea.style.display = 'none';
            printArea.innerHTML = '';
        }, 100);
    }

    document.getElementById('btnImprimirLote')?.addEventListener('click', imprimirNota);
}
