import { ACCESORIOS_SCHEMA, assertPrefijoValido } from '../config/accesoriosSchema.js';

/**
 * Servicio de Validación de Accesorios para Movimientos de Inventario.
 *
 * Centraliza la lógica de validación. La lista de accesorios soportados
 * viene de ACCESORIOS_SCHEMA (ver config/accesoriosSchema.js).
 *
 * Si agregas un accesorio nuevo, basta con:
 *   1. Declararlo en ACCESORIOS_SCHEMA
 *   2. Agregar el HTML correspondiente siguiendo la convención
 *   3. Llamar AccesorioValidator.verificarContratoHTML() al iniciar
 *      la página — el sistema te dirá si el HTML no coincide.
 */
class AccesorioValidator {

    /**
     * Valida y recopila accesorios del formulario.
     * @param {string} prefijo - 'salida' o 'ingreso'
     * @param {Object} [deps] - Dependencias inyectables (para tests)
     * @param {Document} [deps.doc=document] - Documento del DOM
     * @returns {{valido: boolean, errores: string[], accesorios: Object[]}}
     */
    static validarYRecopilar(prefijo, deps = {}) {
        const doc = deps.doc ?? document;
        assertPrefijoValido(prefijo);

        const errores = [];
        const accesorios = [];

        // ══════════════════════════════════════════
        // VALIDACIÓN DINÁMICA POR SCHEMA
        // ══════════════════════════════════════════
        for (const accesorio of Object.values(ACCESORIOS_SCHEMA)) {
            const resultado = this._validarAccesorio(prefijo, accesorio, doc);
            if (!resultado.valido) {
                errores.push(...resultado.errores);
            } else if (resultado.accesorios.length > 0) {
                accesorios.push(...resultado.accesorios);
            }
        }

        // ══════════════════════════════════════════
        // OTRO ACCESORIO (multi-fila dinámico especial)
        // ══════════════════════════════════════════
        const otroCheckbox = doc.getElementById(`${prefijo}OtroAccesorio`);
        if (otroCheckbox?.checked) {
            const resultadoOtro = this._validarOtros(prefijo, doc);
            if (!resultadoOtro.valido) {
                errores.push(...resultadoOtro.errores);
            } else {
                accesorios.push(...resultadoOtro.accesorios);
            }
        }

        // ══════════════════════════════════════════
        // VALIDACIÓN GENERAL
        // ══════════════════════════════════════════
        if (accesorios.length === 0) {
            errores.push('⚠️ Debe seleccionar y completar al menos un accesorio');
        }

        return { valido: errores.length === 0, errores, accesorios };
    }

    /**
     * Valida campos comunes del movimiento (destino/proveedor)
     * @param {string} prefijo - 'salida' o 'ingreso'
     * @param {boolean} esSalida - true si es salida, false si es ingreso
     * @returns {Object} { valido, errores }
     */
    static validarCamposComunes(prefijo, esSalida) {
        const errores = [];
        
        if (esSalida) {
            const destino = document.getElementById(`${prefijo}AccesorioDestino`)?.value || '';
            if (!destino) {
                errores.push('❌ Debe seleccionar un destino');
            }
        } else {
            const proveedor = document.getElementById(`${prefijo}AccesorioProveedor`)?.value || '';
            if (!proveedor || proveedor.trim() === '') {
                errores.push('❌ Debe especificar el proveedor');
            }
        }
        
        return {
            valido: errores.length === 0,
            errores
        };
    }

    // ── Métodos privados ─────────────────────────────────────────────

    /**
     * Despacha la validación según el tipo de accesorio.
     * @private
     */
    static _validarAccesorio(prefijo, accesorio, doc) {
        const checkbox = doc.getElementById(`${prefijo}${accesorio.id}`);
        if (!checkbox?.checked) {
            return { valido: true, accesorios: [] };  // no marcado → no aplica
        }

        switch (accesorio.tipoForm) {
            case 'simple':     return this._validarSimple(prefijo, accesorio, doc);
            case 'multi-fila': return this._validarMultiFila(prefijo, accesorio, doc);
            case 'con-color':  return this._validarConColor(prefijo, accesorio, doc);
            default:
                return {
                    valido: false,
                    errores: [`❌ ${accesorio.nombre}: tipoForm "${accesorio.tipoForm}" no soportado`],
                };
        }
    }

    /**
     * Accesorio simple: solo cantidad.
     * @private
     */
    static _validarSimple(prefijo, accesorio, doc) {
        const input = doc.querySelector(`#${prefijo}${accesorio.id}Cantidad input`);
        if (!input) {
            return {
                valido: false,
                errores: [
                    `❌ ${accesorio.nombre}: no se encontró el input de cantidad ` +
                    `(buscado: #${prefijo}${accesorio.id}Cantidad input). ` +
                    `Revisa el HTML.`,
                ],
            };
        }
        const cantidad = parseInt(input.value, 10) || 0;
        if (cantidad <= 0) {
            return {
                valido: false,
                errores: [`❌ ${accesorio.nombre}: La cantidad debe ser mayor a 0`],
            };
        }
        return {
            valido: true,
            accesorios: [{ tipo: accesorio.nombre, cantidad }],
        };
    }

