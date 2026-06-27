# Protocolo de Migración de Tema (Light/Dark) — Multi-página

> Recopilación de pasos, principios y patrones usados para migrar páginas
> HTML existentes a un sistema de tokens centralizado.
>
> **Audiencia:** Desarrollador que quiere replicar este proceso en otro proyecto
> o continuar migrando páginas restantes.
>
> **Stack base:** HTML estático + Tailwind CDN + CSS plano + módulos ES6.

---

## 🎯 Filosofía en una frase

> **El JS no sabe colores. La página no sabe colores. Solo `theme.css` sabe colores.**

Todos los elementos (HTML, JS, CSS) usan **clases semánticas** que apuntan a
**tokens** (variables CSS) que viven en un único archivo. Cambiar un color
global = editar 1 archivo.

---

## 🧱 Arquitectura: 3 capas

```
┌──────────────────────────────────────────────────────────────┐
│  CAPA 3: theme.css  →  RGB-triples por token                 │
│                    (light) y .dark { ... } (dark)            │
├──────────────────────────────────────────────────────────────┤
│  CAPA 2: clases semánticas                                   │
│   - globales (theme.css): .text-themed, .tarjeta--exito      │
│   - por página (intercambio.css, inv-precio.css, etc.)      │
├──────────────────────────────────────────────────────────────┤
│  CAPA 1: páginas HTML                                        │
│   - HTML usa clases semánticas (.text-themed, .btn-accion)  │
│   - JS usa clases semánticas (nunca hex/rgb/Tailwind hard)   │
└──────────────────────────────────────────────────────────────┘
```

**Regla de oro:** Si necesitas un color, primero busca un token. Si no
existe, agrégalo a `theme.css` antes de usarlo en cualquier otro lado.

---

## 📋 Protocolo de migración página por página (7 pasos)

Este es el flujo que se aplicó a `intercambio.html` y `inv-precio.html`.
Funciona para cualquier página nueva.

### 🔍 FASE 0 — Antes de tocar código

| Paso | Acción | Tiempo |
|---|---|---|
| 0.1 | Leer el archivo completo de la página | 2 min |
| 0.2 | Identificar todos los colores hardcodeados (Tailwind `bg-*`, `text-*`, hex, rgb en CSS/JS) | 3 min |
| 0.3 | Identificar si hay nav legacy (`<nav id="globalMenu">`) o scroll listener propio | 1 min |
| 0.4 | Identificar si el JS genera HTML dinámico (template strings, `className =`) | 2 min |
| 0.5 | Planear la pausa: ¿Hasta dónde llegar antes de mostrar el JS al usuario? | 1 min |

### 🧹 FASE 1 — Limpieza segura (pasos 1-4)

#### Paso 1: `<head>` canónico de 5 imports

Reemplazar TODO el contenido del `<head>` por:

```html
<head>
  <meta charset="UTF-8">
  <title>Nombre de la página</title>

  <!-- 1. Anti-FOUC: aplica .dark antes de que Tailwind parsee -->
  <script src="js/theme-init.js"></script>

  <!-- 2. Tailwind (CDN) -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- 3. Config inline: darkMode por clase — DEBE ir después del CDN -->
  <script>
    window.tailwind = window.tailwind || {};
    window.tailwind.config = {
      darkMode: 'class',
      theme: { extend: {
        fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
      } }
    };
  </script>

  <!-- 4. Tokens y overrides de tema (ganan especificidad sobre Tailwind) -->
  <link rel="stylesheet" href="css/theme.css">

  <!-- 5. Estilos específicos de esta página -->
  <link rel="stylesheet" href="./css/<nombre-pagina>.css">
</head>
```

**Por qué este orden importa:**
1. `theme-init.js` debe ir **antes** de Tailwind para evitar el "flash" del modo claro al cargar dark mode.
2. La config inline de Tailwind (`darkMode: 'class'`) debe ir **después** del CDN, porque extiende la config que el CDN ya inicializó.
3. `theme.css` debe ir **después** de la config porque sus selectores `.dark .bg-slate-50 { ... }` ganan especificidad sobre Tailwind.
4. El CSS específico de página al final, para que pueda overridear lo anterior si es necesario.

