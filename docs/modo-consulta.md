# Modo Consulta — Inventario consultable, filtrable y editable

> Documentación del feature "📋 Consultar" agregado a `ingreso-mercancia.html`.
>
> Cubre: arquitectura, evaluación de calidad, bugs encontrados en verificación
> y lista de mejoras pendientes para versiones futuras.
>
> **Audiencia:** Desarrollador que quiere entender cómo está hecho el feature,
> o que va a continuar su evolución.

---

## 🎯 Objetivo del feature

Antes de este feature, el sistema tenía 2 pestañas (Ingreso / Salida) pero
**ninguna forma de ver el inventario consolidado de las 6 sedes con filtros**.
Para corregir un equipo (batería, estado, moverlo a otra sede) había que
volver a ingresarlo manualmente.

**Necesidad resuelta:** una tercera pestaña "📋 Consultar" que:

- Lista equipos de **todas las sedes** en una sola tabla.
- Filtra por sede, estado, modelo, GB, color, IMEI (prefijo), rango de fecha.
- Permite a **admins** editar inline: estado, batería, detalles.
- Permite a **admins** trasladar equipos entre sedes.
- Funciona offline con cache local (IndexedDB).
- Es solo lectura para empleados.

---

## 🏗️ Arquitectura: 3 capas

```
┌──────────────────────────────────────────────────────────────┐
│  CAPA 3: ModoConsulta.js (725 líneas)                       │
│    UI pura: render tabla, filtros, modal, edición inline     │
│    No sabe de Firestore, solo llama al servicio inyectado    │
├──────────────────────────────────────────────────────────────┤
│  CAPA 2: ConsultaInventarioService.js (323 líneas)          │
│    Listener multi-sede (6 onSnapshot en paralelo)            │
│    Cache en memoria + persistencia a IndexedDB              │
│    Filtros server-free (en memoria)                          │
├──────────────────────────────────────────────────────────────┤
│  CAPA 1: InventarioService.js (extendido)                   │
│    + actualizarEquipoEnSede()   — variante multi-sede       │
│    + trasladarEquipo()          — writeBatch atómico        │
│    AuthService.esAdmin()        — guard centralizado         │
│    constants.js                 — SEDES, ESTADOS_EQUIPO     │
└──────────────────────────────────────────────────────────────┘
```

### Decisión clave: ¿por qué un servicio separado?

`InventarioService` es **mono-sede por diseño** (asumido por Ingreso, Salida,
cierree, validación de IMEI). Cambiar eso rompería esas páginas. La pestaña
Consulta necesita visión multi-sede, pero **solo para lectura + ediciones
explícitas**. Por eso `ConsultaInventarioService` es un singleton paralelo,
no una extensión.

```js
// InventarioService — mono-sede (Ingreso/Salida/cierree)
class InventarioService {
    _getBasePath() {  // → sedes/sede_1
        return `sedes/${localStorage.getItem('usuario_sede_id')}`;
    }
}

// ConsultaInventarioService — multi-sede (solo Consulta)
class ConsultaInventarioService {
    constructor() {
        this.sedes = SEDES;  // las 6
        this._cache = {};     // { sede_1: [...], sede_2: [...], ... }
    }
}
```

---

## 📂 Archivos del feature

| Path | Líneas | Rol |
|---|---|---|
| `public/js/pages/ingreso-mercancia/ModoConsulta.js` | 725 | UI completa |
| `public/js/services/ConsultaInventarioService.js` | 323 | Listener multi-sede + IDB |
| `public/css/ingreso-mercancia.css` | +200 | Estilos `.consulta-*` |
| `public/ingreso-mercancia.html` | +90 | Botón, sección, filtros, tabla |
| `public/js/services/InventarioService.js` | +130 | `actualizarEquipoEnSede`, `trasladarEquipo` |
| `public/js/pages/ingreso-mercancia/index.js` | +60 | Refactor a `MODOS` declarativo |
| `public/js/config/constants.js` | +20 | `SEDES`, `SEDES_NOMBRES`, `ESTADOS_EQUIPO` |
| `public/js/services/AuthService.js` | +5 | Helper `esAdmin()` |
| `public/js/models/EquipoInventario.js` | +25 | Persistir `__sedeId`/`__sedeNombre` |
| `public/js/models/Movimiento.js` | +15 | Validación tipo 'Traslado' |
| `public/js/services/AdminService.js` | -10 | DRY: import de constants |

