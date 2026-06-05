import { Autocomplete } from '../../utils/autocomplete.js';
import { validarIMEI } from '../../utils/validators.js';

export function initModoIngreso({ 
    inventarioService, 
    movimientoService, 
    EquipoInventario, 
    MODELOS_CORTOS, 
    COLORES_IPHONE, 
    showToast, 
    setLoading,
    onInventarioCargado // Función que retorna si el inventario está cargado
}) {
    const tablaBody = document.getElementById('tablaBody');
    const tpl = document.getElementById('filaTpl');
    const panelAutocomplete = document.getElementById('autocompletePanel');
    const autocomplete = new Autocomplete(panelAutocomplete);
    
    let filaCounter = 0;

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

    function actualizarResumen() {
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
            lista.innerHTML = '<p class="text-slate-500 text-xs text-center italic">Sin equipos válidos aún...</p>';
        } else {
            lista.innerHTML = Object.entries(modelos).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
                `<div class="flex justify-between items-center text-xs">
                    <span class="text-slate-300 truncate">${k}</span>
                    <span class="text-indigo-300 font-bold ml-2 shrink-0">×${v}</span>
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
                    imeiStatus.textContent = '✅';
                    imeiInput.title = 'IMEI válido y único';
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
        
        const resultado = await inventarioService.guardarLote(equipos, origenLote);
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
    crearFila();

    return { recolectarEquipos };
}