#### Paso 2: Reemplazar nav legacy

**Antes:**
```html
<nav id="globalMenu" class="fixed top-0 left-0 right-0 ... bg-blue-700 text-white">
  <a href="..." class="...">LISTADO PRECIOS</a>
  <a href="..." class="...">Cálculo Trading</a>
  ...
</nav>
<div class="h-14"></div>  <!-- espaciador legacy -->
```

**Después:**
```html
<div id="appNav" data-active="<key-de-esta-pagina>"></div>
```

> El `<div>` vacío será montado por `mountNav('<key>')` desde el JS.
> `data-active` indica qué opción del menú resaltar.

#### Paso 3: Remover scroll listeners y referencias a nav variable

Buscar:
```js
window.addEventListener('scroll', () => { ... });
const nav = document.querySelector('nav');
nav?.classList.toggle(...);
```

Borrar todo esto. La nav ahora es fija, manejada por `mountNav`.

#### Paso 4: Eliminar código muerto comentado

Típico en páginas evolucionadas:
- Arrays hardcodeados de productos comentados que ahora se importan de un módulo
- Versiones anteriores de funciones JS
- HTML legacy comentado (`<!-- <div class="old">...</div> -->`)

**Cómo:**
- PowerShell: cargar el archivo, eliminar rango de líneas, escribir.
- O `Bash` con `sed`.

> **Tip:** Si el bloque muerto es >500 líneas, NO intentes reemplazarlo con
> `Edit` (string match falla por whitespace). Usa PowerShell con índices.

**Después de Fase 1, PAUSAR y mostrar al usuario:**
- Las clases Tailwind hardcodeadas que encontraste
- El JS que las usa (especialmente `className =` y template strings)

---

### 🎨 FASE 2 — Crear el CSS semántico (paso 5-6)

#### Paso 5: Diseñar las clases semánticas

**Convención de naming:**

| Tipo | Patrón | Ejemplo |
|---|---|---|
| Texto por tono | `text-themed-{variante}` | `text-themed`, `text-themed-secondary`, `text-themed-muted` |
| Categoría semántica | `{cosa}--{categoría}` | `tarjeta--exito`, `tarjeta--info`, `tarjeta--mixto`, `tarjeta--advertencia` |
| Botones | `btn-{tipo}--{variante}` | `btn-accion--primario`, `btn-accion--exito` |
| Estados | `.{cosa}-{estado}` | `tab--activa-devices`, `tab--activa-products` |
| Badges | `badge-{nombre}--{variante}` | `badge-razon--exito`, `badge-razon--neutro` |

**Reglas para inventar una clase nueva:**
1. **Nombre describe propósito, no color.** `.tarjeta--exito` ✅, `.tarjeta-verde` ❌
2. **Una clase = un rol visual completo** (fondo + texto + borde si aplica)
3. **Agrupa con BEM** cuando hay variantes del mismo concepto
4. **Si dos clases hacen lo mismo → usa una sola**

#### Paso 6: Crear el archivo `css/<pagina>.css`

Estructura recomendada:

```css
/* ============================================================
   nombre-pagina.css
   Estilos para la página [descripción].
   Todos los colores usan tokens de theme.css — nunca hardcoded.
   ============================================================ */

/* ── Sección 1: nombre semántico ── */
.clase-semantica-1 {
  background: rgb(var(--token));
  color: rgb(var(--text-primary));
  border: 1px solid rgb(var(--border));
  /* ... */
}

.clase-semantica-1--variante {
  background: rgb(var(--otro-token));
}

/* ── Sección 2: ... ── */
```

**Tokens más usados (de `theme.css`):**

