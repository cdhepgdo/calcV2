# Análisis y Solución de Bugs — Movimientos de Accesorios (HISTÓRICO)

**Proyecto:** calcV2 (Sistema de Ventas iPhone)
**Archivos afectados:** `public/js/services/AccesorioValidator.js`, `public/js/config/accesoriosSchema.js`
**Fecha de resolución:** 2026-06-30

---

## 📌 Estado: RESOLUCIÓN DEFINITIVA (REFACTOR APLICADO)

> ⚠️ **Este documento queda como histórico (Postmortem).**
> Los bugs descritos aquí ya no existen en la base de código actual. El archivo `AccesorioValidator.js` fue reescrito completamente utilizando un **Schema Declarativo** que elimina de raíz la posibilidad de que ocurran estos fallos.

---

## 📋 Resumen del Problema Original

En iteraciones anteriores, al intentar registrar un movimiento de **Salida** o **Ingreso de Accesorios** con todos los checkboxes marcados, se presentaban **dos bugs encadenados**:

1. **Fallo Silencioso (Stringly Typed):** El validador usaba convención de strings rígida (ej. `salidaProtectorCamaraCantidad`) que al no coincidir con el HTML asumía cantidad `0` en lugar de fallar explícitamente.
2. **Error Plural vs Singular:** `resultadoCaja.accesorio` (singular) devolvía `undefined`, lo que inyectaba objetos nulos en el array final, provocando `TypeError: Cannot read properties of undefined (reading 'tipo')` durante la iteración de guardado.

## 🛠️ La Solución Definitiva (Schema Declarativo)

En lugar de parchear los métodos `_validarCaja`, `_validarVidrios` con lógica repetitiva, se optó por un refactor arquitectónico completo:

### 1. `accesoriosSchema.js`
Se extrajo la configuración a un esquema declarativo como fuente única de verdad.

```javascript
export const ACCESORIOS_SCHEMA = {
    ProtectorCamara: { id: 'ProtectorCamara', nombre: 'Protector de Cámara', tipoForm: 'simple' },
    Caja: {
        id: 'Caja',
        nombre: 'Caja',
        tipoForm: 'con-color',
        listaSelector: '#{prefijo}CajaLista',
        itemSelector: '.caja-item',
        campoModelo: '.accModelo',
        campoColor: '.caja-color',
        campoCant: '.caja-cant',
        tipoSalida: 'Caja',
    },
    // ...
};
```

### 2. `AccesorioValidator.js` (Refactorizado)
El validador ahora es "agnóstico" a los accesorios específicos. Itera sobre el `ACCESORIOS_SCHEMA` y despacha la validación al método genérico correspondiente según el `tipoForm` (`simple`, `multi-fila`, `con-color`).
Esto eliminó la duplicidad de código y arregló el bug plural/singular, porque todos los validadores genéricos ahora retornan un array estandarizado `accesorios: [...]`.

### 3. Validación de Contrato en Tiempo de Desarrollo
Se agregó la función `verificarContratoHTML(doc, prefijo)`. 
Al cargar páginas como `cierree.html` en modo desarrollo, esta función escanea el DOM comparándolo con `ACCESORIOS_SCHEMA`. Si falta algún `<input>` o `<div id="...">`, lanza advertencias explícitas en la consola indicando exactamente qué falta agregar al HTML.

Esto previene permanentemente el "Bug 1" (fallos silenciosos de selectores nulos).

---
*Este análisis documenta la evolución desde una validación imperativa frágil hacia un modelo declarativo robusto.*
