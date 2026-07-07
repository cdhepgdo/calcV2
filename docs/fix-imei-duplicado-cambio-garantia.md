# Fix Bug IMEI-Duplicado en Cambio por Garantía

**Fecha**: 2026-07-07
**Severidad**: 🔴 Alta (pérdida de trazabilidad de inventario)
**Tipo**: Bug silencioso de integridad de datos
**Estado**: ✅ Corregido, tests pasando (185/185), pendiente verificación manual en navegador

---

## 📋 Resumen ejecutivo

**Bug**: En `public/cierree.html` → "Cambio por Garantía", si el operador tipeaba un IMEI de equipo defectuoso que YA existía en el inventario (cualquier estado), el sistema:
- Guardaba el movimiento de garantía en localStorage/Firestore
- Mostraba toast verde "✅ Cambio por garantía registrado correctamente"
- NO actualizaba el inventario con el equipo defectuoso nuevo
- Dejaba un "equipo fantasma" — un movimiento registrado sin contraparte en inventario

**Causa raíz**: 3 call-sites de `inventarioService.ingresarEquipo()` en `public/js/main.js` NO chequeaban el retorno del método. El servicio SÍ retornaba `{ exito: false, error: 'ya existe...' }` pero el código lo trataba como fire-and-forget.

**Fix**: Defensa en profundidad en 3 capas:
1. Pre-check con `buscarPorImei()` antes de cualquier escritura
2. Chequeo explícito del retorno de `ingresarEquipo()` y `marcarVendido()`
3. Banner UX en vivo (feedback mientras el operador tipea el IMEI)

---

## 🔍 Diagnóstico detallado

### Cadena del bug paso a paso

```
Operador llena "Cambio por Garantía" con IMEI defectuoso = IMEI de equipo disponible
    ↓
CambioGarantia.validar()                                              [línea 59-111]
  → Solo chequea presencia del IMEI, NO duplicados                    [línea 83-85 ORIGINAL]
    ↓
movimientoService.registrarCambioGarantia(cambio)                      [main.js:1345 ORIGINAL]
  → Guarda el movimiento en Firestore                                  [MovimientoService.js:70]
  → Retorna { exito: true, mensaje: '...' }
    ↓
ingresarEquipo(eqDefectuoso)                                           [main.js:1362 ORIGINAL]
  → InventarioService SÍ valida duplicados                            [InventarioService.js:195-208]
  → Retorna { exito: false, error: 'ya existe...' }
  → CALLER IGNORA EL RETORNO                                           [BUG: sin chequeo]
    ↓
marcarVendido(equipoEnInv.id, ...)                                     [main.js:1368 ORIGINAL]
  → Se ejecuta (si el IMEI del nuevo equipo existe en inventario)
    ↓
Toast verde: "✅ Cambio por garantía registrado correctamente"          [main.js:1376]
  → Operador piensa que todo salió bien
    ↓
RESULTADO: "equipo fantasma"
  → Movimiento en Firestore: dice que cliente devolvió un iPhone
  → Inventario: NO tiene ese equipo
  → Próxima búsqueda por IMEI: muestra el equipo viejo (disponible)
```

### Entry points afectados (3 sitios)

| # | Línea ORIGINAL | Función | Estado al momento del fix | Impacto |
|---|---|---|---|---|
| 1 | **main.js:1362** | `manejarSubmitCambioGarantia` | **ACTIVO** (llamado desde `cierree.html`) | 🔴 **Bug que el usuario sufría** |
| 2 | main.js:2184 | `_sincronizarTradeinInventario` | Definido pero **NO llamado** desde ningún archivo | 🟡 Latente (código muerto/pendiente) |
| 3 | main.js:2282 | `_sincronizarTradeinsInventario` | Definido pero **NO llamado** desde ningún archivo | 🟡 Latente (código muerto/pendiente) |

**Búsqueda de callers reales** (en sesión de debugging):
```bash
$ grep -rn '_sincronizarTradein' public/
public/js/main.js:2162:    async _sincronizarTradeinInventario(...) { ... }
public/js/main.js:2242:    async _sincronizarTradeinsInventario(...) { ... }
```
Solo aparecen las **definiciones** — ningún archivo `.js` las invoca. Son código planificado de `PLAN_TRADEIN_INVENTARIO.md` y `PLAN_MULTI_EQUIPO.md` que aún no se integró al flujo.

