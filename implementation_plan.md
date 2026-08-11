# Plan de Implementación: Sistema de Inventario y Stock de Accesorios Escalable (V3)

Este plan detalla el diseño técnico para implementar el control de inventario de accesorios y productos con stock cuantitativo. El sistema estará integrado atómicamente con las ventas diarias y los movimientos de la sucursal, manteniendo la arquitectura Local-First y de Sincronización offline en tiempo real.

---

## Cambios tras Revisión del Usuario (Feedback V2)

> [!IMPORTANT]
> **Ajustes y Mejoras Clave Solicitadas:**
> 1. **Ubicación de la Vista:** En lugar de `inv-precio.html`, implementaremos la vista de administración de accesorios dentro de [ingreso-mercancia.html](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/ingreso-mercancia.html) como una cuarta pestaña llamada `🛡️ Accesorios` para mantener agrupadas las funciones operativas de inventario.
> 2. **Variaciones y Subtipos de Accesorios:** Para soportar múltiples variaciones (ej. Forro de Cuero, Forro de Silicona, Vidrio Antiespía, Vidrio de Privacidad), el modelo de datos incluirá un atributo flexible de **subtipo o descripción de variante** (`tipoVariacion`).
> 3. **Gestión Completa (CRUD):** El panel de accesorios de la sucursal permitirá crear, editar todos los campos (nombre, modelo, color, precio, cantidad) y eliminar ítems del inventario permanentemente.
> 4. **Reportes:** Se añadirá soporte para imprimir un resumen del stock de accesorios y descargar la lista en formato **Excel / CSV** desde la interfaz.
> 
> **Robustez en Modo Offline y Prevención de Pérdida de Datos:**
> 5. **Borrador de Respaldo Auto-Guardado:** Implementaremos un sistema de auto-guardado en tiempo real en `ingreso-mercancia.html` (para el ingreso de mercancía). Si ocurre un corte de internet o recarga accidental, el operador podrá recuperar todo su trabajo de digitación con un solo clic.
> 6. **Timeout Offline en Firestore (Evitar Cuelgues):** Ajustaremos la llamada `batch.commit()` en `InventarioService.js` mediante una carrera de promesas (`Promise.race`) con un timeout de 3 segundos. Si la red está desconectada, la escritura se completará inmediatamente en el caché local de IndexedDB y se liberará la pantalla de carga (notificando al usuario), permitiéndole continuar trabajando sin colgar la aplicación.
> 
> **Seguridad y Uso de PNPM:**
> 7. **Migración a PNPM:** Reemplazaremos el uso de `npm` por `pnpm` para mejorar la seguridad del árbol de dependencias, aislar paquetes fantasmas mediante enlaces simbólicos y aprovechar su almacén global de contenido direccionable.

---

## Proposed Changes

### 1. Modelo de Datos y Servicio

#### [NEW] [AccesorioInventario.js](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/js/models/AccesorioInventario.js)
Clase del modelo que representa una variante de accesorio.
- **Campos del Objeto:**
  - `id`: Identificador único (ej. `acc-xxx`).
  - `tipoItem`: Constante `"accesorio"` para diferenciarlo de los iPhones (`"equipo"`).
  - `nombre`: Tipo principal (ej: `Forro`, `Vidrio Templado`, `Cargador`, `Cable`).
  - `modelo`: Modelo de iPhone aplicable (ej. `iPhone 13`, `iPhone 14 Pro`, `Genérico`).
  - `tipoVariacion`: Subtipo o material (ej. `Cuero`, `Silicona`, `360`, `Antiespía`, `Privacidad`, `Estándar`).
  - `color`: Color del accesorio (ej. `Negro`, `Azul`, `Transparente`, o `null` si no aplica).
  - `cantidad`: Stock físico disponible (número entero).
  - `precio`: Precio de venta unitario.
  - `costo`: Costo unitario (para reportes de rentabilidad).
  - `detalles`: Comentarios adicionales.
  - `fechaIngreso`, `fechaActualizacion`, `creadoPor`, `actualizadoPor`.

#### [NEW] [AccesorioInventarioService.js](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/js/services/AccesorioInventarioService.js)
Servicio local-first que gestiona las operaciones CRUD y sincronización en tiempo real.
- Conectará a la colección `sedes/{sedeId}/inventario` filtrando por `tipoItem === "accesorio"`.
- Sincronizará la caché en memoria y persistirá en IndexedDB (`calcv2_accesorios_cache`) para carga offline instantánea.
- Métodos públicos:
  - `inicializar()` / `esperarListo()`.
  - `obtenerTodos()`.
  - `guardarAccesorio(accesorio)`: Guarda o actualiza un accesorio en Firestore.
  - `eliminarAccesorio(id)`: Elimina físicamente el documento de stock.
  - `ajustarStockBatch(batch, nombre, modelo, color, tipoVariacion, cantidadDiferencia)`: Descuenta o suma unidades en el stock utilizando un batch compartido. Si el ítem no existe en la base de datos al venderse, **lo auto-crea con stock negativo** para auditoría.

---

### 2. Robustez Offline y Timeout de Carga

#### [MODIFY] [InventarioService.js](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/js/services/InventarioService.js)
Implementar una carrera de promesas para evitar que la interfaz se cuelgue cuando se guarden lotes offline.
- Modificar `guardarLote`:
  ```javascript
  const commitPromise = batch.commit();
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ offlineSync: true }), 3000));
  
  const resultado = await Promise.race([commitPromise, timeoutPromise]);
  if (resultado && resultado.offlineSync) {
      console.warn("⏳ Conexión lenta o desconectada. Registro guardado en cola local offline.");
      return { exito: true, loteId, offline: true };
  }
  return { exito: true, loteId };
  ```
