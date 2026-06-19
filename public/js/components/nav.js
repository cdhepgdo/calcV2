/* ============================================================
   nav.js — Shared top-bar nav + mobile drawer + theme toggle.
   Replaces the 3 duplicated <nav> blocks previously inlined in
   cierree.html, registro.html, index.html etc.

   Usage:
     <div id="appNav" data-active="cierree"></div>
     <script type="module">
       import { mountNav } from './js/components/nav.js';
       mountNav('cierree');
     </script>
   ============================================================ */

import { initTheme } from '../theme.js';
import { mountThemeToggle } from './themeToggle.js';

// All visible navigation links. Order matters — matches the order
// in the original cierree/registro nav. Pages not in this list
// (login, migrar-datos, ingreso-mercancia, historial) don't use mountNav.
const NAV_LINKS = [
  { id: 'index',          label: 'Principal',     href: 'index.html' },
  { id: 'lista',          label: 'Listado',       href: 'lista.html' },
  { id: 'intercambio',    label: 'Cálculo',       href: 'intercambio.html' },
  { id: 'cierre',         label: 'Cierre',        href: 'cierree.html' },
  { id: 'registro',       label: '📊 Registro',   href: 'registro.html' },
  { id: 'ingreso',        label: '📦 Ingreso',    href: 'ingreso-mercancia.html' },
  { id: 'inv-precio',     label: 'Inv',           href: 'inv-precio.html' },
  { id: 'admin',          label: 'Admin',         href: 'admin.html' }
];

function buildLink(link, activeId) {
  const isActive = link.id === activeId;
  const baseClass = 'px-3 py-2 rounded-md text-sm font-medium transition flex items-center';
  const stateClass = isActive
    ? 'bg-white/15 text-white shadow-inner'
    : 'text-white/85 hover:bg-white/10 hover:text-white';
  return `<a href="${link.href}" class="${baseClass} ${stateClass}">${link.label}</a>`;
}

function buildNavHTML(activeId) {
  const linksDesktop = NAV_LINKS.map(l => buildLink(l, activeId)).join('');
  const linksMobile  = NAV_LINKS.map(l => buildLink(l, activeId)).join('');

  return `
<nav id="appNavBar" class="no-print fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 bg-slate-900 dark:bg-slate-950 text-white shadow-lg transition-all duration-300">
  <div class="flex items-center gap-2">
    <span class="text-xl mr-2" aria-hidden="true">💼</span>
    <div id="menuOptions" class="flex gap-1">
      ${linksDesktop}
    </div>
  </div>

  <div class="flex items-center gap-2">
    <div id="themeToggleSlot" class="flex items-center"></div>
    <button id="btnLogout"
            class="px-3 py-2 rounded-md text-sm font-bold transition bg-rose-600 hover:bg-rose-700 text-white">
      Cerrar Sesión
    </button>
    <button id="menuToggle" class="hidden text-2xl focus:outline-none relative z-50 ml-1" aria-label="Abrir menú">☰</button>
  </div>
</nav>

<!-- Mobile drawer -->
<div id="floatingMenu"
     class="no-print hidden fixed bottom-20 right-6 bg-slate-900 dark:bg-slate-950 text-white rounded-lg shadow-lg py-2 flex flex-col gap-1 z-40 min-w-[200px]">
  ${linksMobile}
  <button id="btnLogoutMobile"
          class="mx-2 mt-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold transition rounded text-sm">
    Cerrar Sesión
  </button>
</div>

<!-- Spacer so content isn't hidden under the fixed nav -->
<div class="h-14"></div>
`;
}

/**
 * Mount the shared nav into the given placeholder element.
 * @param {string|HTMLElement} targetOrId - Either the active page id (string)
 *   or the placeholder element. When passed a string, the first element
 *   with id="appNav" is used.
 * @param {string} [activeId] - Required if first arg is an element.
 * @returns {HTMLElement|null} The nav element, or null if not mounted.
 */
export function mountNav(targetOrId, activeId) {
  let target;
  let active;

  if (typeof targetOrId === 'string') {
    active = targetOrId;
    target = document.getElementById('appNav');
  } else {
    target = targetOrId;
    active = activeId;
  }

  if (!target || !active) {
    console.warn('[mountNav] Missing target or activeId. Skipping nav mount.');
    return null;
  }

  console.log('[mountNav] Mounting nav for:', active);

  // Init theme system first (idempotent, safe to call before DOM is mounted)
  try { initTheme(); } catch (e) { console.error('[mountNav] initTheme failed:', e); }

  // Replace the placeholder with the nav HTML
  target.outerHTML = buildNavHTML(active);

  // After outerHTML the element with id="appNavBar" is the new nav
  const navEl = document.getElementById('appNavBar');
  const menuOptions = document.getElementById('menuOptions');
  const menuToggle  = document.getElementById('menuToggle');
  const floating    = document.getElementById('floatingMenu');
  const toggleSlot  = document.getElementById('themeToggleSlot');

  console.log('[mountNav] toggleSlot:', toggleSlot);

  // Mount theme toggle into its slot
  try {
    if (toggleSlot) mountThemeToggle(toggleSlot);
  } catch (e) { console.error('[mountNav] mountThemeToggle failed:', e); }
  // Remove debug logs in production (commented for now to help debugging)
  void navEl;

  // Wire logout buttons (the page must implement btnLogout handler in its own JS)
  // We dispatch a CustomEvent so the page can listen, OR we just call the
  // page's existing btnLogout handler if it exists.
  const logout = document.getElementById('btnLogout');
  const logoutMobile = document.getElementById('btnLogoutMobile');
  const fireLogout = () => {
    if (typeof window.handleLogout === 'function') {
      window.handleLogout();
    } else {
      // Fallback: redirect to login
      window.location.href = 'login.html';
    }
  };
  if (logout) logout.addEventListener('click', fireLogout);
  if (logoutMobile) logoutMobile.addEventListener('click', fireLogout);

  // ---- Mobile drawer logic (matches original cierree behavior) ----
  // Show toggle when menuOptions would overflow on small screens
  function syncToggleVisibility() {
    if (!menuOptions || !menuToggle) return;
    if (window.innerWidth < 900) {
      menuOptions.classList.add('hidden');
      menuToggle.classList.remove('hidden');
    } else {
      menuOptions.classList.remove('hidden');
      menuToggle.classList.add('hidden');
      if (floating) floating.classList.add('hidden');
    }
  }
  syncToggleVisibility();
  window.addEventListener('resize', syncToggleVisibility);

  if (menuToggle && floating) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      floating.classList.toggle('hidden');
    });
    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
      if (floating.classList.contains('hidden')) return;
      if (floating.contains(e.target) || menuToggle.contains(e.target)) return;
      floating.classList.add('hidden');
    });
  }

  return navEl;
}
