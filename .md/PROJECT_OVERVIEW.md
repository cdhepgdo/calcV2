# 📱 Sistema de Ventas iPhone — Visión General del Proyecto

> Documento explicativo para familiarización con el proyecto. Cubre los 4 HTMLs foco (`cierree.html`, `ingreso-mercancia.html`, `registro.html`, `admin.html`) y los archivos JS que los respaldan.

---

## 1. ¿Qué es el proyecto?

**Sistema de Ventas iPhone** es una **aplicación web estática (SPA modular)** para gestionar operaciones diarias de tiendas que venden iPhones y accesorios en Venezuela. Soporta múltiples sedes, sincronización offline y un panel administrativo consolidado.

- **Stack frontend:** HTML + Tailwind CSS (CDN) + JavaScript ES6 Modules
- **Backend:** Firebase (Firestore + Auth) con **persistencia offline** mediante IndexedDB
- **Hosting:** Netlify (`public/` se publica, `netlify/functions/` contiene el backend serverless)
- **Arquitectura:** **Local-First** — UI lee de un caché en memoria, Firebase sincroniza en background
- **Multi-sede:** 6 tiendas preconfiguradas (sede_1 a sede_6) + consolidado "Todas las Tiendas"
- **Roles:** `empleado` y `admin` (controlan acceso a `admin.html`)

### Estructura de carpetas

```
calcV2-version-3/
├── netlify.toml                  # Configuración de despliegue
├── netlify/functions/            # Funciones serverless (1 sola: binance-p2p-average)
└── public/                       # Se publica como sitio estático
    ├── login.html                # Autenticación
    ├── cierree.html              # 🏠 Pantalla principal (Punto de Venta)
    ├── ingreso-mercancia.html    # 📦 Ingreso masivo de inventario
    ├── registro.html             # 📊 Historial diario de operaciones
    ├── admin.html                # 🏢 Dashboard consolidado multi-sede (solo admin)
    ├── index.html, lista.html, intercambio.html, inv-precio.html, etc.
    ├── css/styles.css, registro.css
    └── js/
        ├── main.js               # Orquestador de cierree.html
        ├── admin.js              # Orquestador de admin.html
        ├── registro.js           # Orquestador de registro.html
        ├── login.js
        ├── config/
        │   ├── constants.js      # Modelos iPhone, colores, capacidades, formas de pago...
        │   ├── firebase-config.js
        │   └── precios.js        # Listas de precios (USD) de productos
        ├── models/               # Modelos de dominio (Venta, Movimiento, Caja, etc.)
        │   ├── Venta.js
        │   ├── Movimiento.js
        │   ├── Caja.js
        │   ├── CambioGarantia.js
        │   └── EquipoInventario.js
        ├── services/             # Capa de servicios (singleton)
        │   ├── AuthService.js
        │   ├── StorageService.js # ⭐ Caché en memoria de Ventas/Movimientos
        │   ├── InventarioService.js
        │   ├── VentaService.js
        │   ├── MovimientoService.js
        │   ├── AdminService.js   # ⭐ Carga TODAS las sedes para el dashboard admin
        │   ├── HistorialService.js
        │   └── PrintService.js
        └── utils/                # Helpers puros
            ├── calculations.js
            ├── formatters.js
            ├── validators.js
            └── domHelpers.js
```

---

## 2. Servicios compartidos (capa de datos)

Todos los HTMLs comparten estos servicios. Antes de entrar a cada pantalla, conviene entenderlos.

### 2.1 `AuthService` (`js/services/AuthService.js`)
- **Singleton** con Firebase Auth + persistencia local (`browserLocalPersistence`).
- En el `onAuthStateChanged` consulta `usuarios/{uid}` en Firestore y guarda en `localStorage`:
  - `usuario_sede_id` (default: `sede_1`)
  - `usuario_rol` (default: `empleado`)
- Métodos: `login(email, pass)`, `logout()`, `onAuthChange(callback)`.
- **Guarda de `admin.html`:** además del JS, un `<script>` en el `<head>` valida `localStorage.usuario_rol === 'admin'` y redirige a `index.html` si no lo es (defensa en profundidad).

