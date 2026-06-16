# Plan: Equipos recibidos (trade-in) — sincronización con inventario y validación de IMEI

## 1. Diagnóstico

### 1.1 Archivo vivo confirmado
- `public/cierree.html` carga `public/js/main.js` (línea 1183).
- `cierre.html` y `cierre2.html` ya fueron eliminados → no hay código legacy que mantener alineado.

### 1.2 Hallazgos

**Hallazgo A — La guarda por IMEI se confunde con "ya está en inventario".**
`public/js/main.js:1043-1062`:
```js
if (!this.ventaEnEdicion && datosVenta.equipoRecibido && datosVenta.equipoRecibido.imei) {
    const eqExiste = inventarioService.buscarPorImei(datosVenta.equipoRecibido.imei);
    if (!eqExiste) { /* ingresar */ }
}
```
- `buscarPorImei` (`InventarioService.js:64`) busca **cualquier estado** (disponible / vendido / defectuoso).
- Cuando el operador escribe el IMEI del propio iPhone que está vendiendo, o el de un equipo ya vendido, `eqExiste` es truthy y **se salta el ingreso silenciosamente**, sin avisar.
- Esto explica "los equipos recibidos no se están agregando al inventario": en muchos casos ya estaban, pero en otros (IMEI del equipo vendido) nunca se crearon y nadie se enteró.

**Hallazgo B — La edición está excluida de la sincronización.**
La condición `!this.ventaEnEdicion` significa que si el operador:
- edita una venta que originalmente NO tenía trade-in y le agrega uno, **no se ingresa al inventario**;
- edita una venta que SÍ tenía trade-in, el registro viejo del inventario queda intacto, pero si cambia el IMEI se pierde trazabilidad y el nuevo trade-in tampoco entra.

**Hallazgo C — `equipoImeiR` no tiene validación de IMEI.**
- La validación `_obtenerConflictoImei` (líneas 988-1009 en submit, 1581-1590 al tipear) solo opera sobre `#equipoImei` (equipo vendido).
- El input `#equipoImeiR` (equipo recibido) acepta cualquier cadena: IMEI de un equipo disponible, IMEI de un equipo vendido, IMEI del mismo iPhone que se vende en esa misma transacción.
- Por eso "pude poner el IMEI de un equipo tanto vendido como disponible y la venta se registró": no hay nada que lo detenga.

**Hallazgo D — Doble submit no se cubre con `buscarPorImei` después del primer save.**
Si el operador hace doble clic rápido, ambos submits ejecutan `buscarPorImei` antes de que el listener de Firestore actualice la caché → ambos ven `eqExiste === null` y crean el mismo trade-in dos veces. La guarda está mal ubicada.

**Hallazgo E — `Venta.js` no exige IMEI con longitud válida.**
`Venta.js:115` exige IMEI no vacío, pero no longitud (el `EquipoInventario` sí exige 15, pero el modelo `Venta` no se valida contra `EquipoInventario.validar()`). Consecuencia: si el operador escribe "123" en `#equipoImeiR`, la venta pasa y el equipo se intenta meter al inventario, donde sí se valida… pero el `ingresarEquipo` se hace en background con `.catch(console.warn)`, así que el error se traga.

---

## 2. Objetivos del plan

| # | Objetivo | Criterio de éxito |
|---|---|---|
| O1 | Impedir que un trade-in use un IMEI que ya está en el inventario (cualquier estado). | El operador recibe mensaje claro antes de poder submit. |
| O2 | Impedir que un trade-in use el mismo IMEI del equipo vendido en la misma transacción. | Mismo criterio. |
| O3 | Mostrar al operador, mientras tipea en `#equipoImeiR`, una advertencia visual si el IMEI coincide con uno conocido. | Toast amarillo aparece al tipear, igual que ya hace `#equipoImei`. |
| O4 | Sincronizar trade-in ↔ inventario también al editar ventas. | Editar una venta y agregar trade-in → aparece en inventario. Editar y quitar trade-in → se elimina del inventario. |
| O5 | No crear duplicados por doble submit. | Aunque el operador haga doble clic, el inventario no tiene dos registros con el mismo IMEI de trade-in. |
| O6 | Validar formato de IMEI antes de submit (mínimo 15 caracteres como en `EquipoInventario.validar`). | Mensaje de error si es muy corto. |

