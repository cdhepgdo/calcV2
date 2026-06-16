# Análisis y Solución de Bugs — Movimientos de Accesorios (Salida/Ingreso)

**Proyecto:** calcV2 (Sistema de Ventas iPhone)
**Archivos afectados:** `public/cierree.html`, `public/js/main.js`, `public/js/services/AccesorioValidator.js`
**Fecha:** 2026-06-08

---

## 📋 Resumen ejecutivo

Al intentar registrar un movimiento de **Salida** o **Ingreso de Accesorios** con todos los checkboxes marcados, se presentan **dos bugs encadenados**:

| # | Bug | Síntoma | Severidad |
|---|-----|---------|-----------|
| 1 | **HTML ↔ Validator (Protector de Cámara)** | Error "no seleccionaste una cantidad de protectores de cámara" aunque el input existe | 🟠 Alto |
| 2 | **`accesorio` vs `accesorios` en Caja** | `TypeError: Cannot read properties of undefined (reading 'tipo')` — y los forros/vidrios SÍ se guardan antes de que truene | 🔴 Crítico |

> ⚠️ Ambos bugs se retroalimentan: el bug 2 lanza el `TypeError` justo después de que el bucle ya guardó los forros y vidrios, dando la apariencia de que "se guardaron a medias".

---

## 🐞 Bug 1 — Protector de Cámara: el selector del validator no coincide con el `id` del HTML

### 1.1 Síntoma

Al marcar **todos** los checkboxes de accesorios (Forro, Vidrio, Caja, Cargador, **Protector de Cámara**, Cubo, Cable Lightning, Cable C+C, Otro) y completar los datos, al pulsar **"Registrar Movimiento"** aparece:

```
❌ Protector de Cámara: La cantidad debe ser mayor a 0
```

…aunque el input de cantidad del Protector de Cámara **sí está visible y con valor 1** en pantalla.

### 1.2 Causa raíz

Hay un **desajuste de IDs** entre el HTML y el `AccesorioValidator`.

**📄 Archivo:** `public/cierree.html`

| Línea | HTML actual (input + contenedor) |
|------:|----------------------------------|
| 1284‑1291 | `id="salidaProtectorCamara"` + `id="salidaProtectorCantidad"` |
| 1431‑1437 | `id="ingresoProtectorCamara"` + `id="ingresoProtectorCantidad"` |

```html
<!-- Salida de Accesorio — Protector Cámara (línea ~1284) -->
<input type="checkbox" id="salidaProtectorCamara" ...>
<div id="salidaProtectorCantidad" class="hidden">
    <input type="number" min="1" value="1" ...>
</div>
```

**📄 Archivo:** `public/js/services/AccesorioValidator.js` (línea 60‑66 y 243)

```js
const accesoriosSimples = [
    { id: 'Cargador',       nombre: 'Cargador' },
    { id: 'ProtectorCamara',nombre: 'Protector de Cámara' },   // ← id = "ProtectorCamara"
    ...
];

// Línea 243: selector generado
const cantidad = parseInt(
    document.querySelector(`#${prefijo}${id}Cantidad input`)?.value
) || 0;
```

Con `prefijo = "salida"` y `id = "ProtectorCamara"`, el selector construido es:

```
#salidaProtectorCamaraCantidad input
```

→ **NO EXISTE** en el HTML (el real es `#salidaProtectorCantidad`).

Resultado: `document.querySelector(...)` devuelve `null` → `?.value` es `undefined` → `parseInt(undefined)` = `NaN` → `NaN || 0` = `0` → entra al branch de error (`cantidad <= 0`).

> 💡 **Por qué los demás accesorios (Cargador, Cubo, Cables) sí funcionan**: porque para ellos el prefijo del HTML coincide con el `id` del array (`salidaCargadorCantidad`, `salidaCuboCantidad`, etc.). El único caso con discrepancia es **Protector de Cámara**.

### 1.3 Solución

Hay **dos opciones** (cualquiera de las dos funciona; recomiendo la **A** por ser menos invasiva):

