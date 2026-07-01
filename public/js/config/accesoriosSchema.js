/**
 * Schema declarativo de accesorios.
 * Cada accesorio declara:
 *   - id:        Identificador interno (PascalCase)
 *   - nombre:    Nombre legible para el usuario
 *   - tipoForm:  Cómo se valida el formulario
 *                'simple'     → solo un input de cantidad en #prefijo+id+Cantidad
 *                'multi-fila' → filas dinámicas con .accModelo + .item-cant
 *                'con-color'  → multi-fila + .caja-color (solo Caja)
 *   - selectorItem:  Selector CSS para las filas (solo multi-fila / con-color)
 *   - campoModelo:   Clase CSS del input de modelo (solo multi-fila / con-color)
 *   - campoCant:     Clase CSS del input de cantidad
 *   - campoColor:    Clase CSS del input de color (solo con-color)
 *
 * Esta descripción se valida contra el HTML al cargar la app
 * (ver AccesorioValidator.verificarContratoHTML()).
 */
export const ACCESORIOS_SCHEMA = {
    // ── Multi-fila (modelo + cantidad) ──
    Forro: {
        id: 'Forro',
        nombre: 'Forro',
        tipoForm: 'multi-fila',
        listaSelector: '#{prefijo}ForroLista',
        itemSelector: '.forro-item',
        campoModelo: '.accModelo',
        campoCant: '.forro-cant',
        tipoSalida: 'Forro',
    },
    Vidrio: {
        id: 'Vidrio',
        nombre: 'Vidrio Templado',
        tipoForm: 'multi-fila',
        listaSelector: '#{prefijo}VidrioLista',
        itemSelector: '.vidrio-item',
        campoModelo: '.accModelo',
        campoCant: '.vidrio-cant',
        tipoSalida: 'Vidrio Templado',
    },
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

    // ── Simples (solo cantidad) ──
    Cargador:        { id: 'Cargador',        nombre: 'Cargador',         tipoForm: 'simple' },
    ProtectorCamara: { id: 'ProtectorCamara', nombre: 'Protector de Cámara', tipoForm: 'simple' },
    Cubo:            { id: 'Cubo',            nombre: 'Cubo',             tipoForm: 'simple' },
    CableLightning:  { id: 'CableLightning',  nombre: 'Cable Lightning',  tipoForm: 'simple' },
    CableCC:         { id: 'CableCC',         nombre: 'Cable C+C',        tipoForm: 'simple' },
};

/**
 * Validador de inputs: garantiza que el prefijo sea uno de los esperados.
 * @param {string} prefijo
 * @throws {Error} si el prefijo es inválido
 */
export function assertPrefijoValido(prefijo) {
    if (prefijo !== 'salida' && prefijo !== 'ingreso') {
        throw new Error(
            `[AccesorioValidator] Prefijo inválido: "${prefijo}". ` +
            `Debe ser 'salida' o 'ingreso'.`
        );
    }
}
