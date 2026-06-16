# Plan: Refactor `public/cierree.html` — Multi-equipo vendido y multi-trade-in (v2)

> Documento vivo. Actualizado el 2026-06-11.
> Rama: `version-3.6`. Estado: **en progreso, sin commitear**.

## 0. Contexto

`cierree.html` es el formulario principal de ventas. Hoy permite vender 1 equipo + recibir 1 equipo (trade-in). El objetivo es soportar **N equipos vendidos** y **N equipos recibidos** en una sola venta, manteniendo:

- Compatibilidad 100% con ventas existentes (singular: `equipo`, `equipoRecibido`).
- Selección de equipos vendidos **estricta por buscador** (estilo `ModoSalida.js`).
- Trade-in sigue siendo input manual, con validación en tiempo real contra inventario.
- 2 validaciones acordadas:
  1. No repetir IMEI con ventas anteriores
  2. No recibir como trade-in un equipo `disponible` o `defectuoso` en inventario

## 1. Estado actual (ya implementado a medias, sin commitear)

### 1.1 `public/cierree.html`
- Línea ~185: sección de garantía con campo `#equipoPrecioVenta` (singular).
- Línea ~221: wrapper `#equiposVendidosAdicionalesWrapper` + contenedor `#equiposVendidosAdicionales` (filas N).
- Línea ~235: botón activador `#btnActivarMultiEquipo`.
- Línea ~625: wrapper `#equiposRecibidosAdicionalesWrapper` + contenedor `#equiposRecibidosAdicionales`.
- Línea ~639: botón activador `#btnActivarMultiTradeIn`.

### 1.2 `public/js/main.js`
- `inicializarMultiEquipo()` → listeners de los botones activar/agregar.
- `_agregarFilaEquipoVendido()` / `_agregarFilaEquipoRecibido()` → crean filas dinámicamente.
- `_obtenerFilaVentaTarget()` → decide si la selección va al singular o a una fila N.
- `_aplicarEquipoDelInventario(equipo, targetFila)` → soporta ambos casos.
- `_recalcularTotalDesdePrecios()` / `_sumarPreciosEquiposVendidos()` / `_sumarValoresRecibidos()`.
- `_validarImeisDuplicadosEnVenta(equipos, recibidos)` → reglas N.1, N.2, N.3.
- `_sincronizarTradeinsInventario(recibidosActuales, recibidosAnteriores, ventaId)` → diff N×N.

### 1.3 `public/js/models/Venta.js`
- Normaliza `equipo` ↔ `equipos[]` y `equipoRecibido` ↔ `equiposRecibidos[]`.
- `sumarValoresRecibidos()` → fuente única para totales.
- `toJSON()` persiste ambos formatos (singular + plural) para retrocompat.

### 1.4 `public/js/models/EquipoInventario.js`
- Fallback para `crypto.randomUUID` (HTTP no-seguro).

## 2. Lo que falta (este plan)

Hay 4 cambios grandes. El primero es el corazón del refactor.

### 2.1 [CRÍTICO] Refactor del buscador a patrón `ModoSalida.js`

**Problema**: hoy `invBuscadorInput` + `invDropdown` es un dropdown simple. No excluye IDs ya seleccionados, no muestra una lista apilada, no permite quitar. Es 1 equipo a la vez.

**Solución**: replicar exactamente la estructura de `public/js/pages/ingreso-mercancia/ModoSalida.js`:
- Estado en memoria: `this._equiposSeleccionadosVenta = []` (array de IDs).
- Render del buscador: filtrar `inventarioService.obtenerDisponibles()`, excluir los IDs en `this._equiposSeleccionadosVenta`, mostrar resultados con `+ Agregar` o `✓ Seleccionado` deshabilitado.
- Render de la lista de seleccionados: `#listaEquiposVentaSeleccionados` con modelo, gb, color, IMEI, **input de precio editable**, botón ✕.
- Panel resumen: `#listaResumenEquiposVenta` agrupado por modelo+gb con conteo.

**Detalles de implementación**:

```javascript
// En App class
this._equiposSeleccionadosVenta = []; // array de {id, modelo, gb, color, imei, bateria, detalles, precio}

_renderBuscadorEquiposVenta() {
    const query = document.getElementById('invBuscadorInput')?.value.trim() || '';
    const sugerencias = document.getElementById('invSugerencias');
    if (!sugerencias) return;

    let disponibles = inventarioService.obtenerDisponibles();
    if (query) {
        const q = query.toLowerCase();
        disponibles = disponibles.filter(eq =>
            eq.modelo.toLowerCase().includes(q) ||
            (eq.color || '').toLowerCase().includes(q) ||
            (eq.imei || '').includes(q) ||
            (eq.gb || '').toLowerCase().includes(q)
        );
    }

    if (disponibles.length === 0) {
        sugerencias.innerHTML = '<p class="...">No hay equipos disponibles que coincidan</p>';
        return;
    }

    sugerencias.innerHTML = disponibles.slice(0, 15).map(eq => {
        const yaSel = this._equiposSeleccionadosVenta.some(e => e.id === eq.id);
        return `
            <div class="equipo-sugerencia ${yaSel ? 'opacity-40' : 'cursor-pointer hover:bg-indigo-50'}"
                 ${yaSel ? '' : `onclick="app._agregarEquipoVenta('${eq.id}')"`}>
                <div class="flex items-center justify-between gap-2">
                    <div>
                        <p class="font-semibold text-sm">📱 iPhone ${eq.modelo} ${eq.gb}</p>
                        <p class="text-xs text-gray-500">${eq.color} · 🔋${eq.bateria}%</p>
                        <p class="text-xs font-mono text-gray-400">${eq.imei}</p>
                    </div>
                    ${yaSel
                        ? '<span class="text-yellow-500 text-xs">✓ Seleccionado</span>'
                        : '<span class="text-indigo-500 text-xs font-medium">+ Agregar</span>'}
                </div>
            </div>
        `;
    }).join('');
}

_agregarEquipoVenta(equipoId) {
    if (this._equiposSeleccionadosVenta.some(e => e.id === equipoId)) return;
    const eq = inventarioService.obtenerDisponibles().find(e => e.id === equipoId);
    if (!eq) return;

    this._equiposSeleccionadosVenta.push({
        id: eq.id,
        modelo: eq.modelo,
        gb: eq.gb,
        color: eq.color,
        imei: eq.imei,
        bateria: eq.bateria,
        detalles: eq.detalles || '',
        precio: 0 // el operador lo edita a mano
    });
    this._renderBuscadorEquiposVenta();
    this._renderListaEquiposVenta();
    this._actualizarContadorEquiposVendidos();
}

_quitarEquipoVenta(equipoId) {
    this._equiposSeleccionadosVenta = this._equiposSeleccionadosVenta.filter(e => e.id !== equipoId);
    this._renderBuscadorEquiposVenta();
    this._renderListaEquiposVenta();
    this._actualizarContadorEquiposVendidos();
    this._recalcularTotalDesdePrecios();
}

_renderListaEquiposVenta() {
    const lista = document.getElementById('listaEquiposVentaSeleccionados');
    const resumen = document.getElementById('listaResumenEquiposVenta');
    const totalResumen = document.getElementById('totalEquiposVentaResumen');

    if (this._equiposSeleccionadosVenta.length === 0) {
        if (lista) lista.innerHTML = '<p class="text-slate-500 text-xs text-center italic py-4">Busca y selecciona los equipos a vender arriba ↑</p>';
        if (resumen) resumen.innerHTML = '<p class="text-slate-500 text-xs text-center italic">Sin equipos aún...</p>';
        if (totalResumen) totalResumen.textContent = '0';
        return;
    }

    if (lista) {
        lista.innerHTML = this._equiposSeleccionadosVenta.map((eq, idx) => `
            <div class="equipo-seleccionado bg-white p-3 rounded-lg border-2 border-blue-200" data-equipo-id="${eq.id}">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-slate-500 text-xs font-mono">${idx + 1}</span>
                            <p class="font-bold text-sm">📱 iPhone ${eq.modelo} ${eq.gb} — ${eq.color}</p>
                        </div>
                        <p class="text-xs font-mono text-gray-500">IMEI: ${eq.imei}</p>
                        <p class="text-xs text-gray-500 mt-1">🔋 ${eq.bateria}%${eq.detalles ? ' | ' + eq.detalles : ''}</p>
                        <div class="mt-2 flex items-center gap-2">
                            <label class="text-xs font-medium text-gray-700">Precio ($):</label>
                            <input type="number" step="0.01" min="0"
                                class="eq-vendido-precio flex-1 p-1.5 border rounded text-sm"
                                value="${eq.precio}"
                                oninput="app._actualizarPrecioEquipoVenta('${eq.id}', this.value)">
                        </div>
                    </div>
                    <button onclick="app._quitarEquipoVenta('${eq.id}')"
                            class="text-red-500 hover:text-red-700 text-lg leading-none shrink-0"
                            title="Quitar">✕</button>
                </div>
            </div>
        `).join('');
    }

    if (totalResumen) totalResumen.textContent = this._equiposSeleccionadosVenta.length;

    if (resumen) {
        const modelos = {};
        this._equiposSeleccionadosVenta.forEach(eq => {
            const key = `${eq.modelo} ${eq.gb}`;
            modelos[key] = (modelos[key] || 0) + 1;
        });
        resumen.innerHTML = Object.entries(modelos)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `<div class="flex justify-between items-center text-xs">
                <span class="text-slate-300 truncate">${k}</span>
                <span class="text-indigo-300 font-bold ml-2 shrink-0">×${v}</span>
            </div>`).join('');
    }
}

_actualizarPrecioEquipoVenta(equipoId, valor) {
    const eq = this._equiposSeleccionadosVenta.find(e => e.id === equipoId);
    if (eq) {
        eq.precio = parseFloat(valor) || 0;
        this._recalcularTotalDesdePrecios();
    }
}
```