#### ✅ Opción A — Ajustar el array en el Validator (1 línea, recomendado)

**📄 Archivo:** `public/js/services/AccesorioValidator.js`
**📍 Línea:** 62

```diff
 const accesoriosSimples = [
     { id: 'Cargador', nombre: 'Cargador' },
-    { id: 'ProtectorCamara', nombre: 'Protector de Cámara' },
+    { id: 'Protector', nombre: 'Protector de Cámara' },
     { id: 'Cubo', nombre: 'Cubo' },
     { id: 'CableLightning', nombre: 'Cable Lightning' },
     { id: 'CableCC', nombre: 'Cable C+C' }
 ];
```

**Por qué funciona**: con `id = "Protector"`, el selector pasa a ser `#salidaProtectorCantidad input`, que **sí existe** en el HTML.

> 📌 **IMPORTANTE:** Si haces la opción A, **debes** asegurarte de que el HTML del checkbox usa exactamente `id="salidaProtector"` e `id="ingresoProtector"`, o dejar `id="salidaProtectorCamara"` y entonces sería el del Validator. Con la corrección propuesta arriba se mantiene la convención del HTML actual.

#### ✅ Opción B — Ajustar los IDs del HTML (2 cambios)

**📄 Archivo:** `public/cierree.html`
**📍 Líneas:** 1284 y 1290 (salida), 1431 y 1437 (ingreso)

```diff
 <!-- Salida -->
-<input type="checkbox" id="salidaProtectorCamara" ...>
+<input type="checkbox" id="salidaProtectorCamara" ...>
-<div id="salidaProtectorCantidad" class="hidden">
+<div id="salidaProtectorCamaraCantidad" class="hidden">
     <input type="number" min="1" value="1" ...>
 </div>

 <!-- Ingreso (mismo cambio de id en línea ~1434) -->
-<div id="ingresoProtectorCantidad" class="hidden">
+<div id="ingresoProtectorCamaraCantidad" class="hidden">
     <input type="number" min="1" value="1" ...>
 </div>
```

Y luego actualizar el listener de los checkboxes en `public/js/main.js` (línea 3474 y 3563) que referencia `salida${tipo}Cantidad` — no requiere cambio porque la variable `tipo` viene del array (`'ProtectorCamara'`).

### 1.4 Cómo verificar la solución

1. Marcar **todos** los checkboxes de Salida Accesorio.
2. Completar modelo + cantidad en Forro y Vidrio, cantidad 1 en Cargador/Protector/Cubo/Cables.
3. Click "Registrar Movimiento".
4. **Esperado:** Si todos los datos están bien, debe llegar a la validación final y/o guardar correctamente. **No debe aparecer** "Protector de Cámara: La cantidad debe ser mayor a 0".

---

## 🐞 Bug 2 — `Cannot read properties of undefined (reading 'tipo')` en `guardarMovimiento`

### 2.1 Síntoma

Al corregir el bug 1 (o desactivando el Protector de Cámara) y volver a intentar el registro, el flujo se rompe con:

**En la UI:**
```
❌ Error al guardar el movimiento: Cannot read properties of undefined (reading 'tipo')
```

**En la consola:**
```
main.js:3944 Error al guardar movimiento:
  TypeError: Cannot read properties of undefined (reading 'tipo')
      at App.guardarMovimiento (main.js:3798:35)
```

Y lo más confuso: **los forros y vidrios YA APARECEN en el resumen de "Movimientos del Día"** (se renderizan correctamente), pero el alert de error salta y no se guarda el resto.

### 2.2 Causa raíz

Hay **dos bugs cooperando** dentro de la misma cadena:

#### Sub‑bug 2A — `resultadoCaja.accesorio` (singular) vs `accesorios` (plural)

**📄 Archivo:** `public/js/services/AccesorioValidator.js`
**📍 Línea:** 53

