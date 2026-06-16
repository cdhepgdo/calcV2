# 🔒 Sistema de Validación de Accesorios para Movimientos

## 🎯 Objetivo

Validar que **cada checkbox marcado** tenga sus datos completos y válidos antes de guardar el movimiento.

---

## 📋 Reglas de Validación por Tipo de Accesorio

### 1️⃣ **Forro** (requiere modelo + cantidad)
```
✅ Checkbox marcado
✅ Al menos 1 fila con:
   - Modelo seleccionado (no vacío)
   - Cantidad > 0
❌ Fila con modelo vacío → se ignora
❌ Fila con cantidad = 0 → se ignora
⚠️  Si todas las filas están vacías → ERROR
```

### 2️⃣ **Vidrio** (requiere modelo + cantidad)
```
✅ Checkbox marcado
✅ Al menos 1 fila con:
   - Modelo seleccionado (no vacío)
   - Cantidad > 0
❌ Igual que Forro
```

### 3️⃣ **Caja** (requiere modelo + color + cantidad)
```
✅ Checkbox marcado
✅ Campos completos:
   - Modelo seleccionado
   - Color seleccionado
   - Cantidad > 0
```

### 4️⃣ **Cargador, Cubo, Cable Lightning, Cable C+C, Protector Cámara** (solo cantidad)
```
✅ Checkbox marcado
✅ Cantidad > 0
```

### 5️⃣ **Otro Accesorio** (requiere nombre + cantidad)
```
✅ Checkbox marcado
✅ Al menos 1 fila con:
   - Nombre/descripción (no vacío)
   - Cantidad > 0
```

---

## 💻 Implementación en JavaScript

### Función Principal de Validación