### 2.2 `StorageService` (`js/services/StorageService.js`) ⭐
- **Arquitectura Local-First** con `onSnapshot` de Firestore.
- Mantiene dos cachés en memoria: `_cacheVentas` y `_cacheMovimientos` (sincronizados desde IndexedDB y servidor).
- **Path Firestore:** `sedes/{sedeId}/ventas` y `sedes/{sedeId}/movimientos` (aislamiento por sede).
- Las escrituras son **fire-and-forget**: se persisten en IndexedDB al instante y suben al servidor en background.
- Patrón pub/sub: `onCambio(fn)` se llama cada vez que el caché cambia (local o remoto). La UI se re-renderiza sola.
- Métodos para caja inicial y cierre de caja (paths `sedes/{sedeId}/config/cajaInicial` y `sedes/{sedeId}/config/cierreCaja/{YYYY-MM-DD}` — sub-colección por fecha).
- **Singleton** — misma instancia en toda la app.

### 2.3 `AdminService` (`js/services/AdminService.js`) ⭐
- Similar a `StorageService` pero escucha **las 6 sedes en paralelo**.
- Cada sede tiene su propio `_cache[sedeId] = { ventas, movimientos }`.
- `obtenerVentas('todos')` consolida todas las sedes e **inyecta `sedeId` y `sedeNombre`** en cada documento para identificarlo en tablas/gráficos.
- Solo lo usa `admin.html`.

### 2.4 `InventarioService` (`js/services/InventarioService.js`) ⭐
- Escucha `sedes/{sedeId}/inventario` filtrado por `tipoItem == 'equipo'`.
- Estado del equipo: `disponible` | `vendido` | `defectuoso`.
- Operaciones: `guardarLote(equipos)`, `ingresarEquipo(equipo)`, `marcarVendido(id, ventaId)`, `marcarDisponible(id)`, `buscarPorImei(imei)`, `obtenerDisponibles()`.
- Se usa desde `cierree.html` (buscador en formulario de venta) y desde `ingreso-mercancia.html` (lotes de inventario).

### 2.5 Modelos (`js/models/`)
- `Venta`: ventas de iPhone y/o accesorios. Valida cliente, equipo, accesorios, forma de pago, WEPPA.
- `Movimiento`: movimientos de inventario (entrada/salida de efectivo, equipos, accesorios, compras, cambios por garantía). Tiene `validar()` y `calcularImpactoEfectivo()`.
- `Caja`: calcula caja final a partir de ventas + movimientos (suma ventas en efectivo, resta salidas, etc.).
- `CambioGarantia`: cambio de equipo defectuoso por uno nuevo (cliente, defectuoso, nuevo, diferencia).
- `EquipoInventario`: un equipo con modelo, gb, color, bateria, imei, tieneCaja, estado, loteId.

### 2.6 Utils (`js/utils/`)
- `formatters.js`: `formatearMoneda`, `formatearFecha`, `sanitizar` (anti-XSS).
- `calculations.js`: `calcularTotalPagoMixto`, `convertirDolaresABolivares`, etc.
- `domHelpers.js`: `llenarSelect`, `mostrarAlerta` (toast animado), `confirmar`, `toggleElement`.
- `validators.js`: regex para cédula V/E/J/P venezolana, teléfono 0414/0424/etc.

---

## 3. `cierree.html` — Punto de Venta Principal (Punto focal)

`js/main.js` es el orquestador (3083 líneas). Es **el HTML más complejo** porque concentra la operación diaria.

