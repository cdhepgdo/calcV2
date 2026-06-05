/**
 * autocomplete.js
 * Panel de autocompletado reutilizable para inputs de texto.
 * Soporta fuzzy match, navegación con teclado y posicionamiento dinámico.
 */

/** Normaliza un string para comparación fuzzy (sin acentos ni espacios) */
function norm(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Verifica si `query` es un subconjunto ordenado de caracteres en `text` */
function isFuzzyMatch(query, text) {
    query = norm(query);
    text = norm(text);
    let i = 0, j = 0;
    while (i < query.length && j < text.length) {
        if (query[i] === text[j]) i++;
        j++;
    }
    return i === query.length;
}

/**
 * Clase Autocomplete.
 * Gestiona un único panel de autocompletado compartido en la página.
 *
 * Uso:
 *   const ac = new Autocomplete(panelElement);
 *   ac.setup(inputEl, suggestions, onSelect);
 */
export class Autocomplete {
    /**
     * @param {HTMLElement} panelEl - El elemento #autocompletePanel del DOM
     */
    constructor(panelEl) {
        this._panel = panelEl;
        this._activeInput = null;
        this._activeListItems = [];
        this._selectedIdx = -1;
        this._activeCell = null;
        this._hideTimer = null;
        this._onSelectCb = null;

        // Evitar que clicks en el panel cierren el autocomplete
        this._panel.addEventListener('mousedown', (e) => e.preventDefault());
    }

    /** Posiciona el panel justo debajo (o encima) del input activo */
    _position(input) {
        const rect = input.getBoundingClientRect();
        const margin = 4;
        const spaceBelow = window.innerHeight - rect.bottom;

        this._panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 320))}px`;
        this._panel.style.width = `${rect.width}px`;

        if (spaceBelow < 140 && rect.top > 140) {
            this._panel.style.top = `${Math.max(8, rect.top - margin)}px`;
            this._panel.style.transform = 'translateY(-100%)';
        } else {
            this._panel.style.top = `${rect.bottom + margin}px`;
            this._panel.style.transform = 'none';
        }
    }

    /** Renderiza la lista de sugerencias */
    _render(items, onSelect) {
        this._panel.innerHTML = '';
        const ul = document.createElement('ul');

        items.forEach((m, i) => {
            const li = document.createElement('li');
            li.textContent = m;
            li.dataset.index = String(i);
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (this._activeInput) {
                    this._activeInput.value = m;
                    this.hide();
                    if (typeof onSelect === 'function') onSelect(m, this._activeInput);
                }
            });
            ul.appendChild(li);
        });

        this._panel.appendChild(ul);
        this._activeListItems = Array.from(ul.querySelectorAll('li'));
        this._selectedIdx = -1;
    }

    _setSelected(idx) {
        if (!this._activeListItems.length) return;
        this._selectedIdx = Math.max(0, Math.min(idx, this._activeListItems.length - 1));
        this._activeListItems.forEach((li, i) =>
            li.classList.toggle('selected', i === this._selectedIdx)
        );
    }

    _confirmSelected() {
        if (this._selectedIdx < 0 || !this._activeListItems[this._selectedIdx]) return;
        const value = this._activeListItems[this._selectedIdx].textContent;
        if (this._activeInput) {
            this._activeInput.value = value;
            this.hide();
            if (typeof this._onSelectCb === 'function') this._onSelectCb(value, this._activeInput);
        }
    }

    /** Abre el panel con las sugerencias filtradas por `query` dentro de `suggestions` */
    open(input, suggestions, onSelect) {
        clearTimeout(this._hideTimer);
        const q = input.value.trim();
        if (!q) {
            this.hide();
            return;
        }

        const matches = suggestions
            .filter(m => isFuzzyMatch(q, m))
            .sort((a, b) => a.length - b.length)
            .slice(0, 8);

        if (!matches.length) {
            this.hide();
            return;
        }

        this._activeInput = input;
        this._onSelectCb = onSelect;
        this._activeCell = input.closest('td');
        if (this._activeCell) this._activeCell.style.zIndex = '999';

        this._position(input);
        this._render(matches, onSelect);
        this._panel.classList.add('show');
    }

    /** Cierra y limpia el panel */
    hide() {
        clearTimeout(this._hideTimer);
        this._panel.classList.remove('show');
        this._panel.innerHTML = '';
        if (this._activeCell) this._activeCell.style.zIndex = '';
        this._activeInput = null;
        this._activeListItems = [];
        this._selectedIdx = -1;
        this._activeCell = null;
        this._onSelectCb = null;
    }

    /**
     * Conecta un input con el sistema de autocompletado.
     * @param {HTMLInputElement} input - El campo a conectar
     * @param {string[]} suggestions - Array de sugerencias
     * @param {Function} onSelect - Callback(value, inputEl) cuando se selecciona
     */
    setup(input, suggestions, onSelect) {
        input.addEventListener('input', () => this.open(input, suggestions, onSelect));
        input.addEventListener('focus', () => this.open(input, suggestions, onSelect));

        input.addEventListener('blur', () => {
            this._hideTimer = setTimeout(() => this.hide(), 150);
        });

        input.addEventListener('keydown', (e) => {
            if (!this._panel.classList.contains('show')) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this._setSelected(this._selectedIdx + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this._setSelected(this._selectedIdx - 1);
            } else if (e.key === 'Enter') {
                if (this._selectedIdx >= 0) {
                    e.preventDefault();
                    this._confirmSelected();
                }
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });
    }

    /** Reposiciona el panel al hacer scroll o resize */
    reposition() {
        if (this._activeInput && this._panel.classList.contains('show')) {
            this._position(this._activeInput);
        }
    }

    get isOpen() {
        return this._panel.classList.contains('show');
    }

    get activeInput() {
        return this._activeInput;
    }
}
