import { Autocomplete } from '../../utils/autocomplete.js';
import { validarIMEI } from '../../utils/validators.js';

export function initModoIngreso({
    inventarioService,
    movimientoService,
    EquipoInventario,
    MODELOS_CORTOS,
    COLORES_IPHONE,
    CAPACIDADES_IPHONE,
    showToast,
    setLoading,
    onInventarioCargado // Función que retorna si el inventario está cargado
}) {
    const tablaBody = document.getElementById('tablaBody');
    const tpl = document.getElementById('filaTpl');
    const panelAutocomplete = document.getElementById('autocompletePanel');
    const autocomplete = new Autocomplete(panelAutocomplete);
    
    let filaCounter = 0;

    // ── Sistema de Auto-Guardado de Borradores ────────────────────────────────
    // Cada vez que el usuario edita una celda, guardamos un snapshot del
    // formulario en localStorage. Si la página se recarga o se cae el
    // internet justo al guardar, el operador puede recuperar su trabajo.

    const DRAFT_KEY = `calcv2_ingreso_draft_${localStorage.getItem('usuario_sede_id') || 'sede_1'}`;

    function guardarBorrador() {
        try {
            const filas = [];
            tablaBody.querySelectorAll('tr').forEach(tr => {
                filas.push({
                    modelo:      tr.querySelector('.campo-modelo')?.value || '',
                    gb:          tr.querySelector('.campo-gb')?.value || '',
                    color:       tr.querySelector('.campo-color')?.value || '',
                    bateria:     tr.querySelector('.campo-bateria')?.value || '',
                    imei:        tr.querySelector('.campo-imei')?.value || '',
                    tieneCaja:   tr.querySelector('.campo-caja')?.checked || false,
                    cajaModelo:  tr.querySelector('.campo-caja-modelo')?.value || '',
                    cajaColor:   tr.querySelector('.campo-caja-color')?.value || '',
                    detalles:    tr.querySelector('.campo-detalles')?.value || ''
                });
            });
            const estado = {
                filas,
                origenLote: document.getElementById('origenLote')?.value || '',
                notasLote:  document.getElementById('notasLote')?.value || '',
                ts: Date.now()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(estado));
        } catch(e) { /* silencioso: no romper el flujo por quota de localStorage */ }
    }

    function limpiarBorrador() {
        localStorage.removeItem(DRAFT_KEY);
        const banner = document.getElementById('bannerBorrador');
        if (banner) banner.remove();
    }

    function mostrarBannerBorrador(estado) {
        const existing = document.getElementById('bannerBorrador');
        if (existing) return; // ya mostrado

        const d = new Date(estado.ts);
        const label = d.toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });

        const banner = document.createElement('div');
        banner.id = 'bannerBorrador';
        banner.className = 'mb-4 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600 rounded-xl px-4 py-3 text-sm';
        banner.innerHTML = `
            <span class="text-xl">📋</span>
            <span class="flex-1 text-amber-800 dark:text-amber-200">
                <strong>Borrador sin guardar</strong> del ${label} — ${estado.filas.length} fila(s)
            </span>
            <button id="btnRecuperarBorrador" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-xs transition">
                📂 Recuperar
            </button>
            <button id="btnDescartarBorrador" class="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-themed-secondary rounded-lg font-semibold text-xs transition">
                🗑️ Descartar
            </button>
        `;

        // Insertar antes del body de la tabla
        const seccionIngreso = document.getElementById('seccionIngreso');
        if (seccionIngreso) seccionIngreso.insertBefore(banner, seccionIngreso.firstChild);
        else document.body.insertBefore(banner, document.body.firstChild);

        document.getElementById('btnRecuperarBorrador').addEventListener('click', () => {
            tablaBody.innerHTML = '';
            filaCounter = 0;
            autocomplete.hide();
            estado.filas.forEach(datos => {
                const tr = crearFila();
                if (datos.modelo)    tr.querySelector('.campo-modelo').value = datos.modelo;
                if (datos.gb) {
                    tr.querySelector('.campo-gb').value = datos.gb;
                    tr.querySelectorAll('.gb-chip').forEach(c => c.classList.toggle('active', c.dataset.gb === datos.gb));
                }
                if (datos.color)     tr.querySelector('.campo-color').value = datos.color;
                if (datos.bateria)   tr.querySelector('.campo-bateria').value = datos.bateria;
                if (datos.imei)      tr.querySelector('.campo-imei').value = datos.imei;
                if (datos.tieneCaja) {
                    const chk = tr.querySelector('.campo-caja');
                    if (chk) { chk.checked = true; tr.querySelector('.caja-fields')?.classList.add('visible'); }
                }
                if (datos.cajaModelo) tr.querySelector('.campo-caja-modelo').value = datos.cajaModelo;
                if (datos.cajaColor)  tr.querySelector('.campo-caja-color').value = datos.cajaColor;
                if (datos.detalles)   tr.querySelector('.campo-detalles').value = datos.detalles;
            });
            if (estado.origenLote) {
                const el = document.getElementById('origenLote');
                if (el) el.value = estado.origenLote;
            }
            if (estado.notasLote) {
                const el = document.getElementById('notasLote');
                if (el) el.value = estado.notasLote;
            }
            actualizarResumen();
            banner.remove();
            showToast('✅ Borrador recuperado correctamente', 'success');
        });

        document.getElementById('btnDescartarBorrador').addEventListener('click', () => {
            limpiarBorrador();
            showToast('🗑️ Borrador descartado', 'success');
        });
    }

    // Intentar restaurar borrador al inicializar
    function verificarBorrador() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const estado = JSON.parse(raw);
            // Solo mostrar si tiene filas con contenido y es reciente (< 72 horas)
            const hace72h = Date.now() - (72 * 3600 * 1000);
            if (estado && Array.isArray(estado.filas) && estado.filas.length > 0 && estado.ts > hace72h) {
                const tieneContenido = estado.filas.some(f => f.modelo || f.imei);
                if (tieneContenido) mostrarBannerBorrador(estado);
            }
        } catch(e) { /* silent */ }
    }
    // ─────────────────────────────────────────────────────────────────────────

    function preventDefaultEvent(e) {
        e.preventDefault();
    }

    function poblarColores(select) {
        if (!select) return;
        select.querySelectorAll('option:not(:first-child)').forEach(opt => opt.remove());
        COLORES_IPHONE.forEach(c => {
            const o = document.createElement('option');
            o.value = c.valor;
            o.textContent = c.etiqueta;
            select.appendChild(o);
        });
    }

        actualizarResumen._debounceTimer = null;

    function actualizarResumen() {
        // Debounce de 300ms para no saturar localStorage en keystrokes rápidos
        clearTimeout(actualizarResumen._debounceTimer);
        actualizarResumen._debounceTimer = setTimeout(() => guardarBorrador(), 300);
        const filas = tablaBody.querySelectorAll('tr');
        const modelos = {};
        let validos = 0;
        let conAdvertencias = 0;

        filas.forEach(tr => {
            const modelo = tr.querySelector('.campo-modelo')?.value.trim() || '';
            const gb = tr.querySelector('.campo-gb')?.value || '';
            const imei = tr.querySelector('.campo-imei')?.value || '';
            const color = tr.querySelector('.campo-color')?.value || '';
            const imeiInput = tr.querySelector('.campo-imei');
            
            const tieneDuplicado = imeiInput?.classList.contains('imei-duplicado');
            
            if (modelo && gb && imei.length === 15 && color) {
                if (tieneDuplicado) {
                    conAdvertencias++;
                } else {
                    validos++;
                    const key = `${modelo} ${gb}`;
                    modelos[key] = (modelos[key] || 0) + 1;
                }
            }
        });

        const textoContador = conAdvertencias > 0 
            ? `${validos} válidos, ${conAdvertencias} ⚠️` 
            : `${validos}`;
        
        document.getElementById('contadorFilas').textContent = textoContador;
        document.getElementById('totalEquiposResumen').textContent = validos;

        const lista = document.getElementById('listaResumen');
        if (!Object.keys(modelos).length) {
            lista.innerHTML = '<p class="texto-vacio text-xs text-center italic">Sin equipos válidos aún...</p>';
        } else {
            lista.innerHTML = Object.entries(modelos).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
                `<div class="flex justify-between items-center text-xs">
                    <span class="texto-inverso truncate">${k}</span>
                    <span class="resumen-titulo--lote font-bold ml-2 shrink-0">×${v}</span>
                </div>`
            ).join('');
        }
    }

    function norm(s) {
        return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function revalidarTodosLosImeis() {
        const filas = tablaBody.querySelectorAll('tr');
        filas.forEach(tr => {
            const imeiInput = tr.querySelector('.campo-imei');
            if (imeiInput && imeiInput.value.length === 15) {
                imeiInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    function renumerarFilas() {
        tablaBody.querySelectorAll('tr').forEach((tr, i) => {
            tr.querySelector('.num-col').textContent = i + 1;
        });
    }

    function crearFila() {
        filaCounter++;
        const clone = tpl.content.cloneNode(true);
        const tr = clone.querySelector('tr');
        tr.dataset.filaId = filaCounter;
        tr.querySelector('.num-col').textContent = filaCounter;

        poblarColores(tr.querySelector('.campo-color'));
        poblarColores(tr.querySelector('.campo-caja-color'));

        // Generar chips de capacidad dinámicamente desde CAPACIDADES_IPHONE
        // (single source of truth: agregar 4TB/etc. es 1 línea en constants.js)
        const gbContainer = tr.querySelector('.gb-chips-container');
        if (gbContainer) {
            const hiddenGb = gbContainer.querySelector('.campo-gb');
            (CAPACIDADES_IPHONE || []).forEach(cap => {
                const chip = document.createElement('span');
                chip.className = 'gb-chip';
                chip.dataset.gb = cap.valor;
                // Para 1TB/2TB mostramos la etiqueta completa, para GB solo el número
                chip.textContent = cap.valor.includes('TB') ? cap.valor : cap.valor.replace('GB', '');
                gbContainer.insertBefore(chip, hiddenGb);
            });
        }

        tr.querySelectorAll('.gb-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                tr.querySelectorAll('.gb-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                tr.querySelector('.campo-gb').value = chip.dataset.gb;
                actualizarResumen();
            });
        });

        const chkCaja = tr.querySelector('.campo-caja');
        const cajaFields = tr.querySelector('.caja-fields');
        chkCaja.addEventListener('change', () => {
            cajaFields.classList.toggle('visible', chkCaja.checked);
        });

        const modeloInput = tr.querySelector('.campo-modelo');
        autocomplete.setup(modeloInput, MODELOS_CORTOS, () => actualizarResumen());

        const imeiInput = tr.querySelector('.campo-imei');
        const imeiStatus = tr.querySelector('.imei-status');
        
        imeiInput.addEventListener('input', () => {
            const v = imeiInput.value.replace(/\D/g, '');
            imeiInput.value = v;
            imeiInput.classList.remove('imei-ok', 'imei-error', 'imei-duplicado');
            imeiStatus.textContent = '';
            imeiInput.title = '';
            
            if (v.length === 15) {
                const resultado = validarIMEI(v, tr, tablaBody, inventarioService, onInventarioCargado());
                
                if (resultado.duplicado) {
                    imeiInput.classList.add('imei-duplicado');
                    imeiStatus.textContent = '⚠️';
                    imeiInput.title = resultado.mensaje;
                    
                    if (resultado.origen === 'inventario' && resultado.equipo) {
                        const info = ` | ${resultado.equipo.modelo} ${resultado.equipo.gb} ${resultado.equipo.color}`;
                        imeiInput.title += info;
                    }
                } else {
                    imeiInput.classList.add('imei-ok');
                    
                    if (resultado.reingreso) {
                        imeiStatus.textContent = '🔄';
                        imeiInput.title = resultado.mensaje;
                        
                        // Autocompletar
                        const eq = resultado.equipo;
                        const modeloInput = tr.querySelector('.campo-modelo');
                        const gbInput = tr.querySelector('.campo-gb');
                        const colorInput = tr.querySelector('.campo-color');
                        const bateriaInput = tr.querySelector('.campo-bateria');
                        const gbContainer = tr.querySelector('.gb-chips-container');
                        
                        // Guardamos valores originales para saber si se cambian
                        tr.dataset.reingresoImei = eq.imei;
                        
                        modeloInput.value = eq.modelo;
                        gbInput.value = eq.gb;
                        colorInput.value = eq.color;
                        bateriaInput.value = eq.bateria;
                        
                        if (gbContainer) {
                            gbContainer.querySelectorAll('.gb-chip').forEach(c => {
                                c.classList.toggle('active', c.dataset.gb === eq.gb);
                            });
                        }
                        
                        // Bloquear visualmente
                        modeloInput.readOnly = true;
                        modeloInput.style.pointerEvents = 'none';
                        modeloInput.classList.add('bg-gray-100', 'dark:bg-gray-800', 'opacity-70');
                        
                        colorInput.style.pointerEvents = 'none';
                        colorInput.classList.add('bg-gray-100', 'dark:bg-gray-800', 'opacity-70');
                        // Hacer readonly visual para los selects evitando que abran el dropdown
                        colorInput.addEventListener('mousedown', preventDefaultEvent);
                        
                        bateriaInput.readOnly = true;
                        bateriaInput.classList.add('bg-gray-100', 'dark:bg-gray-800', 'opacity-70');
                        
                        if (gbContainer) {
                            gbContainer.style.pointerEvents = 'none';
                            gbContainer.style.opacity = '0.7';
                        }
                        
                        tr.dataset.reingreso = "true";
                        
                    } else {
                        imeiStatus.textContent = '✅';
                        imeiInput.title = 'IMEI válido y único';
                        
                        // Si era un reingreso y cambió el IMEI a uno nuevo, desbloqueamos
                        if (tr.dataset.reingreso === "true") {
                            const modeloInput = tr.querySelector('.campo-modelo');
                            const colorInput = tr.querySelector('.campo-color');
                            const bateriaInput = tr.querySelector('.campo-bateria');
                            const gbContainer = tr.querySelector('.gb-chips-container');
                            
                            modeloInput.readOnly = false;
                            modeloInput.style.pointerEvents = 'auto';
                            modeloInput.classList.remove('bg-gray-100', 'dark:bg-gray-800', 'opacity-70');
                            
                            colorInput.style.pointerEvents = 'auto';
                            colorInput.classList.remove('bg-gray-100', 'dark:bg-gray-800', 'opacity-70');
                            colorInput.removeEventListener('mousedown', preventDefaultEvent);
                            
                            bateriaInput.readOnly = false;
                            bateriaInput.classList.remove('bg-gray-100', 'dark:bg-gray-800', 'opacity-70');
                            
                            if (gbContainer) {
                                gbContainer.style.pointerEvents = 'auto';
                                gbContainer.style.opacity = '1';
                            }
                            
                            tr.dataset.reingreso = "false";
                            tr.dataset.reingresoImei = "";
                        }
                    }
                }
            } else if (v.length > 0) {
                imeiInput.classList.add('imei-error');
                imeiStatus.textContent = '❌';
                imeiInput.title = `Faltan ${15 - v.length} dígitos`;
            }
            
            actualizarResumen();
        });

        const batInput = tr.querySelector('.campo-bateria');
        batInput.addEventListener('input', () => {
            const v = parseInt(batInput.value);
            batInput.classList.remove('bat-warn', 'bat-low');
            if (!isNaN(v)) {
                if (v < 50) batInput.classList.add('bat-low');
                else if (v < 80) batInput.classList.add('bat-warn');
            }
            actualizarResumen();
        });

        tr.querySelector('.campo-modelo').addEventListener('change', actualizarResumen);
        tr.querySelector('.campo-color').addEventListener('change', actualizarResumen);
        tr.querySelector('.campo-caja-color').addEventListener('change', actualizarResumen);
        tr.querySelector('.campo-detalles').addEventListener('input', actualizarResumen);

        tr.querySelector('.campo-detalles').addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const nuevaFila = crearFila();
                nuevaFila.querySelector('.campo-modelo').focus();
            }
        });

        tr.querySelector('.btn-eliminar').addEventListener('click', () => {
            tr.remove();
            renumerarFilas();
            actualizarResumen();
            if (autocomplete.isOpen && autocomplete.activeInput === modeloInput) {
                autocomplete.hide();
            }
            revalidarTodosLosImeis();
        });

        tablaBody.appendChild(tr);
        actualizarResumen();
        return tr;
    }

    function recolectarEquipos() {
        const equipos = [];
        const errores = [];

        tablaBody.querySelectorAll('tr').forEach((tr, idx) => {
            const num = idx + 1;
            let modelo = tr.querySelector('.campo-modelo')?.value.trim();
            const gb = tr.querySelector('.campo-gb')?.value;

            let errorModeloPersonalizado = null;
            if (modelo) {
                const modNorm = norm(modelo);
                const matchOficial = MODELOS_CORTOS.find(m => norm(m) === modNorm);
                if (matchOficial) {
                    modelo = matchOficial;
                } else {
                    errorModeloPersonalizado = `El modelo "${modelo}" no está en la lista oficial.`;
                }
            }

            const color = tr.querySelector('.campo-color')?.value;
            const bateria = parseInt(tr.querySelector('.campo-bateria')?.value) || 0;
            const imei = tr.querySelector('.campo-imei')?.value;
            const tieneCaja = tr.querySelector('.campo-caja')?.checked || false;
            const cajaModelo = tr.querySelector('.campo-caja-modelo')?.value.trim();
            const cajaColor = tr.querySelector('.campo-caja-color')?.value;
            const detalles = tr.querySelector('.campo-detalles')?.value.trim();
            const origen = document.getElementById('origenLote')?.value.trim() || '';

            const equipo = new EquipoInventario({ modelo, gb, color, bateria, imei, tieneCaja, cajaModelo, cajaColor, detalles, origen });
            const v = equipo.validar();

            if (errorModeloPersonalizado) {
                errores.push(`Fila ${num}: ${errorModeloPersonalizado}`);
            } else if (!v.valido) {
                errores.push(`Fila ${num}: ${v.errores.join(', ')}`);
            } else {
                // Validación estricta para reingresos (prevenir alteración de HTML)
                if (tr.dataset.reingreso === "true" && tr.dataset.reingresoImei === imei) {
                    const eqExistente = inventarioService.buscarPorImei(imei);
                    if (eqExistente) {
                        const m1 = norm(modelo);
                        const m2 = norm(eqExistente.modelo);
                        if (m1 !== m2 || gb !== eqExistente.gb || color !== eqExistente.color || bateria != eqExistente.bateria) {
                            errores.push(`Fila ${num}: Los datos del IMEI ${imei} no coinciden con los del equipo original. No modifique los campos de un reingreso.`);
                            return; // saltar el push
                        }
                    }
                }
                equipos.push(equipo);
            }
        });

        return { equipos, errores };
    }

    // --- Listeners ---
    document.getElementById('btnGuardarLote').addEventListener('click', async () => {
        if (tablaBody.querySelectorAll('tr').length === 0) {
            showToast('⚠️ Agrega al menos un equipo', 'error');
            return;
        }
        
        if (!onInventarioCargado()) {
            showToast('⚠️ Esperando carga del inventario. Intenta de nuevo en un momento.', 'error');
            return;
        }
        
        const imeisDuplicados = Array.from(tablaBody.querySelectorAll('.campo-imei.imei-duplicado'));
        if (imeisDuplicados.length > 0) {
            const numFilas = imeisDuplicados.map(input => input.closest('tr').querySelector('.num-col').textContent).join(', ');
            showToast(`⚠️ Hay IMEIs duplicados en las filas: ${numFilas}. Corrígelos antes de guardar.`, 'error');
            return;
        }

        const { equipos, errores } = recolectarEquipos();

        if (errores.length) {
            showToast(`⚠️ ${errores[0]}`, 'error');
            return;
        }

        if (!equipos.length) {
            showToast('⚠️ No hay equipos válidos para guardar', 'error');
            return;
        }

        setLoading(true);
        const origenLote = document.getElementById('origenLote').value.trim();
        const notasLote = document.getElementById('notasLote').value.trim();
        const registrarMovimiento = document.getElementById('chkRegistrarMovimiento').checked;
        
        const resultado = await inventarioService.guardarLote(equipos, origenLote, { permitirReingreso: true });
        setLoading(false);

        if (resultado.exito) {
            if (registrarMovimiento) {
                try {
                    for (const equipo of equipos) {
                        await movimientoService.crearMovimiento({
                            tipo: 'Ingreso Equipo',
                            datos: {
                                modelo: equipo.modelo,
                                capacidad: equipo.gb,
                                color: equipo.color,
                                imei: equipo.imei,
                                origen: origenLote || 'No especificado',
                                bateria: equipo.bateria,
                                notas: notasLote || ''
                            }
                        });
                    }
                    console.log(`✅ ${equipos.length} movimiento(s) de ingreso registrado(s)`);
                } catch (error) {
                    console.error('Error al registrar movimientos:', error);
                    showToast('⚠️ Equipos guardados, pero error al registrar movimientos', 'error');
                }
            }
            
            showToast(`✅ ${equipos.length} equipo(s) guardados correctamente`, 'success');
            limpiarBorrador(); // ← Limpiar borrador al guardar con éxito
            tablaBody.innerHTML = '';
            filaCounter = 0;
            document.getElementById('origenLote').value = '';
            document.getElementById('notasLote').value = '';
            autocomplete.hide();
            actualizarResumen();
            crearFila();
        } else {
            showToast(`❌ ${resultado.error}`, 'error');
        }
    });

    document.getElementById('btnLimpiarTodo').addEventListener('click', () => {
        if (tablaBody.querySelectorAll('tr').length === 0) return;
        if (!confirm('¿Limpiar todas las filas?')) return;
        tablaBody.innerHTML = '';
        filaCounter = 0;
        autocomplete.hide();
        actualizarResumen();
        crearFila();
    });

    document.getElementById('btnAgregarFila').addEventListener('click', () => {
        const tr = crearFila();
        tr.querySelector('.campo-modelo').focus();
    });

    window.addEventListener('scroll', () => {
        autocomplete.reposition();
    }, true);

    window.addEventListener('resize', () => {
        autocomplete.reposition();
    });

    document.addEventListener('click', (e) => {
        if (!panelAutocomplete.contains(e.target) && e.target !== autocomplete.activeInput) {
            autocomplete.hide();
        }
    });

    // Iniciar con una fila
    verificarBorrador();
    crearFila();

    return { recolectarEquipos };
}
