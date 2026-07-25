// vite.config.mjs
import { defineConfig } from "file:///C:/Users/USUARIO/Desktop/4.6/calcV2/node_modules/vite/dist/node/index.js";
import tailwindcss from "file:///C:/Users/USUARIO/Desktop/4.6/calcV2/node_modules/@tailwindcss/vite/dist/index.mjs";
import { VitePWA } from "file:///C:/Users/USUARIO/Desktop/4.6/calcV2/node_modules/vite-plugin-pwa/dist/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "C:\\Users\\USUARIO\\Desktop\\4.6\\calcV2";
var vite_config_default = defineConfig({
  // Indicamos que el código fuente de nuestra app está en la carpeta 'public'
  root: "public",
  // Especificar que los archivos .env están en la raíz del proyecto, no en 'public'
  envDir: "../",
  plugins: [
    // Integramos Tailwind directamente en Vite
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      // Inyecta el Service Worker en todos los HTML
      workbox: {
        // Qué archivos debe guardar en la caché local
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        navigateFallback: null
        // Desactiva el redireccionamiento a index.html (Vital para arquitecturas MPA)
      },
      manifest: {
        name: "Sistema de Ventas iOS",
        short_name: "Ventas iOS",
        description: "Sistema de c\xE1lculo y ventas de equipos",
        theme_color: "#ffffff",
        icons: [
          {
            src: "img/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "img/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
  build: {
    // La carpeta compilada final se creará un nivel arriba, en 'dist'
    outDir: "../dist",
    emptyOutDir: true,
    // Como tenemos múltiples páginas HTML (arquitectura MPA), debemos decirle a Vite cuáles son
    rollupOptions: {
      input: {
        main: resolve(__vite_injected_original_dirname, "public/index.html"),
        registro: resolve(__vite_injected_original_dirname, "public/registro.html"),
        cierree: resolve(__vite_injected_original_dirname, "public/cierree.html"),
        lista: resolve(__vite_injected_original_dirname, "public/lista.html"),
        inv_precio: resolve(__vite_injected_original_dirname, "public/inv-precio.html"),
        intercambio: resolve(__vite_injected_original_dirname, "public/intercambio.html"),
        admin: resolve(__vite_injected_original_dirname, "public/admin.html"),
        ingreso_mercancia: resolve(__vite_injected_original_dirname, "public/ingreso-mercancia.html"),
        login: resolve(__vite_injected_original_dirname, "public/login.html"),
        migrar_datos: resolve(__vite_injected_original_dirname, "public/migrar-datos.html")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcVVNVQVJJT1xcXFxEZXNrdG9wXFxcXDQuNlxcXFxjYWxjVjJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFVTVUFSSU9cXFxcRGVza3RvcFxcXFw0LjZcXFxcY2FsY1YyXFxcXHZpdGUuY29uZmlnLm1qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvVVNVQVJJTy9EZXNrdG9wLzQuNi9jYWxjVjIvdml0ZS5jb25maWcubWpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSc7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIC8vIEluZGljYW1vcyBxdWUgZWwgY1x1MDBGM2RpZ28gZnVlbnRlIGRlIG51ZXN0cmEgYXBwIGVzdFx1MDBFMSBlbiBsYSBjYXJwZXRhICdwdWJsaWMnXHJcbiAgcm9vdDogJ3B1YmxpYycsXHJcbiAgLy8gRXNwZWNpZmljYXIgcXVlIGxvcyBhcmNoaXZvcyAuZW52IGVzdFx1MDBFMW4gZW4gbGEgcmFcdTAwRUR6IGRlbCBwcm95ZWN0bywgbm8gZW4gJ3B1YmxpYydcclxuICBlbnZEaXI6ICcuLi8nLFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIC8vIEludGVncmFtb3MgVGFpbHdpbmQgZGlyZWN0YW1lbnRlIGVuIFZpdGVcclxuICAgIHRhaWx3aW5kY3NzKCksXHJcbiAgICBWaXRlUFdBKHtcclxuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXHJcbiAgICAgIGluamVjdFJlZ2lzdGVyOiAnc2NyaXB0LWRlZmVyJywgLy8gSW55ZWN0YSBlbCBTZXJ2aWNlIFdvcmtlciBlbiB0b2RvcyBsb3MgSFRNTFxyXG4gICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgLy8gUXVcdTAwRTkgYXJjaGl2b3MgZGViZSBndWFyZGFyIGVuIGxhIGNhY2hcdTAwRTkgbG9jYWxcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd2VicH0nXSxcclxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrOiBudWxsIC8vIERlc2FjdGl2YSBlbCByZWRpcmVjY2lvbmFtaWVudG8gYSBpbmRleC5odG1sIChWaXRhbCBwYXJhIGFycXVpdGVjdHVyYXMgTVBBKVxyXG4gICAgICB9LFxyXG4gICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgIG5hbWU6ICdTaXN0ZW1hIGRlIFZlbnRhcyBpT1MnLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdWZW50YXMgaU9TJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Npc3RlbWEgZGUgY1x1MDBFMWxjdWxvIHkgdmVudGFzIGRlIGVxdWlwb3MnLFxyXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAnaW1nL2ljb24tMTkyeDE5Mi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAnaW1nL2ljb24tNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICBdLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICAvLyBMYSBjYXJwZXRhIGNvbXBpbGFkYSBmaW5hbCBzZSBjcmVhclx1MDBFMSB1biBuaXZlbCBhcnJpYmEsIGVuICdkaXN0J1xyXG4gICAgb3V0RGlyOiAnLi4vZGlzdCcsXHJcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcclxuICAgIC8vIENvbW8gdGVuZW1vcyBtXHUwMEZBbHRpcGxlcyBwXHUwMEUxZ2luYXMgSFRNTCAoYXJxdWl0ZWN0dXJhIE1QQSksIGRlYmVtb3MgZGVjaXJsZSBhIFZpdGUgY3VcdTAwRTFsZXMgc29uXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvaW5kZXguaHRtbCcpLFxyXG4gICAgICAgIHJlZ2lzdHJvOiByZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYy9yZWdpc3Ryby5odG1sJyksXHJcbiAgICAgICAgY2llcnJlZTogcmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvY2llcnJlZS5odG1sJyksXHJcbiAgICAgICAgbGlzdGE6IHJlc29sdmUoX19kaXJuYW1lLCAncHVibGljL2xpc3RhLmh0bWwnKSxcclxuICAgICAgICBpbnZfcHJlY2lvOiByZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYy9pbnYtcHJlY2lvLmh0bWwnKSxcclxuICAgICAgICBpbnRlcmNhbWJpbzogcmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvaW50ZXJjYW1iaW8uaHRtbCcpLFxyXG4gICAgICAgIGFkbWluOiByZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYy9hZG1pbi5odG1sJyksXHJcbiAgICAgICAgaW5ncmVzb19tZXJjYW5jaWE6IHJlc29sdmUoX19kaXJuYW1lLCAncHVibGljL2luZ3Jlc28tbWVyY2FuY2lhLmh0bWwnKSxcclxuICAgICAgICBsb2dpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvbG9naW4uaHRtbCcpLFxyXG4gICAgICAgIG1pZ3Jhcl9kYXRvczogcmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvbWlncmFyLWRhdG9zLmh0bWwnKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5UyxTQUFTLG9CQUFvQjtBQUN0VSxPQUFPLGlCQUFpQjtBQUN4QixTQUFTLGVBQWU7QUFDeEIsU0FBUyxlQUFlO0FBSHhCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBO0FBQUEsRUFFMUIsTUFBTTtBQUFBO0FBQUEsRUFFTixRQUFRO0FBQUEsRUFDUixTQUFTO0FBQUE7QUFBQSxJQUVQLFlBQVk7QUFBQSxJQUNaLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGdCQUFnQjtBQUFBO0FBQUEsTUFDaEIsU0FBUztBQUFBO0FBQUEsUUFFUCxjQUFjLENBQUMscUNBQXFDO0FBQUEsUUFDcEQsa0JBQWtCO0FBQUE7QUFBQSxNQUNwQjtBQUFBLE1BQ0EsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2IsT0FBTztBQUFBLFVBQ0w7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNSO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1I7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE9BQU87QUFBQTtBQUFBLElBRUwsUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBO0FBQUEsSUFFYixlQUFlO0FBQUEsTUFDYixPQUFPO0FBQUEsUUFDTCxNQUFNLFFBQVEsa0NBQVcsbUJBQW1CO0FBQUEsUUFDNUMsVUFBVSxRQUFRLGtDQUFXLHNCQUFzQjtBQUFBLFFBQ25ELFNBQVMsUUFBUSxrQ0FBVyxxQkFBcUI7QUFBQSxRQUNqRCxPQUFPLFFBQVEsa0NBQVcsbUJBQW1CO0FBQUEsUUFDN0MsWUFBWSxRQUFRLGtDQUFXLHdCQUF3QjtBQUFBLFFBQ3ZELGFBQWEsUUFBUSxrQ0FBVyx5QkFBeUI7QUFBQSxRQUN6RCxPQUFPLFFBQVEsa0NBQVcsbUJBQW1CO0FBQUEsUUFDN0MsbUJBQW1CLFFBQVEsa0NBQVcsK0JBQStCO0FBQUEsUUFDckUsT0FBTyxRQUFRLGtDQUFXLG1CQUFtQjtBQUFBLFFBQzdDLGNBQWMsUUFBUSxrQ0FBVywwQkFBMEI7QUFBQSxNQUM3RDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