| Token | Uso |
|---|---|
| `--surface` | Fondo de página (cambia en dark) |
| `--surface-elevated` | Fondo de tarjetas |
| `--surface-muted` | Fondo de elementos secundarios |
| `--surface-sunken` | Fondo hundido (thead de tablas, etc.) |
| `--text-primary` | Texto principal |
| `--text-secondary` | Texto secundario (labels) |
| `--text-muted` | Texto auxiliar (placeholders, hints) |
| `--text-inverse` | Texto sobre fondos de color |
| `--accent` | Color de marca / primario |
| `--accent-soft` | Fondo tintado de accent |
| `--accent-text` | Texto sobre accent-soft |
| `--success` | Verde (categoría éxito) |
| `--success-soft` | Fondo tintado de éxito |
| `--success-text` | Texto sobre success-soft |
| `--warning` | Ámbar |
| `--danger` | Rojo |
| `--mixto` | Púrpura (categoría "mixto") |
| `--mixto-soft` / `--mixto-text` | Variantes |
| `--info` | Cyan |
| `--border` / `--border-strong` / `--border-soft` | Bordes escalonados |
| `--shadow-card` / `--shadow-elevated` | Sombras |
| `--input-bg` / `--input-border` / `--input-placeholder` | Inputs translúcidos |
| `--hover-bg` | Fila hover |
| `--salida-btn` / `--salida-btn-hover` | Botón destructivo |

**Truco para tokens nuevos:**

Si necesitas un color que no existe (ej: verde-claro específico), **primero
agrégalo a `theme.css` con sus dos valores (light + .dark)**, luego úsalo
desde el CSS de la página.

```css
/* En theme.css */
:root {
  --mi-color: 100 200 50;
}
.dark {
  --mi-color: 150 220 100;
}

/* En mi-pagina.css */
.mi-clase {
  background: rgb(var(--mi-color));
}
```

#### Excepción intencional: terminales / código

Ciertos elementos deben verse igual siempre:

- Bloques `<pre>` con código (estilo terminal)
- Bloques `<code>` inline
- Logos con colores de marca fijos

Para estos, usa colores hex fijos con un comentario:

```css
.terminal-codigo {
  background: #0f172a;  /* slate-900 — terminal siempre oscuro */
  color: #4ade80;       /* green-400 — texto de terminal siempre brillante */
}
```

---

### 🔧 FASE 3 — Reemplazar en HTML y JS (paso 7)

#### Paso 7.1: HTML estático

Reemplazar clases Tailwind de color por clases semánticas. Patrones frecuentes:

| Antes (Tailwind hardcoded) | Después (semántico) |
|---|---|
| `bg-white` | `surface-card` (si es tarjeta) o `surface-base-bg` (fondo) |
| `bg-gray-50/100` | `surface-muted` |
| `text-gray-800/900` | `text-themed` |
| `text-gray-600/700` | `text-themed-secondary` |
| `text-gray-500` | `text-themed-muted` |
| `text-gray-400` | `text-themed-subtle` |
| `bg-blue-{50..900}` | `surface-base-bg` + `tarjeta--info` / `texto-valor-acento` |
| `bg-green-{50..900}` | `tarjeta--exito` + `texto-valor-exito` |
| `bg-purple-{50..900}` | `tarjeta--mixto` + `texto-valor-mixto` |
| `border-{color}-{N}` | `border-themed` o `var(--border)` |
| `text-white` | `texto-inverso` (solo si va sobre fondo de color) |
| `text-blue-600` (checkbox) | variante de accent en CSS (no en línea) |

#### Paso 7.2: JS que reescribe `className`

Patrón peligroso que rompe el tema. Buscar:

```js
element.className = 'bg-blue-600 text-white px-4 py-2';
```

**Reemplazar por:**

```js
element.className = 'btn-accion btn-accion--primario';
```

#### Paso 7.3: JS que genera HTML dinámico

Buscar template strings con clases Tailwind:

```js
div.innerHTML = `
  <span class="bg-green-100 text-green-800 px-2 py-1 rounded">
    ${reasonText}
  </span>
`;
```

**Reemplazar por:**

```js
const badgeClass = condicionExito ? 'badge-razon--exito' : 'badge-razon--neutro';
div.innerHTML = `
  <span class="badge-razon ${badgeClass}">
    ${reasonText}
  </span>
`;
```