### Hallazgo crítico durante la implementación

`MovimientoService.registrarCambioGarantia()` (línea 70) escribe a Firestore con `setDoc` (no reversible). El bug original tenía `await movimientoService.registrarCambioGarantia(cambio)` **antes** de validar el inventario, lo que causaba:
- Movimiento huérfano en Firestore si el inventario fallaba
- Imposible de limpiar sin método `eliminarCambioGarantia(id)` (que no existe)

**Decisión del fix**: invertir el orden — validar inventario PRIMERO, luego guardar movimiento. Esto previene la creación de huérfanos.

---

## 🔧 Cambios realizados

### Resumen de archivos

| Archivo | Tipo | Líneas | Propósito |
|---|---|---|---|
| `public/js/main.js` | Modificado | +130 / -45 (ver desglose) | Fix core + banner UX + 2 funciones huérfanas |
| `public/js/models/CambioGarantia.js` | Modificado | +4 | Chequeo longitud IMEI ≥ 15 |
| `public/js/models/CambioGarantia.test.js` | **Nuevo** | 198 | 14 tests del modelo |
| `public/js/models/EquipoInventario.test.js` | **Nuevo** | 95 | 8 tests de validación |
| `public/js/services/InventarioService.test.js` | **Nuevo** | 193 | 9 tests (4 de cache + 5 de duplicados) |

### Desglose de cambios en `main.js`

| Bloque | Líneas | Tipo |
|---|---|---|
| Listener `defectuosoImei` en `init()` | +6 | Banner UX (Fase 2) |
| `manejarSubmitCambioGarantia` reescrito | +98 / -32 | Fix core (Fase 1.1) |
| `_revalidarImeiDefectuosoActual` (nuevo) | +42 | Banner UX (Fase 2) |
| `_ocultarBannerImeiDefectuoso` (nuevo) | +7 | Banner UX (Fase 2) |
| `_sincronizarTradeinInventario` caso 2 | +30 / -3 | Funciones huérfanas (Fase 1.2) |
| `_sincronizarTradeinsInventario` completo | +55 / -10 | Funciones huérfanas (Fase 1.2) |
| `limpiarFormularioVenta` | +1 | Banner UX (Fase 2) |

---

## 📂 Detalle por archivo (qué buscar y dónde)

### `public/js/main.js`

#### 1. Listener de validación en vivo (líneas 314-319)

```js
// Validación de IMEI del equipo DEFECTUOSO en cambio por garantía
// (FIX BUG IMEI-DUPLICADO: feedback en vivo para no esperar al submit)
const defectuosoImeiInput = document.getElementById('defectuosoImei');
if (defectuosoImeiInput) {
    defectuosoImeiInput.addEventListener('input', () => this._revalidarImeiDefectuosoActual());
    defectuosoImeiInput.addEventListener('change', () => this._revalidarImeiDefectuosoActual());
}
```

**Qué hace**: cada vez que el operador tipea en el campo `#defectuosoImei`, valida contra el inventario. El banner aparece antes de hacer submit.

---

#### 2. Fix core: `manejarSubmitCambioGarantia` (líneas 1346-1443)

**Estrategia**: 3 fases con orden invertido vs el bug original.

**Fase 1 — Pre-check inventario** (líneas 1369-1385):
```js
const imeiDefectuoso = (cambio.equipoDefectuoso.imei || '').trim();
if (imeiDefectuoso) {
    const existente = inventarioService.buscarPorImei(imeiDefectuoso);
    if (existente) {
        mostrarAlerta(
            `❌ El IMEI ${imeiDefectuoso} del equipo defectuoso ya existe en el inventario ` +
            `como "${existente.estado}" (${existente.modelo || '?'} ${existente.gb || ''} — ${existente.color || '?'}). ` +
            `No se puede registrar un cambio por garantía con un IMEI duplicado. ` +
            `Verifica que el IMEI tipeado sea correcto o contacta al administrador.`,
            'error'
        );
        return; // NO guardar movimiento, NO limpiar formulario
    }
}
```

