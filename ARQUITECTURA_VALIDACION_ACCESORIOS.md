# 🏗️ Arquitectura: Validación de Accesorios en Movimientos

## 📊 Análisis de la Estructura Actual del Proyecto

```
public/js/
├── config/           → Constantes y configuración
├── models/           → Entidades de negocio (Venta, Movimiento, etc.)
├── services/         → Lógica de negocio y comunicación con Firebase
├── utils/            → Funciones auxiliares y validadores genéricos
├── pages/            → Lógica específica de páginas individuales
└── main.js           → Orquestador principal (UI + coordinación)
```

---

## 🎯 Principios de Arquitectura Observados

### ✅ **Separación de Responsabilidades**

1. **Models** (`models/`) → Representan entidades del dominio
   - `Venta.js` - Contiene validaciones de negocio de ventas
   - `Movimiento.js` - Contiene validaciones de negocio de movimientos
   - Método `.validar()` en cada modelo

2. **Services** (`services/`) → Lógica de negocio y persistencia
   - `VentaService.js` - Operaciones CRUD de ventas
   - `MovimientoService.js` - Operaciones CRUD de movimientos
   - Llaman a `.validar()` del modelo antes de guardar

3. **Utils** (`utils/`) → Funciones reutilizables genéricas
   - `validators.js` - Validadores básicos (required, IMEI, email, etc.)
   - `domHelpers.js` - Manipulación del DOM
   - `formatters.js` - Formateo de datos

4. **Main.js** → Orquestador de UI
   - Escucha eventos del DOM
   - Recopila datos del formulario
   - Llama a servicios
   - Actualiza la interfaz
   - **NO debería contener lógica de negocio compleja**

---

## ⚠️ Problema Actual en `main.js`

### ❌ **Violación del Principio de Responsabilidad Única**

El archivo `main.js` tiene **4153 líneas** y contiene:

```javascript
// ✅ CORRECTO (responsabilidades UI)
- Inicialización de eventos
- Recopilación de datos del formulario
- Actualización de la interfaz
- Coordinación entre servicios

// ❌ INCORRECTO (lógica de negocio mezclada)
- Validaciones complejas de IMEI
- Sincronización con inventario
- Lógica de trade-in
- Validación de estados de equipos
```

**Ejemplo de código que NO debería estar en main.js:**
```javascript
// main.js línea ~1300
_validarImeiParaVenta(imei) {
    // 80+ líneas de lógica de negocio
    // Búsqueda en inventario
    // Validaciones cruzadas
    // Reglas de estado
}
```

---

## ✅ Solución Propuesta: Arquitectura Modular

### 📁 **Nueva Estructura para Validación de Accesorios**

```
public/js/
├── utils/
│   └── validators.js          → Validadores básicos (ya existe)
│
├── services/
│   ├── MovimientoService.js   → Lógica de negocio de movimientos
│   └── AccesorioValidator.js  → 🆕 Validador específico de accesorios
│
├── models/
│   └── Movimiento.js          → Entidad con validación general
│
└── main.js                    → Solo orquestación UI (reducir tamaño)
```

---

## 🔧 Implementación Detallada

### 1️⃣ **Crear `AccesorioValidator.js` (NUEVO)**

**Ubicación:** `public/js/services/AccesorioValidator.js`

**Responsabilidad:** Validar y recopilar datos de accesorios en movimientos.