```javascript
/**
 * Valida y recopila accesorios de movimientos (salida/ingreso)
 * @param {string} prefijo - 'salida' o 'ingreso'
 * @returns {Object} { valido, errores, accesorios }
 */
validarYRecopilarAccesoriosMovimiento(prefijo) {
    const errores = [];
    const accesorios = [];
    
    // ═══════════════════════════════════════
    // 1. FORRO (multi-modelo)
    // ═══════════════════════════════════════
    const forroCheckbox = document.getElementById(`${prefijo}Forro`);
    if (forroCheckbox && forroCheckbox.checked) {
        const forros = [];
        const filas = document.querySelectorAll(`#${prefijo}ForroLista .forro-item`);
        
        filas.forEach((fila, index) => {
            const modelo = fila.querySelector('.accModelo')?.value || '';
            const cantidad = parseInt(fila.querySelector('.forro-cant')?.value) || 0;
            
            // Solo agregar si tiene datos válidos
            if (modelo && cantidad > 0) {
                forros.push({ modelo, cantidad });
            }
        });
        
        // Validar que al menos haya 1 forro válido
        if (forros.length === 0) {
            errores.push('❌ Forro: Debe seleccionar al menos un modelo y cantidad válida');
        } else {
            accesorios.push({
                tipo: 'Forro',
                modelos: forros
            });
        }
    }
    
    // ═══════════════════════════════════════
    // 2. VIDRIO (multi-modelo)
    // ═══════════════════════════════════════
    const vidrioCheckbox = document.getElementById(`${prefijo}Vidrio`);
    if (vidrioCheckbox && vidrioCheckbox.checked) {
        const vidrios = [];
        const filas = document.querySelectorAll(`#${prefijo}VidrioLista .vidrio-item`);
        
        filas.forEach((fila, index) => {
            const modelo = fila.querySelector('.accModelo')?.value || '';
            const cantidad = parseInt(fila.querySelector('.vidrio-cant')?.value) || 0;
            
            if (modelo && cantidad > 0) {
                vidrios.push({ modelo, cantidad });
            }
        });
        
        if (vidrios.length === 0) {
            errores.push('❌ Vidrio: Debe seleccionar al menos un modelo y cantidad válida');
        } else {
            accesorios.push({
                tipo: 'Vidrio Templado',
                modelos: vidrios
            });
        }
    }
    
    // ═══════════════════════════════════════
    // 3. CAJA (modelo + color + cantidad)
    // ═══════════════════════════════════════
    const cajaCheckbox = document.getElementById(`${prefijo}Caja`);
    if (cajaCheckbox && cajaCheckbox.checked) {
        const modelo = document.querySelector(`#${prefijo}CajaModelo .accModelo`)?.value || '';
        const color = document.getElementById(`${prefijo}CajaColorSelect`)?.value || '';
        const cantidad = parseInt(document.querySelector(`#${prefijo}CajaModelo input[type="number"]`)?.value) || 0;
        
        const erroresCaja = [];
        if (!modelo) erroresCaja.push('modelo');
        if (!color) erroresCaja.push('color');
        if (cantidad <= 0) erroresCaja.push('cantidad');
        
        if (erroresCaja.length > 0) {
            errores.push(`❌ Caja: Debe completar ${erroresCaja.join(', ')}`);
        } else {
            accesorios.push({
                tipo: 'Caja',
                modelos: [{ modelo, color, cantidad }]
            });
        }
    }
    
    // ═══════════════════════════════════════
    // 4. CARGADOR (solo cantidad)
    // ═══════════════════════════════════════
    const cargadorCheckbox = document.getElementById(`${prefijo}Cargador`);
    if (cargadorCheckbox && cargadorCheckbox.checked) {
        const cantidad = parseInt(document.querySelector(`#${prefijo}CargadorCantidad input`)?.value) || 0;
        
        if (cantidad <= 0) {
            errores.push('❌ Cargador: La cantidad debe ser mayor a 0');
        } else {
            accesorios.push({
                tipo: 'Cargador',
                cantidad
            });
        }
    }
    
    // ═══════════════════════════════════════
    // 5. PROTECTOR CÁMARA (solo cantidad)
    // ═══════════════════════════════════════
    const protectorCheckbox = document.getElementById(`${prefijo}ProtectorCamara`);
    if (protectorCheckbox && protectorCheckbox.checked) {
        const cantidad = parseInt(document.querySelector(`#${prefijo}ProtectorCantidad input`)?.value) || 0;
        
        if (cantidad <= 0) {
            errores.push('❌ Protector Cámara: La cantidad debe ser mayor a 0');
        } else {
            accesorios.push({
                tipo: 'Protector de Cámara',
                cantidad
            });
        }
    }
    
    // ═══════════════════════════════════════
    // 6. CUBO (solo cantidad)
    // ═══════════════════════════════════════
    const cuboCheckbox = document.getElementById(`${prefijo}Cubo`);
    if (cuboCheckbox && cuboCheckbox.checked) {
        const cantidad = parseInt(document.querySelector(`#${prefijo}CuboCantidad input`)?.value) || 0;
        
        if (cantidad <= 0) {
            errores.push('❌ Cubo: La cantidad debe ser mayor a 0');
        } else {
            accesorios.push({
                tipo: 'Cubo',
                cantidad
            });
        }
    }
    
    // ═══════════════════════════════════════
    // 7. CABLE LIGHTNING (solo cantidad)
    // ═══════════════════════════════════════
    const cableLightningCheckbox = document.getElementById(`${prefijo}CableLightning`);
    if (cableLightningCheckbox && cableLightningCheckbox.checked) {
        const cantidad = parseInt(document.querySelector(`#${prefijo}CableLightningCantidad input`)?.value) || 0;
        
        if (cantidad <= 0) {
            errores.push('❌ Cable Lightning: La cantidad debe ser mayor a 0');
        } else {
            accesorios.push({
                tipo: 'Cable Lightning',
                cantidad
            });
        }
    }
    
    // ═══════════════════════════════════════
    // 8. CABLE C+C (solo cantidad)
    // ═══════════════════════════════════════
    const cableCCCheckbox = document.getElementById(`${prefijo}CableCC`);
    if (cableCCCheckbox && cableCCCheckbox.checked) {
        const cantidad = parseInt(document.querySelector(`#${prefijo}CableCCCantidad input`)?.value) || 0;
        
        if (cantidad <= 0) {
            errores.push('❌ Cable C+C: La cantidad debe ser mayor a 0');
        } else {
            accesorios.push({
                tipo: 'Cable USB-C',
                cantidad
            });
        }
    }
    
    // ═══════════════════════════════════════
    // 9. OTRO ACCESORIO (multi-fila: nombre + cantidad)
    // ═══════════════════════════════════════
    const otroCheckbox = document.getElementById(`${prefijo}OtroAccesorio`);
    if (otroCheckbox && otroCheckbox.checked) {
        const otros = [];
        const filas = document.querySelectorAll(`#${prefijo}OtroLista .otro-item`);
        
        filas.forEach((fila, index) => {
            const nombre = fila.querySelector('.otro-nombre')?.value || '';
            const cantidad = parseInt(fila.querySelector('.otro-cant')?.value) || 0;
            
            if (nombre && cantidad > 0) {
                otros.push({ nombre, cantidad });
            }
        });
        
        if (otros.length === 0) {
            errores.push('❌ Otro Accesorio: Debe especificar al menos un nombre y cantidad válida');
        } else {
            // Crear un movimiento separado por cada "otro" accesorio
            otros.forEach(otro => {
                accesorios.push({
                    tipo: 'Otro',
                    descripcion: otro.nombre,
                    cantidad: otro.cantidad
                });
            });
        }
    }
    
    // ═══════════════════════════════════════
    // VALIDACIÓN GENERAL: Al menos 1 accesorio
    // ═══════════════════════════════════════
    if (accesorios.length === 0) {
        errores.push('⚠️ Debe seleccionar y completar al menos un accesorio');
    }
    
    return {
        valido: errores.length === 0,
        errores,
        accesorios
    };
}
```

---

## 🎨 Mejora de UX: Feedback Visual

### Marcar campos inválidos en rojo

```javascript
/**
 * Resalta visualmente los campos con errores
 */
