# Ejemplo real: cambiar el color de "Resumen de Salida"

> **Caso**: el `<h3>` "RESUMEN DE SALIDA" se ve casi invisible en modo claro (rosa pálido sobre blanco). Vamos a hacerlo legible en ambos modos, usando el flujo de tokens.

---

## Paso 0 — Ubicar el elemento

Abre `public/ingreso-mercancia.html` y ve a la **línea 175**:

```html
<h3 class="text-red-300 text-xs font-bold uppercase tracking-wider mb-3">Resumen de Salida</h3>
```

**Diagnóstico:**
- Tiene `text-red-300` (Tailwind hardcoded).
- `red-300` = `rgb(252, 165, 165)`, un rosa muy claro que en modo oscuro destaca sobre el fondo glass, pero en modo claro desaparece contra el blanco.
- En la línea 267 hay otro h3 similar (`Resumen del Lote` con `text-indigo-300`). Vamos a arreglar ambos con la misma técnica.

**Decisión semántica:**
"Resumen de Salida" es un encabezado de un panel de advertencia/destructivo → categoría **danger**.
"Resumen del Lote" es un encabezado de un panel informativo → categoría **accent** (indigo).

Por suerte, **ya tenemos los tokens** para ambas categorías:
- `text-red-300` → debería ser `rgb(var(--danger-text))`
- `text-indigo-300` → debería ser `rgb(var(--accent-text))`

---

## Paso 1 — Verificar que los tokens existen

Abre `public/css/theme.css` y busca la familia `--danger-text`:

**En `:root` (modo claro, líneas 39-41):**
```css
--danger:            244 63 94;    /* rose-500 */
--danger-soft:       255 241 242;  /* rose-50 */
--danger-text:       159 18 57;    /* rose-800 */
```

**En `.dark` (modo oscuro, líneas 100-102):**
```css
--danger:            244 63 94;
--danger-soft:       136 19 55;    /* rose-900 */
--danger-text:       254 205 211;  /* rose-200 */
```

**¿Ves la magia?**
- En light: `--danger-text` = `159 18 57` (rose-800, rojo oscuro legible sobre blanco).
- En dark: `--danger-text` = `254 205 211` (rose-200, rosa claro legible sobre fondo oscuro).
- **El mismo token da el color correcto en cada modo**. Eso es exactamente lo que queremos.

---

## Paso 2 — Quitar la clase Tailwind del HTML

En `ingreso-mercancia.html` línea 175, **de**:

```html
<h3 class="text-red-300 text-xs font-bold uppercase tracking-wider mb-3">Resumen de Salida</h3>
```

**a**:

```html
<h3 class="resumen-titulo text-xs font-bold uppercase tracking-wider mb-3">Resumen de Salida</h3>
```

**Cambios:**
- ❌ Quitamos `text-red-300` (color hardcoded).
- ✅ Añadimos una clase semántica nueva: `resumen-titulo`.

**¿Por qué crear una clase nueva en vez de usar un utility?**
Podría escribir `text-[rgb(var(--danger-text))]` directamente en el HTML, pero:
- Es feo de leer.
- Rompe la consistencia con el resto del código (que usa clases semánticas).
- Si mañana hay que ajustar el padding o el border, ya tenemos un lugar donde añadirlo.

**Repetimos para el otro h3** (línea 267):

**De**:
```html
<h3 class="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3" id="tituloResumen">Resumen del Lote</h3>
```

**A**:
```html
<h3 class="resumen-titulo resumen-titulo--lote text-xs font-bold uppercase tracking-wider mb-3" id="tituloResumen">Resumen del Lote</h3>
```

Usamos un **modificador BEM** (`--lote`) para el segundo h3, así comparten estilos base pero pueden divergir si hace falta.

---

## Paso 3 — Definir las clases en `ingreso-mercancia.css`

Abre `public/css/ingreso-mercancia.css` y añade este bloque nuevo (por ejemplo, justo después de los estilos del panel `#panelResumen`):