**Cambios en HTML (`cierree.html`)**:

Reemplazar el bloque actual del buscador (líneas 124-161) por algo como:

```html
<div id="inventarioBuscadorSection" class="border-b pb-6 bg-indigo-50 rounded-xl p-5 mb-2">
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 class="text-lg font-semibold text-indigo-800 flex items-center gap-2">
            📦 Equipos a vender (selecciona del inventario)
        </h2>
        <span id="invStockBadge" class="text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full"></span>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
        <!-- Buscador -->
        <div>
            <label class="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2 block">
                🔍 Buscar en inventario
            </label>
            <input type="text" id="invBuscadorInput"
                placeholder="Modelo, color, gb o IMEI..."
                autocomplete="off"
                class="w-full p-3 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:outline-none bg-white text-gray-800">
            <div id="invSugerencias" class="flex flex-col gap-1 mt-2 max-h-96 overflow-y-auto pr-1"></div>
        </div>

        <!-- Lista apilada -->
        <div>
            <label class="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2 block">
                📋 Equipos seleccionados (<span id="totalEquiposVentaResumen">0</span>)
            </label>
            <div id="listaEquiposVentaSeleccionados" class="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                <p class="text-slate-500 text-xs text-center italic py-4">Busca y selecciona los equipos a vender arriba ↑</p>
            </div>
        </div>
    </div>

    <p class="text-xs text-indigo-500 mt-3">
        <strong>Regla:</strong> solo se pueden vender equipos registrados en el inventario. Si no hay equipos, primero ingrésalos en
        <a href="ingreso-mercancia.html" class="underline">📦 Ingreso de Mercancía</a>.
    </p>
</div>
```

Y el panel resumen lateral (línea 273-282) se reemplaza por:

```html
<div id="panelResumen" class="glass-dark rounded-2xl p-4">
    <h3 class="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">Resumen de Equipos a Vender</h3>
    <div class="text-center mb-3">
        <p class="text-3xl font-bold text-white" id="totalEquiposVentaResumenGrande">0</p>
        <p class="text-slate-400 text-xs">equipos seleccionados</p>
    </div>
    <div class="border-t border-white/10 pt-3 space-y-1.5" id="listaResumenEquiposVenta">
        <p class="text-slate-500 text-xs text-center italic">Sin equipos aún...</p>
    </div>
</div>
```

### 2.2 [CRÍTICO] Remover inputs de precio de las filas dinámicas

Hoy existen campos `.eq-vendido-precio` en cada `.equipo-vendido-item`. Con la nueva UX, **el precio se edita dentro de la lista apilada** (en `_renderListaEquiposVenta`), no en filas. Hay que:

1. Eliminar las llamadas a `_agregarFilaEquipoVendido()` y `_agregarFilaEquipoRecibido()` que crean filas adicionales.
2. Eliminar los wrappers `#equiposVendidosAdicionalesWrapper` y `#equiposRecibidosAdicionalesWrapper` del HTML.
3. Eliminar los métodos obsoletos en `main.js`: `_agregarFilaEquipoVendido`, `_agregarFilaEquipoRecibido`, `_poblarSelectoresEquipoVendido`, `_poblarSelectoresEquipoRecibido`, `_actualizarContadorEquiposVendidos`, `_actualizarContadorEquiposRecibidos`, `_obtenerFilaVentaTarget` (este último ya no aplica).
4. Mantener la lógica de `_recalcularTotalDesdePrecios` pero leer de `this._equiposSeleccionadosVenta`.
5. Mantener `recopilarDatosVenta` que construye `datos.equipos` desde `this._equiposSeleccionadosVenta` (más simple que recorrer DOM).

### 2.3 [CRÍTICO] Validación de trade-in en tiempo real (banner)

**Problema**: hoy el trade-in se tipea a mano y solo se valida al hacer submit. El usuario quiere ver en tiempo real si el IMEI es aceptable.

**Solución**: agregar un banner al lado del input `#equipoImeiR` (singular) y por cada fila `.equipo-recibido-item` adicional.

**Reglas del banner** (4 estados):

| Estado del IMEI tipeado en el inventario | Banner | Permite guardar? |
|---|---|---|
| No está en inventario en absoluto | 🟢 "Equipo NO en tu inventario — puede ser trade-in" | ✅ Sí |
| Está en inventario con estado `disponible` | 🔴 "Este IMEI es un iPhone X GB Color DISPONIBLE en tu inventario. No puede recibirse como trade-in" | ❌ No |
| Está en inventario con estado `defectuoso` | 🔴 "Este IMEI está marcado como defectuoso en inventario. No puede recibirse" | ❌ No |
| Está en inventario con estado `vendido` | 🟢 "Este IMEI ya se vendió (no es stock activo). Puede ser trade-in" | ✅ Sí |
| Está en inventario con estado `eliminado` | 🟢 "Este IMEI fue dado de baja. Puede ser trade-in" | ✅ Sí |
| **Caso edición**: es el trade-in de la venta actual | 🟡 "Este es el trade-in de esta venta. Puedes editar sus campos" | ✅ Sí |

**Implementación**:

```javascript
// Nuevo método en App class
_validarImeiTradeInEnTiempoReal(imei, ventaIdExcluir = null, imeiTradeInOriginal = null) {
    const imeiNorm = (imei || '').trim();
    if (imeiNorm.length < 6) return { estado: 'vacio', mensaje: '', permite: true };

    const eq = inventarioService.buscarPorImei(imeiNorm);

    if (!eq) {
        return {
            estado: 'ok',
            clase: 'bg-green-50 border-green-300 text-green-800',
            icono: '✅',
            mensaje: 'Este IMEI NO está en tu inventario. Puede ser trade-in.',
            permite: true
        };
    }

    // Está en inventario → evaluar estado
    if (eq.estado === 'disponible') {
        return {
            estado: 'bloqueado-disponible',
            clase: 'bg-red-50 border-red-300 text-red-800',
            icono: '⛔',
            mensaje: `Este IMEI es un iPhone ${eq.modelo} ${eq.gb} — ${eq.color} DISPONIBLE en tu inventario. No puede recibirse como trade-in.`,
            permite: false
        };
    }

    if (eq.estado === 'defectuoso') {
        return {
            estado: 'bloqueado-defectuoso',
            clase: 'bg-red-50 border-red-300 text-red-800',
            icono: '⛔',
            mensaje: `Este IMEI está marcado como DEFECTUOSO en inventario. No puede recibirse.`,
            permite: false
        };
    }

    if (eq.estado === 'vendido' || eq.estado === 'eliminado') {
        return {
            estado: 'ok',
            clase: 'bg-green-50 border-green-300 text-green-800',
            icono: '✅',
            mensaje: `Este IMEI ya está en estado "${eq.estado}" en inventario (no es stock activo). Puede ser trade-in.`,
            permite: true
        };
    }

    if (eq.estado === 'reservado' || eq.estado === 'reparacion') {
        return {
            estado: 'bloqueado-otro-estado',
            clase: 'bg-red-50 border-red-300 text-red-800',
            icono: '⛔',
            mensaje: `Este IMEI está en estado "${eq.estado}" en inventario. No puede recibirse.`,
            permite: false
        };
    }

    return { estado: 'desconocido', clase: 'bg-gray-50 border-gray-300', icono: '❓', mensaje: 'Estado desconocido', permite: false };
}

_mostrarBannerImeiTradeIn(bannerId, validacion) {
    const banner = document.getElementById(bannerId);
    if (!banner) return;
    if (validacion.estado === 'vacio') {
        banner.classList.add('hidden');
        return;
    }
    banner.className = `mt-2 rounded-lg px-3 py-2 border ${validacion.clase}`;
    banner.querySelector('[data-icono]').textContent = validacion.icono;
    banner.querySelector('[data-mensaje]').textContent = validacion.mensaje;
    banner.classList.remove('hidden');
}
```