```javascript
/**
 * Validador de Accesorios para Movimientos de Inventario
 * Centraliza toda la lógica de validación de accesorios
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
                accesorios.push(resultadoCaja.accesorio);
            }
        }
        
        // ══════════════════════════════════════════
        // ACCESORIOS SIMPLES (solo cantidad)
        // ══════════════════════════════════════════
        const accesoriosSimples = [
            { id: 'Cargador', nombre: 'Cargador' },
            { id: 'ProtectorCamara', nombre: 'Protector de Cámara' },
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
            accesorios: [{ tipo: 'Forro', modelos: forros }]
        };
    }
    
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
            accesorios: [{ tipo: 'Vidrio Templado', modelos: vidrios }]
        };
    }
    
    static _validarCaja(prefijo) {
        const modelo = document.querySelector(`#${prefijo}CajaModelo .accModelo`)?.value || '';
        const color = document.getElementById(`${prefijo}CajaColorSelect`)?.value || '';
        const cantidad = parseInt(document.querySelector(`#${prefijo}CajaModelo input[type="number"]`)?.value) || 0;
        
        const erroresCaja = [];
        if (!modelo) erroresCaja.push('modelo');
        if (!color) erroresCaja.push('color');
        if (cantidad <= 0) erroresCaja.push('cantidad');
        
        if (erroresCaja.length > 0) {
            return {
                valido: false,
                errores: [`❌ Caja: Debe completar ${erroresCaja.join(', ')}`]
            };
        }
        
        return {
            valido: true,
            accesorio: {
                tipo: 'Caja',
                modelos: [{ modelo, color, cantidad }]
            }
        };
    }
    
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
```

---

### 2️⃣ **Actualizar `main.js` para usar el validador**

**ANTES (❌ Mal):**
```javascript
// main.js - 100+ líneas de validación mezcladas con UI
async guardarMovimiento() {
    // ... validación inline masiva ...
    const forros = [];
    document.querySelectorAll('#salidaForroLista .forro-item').forEach(item => {
        // 50 líneas de lógica...
    });
    // ... más validaciones ...
}
```

**DESPUÉS (✅ Bien):**
```javascript
// main.js - Limpio y delegando responsabilidades
import { AccesorioValidator } from './services/AccesorioValidator.js';

async guardarMovimiento() {
    if (this._guardandoMovimiento) return;
    this._guardandoMovimiento = true;

    try {
        const datos = this.recopilarDatosMovimiento();
        
        if (!datos) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }

        const sedeId = localStorage.getItem('usuario_sede_id') || 'sede_1';

        // ... lógica de equipos (ya existe) ...

        // ══════════════════════════════════════════
        // ACCESORIOS: Delegar al validador
        // ══════════════════════════════════════════
        if (datos.tipo === 'Salida Accesorio' || datos.tipo === 'Ingreso Accesorio') {
            const esSalida = datos.tipo === 'Salida Accesorio';
            const prefijo = esSalida ? 'salida' : 'ingreso';
            
            // ✨ DELEGACIÓN AL SERVICIO ESPECIALIZADO
            const validacionAccesorios = AccesorioValidator.validarYRecopilar(prefijo);
            
            if (!validacionAccesorios.valido) {
                const mensajeError = validacionAccesorios.errores.join('\n\n');
                alert(`⚠️ Por favor corrija los siguientes errores:\n\n${mensajeError}`);
                return;
            }
            
            // Validar campos comunes
            const validacionCampos = AccesorioValidator.validarCamposComunes(prefijo, esSalida);
            if (!validacionCampos.valido) {
                alert(validacionCampos.errores.join('\n'));
                return;
            }
            
            // Obtener destino/proveedor
            const destino = esSalida ? document.getElementById(`${prefijo}AccesorioDestino`).value : undefined;
            const proveedor = !esSalida ? document.getElementById(`${prefijo}AccesorioProveedor`).value : undefined;
            
            // Guardar cada accesorio como movimiento separado
            for (const acc of validacionAccesorios.accesorios) {
                const datosMovimiento = {
                    tipo: acc.tipo,
                    modelos: acc.modelos || [],
                    cantidad: acc.cantidad || 0,
                    descripcion: acc.descripcion || '',
                    destino,
                    proveedor
                };
                
                const resultado = await movimientoService.crearMovimiento({
                    tipo: datos.tipo,
                    datos: datosMovimiento
                });
                
                if (!resultado.exito) {
                    alert(`❌ Error al guardar ${acc.tipo}: ${resultado.error}`);
                    return;
                }
            }
            
            alert(`✅ ${validacionAccesorios.accesorios.length} movimiento(s) registrado(s) correctamente`);
            this.cancelarMovimiento();
            await this.actualizarResumenMovimientos();
            await this.actualizarResumenVentas();
            return;
        }

        // ... resto del código para otros tipos de movimiento ...
        
    } catch (error) {
        console.error('Error al guardar movimiento:', error);
        alert('❌ Error al guardar el movimiento: ' + error.message);
    } finally {
        this._guardandoMovimiento = false;
    }
}
```

---

### 3️⃣ **Mantener `Movimiento.js` con validación básica**

**Ubicación:** `public/js/models/Movimiento.js`

El modelo `Movimiento` **ya tiene** su método `.validar()`, que se mantiene para validaciones generales:

```javascript
// Movimiento.js - Validación general (YA EXISTE)
validar() {
    const errores = [];
    
    if (!this.tipo) {
        errores.push('Debe especificar el tipo de movimiento');
    }
    
    // Validaciones básicas por tipo...
    
    return {
        valido: errores.length === 0,
        errores
    };
}
```

**NO necesita cambios** porque:
- Ya valida campos básicos requeridos
- `AccesorioValidator` se encarga de la lógica específica de accesorios
- Separación clara de responsabilidades

---

## 📊 Flujo de Validación Completo

```
┌─────────────────────────────────────────────────────────────┐
│  1. Usuario llena formulario de movimiento de accesorios   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. main.js - guardarMovimiento()                           │
│     - Recopila datos básicos del formulario                 │
│     - Detecta que es movimiento de accesorios               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. AccesorioValidator.validarYRecopilar(prefijo)           │
│     ✅ Valida cada tipo de accesorio marcado                │
│     ✅ Verifica modelo, cantidad, color según el tipo       │
│     ✅ Retorna { valido, errores, accesorios }              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. AccesorioValidator.validarCamposComunes()               │
│     ✅ Valida destino (salida) o proveedor (ingreso)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. main.js - Itera sobre accesorios válidos                │
│     - Por cada accesorio crea un Movimiento                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. MovimientoService.crearMovimiento(datos)                │
│     - Crea instancia de Movimiento                          │
│     - Llama a movimiento.validar()                          │
│     - Guarda en Firebase vía StorageService                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  7. storageService.guardarMovimiento()                      │
│     - Persiste en Firebase                                  │
│     - Retorna resultado                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Beneficios de esta Arquitectura

