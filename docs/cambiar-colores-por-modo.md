# Cómo cambiar colores/tonos en ambos modos — Guía paso a paso

> **Regla de oro**: nunca pongas un color directamente en el HTML ni en el CSS de la página.
> Siempre modifica el **token** en `theme.css`. El cambio se propaga a quien lo use.

---

## Antes de empezar: entender los 3 niveles de tokens

`public/css/theme.css` tiene 3 tipos de variables:

| Tipo | Formato | Cuándo se usa | Ejemplo |
|---|---|---|---|
| **RGB-triple** | `15 23 42` (sin comas) | Permite usar `rgb(var(--x) / <alpha>)` con Tailwind | `--text-primary`, `--accent`, `--danger` |
| **Color compuesto** | `rgba(15, 23, 42, 0.04)` | Casos donde no necesitas que Tailwind le meta alpha | `--input-bg`, `--glass-bg`, `--hover-bg` |
| **Sombra** | `0 1px 3px ...` | Solo para `box-shadow` | `--shadow-card`, `--shadow-elevated` |

**Casi todo lo que vas a querer cambiar es RGB-triple.**

---

## Ejemplo real: cambiar el color del botón `#btnConfirmarSalida`

El botón hoy es rojo (gradiente de `red-600` → `rose-600`). El usuario quiere:
- **Modo claro** → rojo destructivo (igual que ahora)
- **Modo oscuro** → ámbar/advertencia (semáforo invertido)

### Paso 1 — Identifica el elemento y su categoría semántica

Abre `ingreso-mercancia.html` línea 163:

```html
<button id="btnConfirmarSalida"
  class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 ...">
  📤 Confirmar Salida y Dar de Baja
</button>
```

**Categoría**: es un botón destructivo / de acción crítica. Hoy usa `red-600` + `rose-600` (Tailwind hardcoded), pero la categoría semántica es **"acción de salida / advertencia"** — y como es específico de esta página, no hay un token genérico que encaje.

**Decisión**: vamos a crear un token dedicado `--salida-btn` para que el botón sea un citizen de primera clase del sistema de diseño.

---

### Paso 2 — Añade el token en `theme.css` (modo claro)

Abre `public/css/theme.css`. Busca la línea 43-45 (la familia `--info`):

```css
  --info:              6 182 212;    /* cyan-500 */
  --info-soft:         236 254 255;  /* cyan-50 */
  --info-text:         14 116 144;   /* cyan-800 */
```

Justo **debajo** de `--info-text` añadimos el token nuevo. ¿Por qué ahí? Porque el bloque `--info` cierra la familia de "estados semánticos" (success, warning, danger, info). Visualmente queda agrupado.

```css
  --info:              6 182 212;    /* cyan-500 */
  --info-soft:         236 254 255;  /* cyan-50 */
  --info-text:         14 116 144;   /* cyan-800 */

  /* Botón "Confirmar Salida": rojo destructivo en light, ámbar en dark
     (semáforo invertido: peligro → advertencia) */
  --salida-btn:        220 38 38;    /* red-600 */
  --salida-btn-hover:  185 28 28;    /* red-700 */
```

**¿Por qué RGB-triple y no hex?**
- `220 38 38` permite que en el futuro alguien escriba `rgb(var(--salida-btn) / 0.5)` y obtenga un rojo translúcido.
- Si pusieras `#dc2626`, tendrías que duplicar el token con un `rgba(220, 38, 38, 0.5)` aparte.

**¿De dónde sale `220 38 38`?**
De la paleta de Tailwind: `red-600` = `rgb(220, 38, 38)`. Siempre que copies un color de Tailwind, quítale el `rgb(` y `)` y te queda el triple.

---

### Paso 3 — Añade el token en `theme.css` (modo oscuro)

Baja hasta el bloque `.dark` (línea ~100). Misma lógica, justo debajo de `--info-text`:

```css
  --info:              6 182 212;
  --info-soft:         22 78 99;     /* cyan-900 */
  --info-text:         165 243 252;  /* cyan-200 */

  /* Botón "Confirmar Salida" en dark: ámbar (advertencia) en vez de rojo */
  --salida-btn:        245 158 11;   /* amber-500 */
  --salida-btn-hover:  217 119 6;    /* amber-600 */
```

**Nota:** `--salida-btn-hover` es un poco más oscuro que `--salida-btn` en ambos modos (sombra natural al pasar el mouse). En light: red-600 → red-700. En dark: amber-500 → amber-600.

---

### Paso 4 — Quita los colores hardcoded del HTML

El HTML del botón tiene clases Tailwind con el gradiente rojo fijo. Esas clases **siempre** van a ser rojas, sin importar el modo. Hay que quitarlas.

En `ingreso-mercancia.html` línea 163, **de**:

```html
<button id="btnConfirmarSalida"
  class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition">
```

**a**:

```html
<button id="btnConfirmarSalida"
  class="text-white font-bold py-3.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition">
```

Quitamos:
- `bg-gradient-to-r` → el gradiente lo definiremos en CSS
- `from-red-600 to-rose-600` → los colores fijos
- `hover:from-red-500 hover:to-rose-500` → el hover fijo

**¿Por qué quitar y no solo añadir `!important`?** Porque `!important` sobre una clase Tailwind seguiría usando `red-600` en dark. Hay que sustituir el origen, no taparlo.

---

### Paso 5 — Define el estilo del botón en `ingreso-mercancia.css` con tokens

Abre `public/css/ingreso-mercancia.css`. Añade este bloque donde tenga sentido (yo lo puse junto a `.btn-success` para tener todos los "botones de acción" juntos):