**Fase 2 — Ingreso al inventario** (líneas 1387-1423):
```js
const eqDefectuoso = new EquipoInventario({ /* ... */ });
const resIngreso = await inventarioService.ingresarEquipo(eqDefectuoso);
if (!resIngreso.exito) {
    mostrarAlerta(
        `❌ No se pudo registrar el equipo defectuoso en inventario: ${resIngreso.error}. ` +
        `El cambio por garantía NO fue guardado. Contacta al administrador.`,
        'error'
    );
    return;
}
// Marcar vendido (opcional, no bloquea)
```

**Fase 3 — Registro de movimiento (solo si todo OK)** (líneas 1425-1442):
```js
const resultado = await movimientoService.registrarCambioGarantia(cambio);
// ... resto del flujo
```

**Por qué este orden**:
- Si falla inventario → no se crea movimiento huérfano
- El operador ve error inmediato y puede corregir sin perder datos
- `registrarCambioGarantia` se ejecuta AL FINAL, garantizando consistencia

---

#### 3. Banner UX en vivo (líneas 2212-2265)

**`_revalidarImeiDefectuosoActual`** (líneas 2228-2257):
```js
_revalidarImeiDefectuosoActual() {
    const imeiInput = document.getElementById('defectuosoImei');
    if (!imeiInput) return;

    const imei = imeiInput.value.trim();
    if (!imei || imei.length < 6) {
        this._ocultarBannerImeiDefectuoso();
        return;
    }

    // Gate: solo mostrar banner si el form de cambio por garantía está visible
    const cambioGarantiaForm = document.getElementById('cambioGarantiaForm');
    if (cambioGarantiaForm && cambioGarantiaForm.classList.contains('hidden')) {
        this._ocultarBannerImeiDefectuoso();
        return;
    }

    let conflicto = this._obtenerConflictoImeiRecibido(imei, null, null);

    // Re-categorizar 'autocompletar-vendido' a 'bloqueado-otro-estado':
    if (conflicto && conflicto.tipo === 'autocompletar-vendido') {
        conflicto = {
            tipo: 'bloqueado-otro-estado',
            equipo: conflicto.equipo,
        };
    }

    this._mostrarToastConflictoImeiRecibido(conflicto);
}
```

**Diferencia clave vs trade-in**: en cambio por garantía, **ningún IMEI del inventario es aceptable** (ni vendido, ni transferido). Por eso se re-categoriza `autocompletar-vendido` → `bloqueado-otro-estado`.

**Reutilización**: aprovecha `_obtenerConflictoImeiRecibido()` (línea 2003) y `_mostrarToastConflictoImeiRecibido()` (línea 2059) — funciones existentes para trade-in. **No se duplicó código**, se reusó.

**`_ocultarBannerImeiDefectuoso`** (líneas 2262-2265):
```js
_ocultarBannerImeiDefectuoso() {
    document.getElementById('imeiTradeInBanner')?.classList.add('hidden');
}
```

**Reutilización del HTML**: el banner `imeiTradeInBanner` (HTML línea 581) ya existía. No se agregó markup nuevo.

---

#### 4. Funciones huérfanas corregidas (líneas 2273-2409)

**Ambas funciones están definidas pero NO SE LLAMAN** desde ningún archivo `.js`. Son código de `PLAN_TRADEIN_INVENTARIO.md` y `PLAN_MULTI_EQUIPO.md` que aún no se integró al flujo.

**Corrección aplicada preventivamente**:

`_sincronizarTradeinInventario` caso 2 (líneas 2273-2312):
- Pre-check con `buscarPorImei` antes de `ingresarEquipo`
- Chequeo de retorno de `ingresarEquipo`
- Cambio de contrato: ahora retorna `{ exito, error? }` en vez de `void`

`_sincronizarTradeinsInventario` (líneas 2320-2409):
- Acumulación de errores en `erroresIngreso[]` (no aborta al primer error)
- Cambio de contrato: ahora retorna `{ exito, error? }`

