import { accesorioInventarioService } from '../../services/AccesorioInventarioService.js';
import { AccesorioInventario } from '../../models/AccesorioInventario.js';
import { MODELOS_IPHONE } from '../../config/constants.js';

// ───────────────────────────────────────────────────────────────────────────────
// Constantes y helpers internos
// ───────────────────────────────────────────────────────────────────────────────

const NOMBRES_PREDEFINIDOS = ['Forro', 'Vidrio Templado', 'Cargador', 'Cubo', 'Cable Lightning', 'Cable C+C', 'Protector Cámara', 'Caja'];
const VARIACIONES_POR_NOMBRE = {
    'Forro':             ['Silicona', 'Cuero', '360', 'Magnético', 'Antigolpe', 'Translúcido', 'Otro'],
    'Vidrio Templado':   ['Estándar', 'Antiespía', 'Privacidad', 'Matte', 'Curvo', 'Otro'],
    'Cargador':          ['20W', '25W', '35W', '67W', 'MagSafe', 'USB-C', 'Otro'],
    'Cubo':              ['Estándar', 'GaN', 'Otro'],
    'Cable Lightning':   ['1m', '2m', 'Trenzado', 'Otro'],
    'Cable C+C':         ['1m', '2m', 'Trenzado', '100W', 'Otro'],
    'Protector Cámara':  ['Estándar', 'Con marco', 'Otro'],
    'Caja':              ['Original', 'Réplica', 'Otra']
};
const NIVELES_STOCK_BAJO = 5;

let _editandoId = null; // ID del accesorio en edición (null = crear nuevo)
let _unsub = null;      // Función de unsuscripción del listener de cambios

// ───────────────────────────────────────────────────────────────────────────────
// Exportable principal
// ───────────────────────────────────────────────────────────────────────────────