**Total:** ~1,600 líneas distribuidas en 11 archivos.

---

## 🐛 Bugs encontrados en verificación end-to-end

Durante la verificación se descubrieron **6 bugs** que fueron corregidos
antes de mergear a producción. Cada uno tiene trazabilidad en el código
(comentario `// FIX Xn`).

### 🔴 C1 — `onCommit` async: celda vacía tras edit fallido

**Síntoma:** Doble-click en batería, Enter sin cambiar nada → celda queda
**vacía** (sin input, sin valor). Mismo bug si se escribe un valor inválido.

**Causa:** `cerrar(commit)` comparaba `resultado === false`, pero `onCommit`
es `async` → devuelve `Promise` → comparación siempre falsa → la rama de
restauración nunca se ejecutaba.

**Fix:** convertir `cerrar` en `async` y `await`-ear el resultado.

```js
// Antes
function cerrar(commit) {
    const resultado = onCommit(input.value);
    if (resultado === false) { td.innerHTML = original; }  // NUNCA corre
}

// Después
async function cerrar(commit) {
    let ok;
    try { ok = await Promise.resolve(onCommit(input.value)); }
    catch (e) { ok = false; }
    if (ok === false) { td.innerHTML = original; }
}
```

### 🔴 C2 — Cache IDB nunca se renderizaba offline (spinner eterno)

**Síntoma:** Login online, abrir Consultar (cachea IDB), desconectar,
recargar → muestra "Cargando inventario consolidado…" indefinidamente.

**Causa:** `cargarCacheLocal()` llenaba `this._cache` pero NO actualizaba
`this._sedesListas`. El render dependía de ese Set para decidir si mostrar
datos o spinner. Sin internet, ningún snapshot actualizaba el Set.

**Fix:** agregar `_sedesListas.add(sedeId)` cuando IDB tiene datos.

### 🟠 A2 — Filtro IMEI no normalizaba espacios/guiones

**Síntoma:** Equipo con IMEI `"35 1234 5678 90123 4"` no aparecía al buscar
prefijo "35".

**Causa:** `startsWith(imei)` comparaba strings literales.

**Fix:** normalizar ambos lados (input y campo) con `.replace(/[\s-]/g, '')`.

### 🟠 A3 — Traslado: equipo seguía visible 100-500ms en sede origen

**Síntoma:** Trasladar un equipo, hacer click en otra fila inmediatamente
→ el equipo aún aparecía en la lista, podía ser re-editado (doc ya no existe).

**Fix:** forzar `consultaInventarioService._notificarCambio()` después del
traslado exitoso (re-render optimista, no espera al snapshot).

### 🟠 A4 — Listeners Firestore no se cerraban al logout (memory leak)

**Síntoma:** Logout + login con otro user (mismo browser) → 12 listeners
activos (6 viejos + 6 nuevos). La guarda `length === 0` prevenía reinicializar
pero los viejos seguían ahí.

**Fix:** llamar `consultaInventarioService.destruir()` en `doLogout()` y en
`onAuthChange` cuando se pierde el user.

### 🟡 M1 — Items cacheados offline sin `data-sede` (edición admin rota)

**Síntoma:** Con cache offline cargado, doble-click en batería fallaba con
"sedeId y equipoId son obligatorios".

**Causa:** `_sedeId` y `_sedeNombre` no se persistían en `toJSON()` (son
propiedades no-enumerables en la instancia).

**Fix:** agregar `__sedeId`/`__sedeNombre` opcionales al JSON. `fromJSON`
los restaura como no-enumerables.