resaltarErroresAccesorios(prefijo, errores) {
    // Limpiar estilos previos
    document.querySelectorAll(`[id^="${prefijo}"]`).forEach(el => {
        el.classList.remove('border-red-500', 'bg-red-50');
    });
    
    // Marcar errores específicos
    errores.forEach(error => {
        if (error.includes('Forro')) {
            document.getElementById(`${prefijo}Forro`)?.parentElement?.classList.add('border-red-500', 'bg-red-50');
        } else if (error.includes('Vidrio')) {
            document.getElementById(`${prefijo}Vidrio`)?.parentElement?.classList.add('border-red-500', 'bg-red-50');
        } else if (error.includes('Caja')) {
            document.getElementById(`${prefijo}Caja`)?.parentElement?.classList.add('border-red-500', 'bg-red-50');
        }
        // ... etc para cada tipo
    });
}
```

---

## 🚀 Integración en guardarMovimiento()

```javascript
async guardarMovimiento() {
    if (this._guardandoMovimiento) return;
    this._guardandoMovimiento = true;

    try {
        // ... código existente ...

        case 'formSalidaAccesorio':
        case 'formIngresoAccesorio':
            const esSalida = this.tipoMovimientoActual === 'formSalidaAccesorio';
            const prefijo = esSalida ? 'salida' : 'ingreso';
            
            // ✨ VALIDACIÓN ROBUSTA
            const resultado = this.validarYRecopilarAccesoriosMovimiento(prefijo);
            
            if (!resultado.valido) {
                // Mostrar errores
                const mensajeError = resultado.errores.join('\n\n');
                alert(`⚠️ Por favor corrija los siguientes errores:\n\n${mensajeError}`);
                
                // Resaltar campos con error (opcional)
                this.resaltarErroresAccesorios(prefijo, resultado.errores);
                return;
            }
            
            // Validar campos comunes (destino/proveedor)
            let destino, proveedor;
            if (esSalida) {
                destino = document.getElementById('salidaAccesorioDestino')?.value || '';
                if (!destino) {
                    alert('❌ Debe seleccionar un destino para todos los accesorios');
                    return;
                }
            } else {
                proveedor = document.getElementById('ingresoAccesorioProveedor')?.value || '';
                if (!proveedor || proveedor.trim() === '') {
                    alert('❌ Debe especificar el proveedor para todos los accesorios');
                    return;
                }
            }
            
            // ✅ DATOS VÁLIDOS: Guardar movimientos
            for (const acc of resultado.accesorios) {
                const datosMovimiento = {
                    tipo: acc.tipo,
                    modelos: acc.modelos || [],
                    cantidad: acc.cantidad || 0,
                    descripcion: acc.descripcion || '',
                    destino: esSalida ? destino : undefined,
                    proveedor: !esSalida ? proveedor : undefined
                };
                
                const res = await movimientoService.crearMovimiento({
                    tipo: esSalida ? 'Salida Accesorio' : 'Ingreso Accesorio',
                    datos: datosMovimiento
                });
                
                if (!res.exito) {
                    alert(`❌ Error al guardar ${acc.tipo}: ${res.error}`);
                    return;
                }
            }
            
            alert(`✅ ${resultado.accesorios.length} movimiento(s) registrado(s) correctamente`);
            this.cancelarMovimiento();
            await this.actualizarResumenMovimientos();
            break;
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al guardar: ' + error.message);
    } finally {
        this._guardandoMovimiento = false;
    }
}
```

---

## ✅ Casos de Prueba

### Caso 1: Usuario marca Forro pero no selecciona modelo
```
Acción: ✅ Checkbox Forro marcado
        ❌ Modelo: (vacío)
        ✅ Cantidad: 5

