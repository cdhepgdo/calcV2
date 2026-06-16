PROMPT DE IMPLEMENTACIÓN - VALIDACIÓN Y MEJORAS EN CIERRE DE VENTA
1. VALIDACIÓN DE PAGOS
Implementar una validación en tiempo real (al cambiar cualquier campo de pago o equipo) que verifique:

Suma de métodos de pago = Efectivo + Zelle + Binance + PayPal + Pago Móvil (convertido a dólares) + Transferencia (convertido a dólares) + Valor de equipos recibidos como parte de pago
Debe equals al total de equipos vendidos (suma del precio de cada equipo en #equipoPrecioVenta + precios de equipos adicionales en #equiposVendidosAdicionales)
Mostrar alerta visual si no cuadra: diferencia a favor del cliente o a favor de la tienda
Permitir registrar la venta solo cuando cuadre, o mostrar warning claro si hay diferencia
2. INTERFAZ DE REGISTRO (registro.html) - EQUIPOS VENDIDOS
Cuando se muestran las ventas en el historial/registro:

Si son 2+ equipos vendidos: Mostrar lista completa con:

Modelo de cada equipo
Color de cada equipo
Almacenamiento de cada equipo
Precio individual asignado a cada equipo
IMEI de cada equipo
Garantía de cada equipo
Si son 12+ equipos recibidos como parte de pago: Mostrar todos los equipos recibidos con:

Modelo
Color
Almacenamiento
IMEI
Valor asignado
3. BOTONES DE IMPRESIÓN DE GARANTÍA
En la vista de registro, para cada equipo vendido que tenga garantía asignada:

Agregar un botón de impresión (🖨️ o 📄) junto a cada equipo
Al hacer clic, generar/imprimir un documento de garantía con:
Modelo del equipo
IMEI
Color y almacenamiento
Fecha de venta
Tiempo de garantía
Datos del cliente (nombre, cédula, teléfono)
Precio del equipo
4. AUTOCOMPLETADO EN EDICIÓN DE VENTAS
Cuando el usuario-edita una venta existente en el historial:

Completar automáticamente TODOS los campos del formulario de cierree.html:
✅ Datos del cliente (nombre, cédula, teléfono)
✅ Equipos vendidos (todos, con precios individuales)
✅ Equipos recibidos como parte de pago (todos)
✅ Accesorios seleccionados (forro, cargador, vidrio, etc.)
✅ Métodos de pago usados (efectivo, zelle, binance, paypal, pago móvil, transferencia)
✅ Notas adicionales de la venta
✅ Tasas cambiarias (para pago móvil y transferencia)
✅ Montos en bolívares calculados automáticamente
✅ Tipo de transacción (venta, abono, cambio garantía)
✅ Checkboxes (weppa, nota de venta)
✅ Si es "venta con abonos previos", cargar los abonos anteriores
5. CONSIDERACIONES TÉCNICAS
La validación debe ejecutarse en tiempo real (eventos input y change)
Manejar correctamente la conversión de bs a dólares usando las tasas ingresadas
Para equipos recibidos: el valor en dólares se suma a los pagos realizados
En el registro, paginar o colapsar listas muy largas (12+ equipos)
Mantener backwards compatibility con ventas de 1 equipo