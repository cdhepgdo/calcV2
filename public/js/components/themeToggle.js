/* ============================================================
   themeToggle.js — Accessible sun/moon toggle button.
   Renders into a target element. Listens to theme:change so the
   icon stays in sync when the theme changes externally.
   ============================================================ */

import { toggleTheme, getResolvedTheme, onThemeChange } from '../theme.js';

const SUN_SVG = `
<svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
</svg>`;

const MOON_SVG = `
<svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
</svg>`;

/**
 * Mount the theme toggle into the given target element.
 * @param {HTMLElement} target
 * @param {Object} [opts]
 * @param {boolean} [opts.onLight=false]  Use when the toggle sits on a light surface (login etc).
 * @returns {HTMLButtonElement} The button element
 */
export function mountThemeToggle(target, opts = {}) {
  if (!target) return null;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'themeToggleBtn';
  // Visible button with emoji fallback if SVGs fail
  btn.className = 'theme-toggle' + (opts.onLight ? ' on-light' : '');
  btn.setAttribute('aria-label', 'Cambiar tema claro/oscuro');
  btn.setAttribute('title', 'Cambiar tema');
  btn.style.minWidth = '42px';
  btn.style.minHeight = '42px';
  btn.style.border = '1px solid rgba(255,255,255,0.25)';
  btn.style.fontSize = '18px';
  btn.innerHTML = `
    <span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
      <span class="icon-sun" style="display:none;">☀️</span>
      <span class="icon-moon" style="display:inline;">🌙</span>
    </span>
  `;

  // Update visibility of icons based on current theme
  function syncIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    const sun = btn.querySelector('.icon-sun');
    const moon = btn.querySelector('.icon-moon');
    if (sun) sun.style.display = isDark ? 'inline' : 'none';
    if (moon) moon.style.display = isDark ? 'none' : 'inline';
  }
  syncIcons();

  btn.addEventListener('click', () => {
    console.log('[themeToggle] clicked');
    toggleTheme();
    setTimeout(syncIcons, 50);
  });

  // Listen to external theme changes
  document.addEventListener('theme:change', syncIcons);

  target.appendChild(btn);
  return btn;
}