**Listener en `main.js`** (init):

```javascript
const imeiInputR = document.getElementById('equipoImeiR');
imeiInputR?.addEventListener('input', () => {
    const imei = imeiInputR.value.trim();
    const validacion = this._validarImeiTradeInEnTiempoReal(imei, this.ventaEnEdicion, this._tradeInImeiOriginal);
    this._mostrarBannerImeiTradeIn('imeiTradeInBanner', validacion);
});
```

**Validación al submit**: antes de aceptar el trade-in, verificar `validacion.permite === true` para cada uno. Si no, mostrar alerta con el mensaje del banner y bloquear.

### 2.4 [MENOR] Banner de "primera venta, sin inventario"

Cuando `inventarioService.obtenerDisponibles().length === 0` y el usuario abre `cierree.html`, mostrar un aviso encima del buscador:

> ⚠️ No hay equipos disponibles en tu inventario. Para registrar ventas con equipos, primero ingresa la mercancía en [📦 Ingreso de Mercancía](ingreso-mercancia.html).

Esto refuerza la regla de UX: si no hay inventario, no se puede vender.

## 3. Validaciones al submit (resumen final)

```
PASO 1: Si tipoVenta === 'completa':
        - this._equiposSeleccionadosVenta.length === 0 → ERROR: "Selecciona al menos un equipo del inventario"
        - this._equiposSeleccionadosVenta.length === 0 y tipoTransaccion === 'venta' y no hay accesorios → ERROR

PASO 2: Validar IMEIs vendidos:
        - Para cada equipo en _equiposSeleccionadosVenta: validar formato, longitud, que el idInventario sigue disponible
        - (Ya no hay IMEI tipeado a mano, así que se simplifica)

PASO 3: Si recibirEquipo.checked:
        - Para cada trade-in: validar formato IMEI, banner en tiempo real permite=true
        - Validar que NO esté en inventario como 'disponible' o 'defectuoso'
        - (Las 2 reglas del usuario: ya cubierto por _validarImeiTradeInEnTiempoReal)

PASO 4: Validación cruzada N×N (ya existe):
        - _validarImeisDuplicadosEnVenta(equipos, recibidos) → N.1, N.2, N.3

PASO 5: Validar coherencia de precios vs montoTotal:
        - Si todos los precios suman X y el cliente paga X → OK
        - Si hay diferencia → WEPPA
```

## 4. Cambios en `Venta.js`

Mantener lo que ya está. Solo ajustar `recopilarDatosVenta` en `main.js` para que el array `equipos` se construya desde `this._equiposSeleccionadosVenta`:

```javascript
// En recopilarDatosVenta, reemplazar el bloque que construye datos.equipos:
datos.equipos = this._equiposSeleccionadosVenta.map(eq => ({
    idInventario: eq.id,
    modelo: eq.modelo,
    color: eq.color,
    almacenamiento: eq.gb,
    bateria: eq.bateria + '%',
    imei: eq.imei,
    precio: eq.precio || 0,
    garantia: document.getElementById('equipoGarantia')?.value || ''
}));

// datos.equipo queda como alias del primero (compat)
datos.equipo = datos.equipos[0] || null;
```

## 5. Cambios en `EquipoInventario.js`

Mantener el fallback de UUID. **No tocar** el modelo, solo se usa `inventarioService.buscarPorImei`, `obtenerDisponibles`, `marcarVendido`, `marcarDisponible`.