Resultado: ❌ ERROR
Mensaje: "Forro: Debe seleccionar al menos un modelo y cantidad válida"
```

### Caso 2: Usuario marca varios accesorios, algunos incompletos
```
Acción: ✅ Forro: iPhone 15 (x2) ← VÁLIDO
        ✅ Cargador: (cantidad vacía) ← INVÁLIDO
        ✅ Vidrio: (modelo vacío) ← INVÁLIDO

Resultado: ❌ ERROR
Mensaje: 
"Por favor corrija los siguientes errores:

❌ Cargador: La cantidad debe ser mayor a 0
❌ Vidrio: Debe seleccionar al menos un modelo y cantidad válida"
```

### Caso 3: Usuario marca Caja con modelo pero sin color
```
Acción: ✅ Checkbox Caja marcado
        ✅ Modelo: iPhone 15 Pro
        ❌ Color: (vacío)
        ✅ Cantidad: 1

Resultado: ❌ ERROR
Mensaje: "Caja: Debe completar color"
```

### Caso 4: Todo válido ✅
```
Acción: ✅ Forro: iPhone 15 (x2), iPhone 14 (x1)
        ✅ Cargador: 5
        ✅ Destino: Aviadores

Resultado: ✅ ÉXITO
Mensaje: "✅ 2 movimiento(s) registrado(s) correctamente"
```

---

## 📝 Resumen

### ✅ Validaciones Implementadas

1. **Checkbox marcado pero sin datos** → ERROR específico
2. **Modelo vacío en Forro/Vidrio/Caja** → ERROR
3. **Cantidad = 0 o vacía** → ERROR
4. **Color faltante en Caja** → ERROR
5. **Nombre vacío en Otro** → ERROR
6. **Ningún accesorio seleccionado** → ERROR general
7. **Destino/Proveedor vacío** → ERROR

### 🎯 Beneficios

- ✅ No se guardan registros vacíos
- ✅ Errores claros y específicos
- ✅ Feedback inmediato al usuario
- ✅ Validación por tipo de accesorio
- ✅ Mantiene integridad de datos