---

## 3. Diseño de la solución

### 3.1 Nuevo helper: `_obtenerConflictoImeiRecibido(imei, ventaIdExcluir)`

Misma forma que `_obtenerConflictoImei` pero con semántica para trade-in:
- Busca en `inventarioService.obtenerTodos()` por IMEI (cualquier estado) → retorna `{ tipo: 'inventario', equipo }`.
- Busca en `storageService.obtenerVentas()` por IMEI en `equipoRecibido.imei` → retorna `{ tipo: 'venta-recibido', venta }`.
- **No** busca por IMEI del equipo vendido, porque ese caso lo cubre O2 por separado.

Razón: el helper existente es para evitar vender dos veces el mismo equipo nuevo. Reutilizarlo con un "tipo" nuevo ensucia su contrato.

### 3.2 Guardia en submit para `#equipoImeiR`

Bloque nuevo en `manejarSubmitVenta`, después de la guarda existente de `#equipoImei`:

```js
// Solo aplica si #recibirEquipo está chequeado
if (document.getElementById('recibirEquipo')?.checked) {
    const imeiR = (document.getElementById('equipoImeiR')?.value || '').trim();
    const imeiVenta = (document.getElementById('equipoImei')?.value || '').trim();

    // O6: formato
    if (imeiR && imeiR.length < 15) {
        mostrarAlerta('❌ El IMEI del equipo recibido debe tener al menos 15 caracteres.', 'error');
        return restaurarBoton();
    }

    // O2: mismo IMEI que el equipo vendido en esta transacción
    if (imeiR && imeiR === imeiVenta) {
        mostrarAlerta(`❌ El IMEI del equipo recibido (${imeiR}) es igual al IMEI del equipo que se está vendiendo. No se puede recibir como parte de pago el mismo equipo.`, 'error');
        return restaurarBoton();
    }

    // O1: ya existe en inventario u otra venta como trade-in
    if (imeiR) {
        const conflicto = this._obtenerConflictoImeiRecibido(imeiR, this.ventaEnEdicion);
        if (conflicto) {
            const donde = conflicto.tipo === 'inventario'
                ? `ya está en el inventario (estado: ${conflicto.equipo.estado})`
                : `ya fue recibido como trade-in en otra venta`;
            mostrarAlerta(`❌ El IMEI ${imeiR} ${donde}. No se puede usar de nuevo.`, 'error');
            return restaurarBoton();
        }
    }
}
```

### 3.3 Toast amarillo al tipear en `#equipoImeiR`

Mismo patrón que `_revalidarImeiActual` (líneas 1581-1590), con un listener nuevo en `inicializarEventos`:

```js
const imeiRecibidoInput = document.getElementById('equipoImeiR');
if (imeiRecibidoInput) {
    imeiRecibidoInput.addEventListener('input', () => this._revalidarImeiRecibidoActual());
    imeiRecibidoInput.addEventListener('change', () => this._revalidarImeiRecibidoActual());
}
```

Y el método:

```js
_revalidarImeiRecibidoActual() {
    const imeiInput = document.getElementById('equipoImeiR');
    if (!imeiInput) return;
    const conflicto = this._obtenerConflictoImeiRecibido(imeiInput.value, this.ventaEnEdicion);
    this._mostrarToastConflictoImeiRecibido(conflicto);
}
```

El toast `#imeiConflictoToastRecibido` es un duplicado del actual pero con otro id y otro texto, ubicado debajo del campo `#equipoImeiR`. Más simple que reusar el mismo y parametrizarlo.

### 3.4 Sincronización de trade-in en edición (O4)

Reemplazar el bloque `if (!this.ventaEnEdicion && datosVenta.equipoRecibido && datosVenta.equipoRecibido.imei)` por una función dedicada `this._sincronizarTradeinInventario(datosVenta.equipoRecibido, ventaAnterior)` que cubre los 4 casos:

| Venta anterior | Venta nueva | Acción |
|---|---|---|
| Sin trade-in | Sin trade-in | Nada |
| Sin trade-in | Con trade-in (IMEI nuevo) | `ingresarEquipo` |
| Con trade-in (IMEI X) | Con trade-in (mismo IMEI X) | Nada (o `actualizar` campos no-IMEI) |
| Con trade-in (IMEI X) | Con trade-in (IMEI distinto Y) | Marcar X como `eliminado` + ingresar Y |
| Con trade-in (IMEI X) | Sin trade-in | Marcar X como `eliminado` |

Para "marcar como eliminado" usamos un nuevo estado `inventarioService.cambiarEstado(id, 'eliminado')`. No se borra el doc para preservar trazabilidad histórica.

Casos O5: dentro de `_sincronizarTradeinInventario`, antes de `ingresarEquipo`, hacer una segunda verificación contra Firestore directo (`getDoc` por IMEI en la colección) para evitar la carrera del doble submit. Si la primera escritura no ha confirmado aún, esta segunda lectura sí verá la realidad.

Alternativa más simple si la carrera es rara: usar un Set de IMEIs recién creados en esta sesión de la app, en `InventarioService`. Al inicio del `ingresarEquipo`, agregar IMEI al set; si ya está, no crear.

Recomiendo la segunda (Set en memoria) por simplicidad. La cubrimos si el problema reaparece.

### 3.5 Validación de formato en `Venta.js` (O6)

Agregar a la sección `if (this.equipoRecibido)` en `Venta.js:110-118`:

```js
if (!this.equipoRecibido.imei || this.equipoRecibido.imei.length < 15) {
    errores.push('El IMEI del equipo recibido debe tener al menos 15 caracteres');
}
```

Beneficio colateral: aunque `_obtenerConflictoImeiRecibido` ya exige IMEI para buscar, esta validación evita que un IMEI corto pero "no conflictivo" (porque la búsqueda usa `String(imei).trim().length < 6` como atajo en `_obtenerConflictoImei`, y nuestro nuevo helper hará lo mismo) pase la guarda por su longitud.

---

## 4. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `public/js/main.js` | • Nuevo helper `_obtenerConflictoImeiRecibido(imei, ventaIdExcluir)`. <br>• Nuevo método `_revalidarImeiRecibidoActual()`. <br>• Nuevo método `_mostrarToastConflictoImeiRecibido(conflicto)` (espejo del actual). <br>• Nuevo método `_sincronizarTradeinInventario(equipoRecibido, ventaAnterior)`. <br>• Agregar listener `#equipoImeiR` en `inicializarEventos`. <br>• Bloque nuevo de guarda en `manejarSubmitVenta` después de la guarda de `#equipoImei`. <br>• Reemplazar el bloque inline `if (!this.ventaEnEdicion && …)` por la llamada a `_sincronizarTradeinInventario(equipoRecibido, ventaAnterior)`. <br>• `limpiarFormularioVenta`: llamar también a `_mostrarToastConflictoImeiRecibido(null)`. |
| `public/cierree.html` | • Agregar `<div id="imeiConflictoToastRecibido">` debajo del campo `#equipoImeiR`, idéntico en estructura al `#imeiConflictoToast` existente. |
| `public/js/models/Venta.js` | • Validación de longitud mínima 15 para `equipoRecibido.imei` (línea 115). |
| `public/js/services/InventarioService.js` | • Agregar `cambiarEstado(id, 'eliminado')` ya funciona porque acepta cualquier string; solo documentar el nuevo estado. <br>• Opcional: Set anti-duplicado `this._imeisRecienIngresados = new Set()`. |

---

## 5. Orden de implementación sugerido

