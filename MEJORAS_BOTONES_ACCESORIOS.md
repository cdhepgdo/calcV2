# ✅ Mejoras: Botones +/- y Caja Multi-Modelo

## 🎯 Cambios Implementados

### 1. Botones Diferenciados por Función

**ANTES:**
- Todas las filas tenían botón verde "+"
- No había forma de eliminar filas

**AHORA:**
- ✅ **Primera fila**: Botón verde "+" para agregar más filas
- ✅ **Filas adicionales**: Botón rojo "-" para eliminar

### 2. Caja Ahora Soporta Múltiples Modelos

**ANTES:**
- Caja solo permitía un modelo/color/cantidad
- No se podían registrar múltiples cajas de diferentes modelos

**AHORA:**
- ✅ Caja funciona igual que Forro y Vidrio
- ✅ Primera fila con botón "+" verde
- ✅ Filas adicionales con botón "-" rojo
- ✅ Permite registrar múltiples modelos y colores en una sola operación

---

## 📝 Archivos Modificados

### 1. `public/cierree.html`

#### Salida de Caja
```html
<!-- ANTES -->
<div id="salidaCajaModelo" class="hidden flex flex-col gap-2">
    <select class="p-2 border rounded-lg accModelo text-sm"></select>
    <select id="salidaCajaColorSelect" class="p-2 border rounded-lg text-sm"></select>
    <input type="number" min="1" value="1" class="p-2 border rounded-lg text-sm">
</div>

<!-- AHORA -->
<div id="salidaCajaContenedor" class="hidden flex-col gap-2">
    <div id="salidaCajaLista" class="flex flex-col gap-2">
        <div class="caja-item grid grid-cols-[1fr,1fr,auto,auto] gap-2 items-center">
            <select class="p-2 border rounded-lg accModelo text-sm"></select>
            <select class="p-2 border rounded-lg caja-color text-sm"></select>
            <input type="number" min="1" value="1" class="p-2 border rounded-lg w-16 caja-cant text-sm">
            <button type="button" class="btn-add-salida-caja bg-green-500 text-white w-8 h-8 rounded">+</button>
        </div>
    </div>
</div>
```

**Cambios:**
- ❌ Eliminado ID único `salidaCajaColorSelect`
- ✅ Agregado contenedor `salidaCajaLista` para filas dinámicas
- ✅ Clase `caja-color` para selects de color (antes era ID único)
- ✅ Clase `caja-cant` para inputs de cantidad
- ✅ Botón "+" para agregar filas
- ✅ Grid de 4 columnas: modelo, color, cantidad, botón

#### Ingreso de Caja
Mismo patrón aplicado para el formulario de ingreso.

---

### 2. `public/js/services/AccesorioValidator.js`

#### Método `_validarCaja()` Actualizado

**ANTES:**
```javascript
static _validarCaja(prefijo) {
    // Validaba UN solo modelo/color/cantidad
    const modelo = document.querySelector(`#${prefijo}CajaModelo .accModelo`)?.value;
    const color = document.getElementById(`${prefijo}CajaColorSelect`)?.value;
    const cantidad = parseInt(document.querySelector(`#${prefijo}CajaModelo input[type="number"]`)?.value);
    // ...
}
```

**AHORA:**
```javascript
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
            modelos: cajas  // Array de múltiples cajas
        }]
    };
}
```

**Cambios:**
- ✅ Itera sobre todas las filas `.caja-item`
- ✅ Valida cada fila individualmente
- ✅ Solo agrega filas completas (modelo + color + cantidad)
- ✅ Retorna array de cajas en lugar de una sola

---

### 3. `public/js/main.js`

#### 3.1. Evento de Checkbox de Caja Actualizado

**ANTES:**
```javascript
const contenedor = document.getElementById('salidaCajaModelo');
// ...
this._inicializarColorSelect('salidaCajaColorSelect'); // ID único
```

**AHORA:**
```javascript
const contenedor = document.getElementById('salidaCajaContenedor');
// ...
this._inicializarColorSelects('salidaCajaLista'); // Inicializa todos los selects
```

#### 3.2. Nuevo Método `_inicializarColorSelects()`

```javascript
/**
 * Inicializa todos los selects de color dentro de un contenedor
 * @private
 */