## 6. Compatibilidad con `registro.html` y `admin.html`

**Crítico**: verificar que ambos lean `equipos[]` y `equiposRecibidos[]`, no solo `equipo` y `equipoRecibido`. Si solo leen el singular, **las ventas con N>1 equipos se ven truncadas en los reportes**.

```bash
# Búsqueda rápida para verificar
grep -n "venta.equipo" public/js/pages/registro/*.js
grep -n "venta.equipos" public/js/pages/admin/*.js
```

Si no se itera sobre el plural, hay que actualizar el render.

## 7. Orden de implementación sugerido

1. **Refactor HTML** del buscador de inventario (sección 2.1) — primero el cambio visual, sin lógica.
2. **Refactor `main.js`** con `_renderBuscadorEquiposVenta`, `_agregarEquipoVenta`, `_quitarEquipoVenta`, `_renderListaEquiposVenta` (sección 2.1) — comentar código viejo, no borrar todavía.
3. **Eliminar** `_agregarFilaEquipoVendido`, `_agregarFilaEquipoRecibido`, wrappers HTML, `recopilarDatosVenta` viejo (sección 2.2).
4. **Implementar validación de trade-in en tiempo real** (sección 2.3) — banner, listener, método.
5. **Banner de inventario vacío** (sección 2.4).
6. **Verificar persistencia** en `registro.html` y `admin.html` (sección 6).
7. **Testear flujo completo**:
   - Venta de 1 equipo (seleccionar del buscador, poner precio, submit)
   - Venta de 3 equipos (3 selecciones, 3 precios, submit)
   - Venta con 2 trade-ins (2 IMEIs tipeados, ambos pasan banner verde, submit)
   - Venta con trade-in que tiene IMEI en inventario `disponible` → bloquea en submit
   - Venta con trade-in que tiene IMEI en inventario `defectuoso` → bloquea en submit
   - Edición de venta multi-equipo: cambiar un precio, agregar/quitar un equipo, guardar
   - Venta con 0 inventario → banner amarillo, submit bloqueado
8. **Commit** con mensaje descriptivo: `feat: refactor cierree.html a selección por buscador (patrón ModoSalida) + multi-equipo N×N`.

## 8. Sincronización de inventario — reglas N×N

El inventario es la **fuente de verdad** de los IMEIs. Toda venta debe dejar el inventario coherente. Las reglas son:

### 8.1 Al CREAR una venta nueva (submit, `this.ventaEnEdicion === null`)

```
Para cada equipo en this._equiposSeleccionadosVenta (N=1..M):
    inventarioService.marcarVendido(equipo.id, ventaId)

Para cada trade-in en this._equiposRecibidosTipeados (K=0..P):
    Si el IMEI NO existe en inventario:
        inventarioService.ingresarEquipo(equipoInventario) con estado='disponible'
    Si el IMEI YA existe (caso edición-rehúsa) y pertenece a esta venta:
        actualizar campos sin cambiar estado
```

> El código actual en `main.js` (diff reciente) ya hace esto en parte con `_sincronizarTradeinsInventario` (K equipos) y el bloque "INVENTARIO: Gestión de N equipos vendidos" (M equipos). Hay que **revisar que use `this._equiposSeleccionadosVenta`** (nueva fuente) en vez del array viejo basado en filas DOM.

### 8.2 Al EDITAR una venta existente

Caso 1: usuario **quitó** un equipo de la lista de vendidos
- Ese equipo vuelve a `disponible` en inventario
- `inventarioService.marcarDisponible(equipo.id)` ← limpia `ventaAsociadaId`

Caso 2: usuario **agregó** un equipo a la lista de vendidos
- Ese equipo pasa a `vendido` en inventario
- `inventarioService.marcarVendido(equipo.id, ventaId)`

Caso 3: usuario **quitó** un trade-in
- Si el trade-in se había ingresado a inventario por esta venta → eliminarlo
- Si el trade-in NO se había ingresado (caso: ya estaba en inventario y se referenció) → NO tocar
- Regla de identificación: el campo `origen` del equipo inventario incluye `"Venta: {id}"` o `"Trade-in"`

Caso 4: usuario **cambió** el IMEI de un trade-in
- Es como quitar el anterior + agregar el nuevo