```css
/* ── Títulos de los paneles de resumen ── */
.resumen-titulo {
    color: rgb(var(--danger-text));
    transition: color 200ms ease;
}

.resumen-titulo--lote {
    color: rgb(var(--accent-text));
}
```

**Puntos clave:**

1. **`rgb(var(--danger-text))`**: envolvemos el RGB-triple con `rgb()` para que CSS lo entienda como color.
2. **Una sola clase, dos propósitos**: `.resumen-titulo` siempre será "tono destructivo" (rojo), y `.resumen-titulo--lote` lo sobrescribe a tono "informativo" (indigo).
3. **`transition: color 200ms ease`**: cuando el usuario cambie de tema, el color hará una transición suave en vez de saltar. Esto se nota mucho en la calidad percibida.

---

## Paso 4 — Bonus: limpiar el resto de "rojo duro" cercano

Si te fijas en la imagen, hay otros elementos rojos en el mismo panel que también se ven mal. Vamos a hacer una pasada:

| Elemento | HTML actual | Solución |
|---|---|---|
| `<p>equipos para salida</p>` (línea 178) | `class="text-slate-400 ..."` | ✅ Ya funciona (`.dark .text-slate-400` está overrideado) |
| `border-t border-white/10` (línea 180) | Separador translúcido | ❌ Se ve mal en light → añadir `html:not(.dark) .border-white\/10` override |

Para el separador, abre `public/css/theme.css` y busca el bloque `LIGHT-MODE ADAPTIVE OVERRIDES` (que añadimos en el paso 6 de la migración). Ya existe una línea para `border-white/10`:

```css
html:not(.dark) .border-white\/10 { border-color: rgb(var(--border)) !important; }
```

**Ya está cubierto.** Si no se ve bien, es porque ese selector no está siendo matcheado. Verifica que el HTML tenga la clase `border-white/10` exactamente como aparece (Tailwind escapa la barra como `\/` en CSS).

---

## Paso 5 — Verificar

Refresca con **Ctrl+Shift+R** (recarga sin caché).

| Acción | Resultado esperado |
|---|---|
| Modo claro + panel "Resumen de Salida" | Título en **rojo oscuro** (rose-800), bien legible |
| Cambiar a 🌙 | Título pasa a **rosa claro** (rose-200), legible sobre el glass oscuro |
| Panel "Resumen del Lote" | Título en **indigo oscuro** (light) / **indigo claro** (dark) |
| Hover sobre el panel | El color se mantiene (no es un botón, no necesita hover) |
| Transición | Al cambiar tema, el color hace fade en 200ms (no salta) |

---

## Resumen del flujo (lo que acabas de aprender)

```
  1. UBICAR          →  grep / buscar el elemento en el HTML
  2. DIAGNOSTICAR    →  ¿tiene clase Tailwind hardcoded? (text-red-300, bg-blue-500, etc.)
  3. DECIDIR         →  ¿qué categoría semántica tiene? (danger, accent, success...)
  4. BUSCAR TOKEN    →  ¿ya existe en theme.css? (probablemente sí)
        │
        ├─ SÍ existe  →  usarlo: rgb(var(--danger-text))
        │
        └─ NO existe  →  crearlo en :root y en .dark con un nombre semántico
  5. QUITAR HARDCODE →  eliminar la clase Tailwind del HTML
  6. APLICAR         →  en el CSS de la página, definir la clase con rgb(var(--x))
  7. VERIFICAR       →  refrescar y alternar tema
```

**El error más común**: dejar la clase Tailwind "por si acaso". No la dejes. Si quedó en el HTML, va a ganar al CSS. Hay que borrarla.

---

## Apéndice: lista de títulos similares que conviene revisar

Cuando hagas este ejercicio, busca estos patrones en todo el HTML:

```bash
grep -nE 'text-(red|blue|green|yellow|indigo|orange|amber)-[0-9]+' public/*.html
```

Cada match es un candidato a migrar a tokens. Es el mismo flujo, una y otra vez. Cuando ya no quede ninguno, el proyecto está 100% en modo dinámico.