    /**
     * Accesorio multi-fila: array de {modelo, cantidad}.
     * @private
     */
    static _validarMultiFila(prefijo, accesorio, doc) {
        const listaSelector = accesorio.listaSelector.replace('{prefijo}', prefijo);
        const lista = doc.querySelector(listaSelector);
        if (!lista) {
            return {
                valido: false,
                errores: [`❌ ${accesorio.nombre}: no se encontró el contenedor "${listaSelector}"`],
            };
        }
        const filas = lista.querySelectorAll(accesorio.itemSelector);
        const modelos = [];

        filas.forEach((fila, idx) => {
            const modelo = fila.querySelector(accesorio.campoModelo)?.value || '';
            const cantidad = parseInt(fila.querySelector(accesorio.campoCant)?.value, 10) || 0;
            if (modelo && cantidad > 0) {
                modelos.push({ modelo, cantidad });
            }
        });

        if (modelos.length === 0) {
            return {
                valido: false,
                errores: [`❌ ${accesorio.nombre}: Debe seleccionar al menos un modelo y cantidad válida`],
            };
        }

        return {
            valido: true,
            accesorios: [{ tipo: accesorio.tipoSalida, modelos }],
        };
    }

    /**
     * Accesorio con color: array de {modelo, color, cantidad}.
     * @private
     */
    static _validarConColor(prefijo, accesorio, doc) {
        const listaSelector = accesorio.listaSelector.replace('{prefijo}', prefijo);
        const lista = doc.querySelector(listaSelector);
        if (!lista) {
            return {
                valido: false,
                errores: [`❌ ${accesorio.nombre}: no se encontró el contenedor "${listaSelector}"`],
            };
        }
        const filas = lista.querySelectorAll(accesorio.itemSelector);
        const modelos = [];

        filas.forEach(fila => {
            const modelo = fila.querySelector(accesorio.campoModelo)?.value || '';
            const color  = fila.querySelector(accesorio.campoColor)?.value || '';
            const cantidad = parseInt(fila.querySelector(accesorio.campoCant)?.value, 10) || 0;
            if (modelo && color && cantidad > 0) {
                modelos.push({ modelo, color, cantidad });
            }
        });

        if (modelos.length === 0) {
            return {
                valido: false,
                errores: [`❌ ${accesorio.nombre}: Debe seleccionar al menos un modelo, color y cantidad válida`],
            };
        }

        return {
            valido: true,
            accesorios: [{ tipo: accesorio.tipoSalida, modelos }],
        };
    }

    /**
     * Valida "otros" accesorios (multi-fila: nombre + cantidad)
     * Nota: Este accesorio tiene una estructura dinámica diferente al schema estándar,
     * por lo que se mantiene su validación específica.
     * @private
     */
    static _validarOtros(prefijo, doc) {
        const otros = [];
        const filas = doc.querySelectorAll(`#${prefijo}OtroLista .otro-item`);
        
        filas.forEach(fila => {
            const nombre = fila.querySelector('.otro-nombre')?.value || '';
            const cantidad = parseInt(fila.querySelector('.otro-cant')?.value, 10) || 0;
            
            if (nombre && cantidad > 0) {
                otros.push({ nombre, cantidad });
            }
        });
        
        if (otros.length === 0) {
            return {
                valido: false,
                errores: ['❌ Otro Accesorio: Debe especificar al menos un nombre y cantidad válida']
            };
        }
        
        // Crear un accesorio separado por cada "otro"
        const accesorios = otros.map(otro => ({
            tipo: 'Otro',
            descripcion: otro.nombre,
            cantidad: otro.cantidad
        }));
        
        return {
            valido: true,
            accesorios
        };
    }

    // ── Verificación de contrato (debug en dev) ─────────────────────

    /**
     * Verifica que cada accesorio declarado en el schema tenga su HTML
     * correspondiente. Útil para llamar al iniciar la página en dev.
     *
     * En producción, si todo está bien, esto es silencioso. Si falta algo,
     * emite warnings a la consola con instrucciones claras de cómo arreglar.
     *
     * @param {Document} [doc=document]
     * @param {string} [prefijo='salida'] - 'salida' o 'ingreso'
     * @returns {string[]} Lista de advertencias (vacía si todo OK)
     */
    static verificarContratoHTML(doc = document, prefijo = 'salida') {
        const warnings = [];

        for (const accesorio of Object.values(ACCESORIOS_SCHEMA)) {
            const checkboxId = `${prefijo}${accesorio.id}`;
            const checkbox = doc.getElementById(checkboxId);
            if (!checkbox) {
                warnings.push(
                    `[AccesorioValidator] Falta checkbox #${checkboxId} para "${accesorio.nombre}". ` +
                    `Agregar: <input type="checkbox" id="${checkboxId}">`
                );
                continue;
            }

            if (accesorio.tipoForm === 'simple') {
                const input = doc.querySelector(`#${prefijo}${accesorio.id}Cantidad input`);
                if (!input) {
                    warnings.push(
                        `[AccesorioValidator] Falta input de cantidad para "${accesorio.nombre}". ` +
                        `Agregar: <div id="${prefijo}${accesorio.id}Cantidad"><input type="number" ...></div>`
                    );
                }
            } else {
                const listaSelector = accesorio.listaSelector.replace('{prefijo}', prefijo);
                const lista = doc.querySelector(listaSelector);
                if (!lista) {
                    warnings.push(
                        `[AccesorioValidator] Falta contenedor "${listaSelector}" para "${accesorio.nombre}".`
                    );
                }
            }
        }

        if (warnings.length > 0) {
            console.warn(
                `[AccesorioValidator] Se encontraron ${warnings.length} problema(s) en el HTML (Prefijo: ${prefijo}):\n` +
                warnings.map(w => `  • ${w}`).join('\n')
            );
        }

        return warnings;
    }
}

export { AccesorioValidator };
