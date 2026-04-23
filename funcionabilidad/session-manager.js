// session-manager.js - Gestión avanzada de sesiones
import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configuración
const SESSION_CONFIG = {
    INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutos en milisegundos
    WARNING_BEFORE: 60 * 1000, // 1 minuto antes de cerrar
    CHECK_INTERVAL: 10 * 1000 // Verificar cada 10 segundos
};

let inactivityTimer = null;
let warningTimer = null;
let lastActivity = Date.now();
let swalReady = false;

// Esperar a que Swal esté disponible
function getSwal() {
    return window.Swal;
}

// Función para cerrar sesión automáticamente
async function cerrarSesionAutomatica(razon = 'inactividad') {
    const user = auth.currentUser;
    if (!user) return;
    
    const Swal = getSwal();
    
    let mensaje = '';
    let icono = 'info';
    
    if (razon === 'inactividad') {
        mensaje = 'Tu sesión ha sido cerrada por inactividad. Por favor, inicia sesión nuevamente.';
        icono = 'warning';
    } else if (razon === 'cierre_pestana') {
        mensaje = 'La sesión se ha cerrado al salir de la aplicación.';
        icono = 'info';
    }
    
    try {
        await signOut(auth);
        
        // Mostrar mensaje solo si no es cierre de pestaña y Swal está disponible
        if (razon !== 'cierre_pestana' && Swal && typeof Swal.fire === 'function') {
            await Swal.fire({
                icon: icono,
                title: 'Sesión cerrada',
                text: mensaje,
                confirmButtonColor: '#0FC9F2',
                timer: 3000,
                showConfirmButton: true
            });
        }
        
        // Redirigir si es necesario
        const path = window.location.pathname;
        if (path.includes('docente.html')) {
            window.location.href = '../index.html';
        } else if (!path.includes('index.html') && !path.includes('juego.html')) {
            window.location.href = 'index.html';
        } else if (path.includes('index.html')) {
            // Recargar para mostrar interfaz de estudiante
            window.location.reload();
        }
        
    } catch (error) {
        console.error('Error al cerrar sesión automática:', error);
    }
}

// Función para mostrar advertencia de cierre por inactividad
async function mostrarAdvertenciaInactividad() {
    const user = auth.currentUser;
    if (!user) return;
    
    const Swal = getSwal();
    if (!Swal || typeof Swal.fire !== 'function') return;
    
    const result = await Swal.fire({
        icon: 'warning',
        title: '¿Sigues ahí?',
        html: 'Tu sesión expirará por inactividad en <strong>1 minuto</strong>. ¿Deseas continuar?',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cerrar sesión',
        timer: 30000,
        timerProgressBar: true
    });
    
    if (result.isConfirmed) {
        resetearInactividad();
    } else {
        await cerrarSesionAutomatica('inactividad');
    }
}

// Función para resetear el temporizador de inactividad
function resetearInactividad() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    
    const user = auth.currentUser;
    if (!user) return;
    
    inactivityTimer = setTimeout(() => {
        warningTimer = setTimeout(() => {
            mostrarAdvertenciaInactividad();
        }, SESSION_CONFIG.WARNING_BEFORE);
    }, SESSION_CONFIG.INACTIVITY_TIMEOUT);
    
    lastActivity = Date.now();
}

// Función para registrar actividad del usuario
function registrarActividad() {
    const now = Date.now();
    if (now - lastActivity > 5000) {
        resetearInactividad();
    }
    lastActivity = now;
}

// Función para iniciar los listeners de actividad
function iniciarMonitoreoActividad() {
    const eventos = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    
    eventos.forEach(evento => {
        document.addEventListener(evento, registrarActividad);
    });
    
    if (auth.currentUser) {
        resetearInactividad();
    }
}

// Función para detener el monitoreo
function detenerMonitoreoActividad() {
    const eventos = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    eventos.forEach(evento => {
        document.removeEventListener(evento, registrarActividad);
    });
    
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
}

// Inicializar gestión de sesión (versión segura)
export function inicializarGestionSesion() {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            configurarAuthListener();
        });
    } else {
        configurarAuthListener();
    }
}

function configurarAuthListener() {
    // Verificar estado de autenticación
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            iniciarMonitoreoActividad();
        } else {
            detenerMonitoreoActividad();
        }
    });
}

// Función para cerrar sesión manual
export async function cerrarSesionManual() {
    const user = auth.currentUser;
    if (!user) return false;
    
    const Swal = getSwal();
    if (!Swal || typeof Swal.fire !== 'function') {
        // Si Swal no está disponible, cerrar directamente
        await signOut(auth);
        return true;
    }
    
    const result = await Swal.fire({
        title: '¿Cerrar sesión?',
        text: '¿Estás seguro de que deseas cerrar sesión?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0FC9F2',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        await cerrarSesionAutomatica('manual');
        return true;
    }
    return false;
}