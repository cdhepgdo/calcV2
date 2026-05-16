import { auth } from '../config/firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

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
        return onAuthStateChanged(auth, (user) => {
            this.user = user;
            this.isInitialized = true;
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