### 3.1 ¿Qué hace?
- **Caja inicial del día**: input numérico → guarda en `sedes/{sedeId}/config/cajaInicial`. Al día siguiente, sugiere automáticamente el cierre del día anterior (borde amarillo).
- **Formulario de venta** (flujo principal):
  - Datos del cliente (nombre, cédula, teléfono).
  - **Buscador de inventario** 🔎: filtra en tiempo real por modelo/color/IMEI. Al seleccionar, **autorrellena modelo/color/GB/batería/IMEI**, **bloquea los campos** y pre-llena la "Nota de Venta" si el equipo tenía `detalles`.
  - Datos del iPhone (modelo, color, almacenamiento, batería, IMEI, garantía).
  - Accesorios: forro (multi-modelo), cargador, vidrio, protector cámara, cubo, cable Lightning, cable C+C, caja, "otro" libre.
  - **Forma de pago**: Efectivo, Zelle, Binance, **Pago Móvil** (con tasa Bs/$), Transferencia (con tasa), **Mixto**, PayPal.
  - **Equipo recibido** (trade-in): modelo, color, batería, IMEI, valor. Al guardar la venta, **se ingresa automáticamente al inventario** como `disponible` con origen "Trade-in".
  - **Tipo de transacción**: Venta, Abono (no suma al total de ventas del día), **Cambio por Garantía** (oculta pago/recibido y abre un formulario aparte).
  - **WEPPA** (venta a crédito): campo editable para el monto total final cuando el cliente paga menos al inicio.
  - **Abonos previos**: fechas + montos; se suman al total de ventas del día pero no a la caja.
- **Movimientos de inventario** (en la misma pantalla): 7 botones grandes → formularios para Salida/Ingreso de efectivo, Salida/Ingreso/Compra de equipos, Salida/Ingreso de accesorios (estos últimos con sub-formularios dinámicos para multi-modelo).
- **Resumen del día en vivo**: lista de ventas del día agrupadas (Completas / Solo Accesorios / Abonos), total del día, equipos vendidos, caja final animada.
- **Imprimir resumen** del día (delegado a `PrintService`).
- **Menú móvil** con logout.

### 3.2 Patrón clave: edición vs creación
- Hay un atributo `App.ventaEnEdicion` (y `_equipoInventarioIdAnterior`) que distingue crear de editar.
- En edición, si el equipo del inventario cambió: revierte el anterior a `disponible` y marca el nuevo como `vendido`.
- En creación: marca el equipo seleccionado como `vendido` y, si había equipo recibido, lo ingresa al inventario.

### 3.3 Cálculo de totales
Función central `App.calcularYMostrarTotal()`:
- `totalInicial = subtotalPago + subtotalEquipo + subtotalAbonos`
- Si **WEPPA** activo: muestra el inicial pero deja el total editable por el usuario.
- Si no: el total = inicial.

`Caja.obtenerDesglose(ventas, movimientos)` calcula la **caja final del día**:
- `cajaFinal = cajaInicial + ventasEfectivo + ingresosEfectivo − salidasEfectivo − comprasEquipos ± diferenciasGarantia`
- Solo las ventas con `formaPago === 'efectivo'` (o `mixto` con su parte de efectivo) y los movimientos de tipo `Salida/Ingreso Efectivo` y `Compra Equipo` afectan la caja.

### 3.4 Métodos importantes de `App` (en `main.js`)
| Método | Qué hace |
|---|---|
| `init()` | Inicializa servicios, listeners, selectores |
| `cargarDatosIniciales()` | Lee caja inicial + cierre del día anterior |
| `inicializarEventos()` | Conecta todos los handlers (más de 30 listeners) |
| `manejarCambioTipoVenta()` | Alterna entre venta completa y solo accesorios |
| `manejarCambioFormaPago()` | Muestra el formulario del método de pago elegido |
| `manejarCambioTipoTransaccion()` | Alterna entre venta, abono, cambio por garantía |
| `calcularYMostrarTotal()` | Recalcula el total en cada cambio de input |
| `manejarSubmitVenta(e)` | Punto de entrada del submit (con idempotencia de UI) |
| `manejarSubmitCambioGarantia()` | Flujo separado para cambios por garantía |
| `recopilarDatosVenta()` | Lee el DOM y construye el objeto para `VentaService.crearVenta` |
| `recopilarAccesorios()` | Extrae el bloque completo de accesorios del DOM |
| `inicializarBuscadorInventario()` | Conecta el input de búsqueda con el `InventarioService` |
| `_aplicarEquipoDelInventario(equipo)` | Rellena y bloquea campos al seleccionar del buscador |
| `actualizarResumenVentas()` | Calcula totales del día y los anima |

