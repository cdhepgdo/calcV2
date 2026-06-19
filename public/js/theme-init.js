/* ============================================================
   theme-init.js — runs SYNCHRONOUSLY in <head> BEFORE Tailwind.
   Applies the .dark class to <html> on first paint (avoids FOUC).

   Tailwind config (darkMode + token colors) is set in an inline
   script AFTER the Tailwind CDN script loads, since the CDN reads
   window.tailwind.config only after it boots.
   ============================================================ */
(function () {
  'use strict';

  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) { /* localStorage may be blocked */ }

  var sysDark = false;
  if (window.matchMedia) {
    try { sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { /* old browser */ }
  }

  var resolved;
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    resolved = saved === 'system' ? (sysDark ? 'dark' : 'light') : saved;
  } else {
    resolved = sysDark ? 'dark' : 'light';
  }

  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  }

  // State for non-module code
  window.__themeState = { resolved: resolved, saved: saved, sysDark: sysDark };
})();
