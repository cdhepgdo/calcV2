// vite.config.mjs
import { defineConfig } from "file:///C:/Users/Ada/Desktop/version-3.5/calcV2/node_modules/vite/dist/node/index.js";
import tailwindcss from "file:///C:/Users/Ada/Desktop/version-3.5/calcV2/node_modules/@tailwindcss/vite/dist/index.mjs";
import { VitePWA } from "file:///C:/Users/Ada/Desktop/version-3.5/calcV2/node_modules/vite-plugin-pwa/dist/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "C:\\Users\\Ada\\Desktop\\version-3.5\\calcV2";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQWRhXFxcXERlc2t0b3BcXFxcdmVyc2lvbi0zLjVcXFxcY2FsY1YyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZGFcXFxcRGVza3RvcFxcXFx2ZXJzaW9uLTMuNVxcXFxjYWxjVjJcXFxcdml0ZS5jb25maWcubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BZGEvRGVza3RvcC92ZXJzaW9uLTMuNS9jYWxjVjIvdml0ZS5jb25maWcubWpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnO1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIC8vIEluZGljYW1vcyBxdWUgZWwgY1x1MDBGM2RpZ28gZnVlbnRlIGRlIG51ZXN0cmEgYXBwIGVzdFx1MDBFMSBlbiBsYSBjYXJwZXRhICdwdWJsaWMnXG4gIHJvb3Q6ICdwdWJsaWMnLFxuICAvLyBFc3BlY2lmaWNhciBxdWUgbG9zIGFyY2hpdm9zIC5lbnYgZXN0XHUwMEUxbiBlbiBsYSByYVx1MDBFRHogZGVsIHByb3llY3RvLCBubyBlbiAncHVibGljJ1xuICBlbnZEaXI6ICcuLi8nLFxuICBwbHVnaW5zOiBbXG4gICAgLy8gSW50ZWdyYW1vcyBUYWlsd2luZCBkaXJlY3RhbWVudGUgZW4gVml0ZVxuICAgIHRhaWx3aW5kY3NzKCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluamVjdFJlZ2lzdGVyOiAnc2NyaXB0LWRlZmVyJywgLy8gSW55ZWN0YSBlbCBTZXJ2aWNlIFdvcmtlciBlbiB0b2RvcyBsb3MgSFRNTFxuICAgICAgd29ya2JveDoge1xuICAgICAgICAvLyBRdVx1MDBFOSBhcmNoaXZvcyBkZWJlIGd1YXJkYXIgZW4gbGEgY2FjaFx1MDBFOSBsb2NhbFxuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd2VicH0nXSxcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogbnVsbCAvLyBEZXNhY3RpdmEgZWwgcmVkaXJlY2Npb25hbWllbnRvIGEgaW5kZXguaHRtbCAoVml0YWwgcGFyYSBhcnF1aXRlY3R1cmFzIE1QQSlcbiAgICAgIH0sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnU2lzdGVtYSBkZSBWZW50YXMgaU9TJyxcbiAgICAgICAgc2hvcnRfbmFtZTogJ1ZlbnRhcyBpT1MnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Npc3RlbWEgZGUgY1x1MDBFMWxjdWxvIHkgdmVudGFzIGRlIGVxdWlwb3MnLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyNmZmZmZmYnLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJ2ltZy9pY29uLTE5MngxOTIucG5nJyxcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnaW1nL2ljb24tNTEyeDUxMi5wbmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfSlcbiAgXSxcbiAgYnVpbGQ6IHtcbiAgICAvLyBMYSBjYXJwZXRhIGNvbXBpbGFkYSBmaW5hbCBzZSBjcmVhclx1MDBFMSB1biBuaXZlbCBhcnJpYmEsIGVuICdkaXN0J1xuICAgIG91dERpcjogJy4uL2Rpc3QnLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgIC8vIENvbW8gdGVuZW1vcyBtXHUwMEZBbHRpcGxlcyBwXHUwMEUxZ2luYXMgSFRNTCAoYXJxdWl0ZWN0dXJhIE1QQSksIGRlYmVtb3MgZGVjaXJsZSBhIFZpdGUgY3VcdTAwRTFsZXMgc29uXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvaW5kZXguaHRtbCcpLFxuICAgICAgICByZWdpc3RybzogcmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvcmVnaXN0cm8uaHRtbCcpLFxuICAgICAgICBjaWVycmVlOiByZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYy9jaWVycmVlLmh0bWwnKSxcbiAgICAgICAgbGlzdGE6IHJlc29sdmUoX19kaXJuYW1lLCAncHVibGljL2xpc3RhLmh0bWwnKSxcbiAgICAgICAgaW52X3ByZWNpbzogcmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvaW52LXByZWNpby5odG1sJyksXG4gICAgICAgIGludGVyY2FtYmlvOiByZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYy9pbnRlcmNhbWJpby5odG1sJyksXG4gICAgICAgIGFkbWluOiByZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYy9hZG1pbi5odG1sJyksXG4gICAgICAgIGluZ3Jlc29fbWVyY2FuY2lhOiByZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYy9pbmdyZXNvLW1lcmNhbmNpYS5odG1sJyksXG4gICAgICAgIGxvZ2luOiByZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYy9sb2dpbi5odG1sJyksXG4gICAgICAgIG1pZ3Jhcl9kYXRvczogcmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvbWlncmFyLWRhdG9zLmh0bWwnKVxuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFULFNBQVMsb0JBQW9CO0FBQ2xWLE9BQU8saUJBQWlCO0FBQ3hCLFNBQVMsZUFBZTtBQUN4QixTQUFTLGVBQWU7QUFIeEIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUE7QUFBQSxFQUUxQixNQUFNO0FBQUE7QUFBQSxFQUVOLFFBQVE7QUFBQSxFQUNSLFNBQVM7QUFBQTtBQUFBLElBRVAsWUFBWTtBQUFBLElBQ1osUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZ0JBQWdCO0FBQUE7QUFBQSxNQUNoQixTQUFTO0FBQUE7QUFBQSxRQUVQLGNBQWMsQ0FBQyxxQ0FBcUM7QUFBQSxRQUNwRCxrQkFBa0I7QUFBQTtBQUFBLE1BQ3BCO0FBQUEsTUFDQSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixPQUFPO0FBQUEsVUFDTDtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1I7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDUjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFTCxRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUE7QUFBQSxJQUViLGVBQWU7QUFBQSxNQUNiLE9BQU87QUFBQSxRQUNMLE1BQU0sUUFBUSxrQ0FBVyxtQkFBbUI7QUFBQSxRQUM1QyxVQUFVLFFBQVEsa0NBQVcsc0JBQXNCO0FBQUEsUUFDbkQsU0FBUyxRQUFRLGtDQUFXLHFCQUFxQjtBQUFBLFFBQ2pELE9BQU8sUUFBUSxrQ0FBVyxtQkFBbUI7QUFBQSxRQUM3QyxZQUFZLFFBQVEsa0NBQVcsd0JBQXdCO0FBQUEsUUFDdkQsYUFBYSxRQUFRLGtDQUFXLHlCQUF5QjtBQUFBLFFBQ3pELE9BQU8sUUFBUSxrQ0FBVyxtQkFBbUI7QUFBQSxRQUM3QyxtQkFBbUIsUUFBUSxrQ0FBVywrQkFBK0I7QUFBQSxRQUNyRSxPQUFPLFFBQVEsa0NBQVcsbUJBQW1CO0FBQUEsUUFDN0MsY0FBYyxRQUFRLGtDQUFXLDBCQUEwQjtBQUFBLE1BQzdEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