---

## 4. `ingreso-mercancia.html` — Ingreso Masivo de Inventario

**No usa `main.js` ni `App`**. Tiene su propio `<script type="module">` inline.

### 4.1 ¿Qué hace?
- Tabla editable con una **plantilla `<template id="filaTpl">`** para cada equipo. Las filas se clonan con JS (sin librerías).
- **Autocompletado de modelo** con búsqueda difusa (`isFuzzyMatch`): escribe "13p" → sugiere "13 Pro", "13 Pro Max", etc. Panel flotante con `position: fixed` (no se recorta por scrolls).
- **Selector de GB con chips** clicables (64, 128, 256, 512, 1TB).
- **Validación en vivo del IMEI** (15 dígitos exactos, pinta borde verde/rojo).
- **Color de batería** dinámico: rojo `<50%`, naranja `<80%`, verde `>=80%`.
- **Checkbox de caja** que despliega campos modelo + color de la caja.
- **Resumen en vivo** en panel lateral (sticky): total de equipos válidos, desglose por modelo+GB.
- **Atajos de teclado**: `Tab` avanza, `Enter` al final de la fila crea una nueva fila enfocada.
- **Guarda en lote** (`inventarioService.guardarLote`): genera un `loteId` común (`LOTE-YYYY-MM-DDTHH-MM-SS`) y hace un `writeBatch` de Firestore → una sola escritura.
- **Asociación de sede**: usa `localStorage.usuario_sede_id` (filtrado por `AuthService`). Badge visible en la UI.

### 4.2 Validación al guardar
`EquipoInventario.validar()` exige: modelo, GB, color, batería 0-100, IMEI ≥15 chars. Errores se muestran como toast.

---

## 5. `registro.html` — Historial Diario de Operaciones

`js/registro.js` (829 líneas). Mismo patrón que `admin.js` pero **solo para la sede actual**.

### 5.1 ¿Qué hace?
- Lee de `StorageService` (no `AdminService`) → solo datos de la sede del usuario.
- **Filtros**:
  - Período predefinido (7/15/30/60/90 días) o "Personalizado" (N días) o "Todos".
  - Rango Desde/Hasta.
- **KPIs** del período: total días, total ventas, total operaciones.
- **Resumen de accesorios** del período: agrupa por tipo y modelo. Separa en dos bloques:
  - **Salidos** (rojo): ventas + movimientos de salida.
  - **Ingresados** (verde): solo movimientos de ingreso.
- **Tabla por día**: para cada día con operaciones, una tarjeta con:
  - Accesorios vendidos (grid por tipo)
  - Accesorios salidos / ingresados (por movimiento)
  - Tabla con Hora, Tipo (badge), Descripción, Monto Total, Efectivo (+/-).
  - Total del día al pie.
- **Exportar JSON** con todo el período.

### 5.2 Clasificación de operaciones
- **Ventas**: badge "💳 Venta" o "💰 Abono" según `tipoTransaccion`.
- **Movimientos** (string matching en `tipo`): Salida/Ingreso Efectivo, Salida/Ingreso/Compra Equipo, Salida/Ingreso Accesorio, Cambio por Garantía.
- **Impacto en efectivo** de un movimiento:
  - `salida efectivo` → negativo
  - `ingreso efectivo` → positivo
  - `compra equipo` → negativo (precio)

### 5.3 Ordenamiento de modelos
Función global `ordenarModelosPro(a, b)` (al final del archivo) ordena por número (iPhone **16** antes que **17**) y jerarquía de sufijo: `mini < base < plus < pro < pro max`. Así "iPhone 14" sale antes que "iPhone 14 Pro Max".

---

## 6. `admin.html` — Dashboard Consolidado Multi-Sede