- Replicar este patrón en `commitVentaConInventario` para evitar bloqueos en el registro de ventas cuando falla la conexión.

#### [MODIFY] [ModoIngreso.js](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/js/pages/ingreso-mercancia/ModoIngreso.js)
- **Auto-guardado (Draft):** Agregar listener en el cambio de cualquier celda del formulario para volcar la tabla en `localStorage.setItem('calcv2_ingreso_draft', JSON.stringify(filasData))`.
- **Recuperación:** Al inicializar la vista, verificar si existe un draft. Si existe, renderizar un banner: *"⚠️ Tienes un borrador sin guardar. ¿Deseas recuperarlo? [Recuperar] [Descartar]"*.
- **Limpieza:** Al guardar el lote correctamente (o confirmar "Descartar"), limpiar la clave de borradores.

---

### 3. Panel de Administración de Accesorios (En Ingreso de Mercancía)

#### [MODIFY] [ingreso-mercancia.html](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/ingreso-mercancia.html)
- Agregar un cuarto botón de Tabulador:
  ```html
  <button id="btnModoAccesorios" class="px-4 py-1.5 rounded-md text-sm font-bold bg-indigo-600 text-white opacity-50 hover:bg-white/10 transition">
      🛡️ Accesorios
  </button>
  ```
- Crear la sección correspondiente: `<div id="seccionAccesorios" class="hidden">...</div>` conteniendo:
  1. **Buscador y Tabla de Stock**: Tabla reactiva con columnas: Nombre, Modelo, Variación, Color, Stock, Precio de Venta y Costo.
  2. **Alertas Visuales de Stock**: Color verde si hay buen stock, naranja si hay stock bajo (< 5), y rojo si está agotado o en negativo.
  3. **Botones de Acción en cada Fila**: `✏️ Editar` y `🗑️ Eliminar`.
  4. **Formulario de Registro/Edición**: Formulario limpio e interactivo para crear variantes nuevas o guardar cambios de una existente.
  5. **Controles de Exportación**: Botones para `🖨️ Imprimir Resumen` y `📥 Descargar Excel (CSV)`.

#### [NEW] [ModoAccesorios.js](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/js/pages/ingreso-mercancia/ModoAccesorios.js)
Controlador JS exclusivo para el nuevo tab en `ingreso-mercancia.html`.
- Se suscribirá a los cambios de `AccesorioInventarioService` para renderizar la tabla reactivamente.
- Manejará los eventos del formulario (guardado/edición) y confirmaciones de eliminación.
- Implementará la exportación a CSV (compatible con Excel) y la función de impresión de reporte con estilos CSS optimizados para impresión.

#### [MODIFY] [index.js](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/js/pages/ingreso-mercancia/index.js)
- Importar e inicializar `ModoAccesorios.js` e integrarlo en la máquina de estados del toggle de pestañas.

---

### 4. Sincronización en Ventas y Movimientos

#### [MODIFY] [InventarioService.js](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/js/services/InventarioService.js)
- En `commitVentaConInventario`: Mapear los accesorios de la venta. Por cada uno, llamar a `accesorioInventarioService.ajustarStockBatch(batch, nombre, modelo, color, tipoVariacion, -cantidadVendida)`.
- En `commitEliminarVentaConInventario`: Devolver los accesorios al inventario sumando la cantidad original utilizando el `batch` de la eliminación.

#### [MODIFY] [main.js](file:///c:/Users/Ada/Desktop/4.9/calcV2/public/js/main.js)
- En `guardarMovimiento()`: En los casos de `formSalidaAccesorio` e `formIngresoAccesorio`, se actualizarán los stocks cuantitativos llamando a `ajustarStockBatch` en un lote de Firestore, reflejando el movimiento en el inventario real en el acto.

---

## Precauciones de Seguridad y Guía de PNPM

> [!TIP]
> **Pasos recomendados para migrar a PNPM y asegurar dependencias:**
> 1. **Instalación Global:** Instalar `pnpm` mediante corepack o npm oficial: `npm install -g pnpm`.
> 2. **Eliminar Bloqueos Antiguos:** Eliminar `node_modules` y `package-lock.json` para evitar mezclar gestores.
> 3. **Instalación Segura:** Ejecutar `pnpm install` para recrear el árbol de dependencias protegido por enlaces simbólicos en `pnpm-lock.yaml`.
> 4. **Ejecución de Servidor:** Usar `pnpm dev` en lugar de `npm run dev`.

---

## Verification Plan

### Automated Tests
- Ejecutar el linter y `pnpm test` para asegurar que las pruebas unitarias pasen sin errores.
- Desarrollar pruebas unitarias para la reducción de stock y la autocreación con saldo negativo.

### Manual Verification
1. **Creación de Ítems:** Ir a **Ingreso de Mercancía** -> **Accesorios**, crear `Forro` para `iPhone 13` del tipo/variación `Silicona` color `Azul` con stock `15` y precio `$5`.
2. **Offline y Auto-guardado:** 
   - Digitar 5 filas en el formulario de Ingreso de Mercancía.
   - Apagar el WiFi del computador o simular desconexión.
   - Recargar la página y verificar que aparezca la alerta de recuperar borrador. Al hacer clic, las 5 filas deben restaurarse con sus datos intactos.
3. **Manejo de Cuelgues Offline:**
   - Intentar guardar el lote con el WiFi apagado.
   - Verificar que pasados 3 segundos el loader desaparezca y muestre: *"Guardado localmente. Se sincronizará al recuperar conexión"*.
   - Verificar que al encender el WiFi, los datos se suban automáticamente a Firestore.
