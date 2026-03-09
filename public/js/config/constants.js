/**
 * Configuración centralizada de la aplicación
 * Todos los datos estáticos y constantes van aquí
 */

export const MODELOS_IPHONE = [
    { valor: "iPhone 11", etiqueta: "iPhone 11" },
    { valor: "iPhone 11 Pro", etiqueta: "iPhone 11 Pro" },
    { valor: "iPhone 11 Pro Max", etiqueta: "iPhone 11 Pro Max" },
    { valor: "iPhone 12", etiqueta: "iPhone 12" },
    { valor: "iPhone 12 Pro", etiqueta: "iPhone 12 Pro" },
    { valor: "iPhone 12 Pro Max", etiqueta: "iPhone 12 Pro Max" },
    { valor: "iPhone 13", etiqueta: "iPhone 13" },
    { valor: "iPhone 13 Pro", etiqueta: "iPhone 13 Pro" },
    { valor: "iPhone 13 Pro Max", etiqueta: "iPhone 13 Pro Max" },
    { valor: "iPhone 14", etiqueta: "iPhone 14" },
    { valor: "iPhone 14 Pro", etiqueta: "iPhone 14 Pro" },
    { valor: "iPhone 14 Plus", etiqueta: "iPhone 14 Plus" },
    { valor: "iPhone 14 Pro Max", etiqueta: "iPhone 14 Pro Max" },
    { valor: "iPhone 15", etiqueta: "iPhone 15" },
    { valor: "iPhone 15 Pro", etiqueta: "iPhone 15 Pro" },
    { valor: "iPhone 15 Plus", etiqueta: "iPhone 15 Plus" },
    { valor: "iPhone 15 Pro Max", etiqueta: "iPhone 15 Pro Max" },
    { valor: "iPhone 16", etiqueta: "iPhone 16" },
    { valor: "iPhone 16 Pro", etiqueta: "iPhone 16 Pro" },
    { valor: "iPhone 16 Plus", etiqueta: "iPhone 16 Plus" },
    { valor: "iPhone 16 Pro Max", etiqueta: "iPhone 16 Pro Max" },
    { valor: "iPhone 17", etiqueta: "iPhone 17" },
    { valor: "iPhone 17 Pro", etiqueta: "iPhone 17 Pro" },
    { valor: "iPhone 17 Air", etiqueta: "iPhone 17 Air" },
    { valor: "iPhone 17 Pro Max", etiqueta: "iPhone 17 Pro Max" }
];

export const COLORES_IPHONE = [
    { valor: "Negro", etiqueta: "⚫ Negro" },
    { valor: "Blanco", etiqueta: "⚪ Blanco" },
    { valor: "Verde", etiqueta: "🟢 Verde" },
    { valor: "Morado", etiqueta: "🟣 Morado" },
    { valor: "Amarillo", etiqueta: "🟡 Amarillo" },
    { valor: "Rojo", etiqueta: "🔴 Rojo (PRODUCT)RED" },
    { valor: "Azul", etiqueta: "🔵 Azul" },
    { valor: "Grafito", etiqueta: "⚫ Grafito (Pro)" },
    { valor: "Oro", etiqueta: "🟡 Oro (Pro)" },
    { valor: "Plata", etiqueta: "⚪ Plata (Pro)" },
    { valor: "Azul Pacífico", etiqueta: "🔵 Azul Pacífico (Pro)" },
    { valor: "Rosa", etiqueta: "🟠 Rosa" },
    { valor: "Verde (Alpine Green)", etiqueta: "🟢 Verde Alpine" },
    { valor: "Púrpura", etiqueta: "🟣 Púrpura" },
    { valor: "Titanio Azul", etiqueta: "🔵 Titanio Azul" },
    { valor: "Titanio Blanco", etiqueta: "⚪ Titanio Blanco" },
    { valor: "Titanio Negro", etiqueta: "⚫ Titanio Negro" },
    { valor: "Negro Medianoche", etiqueta: "⚫ Negro Medianoche" },
    { valor: "Azul Ultramar", etiqueta: "🔵 Azul Ultramar" },
    { valor: "Naranja Cósmico", etiqueta: "🟠 Naranja Cósmico" }
];