1. **Venta.js** — Validación de longitud IMEI. Cambio mínimo, 1 línea, valida primero.
2. **InventarioService** — Documentar estado `eliminado` y agregar el Set anti-duplicado.
3. **main.js — `_obtenerConflictoImeiRecibido`** — Helper nuevo, aislado.
4. **main.js — `_revalidarImeiRecibidoActual` + `_mostrarToastConflictoImeiRecibido`** — UI de sugerencia.
5. **cierree.html** — Bloque HTML del nuevo toast.
6. **main.js — listener en `inicializarEventos`** — Conectar el input.
7. **main.js — guarda en `manejarSubmitVenta`** — El bloque más importante (O1, O2, O6).
8. **main.js — `_sincronizarTradeinInventario` + reemplazo del bloque inline** — O4, O5.
9. **main.js — `limpiarFormularioVenta`** — Reset del toast al limpiar.

Cada paso es verificable por separado abriendo `cierree.html` y probando el caso对应的.

---

## 6. Casos de prueba (manuales, sin framework)

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Venta nueva, `#recibirEquipo` chequeado, IMEI de un equipo disponible en inventario tipeado. | Toast amarillo al tipear. Submit bloqueado con mensaje claro. |
| 2 | Venta nueva, IMEI del mismo equipo que se vende tipeado en `#equipoImeiR`. | Submit bloqueado: "no se puede recibir el mismo equipo que se vende". |
| 3 | Venta nueva, IMEI corto (5 caracteres) en `#equipoImeiR`. | Submit bloqueado por validación de longitud. |
| 4 | Venta nueva, IMEI nuevo (nunca visto). | Venta se guarda. Equipo aparece en inventario con origen "Trade-in (Venta: …)" y estado `disponible`. |
| 5 | Editar venta sin trade-in y agregar uno nuevo. | Equipo se ingresa al inventario. |
| 6 | Editar venta con trade-in X y cambiar el IMEI a Y. | X se marca como `eliminado` en inventario. Y se ingresa como nuevo. |
| 7 | Editar venta con trade-in y quitar el trade-in. | Trade-in se marca como `eliminado` en inventario. |
| 8 | Doble submit rápido con mismo IMEI de trade-in. | Solo un equipo en el inventario. |
| 9 | Después de registrar trade-in, abrir buscador de inventario. | Aparece el equipo recién ingresado, con badge "📥 Trade-in" en su `detalles` o `origen`. |

---

## 7. Riesgos y mitigaciones

- **R1**: Ventas existentes en Firestore con `equipoRecibido.imei` que ya están duplicadas en inventario (datos históricos).  
  → No migrar automáticamente. El nuevo helper retornará conflicto en la edición, lo que obliga a limpiar manualmente. Documentar en el commit.

- **R2**: Operador que usa un buscador externo (otro equipo disponible) con IMEI incorrecto escrito a mano, que pasa la validación por error de tipeo.  
  → La validación por IMEI exacto es inevitable con la estructura actual. Mejorar a futuro con matching por (modelo + color + capacidad) cuando se integre IMEI por escáner.

- **R3**: Marcar trade-in como `eliminado` y volver a crearlo si se re-edita la misma venta, y la edición se guarda dos veces.  
  → El Set anti-duplicado (paso 2) lo cubre, pero es en memoria: si el operador recarga la pestaña, se pierde. Documentar como limitación aceptable.

- **R4**: Toast visual duplicado (`#imeiConflictoToast` y `#imeiConflictoToastRecibido`) — más HTML/CSS que mantener.  
  → Aceptable. La duplicación es ~20 líneas y mantiene cada toast con su semántica propia. Refactor a componente es para una segunda iteración.

---

## 8. Lo que NO entra en este plan (deferr)

- Búsqueda en inventario por IMEI parcial (ahora la guarda exige match exacto).
- Bloqueo de IMEI aunque esté en `defectuoso` (hoy se bloquea; podría relajarse si la tienda quiere re-recibir equipos devueltos como trade-in, pero eso es política de negocio).
- Sincronización bidireccional con otras sedes (multi-sede) — depende de cómo Firestore replica `sedes/{sedeId}/inventario` entre locales.
- Reemplazo de `buscarPorImei` (que solo lee caché) por consulta directa a Firestore para máxima consistencia. Útil si se ven inconsistencias post-deploy.