`js/admin.js` (1663 líneas). **La pantalla con más poder analítico**.

### 6.1 ¿Qué hace?
- Sidebar oscuro con navegación (Dashboard / Historial / Menú Principal / Cerrar Caja / Logout).
- Header con **selector de tienda** (🌍 Todas las Tiendas o una sede específica).
- **KPIs** (4 tarjetas gradiente): Total Facturado, Ingreso Neto (Caja), Total Operaciones, iPhones Vendidos.
- **Gráfico de barras** (Chart.js): ventas totales por sucursal.
- **Gráfico de dona** (Chart.js): distribución de métodos de pago. Versión reciente incluye también "Equipo Recibido", "Abonos Previos" y "Por Cobrar (WEPPA)" como categorías separadas.
- **Resumen global de accesorios** del período: mismos dos bloques (Salidos/Ingresados) que `registro.html`, pero con todas las sedes sumadas.
- **Desglose diario**: una tarjeta por día con tabla de operaciones, columna extra "Sucursal" con badge de color por sede.

### 6.2 Filtros
- Período predefinido / personalizado (N días) / Todos.
- Rango Desde/Hasta.

### 6.3 Carga de datos
Usa `AdminService` (escucha las 6 sedes en paralelo). `cargarDatos()` lee solo la sede seleccionada. `obtenerVentas('todos')` consolida con la metadata de sede inyectada.

### 6.4 Gráficos
- Se **destruyen y recrean** en cada `renderizar()` para evitar solapamiento (`if (this.charts.x) this.charts.x.destroy()`).
- `ordenarModelosPro` (definido en el archivo) ordena los modelos con la misma jerarquía que `registro.js`.

### 6.5 Detalle importante
El archivo tiene **un bloque de ~800 líneas comentado** (de la versión anterior) seguido del código actual. Hay duplicación histórica, pero la versión funcional es la segunda.

---

## 7. Flujo de datos (resumen)

```
┌──────────────────────────────────────────────────────────────┐
│                    UI (HTML + main.js / admin.js / ...)      │
│   ① Lee inputs del DOM                                      │
│   ② Llama al Servicio (VentaService, MovimientoService,..) │
│   ③ Servicio valida (Venta.validar, etc.)                   │
│   ④ Servicio llama a StorageService (fire-and-forget)       │
│   ⑤ Service actualiza caché _cacheVentas/_cacheMovimientos  │
│   ⑥ onSnapshot de Firestore notifica al caché               │
│   ⑦ Listeners (_listeners) ejecutan UI.actualizar()         │
│   ⑧ UI re-renderiza con animación (animarNumero)            │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
   ┌──────────────────┐         ┌────────────────────┐
   │ StorageService   │  sync   │ Firestore + IDB    │
   │ AdminService     │ ◄─────► │ (multi-sede)       │
   │ InventarioService│         │                    │
   └──────────────────┘         └────────────────────┘
```

**Local-first:** el usuario nunca espera al servidor. La UI siempre responde desde el caché; Firestore sincroniza silenciosamente.

---

## 8. Modelos de datos (Firestore paths)

```
sedes/
  sede_1/
    ventas/                    # documentos Venta
    movimientos/               # documentos Movimiento
    inventario/                # documentos EquipoInventario
    config/
      cajaInicial              # documento Caja
      cierreCaja/              # sub-colección: un doc por fecha de cierre
        2026-06-16             # { monto, fecha, fechaISO }
usuarios/                      # perfiles con { sedeId, rol }
historial/inventario           # (legacy, en desuso)
```

---

## 9. Patrones transversales

