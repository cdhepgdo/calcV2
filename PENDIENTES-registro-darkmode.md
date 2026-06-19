# Pendientes — `public/registro.html` y dark mode

Trabajo realizado el 2026-06-19 sobre la rama `version-3.8`.

## ✅ Completado en esta sesión

### 1. Fila "TOTALES DEL DÍA" con fondo blanco en dark mode
La fila `<tfoot>` de cada día se renderizaba con `style="background: #f7fafc"` inline, lo que en dark mode quedaba como una franja blanca chillosa en medio del slate-900.

**Cambios:**
- `public/js/registro.js:557` → se reemplazó el inline style por `class="totales-dia"`.
- `public/css/registro.css` → se agregó la clase `.totales-dia` usando `rgb(var(--surface-muted))`, que se adapta automáticamente al tema (slate-100 en light, slate-700 en dark). También se agregó `.totales-dia td` con borde superior usando `rgb(var(--border-strong))`.

### 2. Gradiente del `.dia-header` muy brillante en dark mode
El header de cada día usaba `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` en ambos modos, lo que en dark mode se veía demasiado saturado contra el fondo oscuro.

**Cambios:**
- `public/css/registro.css` → se agregó override `.dark .dia-header` con gradiente más oscuro `linear-gradient(135deg, #4338ca 0%, #5b21b6 100%)` (indigo-700 → violet-800) para integrar mejor con slate-900.

---

## 🔍 Observaciones adicionales (no resueltas, ver si requieren acción)

### 3. HTML de `registro.html` tiene basura embebida
Líneas 49-56 del HTML contienen comentarios estilo "Ahora se agregó:" y "Y este bloque NUEVO justo debajo del select:" con texto literal tipo `<option value="personalizado">Personalizado...</option> ← nueva opción` y un `<input ...>` con `...>` (atributo inválido). Parece código a medio refactorizar que nunca se limpió.

**Recomendación:** Limpiar la línea 51 (hay un `</select>` duplicado), el comentario de la 48-49, y el placeholder/input mal formado de las 55-56.

### 4. Duplicación de archivos de tema
En el git status aparecen archivos de tema nuevos:
- `public/css/theme.css`
- `public/js/theme.js`
- `public/js/theme-init.js`
- `public/js/tailwind-config.js`
- `public/js/components/` (directorio nuevo)

Y `public/registro.html` ya importa `css/theme.css` y `js/theme-init.js`. Habría que verificar que el resto de páginas (`cierree.html`, `index.html`, etc.) también carguen el sistema de tokens para que el dark mode sea consistente en toda la app, no solo en `registro.html`.

### 5. `historial.html` tiene el mismo gradiente morado hardcodeado
`public/historial.html:72` usa `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` inline. Mismo problema que el `.dia-header` antes del fix — no se adapta al tema. Si `historial.html` también soporta dark mode, conviene replicar la solución.

### 6. `admin.js` también renderiza "TOTALES DEL DÍA"
Líneas 469 y 1280 de `public/js/admin.js` generan `<td colspan="4" class="py-3 px-4 uppercase">TOTALES DEL DÍA</td>`. Como usa clases Tailwind en lugar de inline styles, probablemente ya se vea bien en dark mode, pero conviene confirmar visualmente. Si el `<tr>` padre tiene fondo claro hardcodeado, hay que ajustarlo.

---

## 🧪 Pendiente verificar visualmente

- Refrescar `registro.html` en dark mode y confirmar que:
  - La fila TOTALES DEL DÍA ya no es blanca (debe ser slate-700).
  - El header de cada día tiene un gradiente más oscuro pero todavía distinguible.
- Comparar con `historial.html` y `admin.js` para decidir si vale la pena aplicar la misma solución allí.