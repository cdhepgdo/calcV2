/* ============================================================
   theme.js — ES module.
   Reads/writes localStorage('theme'), listens to system preference,
   applies .dark class on <html>, fires 'theme:change' CustomEvent.
   ============================================================ */

const STORAGE_KEY = 'theme';
const VALID = ['light', 'dark', 'system'];

function readSaved() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(v) ? v : null;
  } catch (e) { return null; }
}

function writeSaved(v) {
  try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* noop */ }
}

function systemPrefersDark() {
  if (!window.matchMedia) return false;
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
}

function resolveTheme(saved) {
  if (saved === 'light' || saved === 'dark') return saved;
  return systemPrefersDark() ? 'dark' : 'light';
}

function applyTheme(resolved) {
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');

  // Notify any listeners (charts, toasts, dynamic UI, etc.)
  document.dispatchEvent(new CustomEvent('theme:change', {
    detail: { theme: resolved, source: 'apply' }
  }));
}

let mqListener = null;

function watchSystemPreference(onChange) {
  if (!window.matchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mqListener = (e) => onChange(e.matches ? 'dark' : 'light');
  // Modern API
  if (mq.addEventListener) mq.addEventListener('change', mqListener);
  else if (mq.addListener) mq.addListener(mqListener); // legacy
}

/* ---------- Public API ---------- */

export function getTheme() {
  // Returns the SAVED preference (light/dark/system), not the resolved value.
  return readSaved() || 'system';
}

export function getResolvedTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(theme) {
  if (!VALID.includes(theme)) return;
  writeSaved(theme);
  const resolved = resolveTheme(theme);
  applyTheme(resolved);
}

export function toggleTheme() {
  const current = getResolvedTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}

/**
 * Subscribe to theme changes. The callback receives the new resolved theme.
 * Returns an unsubscribe function.
 */
export function onThemeChange(cb) {
  const handler = (e) => cb(e.detail.theme);
  document.addEventListener('theme:change', handler);
  return () => document.removeEventListener('theme:change', handler);
}

/**
 * Initialize the module. Call once from any page that imports it.
 * Wires up the system-preference watcher.
 */
export function initTheme() {
  // Apply current resolved theme (idempotent if theme-init.js already did it)
  applyTheme(resolveTheme(readSaved()));

  // Listen to system changes ONLY while user is on 'system' preference
  watchSystemPreference((sysResolved) => {
    if (readSaved() === 'system' || readSaved() === null) {
      applyTheme(sysResolved);
    }
  });
}
