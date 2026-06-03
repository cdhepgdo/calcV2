import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// ✅ Ahora — activa IndexedDB para offline real
//import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDPdvDTvMIv-dgoLuiKRDb4_0jx1dtKL14",
  authDomain: "usaimport1.firebaseapp.com",
  projectId: "usaimport1",
  storageBucket: "usaimport1.firebasestorage.app",
  messagingSenderId: "1052948620010",
  appId: "1:1052948620010:web:93d4b17a5a94ada239ed93"
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
