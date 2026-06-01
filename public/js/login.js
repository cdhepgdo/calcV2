import { authService } from './services/AuthService.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = loginBtn.querySelector('span');
    const loginSpinner = document.getElementById('loginSpinner');
    const errorMsg = document.getElementById('errorMsg');

    // Validar si ya hay sesión y redirigir
    authService.onAuthChange((user) => {
        if (user) {
            // Ya está logueado, llevarlo al sistema automáticamente
            window.location.href = 'cierree.html';
        }
    });

    // Manejar el submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpiar errores y poner modo loading
        errorMsg.style.display = 'none';
        loginBtn.disabled = true;
        loginBtnText.textContent = 'Verificando...';
        loginSpinner.style.display = 'block';

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        const result = await authService.login(email, password);

        if (result.exito) {
            // El onAuthChange arriba detectará el login y hará el redirect
            loginBtnText.textContent = '¡Acceso Concedido!';
            loginBtn.style.background = 'var(--success-color)';
            loginSpinner.style.display = 'none';
        } else {
            // Error de login
            errorMsg.textContent = result.error;
            errorMsg.style.display = 'block';
            
            // Restablecer botón
            loginBtn.disabled = false;
            loginBtnText.textContent = 'Ingresar al Sistema';
            loginSpinner.style.display = 'none';
            
            // Sacudir botón (animación visual simple)
            loginBtn.style.transform = 'translateY(2px)';
            setTimeout(() => loginBtn.style.transform = '', 150);
        }
    });
});