```css
/* ── Botón "Confirmar Salida" — color distinto por modo (semáforo) ── */
#btnConfirmarSalida {
    background: linear-gradient(
        135deg,
        rgb(var(--salida-btn)) 0%,
        rgb(var(--salida-btn-hover)) 100%
    );
    transition: filter 0.2s, transform 0.1s;
}

#btnConfirmarSalida:hover {
    filter: brightness(1.1);  /* aclara un 10% al pasar el mouse */
}
```

**Puntos clave**:
- `#btnConfirmarSalida` es **más específico** que cualquier utility de Tailwind → siempre gana.
- Usamos `rgb(var(--salida-btn))` (con `rgb()` envolviendo) porque el token es RGB-triple.
- `linear-gradient(135deg, …, …)` reutiliza el mismo patrón de gradiente que tenía el HTML.
- El hover con `filter: brightness(1.1)` es un truco genial: aclara el botón sin que tengamos que definir un tercer color. Funciona con cualquier color base.

---

### Paso 6 — Verifica

Refresca el navegador con caché desactivada (Ctrl+Shift+R).

| Acción | Resultado esperado |
|---|---|
| Abrir `ingreso-mercancia.html` en modo claro | Botón rojo con gradiente (red-600 → red-700) |
| Click en 🌙 (botón de tema) | El botón pasa a ámbar (amber-500 → amber-600) |
| Click en ☀️ | Vuelve a rojo |

Si no cambia, abre DevTools → Console y busca errores. Si los hay, casi siempre será un error de sintaxis en `theme.css` (falta un `;` o un `}`).

---

## Resumen del flujo (cheatsheet)

```
┌─────────────────────────────────────────────────────────────────┐
│  ¿Quiero cambiar el color de un elemento?                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  ¿El color ya tiene un token           │
         │  que coincida semánticamente?          │
         └────────────────────────────────────────┘
                    │                       │
                   SÍ                      NO
                    │                       │
                    ▼                       ▼
        Cambiar el valor           Crear token nuevo en
        numérico del token         theme.css (light + dark)
        en :root y en .dark                    │
                                             ▼
                                    Quitar colores hardcoded
                                    del HTML (Tailwind, style)
                                             │
                                             ▼
                                    Usar rgb(var(--x))
                                    en el CSS de la página
```

---

## Catálogo de tokens existentes (para no duplicar)

Antes de crear un token nuevo, mira si ya existe uno que sirva. Estos son los semánticos disponibles:

| Token | Triple (light) | Para qué sirve |
|---|---|---|
| `--accent` | `37 99 235` | Color principal / links / foco |
| `--accent-hover` | `29 78 216` | Hover del accent |
| `--accent-soft` | `239 246 255` | Fondo sutil indigo (chips, badges) |
| `--accent-text` | `30 64 175` | Texto indigo sobre `--accent-soft` |
| `--success` | `16 185 129` | Verde / confirmaciones |
| `--success-soft` | `236 253 245` | Fondo verde |
| `--success-text` | `6 95 70` | Texto verde |
| `--warning` | `245 158 11` | Ámbar / advertencias |
| `--warning-soft` | `254 252 232` | Fondo ámbar |
| `--warning-text` | `146 64 14` | Texto ámbar |
| `--danger` | `244 63 94` | Rojo destructivo |
| `--danger-soft` | `255 241 242` | Fondo rojo |
| `--danger-text` | `159 18 57` | Texto rojo |
| `--info` | `6 182 212` | Cyan informativo |
| `--info-soft` | `236 254 255` | Fondo cyan |
| `--info-text` | `14 116 144` | Texto cyan |
| `--text-primary` | `15 23 42` | Texto principal |
| `--text-secondary` | `71 85 105` | Texto secundario |
| `--text-muted` | `100 116 139` | Texto apagado (placeholders, labels) |
| `--text-inverse` | `255 255 255` | Texto blanco sobre color |
| `--surface` | `248 250 252` | Fondo de la página |
| `--surface-elevated` | `255 255 255` | Fondo de cards / inputs |
| `--surface-muted` | `241 245 249` | Fondo de headers / hovers suaves |
| `--surface-sunken` | `226 232 240` | Fondo hundido (insets) |
| `--border` | `226 232 240` | Borde estándar |
| `--border-strong` | `203 213 225` | Borde más visible |
| `--border-soft` | `241 245 249` | Borde sutil |

**Si el color que quieres es uno de estos → cambia el valor del token.**
**Si es un caso muy específico de una página → crea un token nuevo con prefijo** (ej. `--salida-btn`, `--cierre-total`).

---

## Errores comunes

### 1. Olvidar el bloque `.dark`
Si solo defines el token en `:root`, en modo oscuro se quedará con el valor de light. **Siempre** hay que definirlo en ambos bloques.

### 2. Usar hex en lugar de RGB-triple
`--mi-color: #dc2626;` funciona, pero pierdes la capacidad de usar alpha de Tailwind. Con `220 38 38` puedes escribir `bg-salida-btn/50` y se hace translúcido automáticamente.

### 3. Dejar las clases Tailwind viejas
Si solo creas el token y no quitas `from-red-600`, el botón seguirá rojo. Las clases de Tailwind tienen la misma especificidad que `#id`, y el orden del HTML gana. La solución es **quitar la clase vieja** o usar un selector más específico (como `#btnConfirmarSalida`).

### 4. Querer un color que "no es ni light ni dark" del mismo modo
Eso es síntoma de que el token ya no representa una categoría, sino un **estado**. Crea un token nuevo: `--estado-confirmado`, `--estado-pendiente`, etc. No reutilices tokens semánticos para estados puntuales.
