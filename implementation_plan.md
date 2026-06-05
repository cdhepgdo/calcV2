# Refactorización de `ingreso-mercancia.html`

Desmonolitizar el archivo de ~1,887 líneas en módulos JS separados siguiendo la arquitectura existente del proyecto, sin romper ninguna funcionalidad.

## Estrategia de implementación

El `<script type="module">` actual usa ES Modules nativos del navegador, lo que significa que **podemos simplemente extraer código a archivos `.js` y hacer `import/export`** sin necesidad de ningún bundler. El servidor Netlify Dev ya sirve los archivos estáticos correctamente.

---

## Archivos a crear

### 1. `public/css/ingreso-mercancia.css` [NEW]
Todos los estilos del `<style>` inline (~360 líneas). El HTML solo conservará el `<link>` a este archivo.

---

### 2. `public/js/utils/connectionMonitor.js` [NEW]
Extrae la lógica del monitor de conexión WiFi/offline. Es compartible con otras páginas.

**Exports:** `initConnectionMonitor(badgeEl, onOnline, onOffline)`

---

### 3. `public/js/utils/autocomplete.js` [NEW]
Extrae la lógica del panel de autocompletado de modelos (fuzzy match, posicionamiento, teclado). Es compartible.

**Exports:** clase `Autocomplete` con métodos `open()`, `hide()`, `setup(inputEl, onSelect)`

---

### 4. `public/js/utils/validators.js` [MODIFY]
Añadir función `validarIMEI(imei, filaActual, tablaBody, inventarioService)` al archivo existente.

---

### 5. `public/js/pages/ingreso-mercancia/ModoIngreso.js` [NEW]
Toda la lógica de la tabla de ingreso masivo:
- `crearFila()`, `renumerarFilas()`, `revalidarTodosLosImeis()`
- `actualizarResumen()`
- `recolectarEquipos()`
- `setupAutocomplete()` (usa la clase Autocomplete del util)
- Listener de `btnGuardarLote`, `btnLimpiarTodo`, `btnAgregarFila`

**Exports:** `initModoIngreso({ inventarioService, movimientoService, EquipoInventario, MODELOS_CORTOS, COLORES_IPHONE, showToast, setLoading })`

---

### 6. `public/js/pages/ingreso-mercancia/ModoSalida.js` [NEW]
Toda la lógica del panel de salida:
- `buscarEquiposSalida()`, `actualizarListaSugerenciasSalida()`
- `agregarEquipoSalida()`, `quitarEquipoSalida()`
- `actualizarListaSeleccionadosSalida()`
- Listener de `btnConfirmarSalida`, filtro de fecha, buscador

**Exports:** `initModoSalida({ inventarioService, movimientoService, showToast, setLoading, onInventarioCargado })`
También expone `window.agregarEquipoSalida` y `window.quitarEquipoSalida` internamente.

---

### 7. `public/js/pages/ingreso-mercancia/NotasImpresion.js` [NEW]
Las funciones `generarNotaIngresoHTML()` y `generarNotaSalidaHTML()` y `imprimirNota()`.

**Exports:** `initNotasImpresion({ getModoActual, getEquiposSeleccionados, recolectarEquipos, showToast })`

---

### 8. `public/js/pages/ingreso-mercancia/index.js` [NEW]
El orquestador principal. Reemplaza al `<script type="module">` gigante del HTML.
- Importa todos los módulos anteriores
- Maneja auth (`authService.onAuthChange`)
- Maneja el toggle Ingreso/Salida (`cambiarModo()`)
- Conecta el botón de imprimir
- Conecta logout y menú mobile

---

### 9. `public/ingreso-mercancia.html` [MODIFY]
El HTML queda limpio:
- Remueve el bloque `<style>` → `<link rel="stylesheet" href="./css/ingreso-mercancia.css">`
- Remueve el `<script type="module">` de ~1,200 líneas → `<script type="module" src="./js/pages/ingreso-mercancia/index.js"></script>`
- Mantiene toda la estructura HTML intacta (sin tocar ningún elemento, ID o clase)

---

## Orden de ejecución

1. Crear `ingreso-mercancia.css`
2. Crear `connectionMonitor.js`
3. Crear `autocomplete.js`
4. Modificar `validators.js` (añadir `validarIMEI`)
5. Crear `ModoIngreso.js`
6. Crear `ModoSalida.js`
7. Crear `NotasImpresion.js`
8. Crear `index.js` (orquestador)
9. Modificar `ingreso-mercancia.html` (solo al final, cuando todo lo demás esté listo)

## Verificación
- La página debe cargar sin errores en consola
- Modo ingreso: crear fila, autocompletar modelo, validar IMEI, guardar lote
- Modo salida: filtrar equipos, agregar, confirmar salida
- Botón imprimir en ambos modos
- Monitor de conexión online/offline
