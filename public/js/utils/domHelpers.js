/**
 * Funciones auxiliares para manipulación del DOM
 */

/**
 * Crea un elemento HTML con atributos y contenido
 */
export function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else {
            element.setAttribute(key, value);
        }
    });

    if (content) {
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else {
            element.appendChild(content);
        }
    }

    return element;
}

/**
 * Llena un select con opciones
 */
export function llenarSelect(selectElement, opciones, placeholder = 'Seleccionar') {
    selectElement.innerHTML = `<option value="">${placeholder}</option>`;

    opciones.forEach(opcion => {
        const option = document.createElement('option');
        option.value = opcion.valor;
        option.textContent = opcion.etiqueta;
        selectElement.appendChild(option);
    });
}

/**
 * Muestra u oculta un elemento
 */
export function toggleElement(element, mostrar) {
    if (mostrar) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

/**
 * Limpia un formulario
 */
export function limpiarFormulario(formElement) {
    formElement.reset();

    // Ocultar campos condicionales
    formElement.querySelectorAll('.conditional').forEach(el => {
        el.classList.add('hidden');
    });
}

/**
 * Obtiene los valores de un formulario como objeto
 */
export function obtenerValoresFormulario(formElement) {
    const formData = new FormData(formElement);
    const valores = {};

    for (let [key, value] of formData.entries()) {
        valores[key] = value;
    }

    return valores;
}

/**
 * Muestra un mensaje de alerta
 */
export function mostrarAlerta(mensaje, tipo = 'info') {
    const colores = {
        success: 'bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-700 shadow-lg',
        error: 'bg-rose-500 dark:bg-rose-600 text-white border-rose-600 dark:border-rose-700 shadow-lg',
        warning: 'bg-amber-400 dark:bg-amber-500 text-slate-900 dark:text-slate-900 border-amber-500 dark:border-amber-600 shadow-lg',
        info: 'bg-blue-500 dark:bg-blue-600 text-white border-blue-600 dark:border-blue-700 shadow-lg'
    };

    const alerta = document.createElement('div');

    // EXPLICACIÓN DE CLASES NUEVAS:
    // fixed: la saca del flujo y la deja quieta en pantalla.
    // top-5 left-1/2 -translate-x-1/2: la centra arriba.
    // z-[9999]: asegura que esté por encima de TODO lo demás.
    // min-w-[300px]: le da un tamaño mínimo elegante.
    alerta.className = `fixed top-5 left-1/2 -translate-x-1/2 z-[9999] ${colores[tipo]} 
                        px-6 py-4 rounded-xl border-l-4 flex items-center gap-3 
                        transition-all duration-500 ease-out transform animate-bounce-subtle`;

    alerta.innerHTML = `
        <div class="flex-1 font-medium">
            <span class="block sm:inline">${mensaje}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="ml-4 text-white/80 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;

    document.body.appendChild(alerta);

    // Animación de salida antes de remover
    setTimeout(() => {
        alerta.style.opacity = '0';
        alerta.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => alerta.remove(), 500);
    }, 2500);
}

/**
 * Muestra un loader
 */
export function mostrarLoader(contenedor) {
    const loader = createElement('div', {
        className: 'flex justify-center items-center p-8'
    }, '<div class="loader"></div>');

    contenedor.innerHTML = '';
    contenedor.appendChild(loader);
}

/**
 * Confirma una acción con el usuario
 */
export function confirmar(mensaje) {
    return confirm(mensaje);
}

/**
 * Scroll suave a un elemento
 */
export function scrollTo(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Agrega un event listener con limpieza automática
 */
export function agregarEvento(element, evento, handler) {
    element.addEventListener(evento, handler);

    // Retornar función de limpieza
    return () => element.removeEventListener(evento, handler);
}