```js
// Línea 47-54
const cajaCheckbox = document.getElementById(`${prefijo}Caja`);
if (cajaCheckbox?.checked) {
    const resultadoCaja = this._validarCaja(prefijo);
    if (!resultadoCaja.valido) {
        errores.push(...resultadoCaja.errores);
    } else {
        accesorios.push(resultadoCaja.accesorio);   // ❌ BUG: 'accesorio' no existe
    }
}
```

Y en `_validarCaja` (líneas 226‑235), el método retorna la propiedad **`accesorios`** (plural, como array), no `accesorio`:

```js
return {
    valido: true,
    accesorios: [{ tipo: 'Caja', modelos: cajas }]   // ← plural
};
```

**Consecuencia:**
- `resultadoCaja.accesorio` → `undefined`
- `accesorios.push(undefined)` → el array `accesorios` ahora contiene un `undefined` mezclado con los objetos reales.

**Comparación con los otros métodos** (que SÍ funcionan):

| Método        | Línea | Devuelve        | Consumido en              |
|---------------|------:|-----------------|---------------------------|
| `_validarForros`   | 163   | `accesorios: [...]` | spread `...resultadoForro.accesorios` (línea 27) ✅ |
| `_validarVidrios`  | 196   | `accesorios: [...]` | spread `...resultadoVidrio.accesorios` (línea 41) ✅ |
| `_validarCaja`     | 231   | `accesorios: [...]` | **`resultadoCaja.accesorio` (singular) (línea 53) ❌** |
| `_validarAccesorioSimple` | 252 | `accesorio: {...}`  | `resultado.accesorio` (singular) (línea 75) ✅ |
| `_validarOtros`    | 291   | `accesorios: [...]` | spread `...resultadoOtro.accesorios` (línea 89) ✅ |

#### Sub‑bug 2B — El bucle de guardado itera sobre un array con `undefined`

**📄 Archivo:** `public/js/main.js`
**📍 Líneas:** 3794‑3823

```js
if (datos.esMultipleAccesorios) {
    for (const acc of datos.accesorios) {            // ← itera
        const datosMovimiento = {
            tipo: acc.tipo,                          // ← línea 3798: revienta si acc es undefined
            modelos: acc.modelos || [],
            cantidad: acc.cantidad || 0,
            descripcion: acc.descripcion || '',
            destino: datos.destino,
            proveedor: datos.proveedor
        };

        const resultado = await movimientoService.crearMovimiento({
            tipo: datos.tipo,
            datos: datosMovimiento
        });

        if (!resultado.exito) {
            const errores = resultado.errores ? resultado.errores.join('\n') : 'Error desconocido';
            alert(`❌ Error al guardar ${acc.tipo}:\n${errores}`);  // ← también fallaría
            return;
        }
    }
    // ...
}
```

**Flujo del bug:**

1. El usuario marca **Forro, Vidrio y Caja** (y desactiva Protector por el bug 1).
2. `AccesorioValidator.validarYRecopilar('salida')` retorna:
   - `accesorios: [{tipo:'Forro', modelos:[...]}, {tipo:'Vidrio', modelos:[...]}, undefined]` ← 💥 el `undefined` viene del sub‑bug 2A
   - `errores: []` (todo válido)
   - `valido: true`
3. En `guardarMovimiento`, el `for` itera:
   - Iteración 1: `acc = {tipo:'Forro', ...}` → guarda OK ✅
   - Iteración 2: `acc = {tipo:'Vidrio', ...}` → guarda OK ✅
   - Iteración 3: `acc = undefined` → `acc.tipo` → **`TypeError: Cannot read properties of undefined (reading 'tipo')`** 💥
4. El `catch` (línea 3943) captura el error, muestra alert y aborta.
5. **Forros y vidrios ya quedaron guardados en Firebase/Storage** — por eso aparecen en el resumen. Solo Caja (y el resto) no se guardó.

### 2.3 Solución

#### ✅ Fix principal — Corregir el consumo de `resultadoCaja` (1 línea)

**📄 Archivo:** `public/js/services/AccesorioValidator.js`
**📍 Línea:** 53