| Patrón | Dónde se usa | Notas |
|---|---|---|
| **Singleton service** | Todos los services | `export const xService = new XService();` |
| **Pub/Sub local** | `onCambio(fn)` | En StorageService, AdminService, InventarioService |
| **Local-first** | StorageService, AdminService | Caché en memoria, onSnapshot background |
| **Fire-and-forget** | `setDoc` no se espera | UI no se bloquea por la red |
| **Idempotencia de submit** | `manejarSubmitVenta` | Botón disabled hasta confirmación de Firebase |
| **Validación modelo** | `Venta.validar()`, `Movimiento.validar()` | Devuelven `{ valido, errores }` |
| **Plantilla `<template>`** | ingreso-mercancia.html | Clon de filas con `cloneNode(true)` |
| **Búsqueda difusa** | ingreso-mercancia.html | `isFuzzyMatch` para autocompletar modelos |
| **Animación de números** | `App.animarNumero()` | Total del día se "cuenta" visualmente |
| **Sanitización XSS** | `Movimiento.obtenerDetalles()` | Reemplaza `<`, `>`, `&`, `"` por entidades |

---

## 10. Cosas importantes a recordar antes de tocar código

1. **Cachear antes de iterar**: la UI depende de `obtenerVentas()` y `obtenerMovimientos()`. Estas son ahora **síncronas** (devuelven el caché en memoria), pero si tocas StorageService, no las conviertas en async de nuevo — destruirías la UX local-first.

2. **Cuidado con `undefined` en Firestore**: `StorageService._sanitize()` convierte `undefined` → `null` antes de escribir. Si lo rompes, Firestore rechazará silenciosamente la escritura.

3. **Edición de ventas**: `App.ventaEnEdicion` y `App._equipoInventarioIdAnterior` controlan el flujo de reversión de inventario. Si los tocas, asegúrate de manejar ambos caminos (cambió de equipo vs. mismo equipo).

4. **Cambio por garantía**: tiene un submit **separado** (`manejarSubmitCambioGarantia`) que no usa `recopilarDatosVenta()`. La UI lo redirige según el radio `tipoTransaccion === 'cambio-garantia'`.

5. **El `rol` se valida en `localStorage` Y en la base de datos**: `admin.html` chequea `localStorage.usuario_rol` en el `<head>` antes de cargar el JS. Esto es defensa, no la única barrera.

6. **Ingreso de Trade-in**: al guardar una venta con `equipoRecibido.imei`, se crea automáticamente un `EquipoInventario` con `estado: 'disponible'` y `origen: 'Trade-in (Venta: <cliente>)'`. Si eliminas la venta, **debes** revertir manualmente ese equipo del inventario.

7. **IMEI en garantía**: cuando registras un `CambioGarantia`, el equipo defectuoso se ingresa al inventario como `estado: 'defectuoso'`. El equipo nuevo, si tiene IMEI, se marca como `vendido` (asumiendo que salió del stock).

8. **Comentarios en `admin.js`**: la primera mitad del archivo (~800 líneas) es código viejo comentado. No lo borres sin querer — la versión activa está después.

9. **Versión de Firebase**: usa `firebasejs/10.9.0` (imports directos desde `gstatic.com`, no bundler). Si subes la versión, revisa la API de `initializeFirestore` con `persistentLocalCache`.

10. **Búsqueda por IMEI del buscador de inventario**: solo busca por `e.imei.includes(q)`, no por coincidencia exacta. Si un usuario escribe solo 4 dígitos podría traer varios resultados.

---

## 11. Resumen en una frase por HTML

| HTML | Una línea |
|---|---|
| `cierree.html` | Punto de venta todo-en-uno: caja inicial, ventas con trade-in/WEPPA/abonos/cambios por garantía, movimientos de inventario, resumen en vivo. |
| `ingreso-mercancia.html` | Hoja de cálculo para meter lotes de iPhones al inventario con autocompletado de modelo y validación de IMEI en vivo. |
| `registro.html` | Historial filtrable (por período o rango) de ventas y movimientos de **la sede del usuario**, con desglose de accesorios vendidos/salidos/ingresados. |
| `admin.html` | Dashboard consolidado de las 6 tiendas con KPIs, gráficos y desglose diario multi-sede. Solo para `rol=admin`. |

---

✅ **Estoy familiarizado con el proyecto.** Listo para empezar a trabajar — indícame qué quieres abordar primero.