export function initModoAccesorios({ showToast, setLoading }) {

    const seccion = document.getElementById('seccionAccesorios');
    if (!seccion) return;

    // ── Render de la tabla de stock ───────────────────────────────────────────

    function renderTabla(accesorios) {
        const filtro = document.getElementById('filtroAccesorios')?.value.toLowerCase() || '';
        const filtroTipo = document.getElementById('filtroTipoAccesorio')?.value || '';

        const filtrados = accesorios.filter(a => {
            const matchFiltro = !filtro || a.etiqueta.toLowerCase().includes(filtro) || a.modelo.toLowerCase().includes(filtro);
            const matchTipo   = !filtroTipo || a.nombre === filtroTipo;
            return matchFiltro && matchTipo;
        });

        const tbody = document.getElementById('tablaAccesoriosBody');
        if (!tbody) return;

        if (filtrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-10 text-themed-muted italic text-sm">
                        📭 No hay accesorios registrados. ¡Agrega el primero!
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = filtrados.map(a => {
            const stockClass =
                a.cantidad < 0     ? 'text-red-600 dark:text-red-400 font-bold' :
                a.cantidad === 0   ? 'text-red-500 dark:text-red-400' :
                a.cantidad < NIVELES_STOCK_BAJO ? 'text-amber-600 dark:text-amber-400' :
                'text-green-600 dark:text-green-400';

            const stockBadge =
                a.cantidad < 0     ? '<span class="ml-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">⚠️ Neg.</span>' :
                a.cantidad === 0   ? '<span class="ml-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">Agotado</span>' :
                a.cantidad < NIVELES_STOCK_BAJO ? '<span class="ml-1 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">Bajo</span>' : '';

            return `
                <tr class="border-b border-themed hover:bg-white/5 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-themed">${a.nombre}</td>
                    <td class="px-4 py-3 text-sm text-themed-secondary">${a.modelo || '—'}</td>
                    <td class="px-4 py-3 text-sm text-themed-secondary">${a.tipoVariacion || '—'}</td>
                    <td class="px-4 py-3 text-sm text-themed-secondary">${a.color || '—'}</td>
                    <td class="px-4 py-3 text-sm ${stockClass} font-semibold">
                        ${a.cantidad} ${stockBadge}
                    </td>
                    <td class="px-4 py-3 text-sm text-themed-secondary">
                        ${a.precio > 0 ? `$${a.precio.toFixed(2)}` : '—'}
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex gap-2 justify-end">
                            <button class="btn-ajuste-rapido px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs hover:bg-blue-200 dark:hover:bg-blue-800/50 transition font-semibold"
                                data-id="${a.id}" title="Ajuste rápido de cantidad">
                                ±
                            </button>
                            <button class="btn-editar-accesorio px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition font-semibold"
                                data-id="${a.id}">
                                ✏️ Editar
                            </button>
                            <button class="btn-eliminar-accesorio px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs hover:bg-red-200 dark:hover:bg-red-800/50 transition font-semibold"
                                data-id="${a.id}">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        // Estadísticas del footer
        const total = accesorios.reduce((s, a) => s + (a.cantidad > 0 ? a.cantidad : 0), 0);
        const sinStock = accesorios.filter(a => a.cantidad <= 0).length;
        const stockBajo = accesorios.filter(a => a.cantidad > 0 && a.cantidad < NIVELES_STOCK_BAJO).length;
        const el = document.getElementById('statsAccesorios');
        if (el) {
            el.innerHTML = `
                <span class="text-themed-muted text-xs">${filtrados.length} variante(s) mostradas</span>
                <span class="text-green-600 dark:text-green-400 text-xs font-semibold">${total} uds en stock</span>
                ${stockBajo > 0 ? `<span class="text-amber-600 dark:text-amber-400 text-xs">${stockBajo} con stock bajo</span>` : ''}
                ${sinStock > 0 ? `<span class="text-red-600 dark:text-red-400 text-xs">${sinStock} agotadas</span>` : ''}
            `;
        }
    }

    // ── Formulario de creación/edición ────────────────────────────────────────

    function resetFormulario() {
        _editandoId = null;
        document.getElementById('accNombre').value = '';
        document.getElementById('accModelo').value = '';
        document.getElementById('accVariacion').value = '';
        document.getElementById('accColor').value = '';
        document.getElementById('accCantidad').value = '0';
        document.getElementById('accPrecio').value = '';
        document.getElementById('accCosto').value = '';
        document.getElementById('accDetalles').value = '';
        document.getElementById('btnGuardarAccesorio').textContent = '💾 Guardar Accesorio';
        document.getElementById('btnCancelarEdicion').classList.add('hidden');
        actualizarVariaciones();
    }

    function actualizarVariaciones() {
        const nombre = document.getElementById('accNombre')?.value;
        const select = document.getElementById('accVariacion');
        if (!select) return;
        const opciones = VARIACIONES_POR_NOMBRE[nombre] || [];
        const valorActual = select.value;
        select.innerHTML = '<option value="">Sin variación específica</option>';
        opciones.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            select.appendChild(opt);
        });
        // También agregar opción personalizada si el valor actual no está en la lista
        if (valorActual && !opciones.includes(valorActual)) {
            const opt = document.createElement('option');
            opt.value = valorActual;
            opt.textContent = valorActual;
            select.appendChild(opt);
        }
        select.value = valorActual || '';
    }

    function cargarEnFormulario(acc) {
        _editandoId = acc.id;
        document.getElementById('accNombre').value = acc.nombre;
        actualizarVariaciones();
        document.getElementById('accModelo').value = acc.modelo || '';
        document.getElementById('accVariacion').value = acc.tipoVariacion || '';
        document.getElementById('accColor').value = acc.color || '';
        document.getElementById('accCantidad').value = acc.cantidad;
        document.getElementById('accPrecio').value = acc.precio || '';
        document.getElementById('accCosto').value = acc.costo || '';
        document.getElementById('accDetalles').value = acc.detalles || '';
        document.getElementById('btnGuardarAccesorio').textContent = '✅ Actualizar Accesorio';
        document.getElementById('btnCancelarEdicion').classList.remove('hidden');
        document.getElementById('formAccesorio').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Exportaciones ─────────────────────────────────────────────────────────

    function exportarCSV(accesorios) {
        const encabezados = ['Nombre', 'Modelo', 'Variación', 'Color', 'Cantidad', 'Precio Venta', 'Costo', 'Detalles'];
        const filas = accesorios.map(a => [
            a.nombre, a.modelo, a.tipoVariacion, a.color ?? '',
            a.cantidad, a.precio, a.costo, a.detalles
        ]);
        const csvContent = [encabezados, ...filas]
            .map(fila => fila.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_accesorios_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function imprimirResumen(accesorios) {
        const sedeId = localStorage.getItem('usuario_sede_id') || 'sede_1';
        const fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const filas = accesorios.map(a => {
            const estilo = a.cantidad < 0 ? 'color:red;font-weight:bold' :
                           a.cantidad === 0 ? 'color:#c00' :
                           a.cantidad < NIVELES_STOCK_BAJO ? 'color:#b45309' : 'color:#16a34a';
            return `<tr>
                <td>${a.nombre}</td>
                <td>${a.modelo || '—'}</td>
                <td>${a.tipoVariacion || '—'}</td>
                <td>${a.color || '—'}</td>
                <td style="${estilo}">${a.cantidad}</td>
                <td>${a.precio > 0 ? `$${a.precio.toFixed(2)}` : '—'}</td>
            </tr>`;
        }).join('');

        const win = window.open('', '_blank', 'width=800,height=600');
        win.document.write(`<!DOCTYPE html><html><head>
            <meta charset="UTF-8"><title>Reporte Stock Accesorios</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
                h1 { font-size: 18px; margin-bottom: 4px; }
                p { color: #666; margin-top: 0; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #1e40af; color: white; padding: 8px; text-align: left; }
                td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
                tr:nth-child(even) { background: #f9fafb; }
                @media print { button { display: none; } }
            </style>
        </head><body>
            <h1>📦 Reporte de Stock de Accesorios</h1>
            <p>Sede: ${sedeId} — ${fechaHoy}</p>
            <button onclick="window.print()" style="margin-bottom:16px;padding:6px 14px;background:#1e40af;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">🖨️ Imprimir</button>
            <table>
                <thead><tr>
                    <th>Nombre</th><th>Modelo</th><th>Variación</th><th>Color</th><th>Stock</th><th>Precio</th>
                </tr></thead>
                <tbody>${filas}</tbody>
            </table>
        </body></html>`);
        win.document.close();
    }

    // ── Ajuste Rápido (modal inline) ──────────────────────────────────────────

    function mostrarAjusteRapido(acc) {
        const modal = document.createElement('div');
        modal.id = 'modalAjusteRapido';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="glass rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <h3 class="text-lg font-bold text-themed mb-1">⚡ Ajuste Rápido de Stock</h3>
                <p class="text-sm text-themed-secondary mb-4">${acc.etiqueta}</p>
                <p class="text-sm text-themed-muted mb-1">Stock actual: <strong>${acc.cantidad}</strong></p>
                <div class="flex gap-3 items-center mb-4">
                    <label class="text-sm text-themed-secondary">Ajustar en:</label>
                    <input type="number" id="inputAjusteRapido" value="1" class="cell-input rounded-lg py-2 px-3 text-sm w-28 text-center" placeholder="Cantidad">
                </div>
                <div class="flex gap-2">
                    <button id="btnSumarAjuste" class="flex-1 py-2 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition">+ Sumar</button>
                    <button id="btnRestarAjuste" class="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition">− Restar</button>
                    <button id="btnCancelarAjuste" class="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-themed-secondary rounded-xl font-semibold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition">✕</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        const input = document.getElementById('inputAjusteRapido');
        modal.querySelector('#btnCancelarAjuste').addEventListener('click', () => modal.remove());

        const aplicarAjuste = async (mult) => {
            const qty = parseInt(input.value) || 0;
            if (qty === 0) { showToast('⚠️ Ingresa una cantidad mayor a 0', 'error'); return; }
            const accActualizado = AccesorioInventario.fromJSON({ ...acc.toJSON(), cantidad: acc.cantidad + (qty * mult) });
            setLoading(true);
            const resultado = await accesorioInventarioService.guardarAccesorio(accActualizado);
            setLoading(false);
            modal.remove();
            if (resultado.exito) {
                showToast(resultado.offline ? '⏳ Ajuste en cola (sin conexión)' : `✅ Stock actualizado: ${accActualizado.cantidad} unidades`, 'success');
            } else {
                showToast(`❌ ${resultado.error}`, 'error');
            }
        };

        modal.querySelector('#btnSumarAjuste').addEventListener('click', () => aplicarAjuste(+1));
        modal.querySelector('#btnRestarAjuste').addEventListener('click', () => aplicarAjuste(-1));
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    }

    // ── Inicializar eventos de la sección ─────────────────────────────────────

    function init() {
        // Poblar select de modelos iPhone
        const selectModelo = document.getElementById('accModelo');
        if (selectModelo && MODELOS_IPHONE) {
            selectModelo.innerHTML = '<option value="Genérico">Genérico</option>';
            MODELOS_IPHONE.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.valor || m;
                opt.textContent = m.etiqueta || m;
                selectModelo.appendChild(opt);
            });
        }

        // Poblar datalist de nombres predefinidos para soporte de nombres personalizados
        const inputNombre = document.getElementById('accNombre');
        const datalistNombres = document.getElementById('nombresPredefinidosList');
        if (inputNombre && datalistNombres) {
            datalistNombres.innerHTML = '';
            NOMBRES_PREDEFINIDOS.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n;
                datalistNombres.appendChild(opt);
            });
            inputNombre.addEventListener('input', actualizarVariaciones);
            inputNombre.addEventListener('change', actualizarVariaciones);
        }

        // Filtros
        document.getElementById('filtroAccesorios')?.addEventListener('input', () => {
            renderTabla(accesorioInventarioService.obtenerTodos());
        });
        document.getElementById('filtroTipoAccesorio')?.addEventListener('change', () => {
            renderTabla(accesorioInventarioService.obtenerTodos());
        });

        // Llenar filtro de tipos
        const filtroTipo = document.getElementById('filtroTipoAccesorio');
        if (filtroTipo) {
            NOMBRES_PREDEFINIDOS.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n;
                opt.textContent = n;
                filtroTipo.appendChild(opt);
            });
        }

        // Guardar accesorio
        document.getElementById('btnGuardarAccesorio')?.addEventListener('click', async () => {
            const nombre = document.getElementById('accNombre')?.value.trim();
            if (!nombre) { showToast('⚠️ El nombre es obligatorio', 'error'); return; }

            const datos = {
                id: _editandoId || undefined,
                nombre,
                modelo: document.getElementById('accModelo')?.value || 'Genérico',
                tipoVariacion: document.getElementById('accVariacion')?.value || '',
                color: document.getElementById('accColor')?.value || null,
                cantidad: parseInt(document.getElementById('accCantidad')?.value) || 0,
                precio: parseFloat(document.getElementById('accPrecio')?.value) || 0,
                costo: parseFloat(document.getElementById('accCosto')?.value) || 0,
                detalles: document.getElementById('accDetalles')?.value || ''
            };

            // Prevención de duplicados: si estamos creando un nuevo accesorio,
            // verificar que no exista ya otra variante idéntica en el inventario.
            if (!_editandoId) {
                const existente = accesorioInventarioService.buscarVariante(
                    datos.nombre, datos.modelo, datos.tipoVariacion, datos.color
                );
                if (existente) {
                    if (!confirm(`⚠️ Ya existe la variante "${existente.etiqueta}".\n\n¿Deseas actualizar el elemento existente (sumando/actualizando stock) en vez de crear uno duplicado?`)) {
                        return;
                    }
                    datos.id = existente.id; // Reutilizar el ID existente
                }
            }

            const instancia = AccesorioInventario.fromJSON(datos);
            setLoading(true);
            const resultado = await accesorioInventarioService.guardarAccesorio(instancia);
            setLoading(false);

            if (resultado.exito) {
                showToast(resultado.offline
                    ? '⏳ Accesorio guardado en cola (sin conexión). Se sincronizará al recuperar.'
                    : `✅ Accesorio ${_editandoId ? 'actualizado' : 'creado'} correctamente`, 'success');
                resetFormulario();
            } else {
                showToast(`❌ ${resultado.error}`, 'error');
            }
        });

        // Cancelar edición
        document.getElementById('btnCancelarEdicion')?.addEventListener('click', () => {
            resetFormulario();
        });

        // Exportar CSV
        document.getElementById('btnExportarCSV')?.addEventListener('click', () => {
            const items = accesorioInventarioService.obtenerTodos();
            if (items.length === 0) { showToast('⚠️ No hay accesorios para exportar', 'error'); return; }
            exportarCSV(items);
            showToast('✅ CSV descargado', 'success');
        });

        // Imprimir
        document.getElementById('btnImprimirAccesorios')?.addEventListener('click', () => {
            const items = accesorioInventarioService.obtenerTodos();
            if (items.length === 0) { showToast('⚠️ No hay accesorios para imprimir', 'error'); return; }
            imprimirResumen(items);
        });

        // Delegación de eventos en la tabla (editar, eliminar, ajuste rápido)
        document.getElementById('tablaAccesoriosBody')?.addEventListener('click', async (e) => {
            const id = e.target.closest('[data-id]')?.dataset.id;
            if (!id) return;
            const acc = accesorioInventarioService.buscarPorId(id);
            if (!acc) return;

            if (e.target.closest('.btn-editar-accesorio')) {
                cargarEnFormulario(acc);
            } else if (e.target.closest('.btn-eliminar-accesorio')) {
                if (!confirm(`¿Eliminar "${acc.etiqueta}"?\n\nEsta acción no se puede deshacer.`)) return;
                setLoading(true);
                const resultado = await accesorioInventarioService.eliminarAccesorio(id);
                setLoading(false);
                if (resultado.exito) {
                    showToast(resultado.offline ? '⏳ Eliminación en cola' : '✅ Accesorio eliminado', 'success');
                } else {
                    showToast(`❌ ${resultado.error}`, 'error');
                }
            } else if (e.target.closest('.btn-ajuste-rapido')) {
                mostrarAjusteRapido(acc);
            }
        });

        // Suscribirse a cambios en tiempo real
        _unsub = accesorioInventarioService.onCambio(items => renderTabla(items));

        // Render inicial desde caché
        renderTabla(accesorioInventarioService.obtenerTodos());

        // Inicializar variaciones del form
        actualizarVariaciones();
    }

    function destruir() {
        if (_unsub) { _unsub(); _unsub = null; }
    }

    init();
    return { destruir };
}