### 8.3 Al ELIMINAR una venta (`eliminarVenta`)

Regla del usuario: **los equipos vendidos vuelven a estar disponibles, los recibidos se eliminan por completo** (o se marcan como estado totalmente inusable).

```
Para cada equipo vendido en la venta:
    Si inventarioService.buscarPorImei(imei) y estado === 'vendido':
        inventarioService.marcarDisponible(equipo.id)  ← vuelve a estar vendible

Para cada trade-in de la venta:
    Si inventarioService.buscarPorImei(imei) y fue ingresado POR ESTA VENTA
    (origen incluye "Venta: {id}" o "Trade-in"):
        Opción A: inventarioService.eliminarEquipo(equipo.id)   ← borrado físico
        Opción B: inventarioService.cambiarEstado(equipo.id, 'eliminado')  ← soft delete
    Si el trade-in NO pertenece a esta venta (caso raro: referenciado):
        NO tocar
```

**Decisión a tomar con el usuario**: ¿eliminación física (`deleteDoc`) o soft delete (`estado='eliminado'`)? El `VentaService.eliminarVenta` actual usa `eliminarEquipo` (físico) y luego verifica con `origen`. El usuario dijo *"eliminar por completo o estado totalmente inusable"*: como las dos opciones sirven, sugiero **soft delete** porque:
- Mantiene trazabilidad (saber que ese IMEI existió)
- No rompe reportes históricos que referencien ese IMEI
- `obtenerDisponibles()` filtra por `estado === 'disponible'`, así que no se vuelve a vender

→ **Implementar con `cambiarEstado(equipoId, 'eliminado')` + `motivo: 'Venta eliminada'`** (no `deleteDoc`).

### 8.4 `VentaService.eliminarVenta` — refactor N×N ✅ IMPLEMENTADO

**Implementación final** (no es atómica con `await` en bucle, sino un único `writeBatch` en `InventarioService`):

- `InventarioService.commitEliminarVentaConInventario({ venta })` arma un `writeBatch` con:
  1. `batch.delete(ventaRef)` — borra la venta.
  2. Por cada vendido (`venta.equipos[]` o `venta.equipo`): si está en inventario y `estado==='vendido'`, lo restaura a `disponible`.
  3. Por cada trade-in (`venta.equiposRecibidos[]` o `venta.equipoRecibido`): si existe Y su `origen` incluye `Venta: ${venta.id}` o `trade-in`, hace soft-delete (`estado: 'eliminado'`, `motivo: 'Venta ${id} eliminada'`, `fechaEliminacion`).
- `VentaService.eliminarVenta` quedó reducido a: buscar venta en caché, marcarla en caché local como borrada (UX instantánea), llamar al batch, revertir caché si falla.
- Todo se aplica con TODO o NADA gracias al batch.
- Patrón local-first se mantiene: la UI se actualiza al instante desde el caché, IndexedDB persiste, sync a Firestore en background.

## 9. `registro.html` y `admin.html` — lectura N×N

Ambas vistas hoy leen `venta.equipo` y `venta.equipoRecibido` (singular). Hay que actualizarlas para que iteren sobre los plurales.

### 9.1 Helpers compartidos (en `models/Venta.js`)

Agregar métodos de lectura que devuelven siempre arrays:

```javascript
// En modelo Venta.js
getEquiposVendidos() {
    return (this.equipos && this.equipos.length > 0) ? this.equipos : (this.equipo ? [this.equipo] : []);
}

getEquiposRecibidos() {
    return (this.equiposRecibidos && this.equiposRecibidos.length > 0) ? this.equiposRecibidos : (this.equipoRecibido ? [this.equipoRecibido] : []);
}
```

### 9.2 `public/js/pages/registro/` — render de la lista de ventas

- Tarjeta de venta: listar **todos** los equipos vendidos con su **precio individual**
  - Si la venta tiene 2 equipos, mostrar 2 filas: "iPhone 13 Pro 256GB Negro — $450" y "iPhone 11 128GB Blanco — $200"
  - Subtotal ya está bien (se calcula en `calcularEfectivo`)
- Tarjeta de venta: listar **todos** los equipos recibidos
  - Mostrar IMEI, modelo, valor
- Total de equipos vendidos del día: usar `venta.getEquiposVendidos().length` (hoy cuenta 1 por venta → si hay 2 vendidos, debería contar 2)