> **Principio:** El JS decide la **categoría semántica** (éxito/neutro), no
> el color. El CSS traduce categoría → color.

#### Paso 7.4: Agregar bloque de montaje al final

Antes del cierre `</body>`:

```html
<!-- Montar nav + tema (igual que el resto de páginas) -->
<script type="module">
  import { mountNav } from './js/components/nav.js';
  import { initTheme, onThemeChange } from './js/theme.js';
  import { mountThemeToggle } from './js/components/themeToggle.js';

  initTheme();
  mountNav('<key-de-esta-pagina>');
  mountThemeToggle();

  onThemeChange(() => { /* hook opcional */ });
</script>
```

> Este bloque es **idéntico** en todas las páginas excepto por la key.
> Es el "composition root" de cada página.

---

## ✅ Validación final por página

Después de migrar, antes de cerrar:

```bash
# 1. ¿Quedan colores hardcodeados en el HTML?
grep -E "(text-gray|bg-gray|text-blue|bg-blue|text-green|bg-green|text-purple|bg-purple|text-indigo|bg-indigo|text-white|bg-white|text-red|bg-red|text-yellow|bg-yellow)" archivo.html
# (debe retornar 0 matches)

# 2. ¿Los tags están balanceados?
node -e "const fs = require('fs'); const h = fs.readFileSync('archivo.html', 'utf8'); console.log('<div>:', (h.match(/<div/g)||[]).length, '</div>:', (h.match(/<\/div>/g)||[]).length); console.log('<script>:', (h.match(/<script/g)||[]).length, '</script>:', (h.match(/<\/script>/g)||[]).length);"
# (cada par debe coincidir)

# 3. ¿Todas las clases semánticas tienen CSS?
# Listar clases del HTML y verificar que existan en theme.css o <pagina>.css
```

---

## 📦 Archivos del sistema (inventario)

```
public/
├── js/
│   ├── theme-init.js              # Anti-FOUC: aplica .dark antes de Tailwind
│   ├── theme.js                   # initTheme, onThemeChange, setTheme, getTheme
│   └── components/
│       ├── nav.js                 # mountNav(activeKey)
│       └── themeToggle.js         # mountThemeToggle()
├── css/
│   ├── theme.css                  # ⭐ ÚNICA fuente de colores (tokens + utilidades)
│   ├── lista.css                  # ⭐ Específico de lista.html
│   ├── intercambio.css            # ⭐ Específico de intercambio.html
│   ├── inv-precio.css             # ⭐ Específico de inv-precio.html
│   ├── ingreso-mercancia.css      # (ya existía, con clases semánticas)
│   └── registro.css               # (ya existía, con clases semánticas)
└── *.html                          # Una por página
```

