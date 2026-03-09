/**
 * Funciones de cálculo reutilizables
 */

/**
 * Calcula el total de un pago mixto
 */
export function calcularTotalPagoMixto(pagoMixto) {
    return (pagoMixto.efectivo || 0) +
           (pagoMixto.zelle || 0) +
           (pagoMixto.binance || 0) +
           (pagoMixto.pagoMovil || 0) +
           (pagoMixto.transferencia || 0);
}

/**
 * Convierte dólares a bolívares
 */
export function convertirDolaresABolivares(dolares, tasa) {
    return parseFloat(dolares) * parseFloat(tasa);
}

/**
 * Convierte bolívares a dólares
 */
export function convertirBolivaresADolares(bolivares, tasa) {
    return parseFloat(bolivares) / parseFloat(tasa);
}

/**
 * Calcula el porcentaje de un valor sobre un total
 */
export function calcularPorcentaje(valor, total) {
    if (total === 0) return 0;
    return (valor / total) * 100;
}

/**
 * Calcula el descuento aplicado
 */
export function calcularDescuento(precioOriginal, precioFinal) {
    return precioOriginal - precioFinal;
}

/**
 * Calcula el porcentaje de descuento
 */
export function calcularPorcentajeDescuento(precioOriginal, precioFinal) {
    if (precioOriginal === 0) return 0;
    return ((precioOriginal - precioFinal) / precioOriginal) * 100;
}

/**
 * Redondea un número a 2 decimales
 */
export function redondear(numero) {
    return Math.round(numero * 100) / 100;
}

/**
 * Suma un array de números
 */
export function sumar(numeros) {
    return numeros.reduce((total, num) => total + parseFloat(num || 0), 0);
}

/**
 * Calcula el promedio de un array de números
 */
export function calcularPromedio(numeros) {
    if (numeros.length === 0) return 0;
    return sumar(numeros) / numeros.length;
}

/**
 * Valida que dos montos sean iguales (con tolerancia para redondeo)
 */
export function montosIguales(monto1, monto2, tolerancia = 0.01) {
    return Math.abs(monto1 - monto2) <= tolerancia;
}
