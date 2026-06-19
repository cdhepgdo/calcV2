/* ============================================================
   tailwind-config.js — Tailwind Play CDN configuration.
   Must be loaded AFTER cdn.tailwindcss.com. Defines darkMode
   (class-based) and extends the color palette with our theme
   tokens (rgb(var(--*))).
   ============================================================ */
(function () {
  window.tailwind = window.tailwind || {};
  window.tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          surface:            'rgb(var(--surface) / <alpha-value>)',
          'surface-elevated': 'rgb(var(--surface-elevated) / <alpha-value>)',
          'surface-muted':    'rgb(var(--surface-muted) / <alpha-value>)',
          'surface-sunken':   'rgb(var(--surface-sunken) / <alpha-value>)',
          'border-themed':    'rgb(var(--border) / <alpha-value>)',
          'text-themed':      'rgb(var(--text-primary) / <alpha-value>)',
          'text-themed-2':    'rgb(var(--text-secondary) / <alpha-value>)',
          'text-themed-3':    'rgb(var(--text-muted) / <alpha-value>)',
          accent:             'rgb(var(--accent) / <alpha-value>)',
          success:            'rgb(var(--success) / <alpha-value>)',
          warning:            'rgb(var(--warning) / <alpha-value>)',
          danger:             'rgb(var(--danger) / <alpha-value>)',
          info:               'rgb(var(--info) / <alpha-value>)'
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
        }
      }
    }
  };
})();