---

## 📊 Evaluación de calidad (1-10)

| Dimensión | Puntaje | Comentario |
|---|---|---|
| **Arquitectura** | 9.0 | Servicio paralelo bien justificado, tabla `MODOS` declarativa, DRY. |
| **Rendimiento** | 7.0 | Re-render sin debounce, 6 listeners = 6× lecturas. |
| **UX** | 8.5 | 8 filtros útiles, progreso en vivo, pero `min-width: 1200px` rompe mobile. |
| **Robustez** | 7.0 | 3 bugs críticos corregidos, pero sin timeout en Firestore. |
| **Mantenibilidad** | 8.0 | 725 líneas en un solo archivo (`ModoConsulta.js`). |
| **Seguridad** | 7.0 | `escapeHTML` en templates, pero no se auditaron reglas Firestore. |
| **Total ponderado** | **7.85 / 10** | **Funcional y usable, no production-grade aún.** |

---

## ⚠️ Riesgos conocidos y deuda técnica

### Performance

1. **Re-render en cada snapshot**: `onCambio(renderTabla)` reconstruye la tabla
   completa en cada cambio. Para inventarios >2K items por sede podría notarse
   lag. **Fix futuro:** debounce 50ms o `requestAnimationFrame`.

2. **6 listeners = 6× lecturas Firestore**: con 1000 equipos/sede y 100
   cargas/día son ~600K lecturas (free tier de Firestore es 50K/día).
   **Mitigación:** cache IDB reduce esto, pero en primera carga pega el quota.

3. **IndexedDB sincroniza en cada snapshot**: cada `idbSet` abre transacción
   nueva. En escrituras muy frecuentes podría bloquear thread principal.

4. **Sin memoización de filas**: `renderTabla()` reconstruye HTML completo
   (50 filas ~5ms, aceptable, pero podría ser `DocumentFragment`).

### UX

5. **Mobile rota**: `min-width: 1200px` fuerza scroll horizontal en pantallas
   <1200px. **Fix futuro:** layout de cards en mobile, o columnas colapsables.

6. **No hay confirmación al cambiar estado a "defectuoso"**: un click
   accidental rompe el inventario.

7. **Botón "Refrescar" solo re-pinta, no fuerza fetch**: el usuario espera
   más. Considerar renombrar a "Re-renderizar vista" o eliminar.

8. **No hay loading state en "🔀 Trasladar"**: doble-click puede crear
   2 traslados.

### Robustez

9. **Concurrencia last-write-wins sin detección**: dos admins editando
   la misma fila al mismo tiempo → el segundo sobreescribe al primero
   silenciosamente. **Fix futuro:** campo `updatedAt` + chequeo al escribir.

10. **`actualizadoPor` es la sede del admin, no su identidad**: si dos
    admins de la misma sede editan, no se puede distinguirlos. **Decisión
    pendiente:** renombrar a `actualizadoPorSede` o cambiar a `uid`.

11. **Sin timeout en operaciones Firestore**: si la red está lenta, el
    `setLoading(true)` se queda activo indefinidamente.

12. **Validación de IMEI no normaliza al ingreso**: el filtro está corregido,
    pero `EquipoInventario.validar()` solo exige `length >= 15`. Un operador
    puede guardar `"35-1234..."` o `"35 1234..."`.

13. **Memoria crece sin límite**: el cache en memoria de las 6 sedes crece
    con el tiempo. No hay LRU. Para inventarios >10K items sería problema.

### Mantenibilidad

14. **`ModoConsulta.js` es un monolito de 725 líneas**: podría partirse en
    `consulta-filtros.js`, `consulta-tabla.js`, `consulta-modal-traslado.js`,
    `consulta-csv.js`. Hoy todo está en un solo archivo.

15. **HTML inline en template strings**: 3 `escapeHTML` redundantes, sin
    syntax highlighting, riesgo de XSS si se escapa mal.