**⚠️ NOTA IMPORTANTE**: Como nadie las llama hoy, el cambio de contrato NO rompe nada. Cuando se integren al flujo, los callers deberán manejar el retorno.

---

### `public/js/models/CambioGarantia.js`

**Cambio mínimo** (líneas 83-88, 100-105):
```js
if (!this.equipoDefectuoso.imei) {
    errores.push('Debe ingresar el IMEI del equipo defectuoso');
} else if (this.equipoDefectuoso.imei.length < 15) {
    errores.push('El IMEI del equipo defectuoso debe tener al menos 15 caracteres');
}
```

**Por qué**: el `validar()` original solo chequeaba presencia. Ahora también valida longitud mínima (15 caracteres es el estándar IMEI).

---

### `public/js/models/CambioGarantia.test.js` (NUEVO)

**14 tests** organizados en 3 grupos:

| Grupo | Tests | Cubre |
|---|---|---|
| Datos básicos | 8 | nombre, cédula, teléfono, modelos, problema, batería |
| IMEI | 5 | presencia + longitud mínima (15 chars) |
| Múltiples errores | 1 | acumulación de errores |

**Patrón usado** (igual a `Venta.test.js`):
- Helper `cambioBase(overrides)` con datos válidos
- `describe()` por regla de negocio
- Emojis ✅/❌ en nombres de tests
- Sin mocks (modelo puro)

---

### `public/js/models/EquipoInventario.test.js` (NUEVO)

**8 tests** de `validar()`:
- Equipo completo válido
- Rechazo por: modelo, gb, color, batería (>100 o <0), IMEI (<15 o vacío)

**Stub requerido en tests** (en `beforeEach`):
```js
if (typeof globalThis.localStorage === 'undefined') {
    const store = {};
    globalThis.localStorage = {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => { store[k] = String(v); },
        // ...
    };
}
if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) };
}
```

**Por qué**: `EquipoInventario.constructor` accede a `localStorage` y `crypto` (líneas 27-28 del modelo), que no existen en Node puro.

---

### `public/js/services/InventarioService.test.js` (NUEVO)

**9 tests** en 2 grupos:

| Grupo | Tests | Cubre |
|---|---|---|
| Búsquedas en cache | 4 | `buscarPorImei`, `obtenerTodos`, `obtenerDisponibles` |
| Detección de duplicados | 5 | IMEI nuevo, IMEI en cache (cualquier estado), anti-doble-submit |

**Patrón usado**: el servicio se exporta como **singleton** (`export const inventarioService = new InventarioService()`), no como clase. Por eso los tests usan el singleton directamente:

```js
import { inventarioService as svcBase } from './InventarioService.js';

function resetInventarioService() {
    svcBase._cacheInventario = [];
    svcBase._imeisRecienIngresados = new Set();
    svcBase._inventarioListo = true;
    svcBase._listeners = [];
}
```

**Mock de Firestore** (líneas 1-25 del test):
```js
vi.mock('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js', () => ({
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    setDoc: vi.fn(() => Promise.resolve()),
    // ...
    onSnapshot: vi.fn((q, onNext) => {
        if (onNext) onNext({ docs: [] });
        return vi.fn();
    }),
}));
```

**✅ Verificado**: el mock del CDN URL SÍ funciona en Vitest 1.6. Los 9 tests pasan.

---

## 🧪 Verificación

### Tests automatizados

```bash
npm test
```

**Resultado**:
```
Test Files  8 passed (8)
Tests       185 passed (185)
```

- **154 originales** (Venta, Caja, Movimiento, validators, formatters) — sin regresión
- **+14** de `CambioGarantia.test.js`
- **+8** de `EquipoInventario.test.js`
- **+9** de `InventarioService.test.js`

### Verificación manual pendiente (en navegador)

**Comando**: `npm run dev` → `http://localhost:5173/cierree.html`