### 9.3 `public/js/pages/admin/` — similares ajustes

- Vista de detalle de venta: render de arrays
- Estadísticas: `modelosVendidos` debe contar por cada equipo, no por venta
- `obtenerEstadisticas()` línea 269: el `forEach` itera `v.equipo.modelo` → cambiar a `v.getEquiposVendidos().forEach(eq => modelosVendidos[eq.modelo]++)`

### 9.4 Vista de impresión (`NotasImpresion.js`?)

Verificar que las notas de venta / facturas impresas muestren todos los equipos. Hoy probablemente solo imprimen el primero.

## 10. Lo que NO se hace (decisiones explícitas del usuario)

- ❌ No autocompletar precios desde `lista.html` (se mantiene input libre).
- ❌ No convertir IMEIs tipeados a mano para venta en trade-in (los trade-ins sí se tipean, los vendidos no).
- ❌ No agregar validaciones extra (formato numérico, garantía compartida, comentarios por fila, renumeración, etc.). Solo las 2 reglas acordadas + lo mínimo para que funcione.
- ❌ No tocar `ModoSalida.js` de `ingreso-mercancia.html`.

## 9. Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| `registro.html` no lee `equipos[]` → ventas multi se ven truncadas | Sección 6 — verificar antes de mergear |
| Doble selección del mismo ID de inventario | Ya cubierto: el render del buscador deshabilita los ya seleccionados |
| Race condition: 2 pestañas seleccionan el mismo equipo | Aceptado: la validación al submit lo detecta y bloquea |
| `_tradeInImeiOriginal` no se setea en multi-trade-in | Si hay N trade-ins, hay que mantener un array `_tradeInImeisOriginales` |
| Persistencia en localStorage: `equipos[]` puede ser pesado | Aceptable, las ventas son chicas |

## 10. Estado de migración (2026-06-11)

### ✅ Hecho
- `public/cierree.html` — buscador + pila apilada (columna izquierda + derecha). IDs nuevos: `#invSugerencias`, `#listaEquiposVentaSeleccionados`, `#invVacioBanner`, `#totalEquiposVentaResumenInline`.
- `public/js/main.js` — `_equiposSeleccionadosVenta[]`, `_renderBuscadorEquiposVenta()`, `_agregarEquipoVenta()`, `_quitarEquipoVenta()`, `_actualizarPrecioEquipoVenta()`, `_sumarPreciosEquiposVendidos()`, `_actualizarBannerInventarioVacio()`, `_actualizarContadoresMulti()`. Submit reescrito a `commitVentaConInventario` atómico. `recopilarDatosVenta` lee de la pila. `_limpiarSelectorInventario` resetea la pila.
- `public/js/models/Venta.js` — `validar()` reescrito: valida plurales, sincroniza singular con `equipos[0]`. `toJSON` persiste ambos formatos.
- `public/js/services/InventarioService.js` — agregados `commitVentaConInventario` y `commitEliminarVentaConInventario` (ambos con `writeBatch`).
- `public/js/services/VentaService.js` — `eliminarVenta` reducido a batch atómico.

### ⏳ Pendiente
- Verificar `registro.html` y `admin.html` (sección 9 del plan). Hoy leen `venta.equipo` singular.
- Banner de validación de trade-in en tiempo real (sección 2.3 del plan).
- Remover wrappers HTML viejos de multi-equipo (`.equipo-vendido-item`, `#equiposVendidosAdicionalesWrapper`).
- Probar flujos completos: 1 vendido, 3 vendidos, trade-in con IMEI en inventario, edición, race 2 pestañas.

### 📌 Memoria del proyecto
- `C:\Users\Ada\.claude\projects\C--Users-Ada-Desktop-version-3-5-calcV2\memory\project-cierree-multi-equipo.md` — decisiones del usuario.
- `C:\Users\Ada\.claude\projects\C--Users-Ada-Desktop-version-3-5-calcV2\memory\project-cierree-sin-validaciones-extranas.md` — feedback sobre no agregar validaciones extra.
- `C:\Users\Ada\.claude\projects\C--Users-Ada-Desktop-version-3-5-calcV2\memory\reference-patron-modosalida.md` — patrón replicado de `ModoSalida.js`.

