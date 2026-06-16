# Plan: Conectar `Venta.validar()` al submit + `required` en inputs críticos

> Documento vivo. 2026-06-12. Rama: `version-3.6`. Sin commitear.

## 0. Contexto

**Bug confirmado** (reportado por el usuario): si el operador aprieta "Registrar Venta" sin completar casi nada del formulario, la venta **se guarda igual**. La factura de prueba quedó con cliente vacío, sin equipos, monto 0, sin forma de pago.

### Por qué pasa

El modelo `Venta.validar()` SÍ existe y SÍ cubre los 6 chequeos básicos (forma de pago, monto, equipo, cliente, IMEI ≥15, precio). Pero el submit de `main.js` (línea 1299-1603) **nunca lo invoca**:

```
main.js:1317  →  this.recopilarDatosVenta()
main.js:1332-1426  →  chequeos inline de IMEI (parciales, solo IMEI)
main.js:1438  →  this._validarImeisDuplicadosEnVenta()  (solo duplicados N×N)
main.js:1462  →  new Venta({...})
main.js:1557  →  inventarioService.commitVentaConInventario(...)
```

El commit va directo a `InventarioService` saltándose `VentaService.crearVenta()` / `actualizarVenta()`, que son los únicos lugares donde se llama a `validar()`.

### Por qué es grave

- **Venta fantasma** en registro y cierre de caja con monto 0.
- **Cliente vacío** → no se puede buscar al cliente después para garantía / devoluciones.
- **Sin forma de pago** → no se puede calcular el cierre de caja.
- **Sin equipos** pero con monto > 0 → ¿de dónde salió ese monto? No se puede cuadrar caja.

### Lo que el usuario ya me dijo (memoria)

- "Sin validaciones extrañas" — solo las 2 reglas acordadas + lo mínimo para que funcione.
- Las 2 reglas: (1) no repetir IMEI con ventas anteriores, (2) trade-in no puede ser `disponible`/`defectuoso` en inventario.
- Este fix **no agrega validaciones nuevas**. Solo conecta las que ya existen.

## 1. Cambios a hacer

### 1.1 `public/js/main.js` — invocar `validar()` en el submit (mínimo invasivo)

**Dónde**: dentro de `manejarSubmitVenta`, **antes** del `new Venta()` (línea 1462) y del batch.

**Qué**:
```javascript
// Construir instancia de Venta (asigna id si no tiene) — ANTES de esto:
const ventaIdFinal = this.ventaEnEdicion || `venta_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const ventaInstancia = new Venta({ ...datosVenta, id: ventaIdFinal });

// Validar modelo (cliente, monto, formaPago, equipos, accesorios, pagos)
const validacion = ventaInstancia.validar();
if (!validacion.valido) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = textoOriginal;
    // UX confirmada: un solo alert con TODOS los errores juntos (estilo ya usado
    // en _validarImeisDuplicadosEnVenta). El operador ve todo y corrige todo de una.
    const erroresConBala = validacion.errores.map(e => `• ${e}`).join('<br>');
    mostrarAlerta(`❌ No se puede registrar la venta:<br>${erroresConBala}`, 'error');
    return;
}
```

**Por qué en este punto y no antes**:
- Los chequeos inline de IMEI (reglas 1 y 2) ya están pasando.
- `_validarImeisDuplicadosEnVenta` también ya está pasando.
- `validar()` corre **al final** del pipeline, después de todos los chequeos específicos de IMEI.
- Si `validar()` pasa, recién ahí hacemos el `commitVentaConInventario`.

**Orden final del submit**:
1. `recopilarDatosVenta()`
2. Auto-corrección `montoTotal` con suma de precios
3. Validación inline IMEI recibidos (regla 2: no `disponible`/`defectuoso`)
4. Validación inline IMEI vendidos
5. `_validarImeisDuplicadosEnVenta` (N.1, N.2, N.3)
6. **NUEVO**: `ventaInstancia.validar()` (cliente, monto, formaPago, equipos, etc.)
7. `inventarioService.commitVentaConInventario(...)`

### 1.2 Validación visual: 1 sola fuente de verdad (JS)

**Decisión final (2026-06-12)**: eliminar TODOS los `required` HTML5 y dejar que `Venta.validar()` (JS) sea la **única** fuente de mensajes de error. Razones:

1. **UX unificada**: el operador ve siempre el mismo estilo de alerta (la roja con bullets), no mezcla "borde nativo del navegador" + "alert custom".
2. **Sin riesgo de "input not focusable"**: si alguien en el futuro pone `required` en un input dentro de un bloque `hidden` (como pasó con `montoTotalManual` adentro de `#weppaMontoEditable`), vuelve el bug. Con solo JS, eso es imposible.
3. **Mensajes específicos del negocio**: "Debe seleccionar un equipo del inventario para la venta" es 1000 veces más útil que "Completa este campo" genérico.

**El asterisco rojo `*` en los labels** se conserva como guía visual de "campo obligatorio", pero ya no es `required` HTML.

**Archivos modificados**:
- `cierree.html` — quitados los 3 `required` de cliente (los 3 inputs quedan con `placeholder` y label con `*`).
- `main.js` — `manejarCambioTipoVenta` ya no necesita el toggle de `required` (volvió a su forma simple de 8 líneas).