_inicializarColorSelects(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    const selects = contenedor.querySelectorAll('.caja-color');
    selects.forEach(select => {
        if (select.options.length === 0) {
            select.innerHTML = '<option value="">Seleccionar</option>';
            COLORES_IPHONE.forEach(color => {
                const option = document.createElement('option');
                option.value = color.valor;
                option.textContent = color.etiqueta;
                select.appendChild(option);
            });
        }
    });
}
```

**Función:**
- Busca todos los selects con clase `.caja-color` dentro del contenedor
- Llena cada uno con las opciones de colores

#### 3.3. Método `_inicializarBotonesAgregarFila()` Mejorado

**ANTES:**
- Solo botones "+" verdes
- Todas las filas tenían el mismo botón

**AHORA:**

##### Botones "+" (Agregar)
```javascript
// Botones de Caja (salida/ingreso)
if (e.target.classList.contains('btn-add-salida-caja') || 
    e.target.classList.contains('btn-add-ingreso-caja')) {
    const prefijo = e.target.classList.contains('btn-add-salida-caja') ? 'salida' : 'ingreso';
    const lista = document.getElementById(`${prefijo}CajaLista`);
    if (lista) {
        const nuevaFila = document.createElement('div');
        nuevaFila.className = 'caja-item grid grid-cols-[1fr,1fr,auto,auto] gap-2 items-center';
        nuevaFila.innerHTML = `
            <select class="p-2 border rounded-lg accModelo text-sm"></select>
            <select class="p-2 border rounded-lg caja-color text-sm"></select>
            <input type="number" min="1" value="1" class="p-2 border rounded-lg w-16 caja-cant text-sm">
            <button type="button" class="btn-remove-${prefijo}-caja bg-red-500 text-white w-8 h-8 rounded">-</button>
        `;
        lista.appendChild(nuevaFila);
        this._inicializarModeloSelects(`${prefijo}CajaLista`);
        this._inicializarColorSelects(`${prefijo}CajaLista`);
    }
}
```

##### Botones "-" (Eliminar)
```javascript
// Eliminar Caja
if (e.target.classList.contains('btn-remove-salida-caja') || 
    e.target.classList.contains('btn-remove-ingreso-caja')) {
    const fila = e.target.closest('.caja-item');
    if (fila) fila.remove();
}
```

**Lógica similar aplicada a:**
- Forro (salida/ingreso)
- Vidrio (salida/ingreso)
- Otro Accesorio (salida/ingreso)

---

## 🎨 Interfaz Visual

### Antes vs Ahora

#### ANTES
```
☑ Caja
  [Modelo      ▼]
  [Color       ▼]
  [Cantidad: 1  ]
  
→ Solo 1 modelo/color
```

#### AHORA
```
☑ Caja
  [Modelo     ▼] [Color    ▼] [Cant: 1] [+] ← Primera fila (verde)
  [Modelo     ▼] [Color    ▼] [Cant: 2] [-] ← Filas adicionales (rojo)
  [Modelo     ▼] [Color    ▼] [Cant: 1] [-]
  
→ Múltiples modelos/colores
→ Botón "+" solo en primera fila
→ Botón "-" en filas adicionales
```

---

## 🔄 Flujo de Uso

### Ejemplo: Registrar 3 cajas diferentes

1. Usuario marca checkbox "Caja"
2. Aparece primera fila con botón "+" verde
3. Usuario completa: iPhone 15, Negro, Cantidad: 2
4. Usuario hace clic en "+" → Aparece segunda fila con botón "-" rojo
5. Usuario completa: iPhone 14, Blanco, Cantidad: 1
6. Usuario hace clic en "+" → Aparece tercera fila con botón "-" rojo
7. Usuario completa: iPhone 13, Azul, Cantidad: 3
8. Usuario hace clic en "Registrar Movimiento"
9. Sistema valida las 3 cajas y crea 1 movimiento con:
   ```javascript
   {
     tipo: 'Caja',
     modelos: [
       { modelo: 'iPhone 15', color: 'Negro', cantidad: 2 },
       { modelo: 'iPhone 14', color: 'Blanco', cantidad: 1 },
       { modelo: 'iPhone 13', color: 'Azul', cantidad: 3 }
     ]
   }
   ```

---

## ✅ Validaciones

### Caja Multi-Modelo

```javascript
// Caso 1: Primera fila completa, segunda incompleta
Fila 1: iPhone 15, Negro, 2 ✅
Fila 2: iPhone 14, (sin color), 1 ❌

Resultado: ✅ Se registra solo iPhone 15 (fila incompleta se ignora)

// Caso 2: Ninguna fila completa
Fila 1: (sin modelo), Negro, 2 ❌
Fila 2: iPhone 14, (sin color), 1 ❌

Resultado: ❌ ERROR "Caja: Debe seleccionar al menos un modelo, color y cantidad válida"

// Caso 3: Todas las filas completas
Fila 1: iPhone 15, Negro, 2 ✅
Fila 2: iPhone 14, Blanco, 1 ✅
Fila 3: iPhone 13, Azul, 3 ✅