| # | Escenario | Resultado esperado |
|---|---|---|
| A | Cambio por garantía con IMEI defectuoso = equipo **disponible** | Alerta roja, formulario NO se limpia, movimiento NO se guarda |
| B | Cambio por garantía con IMEI defectuoso = equipo **vendido** | Alerta roja, formulario NO se limpia |
| C | Cambio por garantía con IMEI defectuoso = equipo **defectuoso** | Alerta roja, formulario NO se limpia |
| D | Cambio por garantía con IMEI defectuoso **nuevo** (no existe) | Éxito, equipo defectuoso aparece en inventario con estado 'defectuoso' |
| E | Mientras tipea IMEI defectuoso duplicado en A/B/C | Banner rojo aparece ANTES de submit |
| F | Regresión: venta normal con equipo del inventario | Funciona idéntico a antes |
| G | Regresión: venta normal con trade-in nuevo | Funciona idéntico a antes |

**Verificación adicional en consola del navegador**: el movimiento huérfano NO se queda en Firestore/localStorage en escenarios A/B/C.

---

## 📊 Análisis de código agregado vs reutilizado

### Código agregado

| Categoría | Líneas | Reutiliza código existente | Notas |
|---|---|---|---|
| Fix core (`manejarSubmitCambioGarantia`) | +98 / -32 | ✅ Usa `inventarioService.buscarPorImei`, `ingresarEquipo`, `marcarVendido` | Reescritura completa, no nuevo |
| Banner UX (`_revalidarImeiDefectuosoActual` + `_ocultarBannerImeiDefectuoso`) | +49 | ✅ Reusa `_obtenerConflictoImeiRecibido` y `_mostrarToastConflictoImeiRecibido` | Solo lógica nueva: gate de visibilidad + re-categorización |
| Funciones huérfanas (caso 2 + completo) | +85 / -13 | ✅ Mismos métodos del servicio | Cambio de contrato + chequeo de retorno |
| Listener `defectuosoImei` | +6 | N/A | Mismo patrón que listener de trade-in |
| Chequeo longitud IMEI en `CambioGarantia.validar()` | +4 | N/A | Extensión del validar existente |
| `limpiarFormularioVenta` | +1 | ✅ Reusa `_ocultarBannerImeiDefectuoso` | Una línea |
| **Subtotal código de producción** | **+243 / -45** | — | — |

| Categoría | Líneas | Notas |
|---|---|---|
| Tests `CambioGarantia.test.js` | 198 | 14 tests, sin mocks |
| Tests `EquipoInventario.test.js` | 95 | 8 tests, stub de localStorage/crypto |
| Tests `InventarioService.test.js` | 193 | 9 tests, mock de Firestore + reset del singleton |
| **Subtotal tests** | **486** | — |

| **TOTAL** | **+729 / -45** | |
|---|---|---|

### ¿Hay código que no sirve?

**Sí hay código que NO se ejecuta en el flujo actual**:

1. **`_sincronizarTradeinInventario`** (líneas 2212-2312) — ~100 líneas definidas, **NO se llama** desde ningún archivo. Es código de `PLAN_TRADEIN_INVENTARIO.md` que aún no se integró.

2. **`_sincronizarTradeinsInventario`** (líneas 2320-2409) — ~90 líneas definidas, **NO se llama** desde ningún archivo. Es código de `PLAN_MULTI_EQUIPO.md` que aún no se integró.

**Decisión sobre estas funciones**:
- **Se corrigieron preventivamente** (cambio de contrato + chequeo de retorno) porque el bug que arreglamos también les afectaba
- **No se eliminaron** porque cuando se integren al flujo (planes mencionados), el código estará listo
- **Riesgo**: si nunca se integran, son ~190 líneas de código muerto

**Alternativa considerada** (no aplicada): eliminar las funciones hasta que se integren los planes. Decidimos no hacerlo porque:
- Los planes son reales y están escritos
- El costo de corrección preventiva fue bajo (~+85 líneas)
- Si se eliminan, el próximo dev tendría que re-escribirlas cuando integre el plan

### Reutilización efectiva

**Lo que SÍ se reusó** (no se duplicó código):