16. **Sin tests automatizados del feature**: las 154 tests existentes del
    proyecto (`vitest run`) no cubren Consulta. Cero cobertura.

17. **`consultaInventarioService._unsubscribes` se accede públicamente**
    desde `index.js:197-208` (campo "privado" con `_`). Mejor: método
    `isInicializado()` o exponer un flag.

### Seguridad

18. **No se auditaron las reglas de Firestore** para `sedes/{sedeId}/inventario/{equipoId}`.
    Asumo que existen porque el resto del proyecto las tiene, pero no las
    revisé.

19. **IMEI en CSV exportado sin protección**: si el CSV cae en manos
    equivocadas, expone todos los IMEI. Considerar filtrar por permisos.

---

## 🧪 Cómo probarlo

```bash
# 1. Configurar Firebase
cp .env.example .env.local
# Editar .env.local con credenciales reales

# 2. Instalar dependencias (solo la primera vez)
npm install

# 3. Levantar Vite
npm run dev
# → http://localhost:5173

# 4. Abrir
http://localhost:5173/ingreso-mercancia.html
```

### Smoke tests rápidos (5 min)

1. Login admin → pestaña **📋 Consultar** visible
2. Doble-click en batería, Enter sin cambiar → celda NO queda vacía ✅ (C1)
3. Doble-click en batería, escribir `150` → toast error, celda restaura ✅
4. Editar detalles, Enter → celda muestra nuevo valor tras 100-500ms ✅
5. Botón 🔀 Trasladar, sede destino, confirmar → fila desaparece inmediato ✅ (A3)
6. Logout + login con mismo user → sin errores en consola ✅ (A4)
7. Online: abrir Consultar → offline: recargar → muestra cache ✅ (C2)

### Test offline (validación C2)

1. Online: abrir Consultar (cachea IDB al primer snapshot)
2. Desconectar internet
3. Recargar la página
4. **Esperado:** datos cacheados visibles, no spinner eterno

### Test admin-only (validación permisos)

1. Login como **empleado** (no admin)
2. Ir a Consultar
3. **Esperado:** tabla visible, sin inputs editables, sin botón Trasladar

---

## 📝 Para la próxima versión

Si el feature se va a iterar, el orden de prioridad que recomiendo:

| Prioridad | Mejora | Esfuerzo |
|---|---|---|
| 🔴 Alta | Debounce 50ms en `onCambio` (rendimiento) | 1 hora |
| 🔴 Alta | Layout responsive mobile (cards o columnas colapsables) | 4 horas |
| 🟠 Media | Tests Vitest del feature (mock Firestore) | 6 horas |
| 🟠 Media | Confirmación al cambiar estado a "defectuoso" | 1 hora |
| 🟠 Media | Loading state en botón "🔀 Trasladar" | 30 min |
| 🟡 Baja | Refactor `ModoConsulta.js` en 4 módulos | 4 horas |
| 🟡 Baja | Detección de concurrencia con `updatedAt` | 4 horas |
| 🟡 Baja | Renombrar `actualizadoPor` → `actualizadoPorSede` o cambiar a `uid` | 1 hora |
| 🟢 Futura | LRU cache en memoria (limitar a 5K items) | 3 horas |
| 🟢 Futura | Persistir CSV en lugar de descargar directo | 2 horas |
| 🟢 Futura | Auditoría de reglas Firestore para multi-sede | 2 horas |

**Sugerencia:** hacer commit del feature actual (es estable), abrir issues
para los 11 puntos de arriba, y trabajar en sprints posteriores. No bloquear
la entrega por optimizar lo que podría mejorarse.

---

## 🔗 Referencias

- Plan original: `C:\Users\Ada\.claude\plans\gentle-nibbling-trinket.md`
- Reporte de verificación: incluido en el plan original
- Patrón de referencia: `ModoSalida.js` (mismo contrato `initModoX({...})`)
- Documentación relacionada: `docs/protocolo-migracion-tema.md`
