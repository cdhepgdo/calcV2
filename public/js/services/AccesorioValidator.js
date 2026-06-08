/**
 * Servicio de Validación de Accesorios para Movimientos de Inventario
 * Centraliza toda la lógica de validación de accesorios
 * 
 * Responsabilidad: Validar que cada checkbox marcado tenga sus datos completos y válidos
 */

class AccesorioValidator {
    /**
     * Valida y recopila accesorios de un formulario de movimiento
     * @param {string} prefijo - 'salida' o 'ingreso'
     * @returns {Object} { valido, errores, accesorios }
     */
    static validarYRecopilar(prefijo) {
        const errores = [];
        const accesorios = [];
        
        // ══════════════════════════════════════════
        // FORRO (multi-modelo)
        // ══════════════════════════════════════════
        const forroCheckbox = document.getElementById(`${prefijo}Forro`);
        if (forroCheckbox?.checked) {
            const resultadoForro = this._validarForros(prefijo);
            if (!resultadoForro.valido) {
                errores.push(...resultadoForro.errores);
            } else {
                accesorios.push(...resultadoForro.accesorios);
            }
        }
        
        // ══════════════════════════════════════════
        // VIDRIO (multi-modelo)
        // ══════════════════════════════════════════
        const vidrioCheckbox = document.getElementById(`${prefijo}Vidrio`);
        if (vidrioCheckbox?.checked) {
            const resultadoVidrio = this._validarVidrios(prefijo);
            if (!resultadoVidrio.valido) {
                errores.push(...resultadoVidrio.errores);
            } else {
                accesorios.push(...resultadoVidrio.accesorios);
            }
        }
        
        // ══════════════════════════════════════════
        // CAJA (modelo + color + cantidad)
        // ══════════════════════════════════════════
        const cajaCheckbox = document.getElementById(`${prefijo}Caja`);
        if (cajaCheckbox?.checked) {
            const resultadoCaja = this._validarCaja(prefijo);
            if (!resultadoCaja.valido) {
                errores.push(...resultadoCaja.errores);
            } else {
                //accesorios.push(resultadoCaja.accesorio);    //fallaba
                accesorios.push(...resultadoCaja.accesorios);   // ✅ spread del array plural
            }
        }
        
        // ══════════════════════════════════════════
        // ACCESORIOS SIMPLES (solo cantidad)
        // ══════════════════════════════════════════
        const accesoriosSimples = [
            { id: 'Cargador', nombre: 'Cargador' },
            { id: 'ProtectorCamara', nombre: 'Protector de Cámara' },
            { id: 'Protector', nombre: 'Protector de Cámara' },
            { id: 'Cubo', nombre: 'Cubo' },
            { id: 'CableLightning', nombre: 'Cable Lightning' },
            { id: 'CableCC', nombre: 'Cable C+C' }
        ];
        
        accesoriosSimples.forEach(acc => {
            const checkbox = document.getElementById(`${prefijo}${acc.id}`);
            if (checkbox?.checked) {
                const resultado = this._validarAccesorioSimple(prefijo, acc.id, acc.nombre);
                if (!resultado.valido) {
                    errores.push(resultado.error);
                } else {
                    accesorios.push(resultado.accesorio);
                }
            }
        });
        
        // ══════════════════════════════════════════
        // OTRO ACCESORIO (multi-fila: nombre + cantidad)
        // ══════════════════════════════════════════
        const otroCheckbox = document.getElementById(`${prefijo}OtroAccesorio`);
        if (otroCheckbox?.checked) {
            const resultadoOtro = this._validarOtros(prefijo);
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
        
        return {
            valido: errores.length === 0,
            errores,
            accesorios
        };
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
    
    // ══════════════════════════════════════════
    // MÉTODOS PRIVADOS DE VALIDACIÓN
    // ══════════════════════════════════════════
    
    /**
     * Valida forros (multi-modelo con cantidad)
     * @private
     */
    static _validarForros(prefijo) {
        const forros = [];
        const filas = document.querySelectorAll(`#${prefijo}ForroLista .forro-item`);
        
        filas.forEach(fila => {
            const modelo = fila.querySelector('.accModelo')?.value || '';
            const cantidad = parseInt(fila.querySelector('.forro-cant')?.value) || 0;
            
            if (modelo && cantidad > 0) {
                forros.push({ modelo, cantidad });
            }
        });
        
        if (forros.length === 0) {
            return {
                valido: false,
                errores: ['❌ Forro: Debe seleccionar al menos un modelo y cantidad válida']
            };
        }
        
        return {
            valido: true,
            accesorios: [{
                tipo: 'Forro',
                modelos: forros
            }]
        };
    }
    
    /**
     * Valida vidrios (multi-modelo con cantidad)
     * @private
     */
    static _validarVidrios(prefijo) {
        const vidrios = [];
        const filas = document.querySelectorAll(`#${prefijo}VidrioLista .vidrio-item`);
        
        filas.forEach(fila => {
            const modelo = fila.querySelector('.accModelo')?.value || '';
            const cantidad = parseInt(fila.querySelector('.vidrio-cant')?.value) || 0;
            
            if (modelo && cantidad > 0) {
                vidrios.push({ modelo, cantidad });
            }
        });
        
        if (vidrios.length === 0) {
            return {
                valido: false,
                errores: ['❌ Vidrio: Debe seleccionar al menos un modelo y cantidad válida']
            };
        }
        
        return {
            valido: true,
            accesorios: [{
                tipo: 'Vidrio Templado',
                modelos: vidrios
            }]
        };
    }
    
    /**
     * Valida cajas (multi-fila: modelo + color + cantidad)
     * @private
     */
    static _validarCaja(prefijo) {
        const cajas = [];
        const filas = document.querySelectorAll(`#${prefijo}CajaLista .caja-item`);
        
        filas.forEach(fila => {
            const modelo = fila.querySelector('.accModelo')?.value || '';
            const color = fila.querySelector('.caja-color')?.value || '';
            const cantidad = parseInt(fila.querySelector('.caja-cant')?.value) || 0;
            
            if (modelo && color && cantidad > 0) {
                cajas.push({ modelo, color, cantidad });
            }
        });
        
        if (cajas.length === 0) {
            return {
                valido: false,
                errores: ['❌ Caja: Debe seleccionar al menos un modelo, color y cantidad válida']
            };
        }
        
        return {
            valido: true,
            accesorios: [{
                tipo: 'Caja',
                modelos: cajas
            }]
        };
    }
    
    /**
     * Valida accesorio simple (solo cantidad)
     * @private
     */
    static _validarAccesorioSimple(prefijo, id, nombre) {
        const cantidad = parseInt(document.querySelector(`#${prefijo}${id}Cantidad input`)?.value) || 0;
        
        if (cantidad <= 0) {
            return {
                valido: false,
                error: `❌ ${nombre}: La cantidad debe ser mayor a 0`
            };
        }
        
        return {
            valido: true,
            accesorio: {
                tipo: nombre,
                cantidad
            }
        };
    }
    
    /**
     * Valida "otros" accesorios (multi-fila: nombre + cantidad)
     * @private
     */
    static _validarOtros(prefijo) {
        const otros = [];
        const filas = document.querySelectorAll(`#${prefijo}OtroLista .otro-item`);
        
        filas.forEach(fila => {
            const nombre = fila.querySelector('.otro-nombre')?.value || '';
            const cantidad = parseInt(fila.querySelector('.otro-cant')?.value) || 0;
            
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
}

export { AccesorioValidator };