### 1️⃣ **Separación de Responsabilidades**
- ✅ `main.js` → UI y coordinación (reducir tamaño)
- ✅ `AccesorioValidator.js` → Lógica de validación específica
- ✅ `MovimientoService.js` → Operaciones CRUD
- ✅ `Movimiento.js` → Modelo de datos con validación básica

### 2️⃣ **Reutilización**
- `AccesorioValidator` puede usarse en otras páginas si es necesario
- Lógica centralizada = fácil de mantener

### 3️⃣ **Testeable**
- Cada componente puede probarse de forma aislada
- `AccesorioValidator.validarYRecopilar('salida')` es una función pura

### 4️⃣ **Escalable**
- Agregar nuevo tipo de accesorio = solo modificar `AccesorioValidator`
- No tocar `main.js` innecesariamente

### 5️⃣ **Mantenible**
- Código más corto y legible
- Búsqueda de bugs más rápida
- Refactorización más segura

---

## 📝 Checklist de Implementación

- [ ] Crear `public/js/services/AccesorioValidator.js`
- [ ] Implementar métodos de validación específicos
- [ ] Actualizar `main.js` para importar y usar `AccesorioValidator`
- [ ] Eliminar código de validación de accesorios de `main.js`
- [ ] Probar flujo completo de salida de accesorios
- [ ] Probar flujo completo de ingreso de accesorios
- [ ] Verificar mensajes de error claros
- [ ] Documentar cambios en código

---

## 🎯 Conclusión

**SÍ, es CORRECTO implementar las validaciones en un servicio separado**, no en `main.js`.

La arquitectura propuesta:
- ✅ Sigue los principios SOLID
- ✅ Mantiene la coherencia con el proyecto existente
- ✅ Reduce el tamaño de `main.js` (actualmente 4153 líneas)
- ✅ Facilita el mantenimiento futuro
- ✅ Es profesional y escalable

**Recomendación:** Implementar `AccesorioValidator.js` como servicio especializado.
