import { auth, db } from '../config/firebase-config.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

class AuthService {
    constructor() {
        this.user = null;
        this.isInitialized = false;
        this._initPersistence();
    }

    async _initPersistence() {
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch (error) {
            console.error("Error ajustando persistencia de sesión:", error);
        }
    }

    /**
     * Escucha los cambios de sesión (login/logout/refresh)
     */
    onAuthChange(callback) {
        return onAuthStateChanged(auth, async (user) => {
            this.user = user;
            this.isInitialized = true;
            
            if (user) {
                try {
                    // Obtener el perfil del usuario desde Firestore
                    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        localStorage.setItem('usuario_sede_id', data.sedeId || 'sede_1');
                        localStorage.setItem('usuario_rol', data.rol || 'empleado');
                        console.log(`✅ Sesión iniciada: Sede [${data.sedeId}] - Rol [${data.rol}]`);
                    } else {
                        console.warn(`⚠️ Usuario ${user.uid} no tiene perfil en /usuarios. Usando sede_1 por defecto.`);
                        localStorage.setItem('usuario_sede_id', 'sede_1');
                        localStorage.setItem('usuario_rol', 'empleado');
                    }
                } catch (err) {
                    console.error("❌ Error obteniendo perfil de usuario:", err);
                    // Fallback de seguridad
                    localStorage.setItem('usuario_sede_id', 'sede_1');
                }
            } else {
                // Si no hay usuario, limpiar localStorage
                localStorage.removeItem('usuario_sede_id');
                localStorage.removeItem('usuario_rol');
            }
            
            callback(user);
        });
    }

    /**
     * Inicia sesión con correo y contraseña
     */
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { exito: true, user: userCredential.user };
        } catch (error) {
            console.error("Error en login:", error);
            let msg = "Error al iniciar sesión.";
            switch (error.code) {
                case 'auth/invalid-credential':
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-email':
                    msg = "Correo o contraseña incorrectos.";
                    break;
                case 'auth/too-many-requests':
                    msg = "Demasiados intentos fallidos. Intenta de nuevo más tarde.";
                    break;
                case 'auth/network-request-failed':
                    msg = "Error de red. Verifica tu conexión a internet.";
                    break;
            }
            return { exito: false, error: msg };
        }
    }

    /**
     * Cierra la sesión activa
     */
    async logout() {
        try {
            await signOut(auth);
            localStorage.removeItem('usuario_sede_id');
            localStorage.removeItem('usuario_rol');
            return { exito: true };
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            return { exito: false, error: error.message };
        }
    }

    /**
     * Retorna el usuario actual (solo útil si ya finalizó init)
     */
    getCurrentUser() {
        return auth.currentUser;
    }
}

export const authService = new AuthService();