```diff
 const cajaCheckbox = document.getElementById(`${prefijo}Caja`);
 if (cajaCheckbox?.checked) {
     const resultadoCaja = this._validarCaja(prefijo);
     if (!resultadoCaja.valido) {
         errores.push(...resultadoCaja.errores);
     } else {
-        accesorios.push(resultadoCaja.accesorio);
+        accesorios.push(...resultadoCaja.accesorios);   // ✅ spread del array plural
     }
 }
```

#### ✅ Fix defensivo recomendado — Blindar el bucle de guardado

Para que en el futuro, si por cualquier razón el array viniera con un `undefined`, no se caiga el proceso entero (con un alert poco descriptivo), añadir una validación previa al `for` y un `try/catch` interno por iteración.

**📄 Archivo:** `public/js/main.js`
**📍 Líneas:** 3794‑3823 (reemplazar el bloque completo)

```js
if (datos.esMultipleAccesorios) {
    // ── Defensa: descartar entradas inválidas ──
    const accesoriosValidos = (datos.accesorios || []).filter(
        acc => acc && typeof acc === 'object' && acc.tipo
    );

    if (accesoriosValidos.length === 0) {
        alert('❌ No hay accesorios válidos para guardar. Revisa los datos del formulario.');
        return;
    }

    // Guardar cada accesorio como movimiento separado
    for (const acc of accesoriosValidos) {
        const datosMovimiento = {
            tipo: acc.tipo,
            modelos: acc.modelos || [],
            cantidad: acc.cantidad || 0,
            descripcion: acc.descripcion || '',
            destino: datos.destino,
            proveedor: datos.proveedor
        };

        try {
            const resultado = await movimientoService.crearMovimiento({
                tipo: datos.tipo,
                datos: datosMovimiento
            });

            if (!resultado.exito) {
                const errores = resultado.errores ? resultado.errores.join('\n') : 'Error desconocido';
                alert(`❌ Error al guardar ${acc.tipo}:\n${errores}`);
                return;
            }
        } catch (errAcc) {
            console.error(`Error guardando accesorio ${acc.tipo}:`, errAcc);
            alert(`❌ Error inesperado al guardar ${acc.tipo}: ${errAcc.message}`);
            return;
        }
    }

    alert(`✅ ${accesoriosValidos.length} movimiento(s) de accesorios registrado(s) correctamente`);
    this.cancelarMovimiento();
    await this.actualizarResumenMovimientos();
    await this.actualizarResumenVentas();
    return;
}
```

> 🔍 **Nota sobre la limpieza del `this._guardandoMovimiento`**: ya hay un bloque `finally` (línea 3947) que lo resetea, así que el `return` temprano dentro del `try/catch` interno es seguro.

### 2.4 Cómo verificar la solución

1. Marcar **todos** los checkboxes de Salida Accesorio (incluida Caja con modelo + color + cantidad).
2. Click "Registrar Movimiento".
3. **Esperado:**
   - Se guarda cada accesorio como un movimiento independiente.
   - Aparece alert verde: *"✅ 9 movimiento(s) de accesorios registrado(s) correctamente"*
   - En "Movimientos del Día" aparecen **9 entradas** (Forro, Vidrio, Caja, Cargador, Protector, Cubo, Cable Lightning, Cable C+C, Otro).
4. Repetir lo mismo con **Ingreso de Accesorio**.

---

## 🧩 Resumen de cambios

| # | Archivo | Línea(s) | Tipo de cambio | Líneas a modificar |
|---|---------|---------:|----------------|--------------------|
| 1 | `public/js/services/AccesorioValidator.js` | 62 | Modificar | `'ProtectorCamara'` → `'Protector'` (en el array `accesoriosSimples`) |
| 2 | `public/js/services/AccesorioValidator.js` | 53 | Modificar | `accesorios.push(resultadoCaja.accesorio);` → `accesorios.push(...resultadoCaja.accesorios);` |
| 3 | `public/js/main.js` | 3794‑3823 | Reemplazar bloque | Añadir filtro defensivo + try/catch por iteración |

---

## 🔬 Diagnóstico técnico paso a paso (por si quieres validar)

