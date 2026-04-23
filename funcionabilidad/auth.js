// auth.js - Manejo de autenticación para todo el sitio
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { cerrarSesionManual } from './session-manager.js';

const Swal = window.Swal;

// Función para iniciar sesión como docente
export async function loginDocente(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        if (Swal && Swal.fire) {
            await Swal.fire({
                icon: 'success',
                title: '¡Bienvenido Docente!',
                text: 'Inicio de sesión exitoso',
                confirmButtonColor: '#0FC9F2',
                timer: 2000,
                showConfirmButton: true
            });
        }
        return true;
    } catch (error) {
        let mensajeError = '';
        switch (error.code) {
            case 'auth/invalid-email':
                mensajeError = 'El correo electrónico no es válido';
                break;
            case 'auth/user-not-found':
                mensajeError = 'No existe una cuenta con este correo';
                break;
            case 'auth/wrong-password':
                mensajeError = 'Contraseña incorrecta';
                break;
            case 'auth/too-many-requests':
                mensajeError = 'Demasiados intentos. Intenta más tarde';
                break;
            default:
                mensajeError = error.message;
        }
        
        if (Swal && Swal.fire) {
            await Swal.fire({
                icon: 'error',
                title: 'Error de autenticación',
                text: mensajeError,
                confirmButtonColor: '#ef4444'
            });
        } else {
            alert(mensajeError);
        }
        return false;
    }
}

// Función para cerrar sesión
export async function logoutDocente() {
    return await cerrarSesionManual();
}

// Función para verificar estado de autenticación
export function verificarAuth(callback) {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

// Función para proteger páginas de docente
export function protegerRutaDocente(redirectUrl = "../index.html") {
    onAuthStateChanged(auth, async (user) => {
        if (!user && window.location.pathname.includes('docente.html')) {
            if (Swal && Swal.fire) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Acceso restringido',
                    text: 'Debes iniciar sesión como docente para acceder a esta página',
                    confirmButtonColor: '#0FC9F2'
                });
            }
            window.location.href = redirectUrl;
        }
    });
}