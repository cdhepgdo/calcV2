# Implementación de Validaciones y Sincronización de Inventario en Movimientos de Caja

Este documento describe el plan para implementar los ajustes solicitados, asegurando que la caja de Movimientos (`cierree.html` / `main.js`) mantenga el inventario perfectamente sincronizado y validado.

## User Review Required

> [!IMPORTANT]
> - Al automatizar que los "Ingresos de Equipo" y "Compras" desde la Caja se guarden también en el inventario general, la transacción dependerá de Firebase. Si hay un corte de red, el guardado en la caja y en el inventario fallarán juntos (es una transacción segura).
> - Se habilitará poder recibir como Trade-In (parte de pago) un equipo que antes haya estado en estado `transferido` o `eliminado`. Si está en estado `vendido` también se permite (esto ya existía). Solo se bloquearán aquellos equipos que estén `disponibles` o `defectuosos`.

## Open Questions

> [!WARNING]
> Cuando se da Salida a un Equipo desde la Caja (`cierree.html`), ¿qué estado deseas que adquiera en el inventario global? Por defecto, lo pondré en estado `transferido` si el destino es otra sede, o `vendido` si el destino es "Otro" y la persona responsable lo requirió así. ¿Estás de acuerdo con marcar las Salidas como `vendido` (fuera de stock)?

## Proposed Changes

A continuación el detalle de los cambios propuestos organizados por archivo:

---

### main.js (Logica Principal de Ventas y Movimientos)

Modificaremos la función `manejarGuardarMovimiento()` y la lógica de validación del trade-in.

#### [MODIFY] [main.js](file:///c:/Users/USUARIO/Desktop/version-3.1/calcV2/public/js/main.js)
1. **Validación de Trade-In (`_obtenerConflictoImeiRecibido`)**: 
   - Se ajustará el bloque que valida los estados del inventario para permitir `eliminado` y `transferido` de la misma manera que actualmente permite `vendido` (retornando `autocompletar-vendido` en lugar de `bloqueado-otro-estado`).

2. **Ingreso/Compra Automática en Inventario**:
   - Dentro de `manejarGuardarMovimiento()`, antes de llamar a `movimientoService.crearMovimiento`, detectaremos si `datos.tipo === 'Ingreso Equipo'` o `'Compra Equipo'`.
   - Se validará que `inventarioService.buscarPorImei(imei)` no exista en estado `disponible`. Si existe, se detiene el proceso con la alerta `✕ El IMEI ... ya está registrado y disponible`.
   - Si no existe, se creará una instancia `new EquipoInventario(...)` y se ejecutará `await inventarioService.guardarLote([equipo], ...)`.

3. **Salida Automática en Inventario**:
   - Dentro de `manejarGuardarMovimiento()`, si `datos.tipo === 'Salida Equipo'`, buscaremos el IMEI ingresado.
   - Si el equipo NO se encuentra o su estado no es `disponible`, se mostrará una alerta indicando que no puede darse salida a un equipo que no está en stock.
   - Si es válido, llamaremos a `await inventarioService.procesarSalidaLote([equipo.id], destino)` justo antes de generar el movimiento en caja.

## Verification Plan

### Manual Verification
1. **Prueba de Trade-In Permitido**: Buscar en Firebase un equipo con estado `transferido`, y probar agregarlo como "equipo recibido" en una nueva venta. El sistema debe aceptarlo sin arrojar error.
2. **Ingreso desde Caja**: Realizar un "Ingreso de Equipo" por la caja (Botón 📱⬅️) y verificar que no solo sume al historial del día, sino que también aparezca inmediatamente en el Inventario Global.
3. **Bloqueo por Duplicidad (Ingreso)**: Tratar de Ingresar o Comprar un equipo desde Caja usando un IMEI que actualmente existe como `disponible`. El sistema debe arrojar error.
4. **Salida desde Caja**: Dar salida a un equipo disponible desde Caja (Botón 📱➡️). Verificar que salga de la caja y paralelamente su estado en el inventario cambie a `vendido`/`transferido`.
5. **Bloqueo de Salida Inválida**: Tratar de dar salida a un IMEI inventado que no existe en el inventario. El sistema debe arrojar error.
