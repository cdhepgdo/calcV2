import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  // Indicamos que el código fuente de nuestra app está en la carpeta 'public'
  root: 'public',
  plugins: [
    // Integramos Tailwind directamente en Vite
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer', // Inyecta el Service Worker en todos los HTML
      workbox: {
        // Qué archivos debe guardar en la caché local
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        navigateFallback: null // Desactiva el redireccionamiento a index.html (Vital para arquitecturas MPA)
      },
      manifest: {
        name: 'Sistema de Ventas iOS',
        short_name: 'Ventas iOS',
        description: 'Sistema de cálculo y ventas de equipos',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'img/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'img/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    // La carpeta compilada final se creará un nivel arriba, en 'dist'
    outDir: '../dist',
    emptyOutDir: true,
    // Como tenemos múltiples páginas HTML (arquitectura MPA), debemos decirle a Vite cuáles son
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        registro: resolve(__dirname, 'public/registro.html'),
        cierree: resolve(__dirname, 'public/cierree.html'),
        lista: resolve(__dirname, 'public/lista.html'),
        inv_precio: resolve(__dirname, 'public/inv-precio.html'),
        intercambio: resolve(__dirname, 'public/intercambio.html'),
        admin: resolve(__dirname, 'public/admin.html'),
        ingreso_mercancia: resolve(__dirname, 'public/ingreso-mercancia.html'),
        login: resolve(__dirname, 'public/login.html'),
        migrar_datos: resolve(__dirname, 'public/migrar-datos.html')
      }
    }
  }
});