export const CAPACIDADES_IPHONE = [
    { valor: "64GB", etiqueta: "64GB" },
    { valor: "128GB", etiqueta: "128GB" },
    { valor: "256GB", etiqueta: "256GB" },
    { valor: "512GB", etiqueta: "512GB" },
    { valor: "1TB", etiqueta: "1TB" },
    { valor: "2TB", etiqueta: "2TB" }
];

export const GARANTIAS = [
    { valor: "Sin Garantía", etiqueta: "Sin Garantía" },
    { valor: "30 Días", etiqueta: "30 Días" },
    { valor: "60 Días", etiqueta: "60 Días" },
    { valor: "90 Días", etiqueta: "90 Días" },
    { valor: "180 Días", etiqueta: "6 Meses" },
    { valor: "240 Días", etiqueta: "8 Meses" },
    { valor: "365 Días", etiqueta: "1 Año" }
];

export const TIPOS_ACCESORIOS = [
    "Forro",
    "Vidrio Templado",
    "Cargador",
    "Cable",
    "Cubo",
    "Caja",
    "Protector de Cámara",
    "Otro"
];

export const TIPOS_CABLE = [
    "USB-C a USB-C",
    "Lightning"
];

export const DESTINOS = [
    "Aviadores",
    "Estación Central",
    "Principal de Valencia",
    "Otro"
];

export const FORMAS_PAGO = [
    { valor: "efectivo", etiqueta: "Efectivo", icono: "💵" },
    { valor: "zelle", etiqueta: "Zelle", icono: "💳" },
    { valor: "binance", etiqueta: "Binance", icono: "₿" },
    { valor: "pagomovil", etiqueta: "Pago Móvil", icono: "📱" },
    { valor: "transferencia", etiqueta: "Transferencia", icono: "🏦" },
    { valor: "mixto", etiqueta: "Mixto", icono: "💰" }
];

export const TIPOS_MOVIMIENTO = {
    SALIDA_EFECTIVO: 'salidaEfectivo',
    INGRESO_EFECTIVO: 'ingresoEfectivo',
    SALIDA_EQUIPO: 'salidaEquipo',
    INGRESO_EQUIPO: 'ingresoEquipo',
    SALIDA_ACCESORIO: 'salidaAccesorio',
    INGRESO_ACCESORIO: 'ingresoAccesorio',
    COMPRA_EQUIPO: 'compraEquipo'
};

export const STORAGE_KEYS = {
    VENTAS: 'ventas_iphone',
    MOVIMIENTOS: 'movimientos_iphone',
    CAJA_INICIAL: 'caja_inicial_iphone',
    FECHA_ACTUAL: 'fecha_actual_iphone'
};

export const MENSAJES = {
    VENTA_REGISTRADA: '✅ Venta registrada exitosamente!',
    VENTA_ACTUALIZADA: '✅ Venta actualizada exitosamente!',
    VENTA_ELIMINADA: '✅ Venta eliminada exitosamente!',
    MOVIMIENTO_REGISTRADO: '✅ Movimiento registrado exitosamente!',
    ERROR_VALIDACION: '⚠️ Por favor complete todos los campos requeridos',
    ERROR_FORMA_PAGO: '⚠️ Por favor selecciona una forma de pago',
    ERROR_MONTO: '⚠️ Por favor ingresa un monto válido mayor a $0.00',
    CONFIRMAR_ELIMINAR: '¿Estás seguro de que quieres eliminar esta venta?'
};

export const TIPOS_TRANSACCION = [
    { valor: 'venta', etiqueta: 'Venta' },
    { valor: 'abono', etiqueta: 'Abono' },
    { valor: 'cambio-garantia', etiqueta: 'Cambio por Garantía' }
];