| Patrón | Reutilizado para |
|---|---|
| `_obtenerConflictoImeiRecibido` (línea 2003) | Banner de IMEI defectuoso |
| `_mostrarToastConflictoImeiRecibido` (línea 2059) | Banner de IMEI defectuoso |
| `inventarioService.buscarPorImei` | Pre-check en submit + pre-check en banner |
| `inventarioService.ingresarEquipo` | Ingreso al inventario (mismo método) |
| `inventarioService.marcarVendido` | Marcar equipo nuevo (mismo método) |
| Banner HTML `#imeiTradeInBanner` (HTML línea 581) | Banner de IMEI defectuoso |
| `mostrarAlerta` (de `domHelpers.js`) | Alertas de error |
| `EquipoInventario` (clase) | Construcción del eqDefectuoso (mismo patrón) |
| `CambioGarantia` (clase) | Validación inicial (mismo patrón) |

**No se agregó**: ningún servicio nuevo, ningún componente UI nuevo, ningún helper nuevo. Todo se construyó sobre piezas existentes.

---

## 🔄 Cómo revertir el fix (si algo se rompe)

Si después del fix aparece algún problema, los puntos de rollback son:

### Rollback completo

```bash
git diff public/js/main.js > /tmp/fix-imei-duplicado.patch
git checkout public/js/main.js
git checkout public/js/models/CambioGarantia.js
rm public/js/models/CambioGarantia.test.js
rm public/js/models/EquipoInventario.test.js
rm public/js/services/InventarioService.test.js
```

### Rollback selectivo (mantener tests, quitar comportamiento)

1. **Quitar el fix core**: revertir solo `manejarSubmitCambioGarantia` (líneas 1346-1443)
2. **Quitar el banner UX**: revertir las adiciones en init() (líneas 314-319) y eliminar los métodos `_revalidarImeiDefectuosoActual` + `_ocultarBannerImeiDefectuoso` (líneas 2212-2265)
3. **Revertir chequeo longitud IMEI**: revertir `CambioGarantia.js` (4 líneas)

Los tests NO necesitan revertirse — pasan independientemente del comportamiento del código de producción.

---

## 🔗 Referencias

- Plan original: `C:\Users\Ada\.claude\plans\gentle-nibbling-trinket.md`
- Planes de refactor pendientes (funciones huérfanas):
  - `C:\Users\Ada\Desktop\version-3.5\calcV2\.md\PLAN_TRADEIN_INVENTARIO.md`
  - `C:\Users\Ada\Desktop\version-3.5\calcV2\.md\PLAN_MULTI_EQUIPO.md`
- Archivos modificados:
  - `C:\Users\Ada\Desktop\version-3.5\calcV2\public\js\main.js`
  - `C:\Users\Ada\Desktop\version-3.5\calcV2\public\js\models\CambioGarantia.js`
- Archivos nuevos (tests):
  - `C:\Users\Ada\Desktop\version-3.5\calcV2\public\js\models\CambioGarantia.test.js`
  - `C:\Users\Ada\Desktop\version-3.5\calcV2\public\js\models\EquipoInventario.test.js`
  - `C:\Users\Ada\Desktop\version-3.5\calcV2\public\js\services\InventarioService.test.js`
- HTML relacionado: `C:\Users\Ada\Desktop\version-3.5\calcV2\public\cierree.html` (líneas 581, 639, 676)

---

## 📝 Lecciones aprendidas

1. **El servicio estaba correcto**. El bug estaba en los callers que trataban `{ exito, error }` como fire-and-forget. Lección: cuando un método retorna una promesa con shape, **los callers DEBEN** chequear el retorno.

2. **El orden de las operaciones importa**. Guardar el movimiento ANTES de validar el inventario creaba datos huérfanos imposibles de limpiar. Lección: hacer las validaciones más baratas y reversibles **antes** de las costosas e irreversibles.

3. **Patrones de validación ya existían** para trade-in. Reusarlos fue más rápido y consistente que duplicar. Lección: antes de agregar lógica nueva, **buscar patrones similares** que se puedan extender.

4. **Funciones definidas ≠ funciones usadas**. `_sincronizar*` se ven como código activo pero nadie las llama. Lección: el análisis de "callers reales" con `grep` debería ser un paso estándar antes de cualquier refactor.

5. **El mock del CDN URL en Vitest SÍ funciona** (probado). El "plan B" no fue necesario. Lección: el escepticismo sobre tooling de mocks a veces es infundado — vale la pena intentarlo antes de planear fallbacks.