### Trazado del flujo actual con el bug 1 y 2 activos

1. **Usuario marca todos los checkboxes** en `formSalidaAccesorio`.
2. `recopilarDatosMovimiento()` (main.js:3954) detecta `tipoMovimientoActual === 'formSalidaAccesorio'`.
3. Llama a `AccesorioValidator.validarYRecopilar('salida')` (main.js:4024).
4. Dentro del validator:
   - Forro/Vidrio: pasan la validación (con modelo + cantidad). Se agregan a `accesorios` con spread (línea 27 y 41) → ✅
   - **Caja**: `_validarCaja('salida')` retorna `{valido:true, accesorios:[{tipo:'Caja', modelos:cajas}]}`. Línea 53 hace `accesorios.push(resultadoCaja.accesorio)` → **`undefined` empuja al array** 💥
   - Cargador/ProtectorCamara/Cubo/Cables: `parseInt(input.value)` falla para ProtectorCamara por el bug 1 → se agrega error pero NO se agrega accesorio. Los demás (cantidad 1) sí se agregan con `accesorio` (singular) en línea 75 → ✅
   - Otro: si está marcado y completo, OK. Si no, no se agrega.
5. **Resultado del validator**: `valido: true, accesorios: [Forro, Vidrio, undefined, Cargador, Cubo, ...]`.
6. `recopilarDatosMovimiento` retorna ese objeto.
7. `guardarMovimiento` entra a `if (datos.esMultipleAccesorios)`.
8. `for (const acc of datos.accesorios)`:
   - Iter Forro → `movimientoService.crearMovimiento` → OK → guardado en storage ✅
   - Iter Vidrio → OK → guardado ✅
   - Iter **undefined** → `acc.tipo` → **TypeError** 💥
9. `catch` (main.js:3943) captura → alert "Cannot read properties of undefined (reading 'tipo')" → el `finally` (línea 3947) resetea el flag.
10. El usuario ve el alert de error, pero en el resumen de movimientos ya están Forro y Vidrio porque **se guardaron antes** del crash.

### Por qué solo Forro/Vidrio se "renderizan" antes del error

Cada iteración del `for` ejecuta un `await movimientoService.crearMovimiento(...)` (línea 3806) que es asíncrono. Cuando una iteración termina, el movimiento ya está en Storage. La siguiente iteración es la que rompe. Por eso el efecto visual es "se guardaron a medias".

---

## ⚠️ Recomendaciones adicionales (no críticas, pero convenientes)

1. **Consistencia de nombres en el validator**: unificar todos los métodos privados para que **siempre** devuelvan `accesorios` (plural) y todos los call-sites usen spread. Esto elimina la clase entera de bugs.

   ```js
   // Patrón único recomendado:
   return { valido: true, accesorios: [...] };
   // Y siempre consumir con:
   accesorios.push(...resultado.accesorios);
   ```

2. **Logs en el validator**: agregar `console.log('Resultado validación:', resultado)` en cada método privado facilitaría enormemente el debug de futuros casos.

3. **Tests unitarios**: este tipo de bug (singular vs plural, IDs que no coinciden) se previene con tests simples sobre `AccesorioValidator`. Valdría la pena añadir un archivo `AccesorioValidator.test.js`.

4. **HTML ↔ JS ID contract**: documentar en un `constants.js` o comentario la convención de IDs `salida${TipoAccesorio}Cantidad` y validar que el array `accesoriosSimples` use exactamente esos nombres.

---

## ✅ Resultado esperado tras aplicar los fixes

- ✅ Marcar todos los checkboxes ya no produce el error de "cantidad del Protector de Cámara".
- ✅ El registro de Salida/Ingreso de Accesorio guarda correctamente los 9 tipos sin lanzar `TypeError`.
- ✅ El resumen de "Movimientos del Día" muestra todos los accesorios registrados.
- ✅ Si en el futuro vuelve a haber un accesorio mal validado, el filtro defensivo lo descarta con un mensaje claro en lugar de un `TypeError` genérico.