**NO se cambia**:
- `invBuscadorInput` → la pila vacía se valida en `validar()` con mensaje "Debe seleccionar al menos un equipo".
- Radio buttons (`formaPago`, `tipoVenta`, `tipoTransaccion`) → sin `required` HTML, `validar()` los cubre.
- `montoTotalManual` → sin `required` HTML (input oculto dentro de `#weppaMontoEditable`). `validar()` chequea `montoTotal <= 0`.

### 1.3 `manejarCambioTipoVenta` — versión final simplificada

`#datosClienteSection` arranca con `display: none` cuando `tipoVenta='accesorios'`. **No se necesita toggle de `required`** porque ya no hay ningún `required` HTML. El método volvió a su forma original simple (8 líneas).

### 1.4 NO se cambia

- `Venta.validar()` — sus mensajes ya están bien.
- `VentaService.crearVenta()` / `actualizarVenta()` — siguen ahí por si en el futuro se llama desde otro lugar, pero el submit sigue yendo directo al batch (como pediste, para mantener el patrón local-first).
- Los chequeos inline de IMEI — están bien, son específicos y no se superponen con `validar()`.

## 2. Archivos críticos a modificar

- `public/js/main.js` — bloque de `validar()` en `manejarSubmitVenta` (8 líneas).
- `public/cierree.html` — quitados los 3 `required` HTML (3 líneas).
- `public/js/main.js` — `manejarCambioTipoVenta` simplificado (volvió a 8 líneas sin toggle).

## 3. Verificación

### 3.1 Pruebas de seguridad (lo que el bug exponía)

| # | Escenario | Esperado |
|---|---|---|
| 1 | Submit con cliente vacío, sin equipos, sin forma de pago | **BLOQUEADO** con 6 errores en alert rojo |
| 2 | Submit con `montoTotal = 0` y precio en la pila | **BLOQUEADO** "El monto total debe ser mayor a $0.00" |
| 3 | Submit con `montoTotal = -50` | **BLOQUEADO** igual |
| 4 | Submit con equipo seleccionado pero `precio = 0` | **BLOQUEADO** "El equipo #1 no tiene precio asignado" |
| 5 | Submit con equipo seleccionado pero sin garantía | **BLOQUEADO** "Debe seleccionar el tipo de garantía" |
| 6 | Submit con tipo venta='accesorios' sin accesorios | **BLOQUEADO** "Debe seleccionar al menos un accesorio" |
| 7 | **Submit con WEPPA activo y `montoTotalManual` en 0** | **BLOQUEADO** (validar() chequea montoTotal) |
| 8 | **Submit con `montoTotalManual` oculto** | **NO debe tirar** "not focusable" (sin required HTML) |

### 3.2 Pruebas de regresión (no debe romperse nada)

| # | Escenario | Esperado |
|---|---|---|
| 1 | Venta completa normal (1 equipo, 1 trade-in, pago mixto) | Se guarda |
| 2 | Venta solo accesorios (3 vidrios, sin cliente) | Se guarda |
| 3 | Edición de venta existente | Se actualiza |
| 4 | Venta con WEPPA activado (diferencia intencional) | Se guarda (WEPPA bypasea validación pagos) |
| 5 | Venta tipo "abono" con `abonosPrevios` | Se guarda |
| 6 | Venta con 3 equipos vendidos | Se guarda |
| 7 | Venta con 2 trade-ins | Se guarda |

## 4. Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| `validar()` reporta errores que no aplican a este flujo (ej: abono sin formaPago) | Revisar manualmente los 7 escenarios de regresión después del cambio |
| El usuario ya validó todo y el modelo agrega un mensaje nuevo que confunde | Probar el flujo normal end-to-end y ver que no aparezca ningún error |
| `required` HTML en `montoTotalManual` molesta cuando el operador usa auto-llenado | El `required` se valida solo en submit. Si auto-llenado pone un valor antes, no se queja |
| Algún campo de "venta de accesorios" termina con `required` que no aplica | Solo marco cliente/formaPago/equipo. Accesorios se valida en el modelo sin `required` |
| `required` en cliente bloquea ventas de accesorios (donde cliente no aplica) | `manejarCambioTipoVenta()` remueve/restaurar `required` al cambiar tipoVenta |

## 5. Estado de implementación

- ✅ `main.js` — bloque `ventaInstancia.validar()` agregado en `manejarSubmitVenta` (líneas 1476-1491).
- ✅ `cierree.html` — **eliminados los 3 `required` HTML5** de cliente. Validación 100% por JS.
- ✅ `main.js` — `manejarCambioTipoVenta()` simplificado (sin toggle de `required`, volvió a 8 líneas).
- ✅ `cierree.html` — `montoTotalManual` sin `required` (input oculto, no focuseable).
- ⏳ Pendiente: probar end-to-end los 7 escenarios de regresión + 8 de seguridad.

## 6. Resultado esperado al hacer submit con todo vacío

```
[ERROR] ❌ No se puede registrar la venta:
• Debe seleccionar una forma de pago
• El monto total debe ser mayor a $0.00
• Debe seleccionar al menos un equipo del inventario para la venta
• Debe ingresar el nombre del cliente
• Debe ingresar la cédula del cliente
• Debe ingresar el teléfono del cliente
```

Y la venta **NO se guarda**. Antes se guardaba con datos vacíos.