**Reglas:**
- `theme.css` se importa en TODAS las páginas (orden #4 en el head)
- Cada página tiene su propio `<pagina>.css` que se importa al final
- Las clases globales viven en `theme.css` (`.text-themed`, `.tarjeta--exito`, etc.)
- Las clases específicas de página viven en el `<pagina>.css` (`.btn-accion`, `.tab--activa-devices`, etc.)

---

## 🚨 Anti-patrones a evitar

| ❌ No hagas esto | ✅ Haz esto |
|---|---|
| Hardcodear `#3b82f6` en CSS de página | Crear un token en `theme.css` y usarlo |
| `text-blue-600` directamente en JS | `texto-valor-acento` (semántico) |
| `class="bg-white rounded shadow"` en HTML | `class="surface-card"` |
| `bg-green-100 text-green-800` juntos (mismo significado) | `tarjeta--exito` (clase única) |
| Crear una clase por cada color | Crear un token, reutilizarlo |
| Mezclar Tailwind hardcoded con clases semánticas | Decidir uno y mantener consistencia |
| `text-gray-500` esperando que se vea igual en dark | Usar `text-themed-muted` (token-aware) |
| Sobre-overridear con `!important` | Definir el specificity correcto desde el inicio |
| Inyectar `style="color: #..."` inline | Usar una clase |

---

## 🎓 Principios de diseño profesionales aplicados

1. **Single Source of Truth (SSOT):** un solo archivo (`theme.css`) para colores.
2. **Push complexity to the edges:** la lógica complicada vive en CSS; JS/HTML permanecen simples.
3. **Semantic over visual naming:** describe QUÉ es, no CÓMO se ve.
4. **Composition root:** cada página ensambla sus piezas en un lugar visible y ordenado.
5. **Fail-safe defaults:** `initTheme()` aplica `.dark` desde el primer paint, evitando FOUC.
6. **Tokens over hardcoded values:** cualquier color que pueda cambiar de modo → token.
7. **Convention over configuration:** `mountNav('<key>')`, `data-active="<key>"` — el contrato es siempre el mismo.
8. **CSS BEM ligero:** `--modificador` para variantes del mismo concepto.

---

## 🧪 Smoke test post-migración

Para cada página migrada, verificar visualmente:

1. ✅ Carga en modo light sin FOUC (flash blanco)
2. ✅ Botón de tema cambia a dark mode
3. ✅ Carga en dark sin FOUC
4. ✅ Recarga la página manteniendo el modo elegido (localStorage)
5. ✅ Todas las secciones son legibles en ambos modos
6. ✅ Los contrastes son suficientes (texto vs fondo)
7. ✅ Los estados (hover, focus, active) se ven bien
8. ✅ La nav resalta la página actual con `data-active`
9. ✅ Si la página tiene `window.print()`, el `@media print` fuerza light mode

---

## 📚 Decisiones de diseño recurrentes

### ¿Cuándo crear una clase nueva vs reutilizar una existente?

- Si la combinación de color/borde/padding **se repite ≥3 veces** → clase nueva
- Si es **un caso único** → clases utilitarias inline (Tailwind) o estilo inline
- Si es un **concepto nuevo del dominio** (ej: "tarjeta de advertencia") → clase nueva aunque se use 1 vez

### ¿Cuándo un color debe ser un token nuevo?

- Si el color **cambia entre light/dark** → token (obligatorio)
- Si el color es **constante** (logo, terminal) → hex directo con comentario
- Si el color **representa una categoría semántica** (verde=éxito, rojo=peligro) → token semántico (`--success`, `--danger`)

### ¿Cuándo usar BEM y cuándo clases planas?

- Variantes del mismo concepto → BEM: `.tarjeta`, `.tarjeta--exito`, `.tarjeta--info`
- Utilidades independientes → planas: `.text-themed`, `.flex`, `.scroll-y-80`

---

## 📝 Checklist para el desarrollador

Cuando migres una nueva página, tacha cada item:

- [ ] Leí el archivo completo
- [ ] Identifiqué colores hardcodeados (Tailwind/hex/rgb)
- [ ] Identifiqué nav legacy y scroll listeners
- [ ] Identifiqué JS que genera HTML dinámico
- [ ] Pausé después de Fase 1 para validar con el usuario
- [ ] Actualicé `<head>` con los 5 imports en orden
- [ ] Reemplacé nav legacy por `<div id="appNav" data-active="...">`
- [ ] Eliminé scroll listeners
- [ ] Eliminé código muerto comentado
- [ ] Creé `css/<pagina>.css` con clases semánticas
- [ ] Reemplacé clases Tailwind en HTML estático
- [ ] Migré JS que reescribe `className`
- [ ] Migré JS que genera HTML dinámico (template strings)
- [ ] Agregué bloque "montar nav + tema" al final
- [ ] Validé con grep que no quedan colores hardcodeados
- [ ] Validé con node que los tags están balanceados
- [ ] Verifiqué visualmente en light y dark mode
- [ ] Verifiqué la persistencia del tema elegido (localStorage)

---

## 🔗 Referencias cruzadas

- [cambiar-colores-por-modo.md](./cambiar-colores-por-modo.md) — cómo editar tokens para cambiar colores globales
- [ejemplo-cambiar-resumen-salida.md](./ejemplo-cambiar-resumen-salida.md) — ejemplo paso a paso de un cambio

---

**Última actualización:** migración completa de `intercambio.html` e `inv-precio.html`.