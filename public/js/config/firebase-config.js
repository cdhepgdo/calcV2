import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

/**
 * Configuración de Firebase.
 *
 * Las claves se leen de variables de entorno (Vite las inyecta en build
 * desde `.env.local`). Esto evita versionar la apiKey en el repo.
 *
 * Para desarrollo:
 *   1. Copia `.env.example` → `.env.local`
 *   2. Pega los valores reales
 *   3. Vite los expone como `import.meta.env.VITE_FIREBASE_*`
 *
 * En producción (Netlify/Vercel), configúralas en el dashboard.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
// Inicializar Firestore habilitando la Persistencia Offline (Background Sync)
/* export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}); */