Resultado: ✅ Se registran 3 cajas en 1 movimiento
```

---

## 🎯 Beneficios

### Para el Usuario
- ✅ Interfaz más intuitiva (+ para agregar, - para quitar)
- ✅ Puede registrar múltiples cajas de diferentes modelos/colores
- ✅ Mayor flexibilidad en el registro
- ✅ Menos confusión sobre qué hace cada botón

### Para el Sistema
- ✅ Código consistente (Caja funciona igual que Forro/Vidrio)
- ✅ Validación robusta por fila
- ✅ Estructura de datos clara
- ✅ Fácil de mantener y extender

---

## 📊 Comparativa de Funcionalidades

| Accesorio | Multi-Modelo | Botón "+" | Botón "-" | Estado |
|-----------|--------------|-----------|-----------|--------|
| Forro | ✅ | ✅ (verde) | ✅ (rojo) | ✅ Actualizado |
| Vidrio | ✅ | ✅ (verde) | ✅ (rojo) | ✅ Actualizado |
| **Caja** | ✅ **NUEVO** | ✅ (verde) | ✅ (rojo) | ✅ **Mejorado** |
| Otro | ✅ | ✅ (verde) | ✅ (rojo) | ✅ Actualizado |
| Cargador | ❌ | N/A | N/A | Sin cambios |
| Protector | ❌ | N/A | N/A | Sin cambios |
| Cubo | ❌ | N/A | N/A | Sin cambios |
| Cable Light | ❌ | N/A | N/A | Sin cambios |
| Cable C+C | ❌ | N/A | N/A | Sin cambios |

---

## 🧪 Casos de Prueba

### Test 1: Botón "+" agrega fila con botón "-"
```
1. Marcar checkbox "Caja"
2. Hacer clic en botón "+" verde de la primera fila
3. Verificar que aparece segunda fila con botón "-" rojo

Resultado Esperado: ✅ Segunda fila con botón "-" rojo
```

### Test 2: Botón "-" elimina fila
```
1. Marcar checkbox "Caja"
2. Hacer clic en "+" para crear segunda fila
3. Hacer clic en botón "-" rojo de la segunda fila
4. Verificar que la fila desaparece

Resultado Esperado: ✅ Fila eliminada, solo queda la primera
```

### Test 3: Múltiples cajas con diferentes modelos
```
1. Marcar checkbox "Caja"
2. Fila 1: iPhone 15, Negro, 2
3. Clic en "+" → Fila 2: iPhone 14, Blanco, 1
4. Clic en "+" → Fila 3: iPhone 13, Azul, 3
5. Registrar movimiento

Resultado Esperado: 
✅ "1 movimiento(s) de accesorios registrado(s) correctamente"
✅ Movimiento contiene 3 cajas diferentes
```

### Test 4: Validación de filas incompletas
```
1. Marcar checkbox "Caja"
2. Fila 1: iPhone 15, (sin color), 2
3. Registrar movimiento

Resultado Esperado:
❌ ERROR "Caja: Debe seleccionar al menos un modelo, color y cantidad válida"
```

---

## 📝 Resumen de Cambios

### HTML (cierree.html)
- ✅ Caja ahora tiene estructura de lista (`salidaCajaLista` / `ingresoCajaLista`)
- ✅ Clase `caja-color` en lugar de ID único
- ✅ Clase `caja-cant` para cantidades
- ✅ Botón "+" en primera fila

### Validador (AccesorioValidator.js)
- ✅ Método `_validarCaja()` itera sobre múltiples filas
- ✅ Valida cada fila individualmente
- ✅ Retorna array de cajas

### JavaScript (main.js)
- ✅ Evento de Caja actualizado para multi-fila
- ✅ Nuevo método `_inicializarColorSelects()` para llenar múltiples selects
- ✅ Botones "+" crean filas con botón "-" rojo
- ✅ Botones "-" eliminan filas
- ✅ Lógica aplicada a Forro, Vidrio, Caja y Otro

---

## ✅ Estado

- ✅ Implementación completa
- ✅ Sin errores de sintaxis
- ✅ Validaciones actualizadas
- ✅ Consistente con otros accesorios multi-modelo
- ✅ Listo para testing

**Próximo paso:** Probar en navegador que:
1. Primera fila tiene botón "+" verde
2. Botón "+" crea fila con botón "-" rojo
3. Botón "-" elimina la fila
4. Se pueden registrar múltiples cajas de diferentes modelos/colores
5. Validación funciona correctamente

---

**Fecha:** 7 de junio de 2026
**Estado:** ✅ Completado
