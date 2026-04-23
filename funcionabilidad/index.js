// index.js - Lógica de la página principal
import { auth, db } from './firebase-config.js';
import { loginDocente, logoutDocente, verificarAuth } from './auth.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// IMPORTANTE: Inicializar gestión de sesión de forma segura
// Esta línea debe estar después de las importaciones
import { inicializarGestionSesion } from './session-manager.js';

// Inicializar gestión de sesión (no debe bloquear la carga)
setTimeout(() => {
    try {
        inicializarGestionSesion();
    } catch (error) {
        console.warn('Error al inicializar gestión de sesión:', error);
    }
}, 100);

// Elementos del DOM
const loginToggleBtn = document.getElementById('loginToggleBtn');
const loginModal = document.getElementById('loginModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const docenteEmail = document.getElementById('docente-email');
const docentePassword = document.getElementById('docente-password');

// Secciones
const estudianteSection = document.getElementById('estudiante-section');
const docenteSection = document.getElementById('docente-section');
const contenedorNiveles = document.getElementById('contenedor-niveles');

const Swal = window.Swal;

// Abrir modal
if (loginToggleBtn) {
    loginToggleBtn.addEventListener('click', () => {
        if (auth.currentUser) {
            Swal.fire({
                icon: 'info',
                title: 'Sesión activa',
                text: 'Ya has iniciado sesión como docente. Cierra sesión primero si deseas acceder con otra cuenta.',
                confirmButtonColor: '#0FC9F2'
            });
        } else {
            loginModal.classList.add('active');
        }
    });
}

// Cerrar modal
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        loginModal.classList.remove('active');
    });
}

if (loginModal) {
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
        }
    });
}

// Configurar eventos de autenticación
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = docenteEmail.value;
        const password = docentePassword.value;
        if (email && password) {
            const success = await loginDocente(email, password);
            if (success) {
                loginModal.classList.remove('active');
                docenteEmail.value = '';
                docentePassword.value = '';
            }
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor ingresa email y contraseña',
                confirmButtonColor: '#f59e0b'
            });
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await logoutDocente();
    });
}

// Verificar estado de autenticación
verificarAuth((user) => {
    if (user) {
        estudianteSection.style.display = 'none';
        docenteSection.style.display = 'block';
        contenedorNiveles.innerHTML = '';
    } else {
        estudianteSection.style.display = 'block';
        docenteSection.style.display = 'none';
        cargarNivelesYRondas();
    }
});

// Cargar niveles y rondas desde Firebase
async function cargarNivelesYRondas() {
    if (!contenedorNiveles) return;
    
    contenedorNiveles.innerHTML = '<div class="loading-spinner">Cargando ejercicios...</div>';
    
    try {
        // Verificar que db está disponible
        if (!db) {
            throw new Error('Firestore no está disponible');
        }
        
        const q = query(collection(db, "ejercicios"), where("activo", "==", true));
        const snapshot = await getDocs(q);
        const ejercicios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Agrupar por nivel
        const niveles = { facil: [], medio: [], dificil: [] };
        ejercicios.forEach(ej => {
            if (niveles[ej.nivel]) niveles[ej.nivel].push(ej);
        });
        
        contenedorNiveles.innerHTML = '';
        
        let tieneEjercicios = false;
        
        for (const [nivelKey, nivelData] of Object.entries(niveles)) {
            if (nivelData.length === 0) continue;
            
            tieneEjercicios = true;
            const nombreNivel = nivelKey === 'facil' ? 'Fácil' : (nivelKey === 'medio' ? 'Medio' : 'Difícil');
            const nivelClass = nivelKey;
            
            const card = document.createElement('div');
            card.className = `level-card ${nivelClass}`;
            card.innerHTML = `
                <h3>${nombreNivel}</h3>
                <p>Selecciona una ronda:</p>
                <div class="rounds-list" id="rounds-${nivelKey}"></div>
            `;
            contenedorNiveles.appendChild(card);
            
            const roundsContainer = card.querySelector(`#rounds-${nivelKey}`);
            
            // Agrupar por ronda
            const rondasMap = new Map();
            nivelData.forEach(ej => {
                if (!rondasMap.has(ej.ronda)) rondasMap.set(ej.ronda, []);
                rondasMap.get(ej.ronda).push(ej);
            });
            
            // Ordenar rondas
            const rondasOrdenadas = Array.from(rondasMap.keys()).sort((a, b) => a - b);
            
            for (const rondaNum of rondasOrdenadas) {
                const ejerciciosRonda = rondasMap.get(rondaNum);
                const btn = document.createElement('button');
                btn.className = 'round-btn';
                btn.innerHTML = `<i class="fas fa-play"></i> Ronda ${rondaNum} (${ejerciciosRonda.length} ejercicios)`;
                btn.onclick = () => {
                    localStorage.setItem('rondaActual', JSON.stringify({
                        nivel: nivelKey,
                        ronda: rondaNum,
                        ejercicios: ejerciciosRonda
                    }));
                    window.location.href = 'interfaces/juego.html';
                };
                roundsContainer.appendChild(btn);
            }
        }
        
        if (!tieneEjercicios) {
            contenedorNiveles.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:2rem;">📭 No hay ejercicios activos. Contacta a tu docente.</p>';
        }
        
    } catch (error) {
        console.error("Error cargando ejercicios:", error);
        contenedorNiveles.innerHTML = '<p style="text-align:center; padding:2rem; color:#ef4444;">❌ Error al cargar los ejercicios. Intenta más tarde.</p>';
    }
}

// No llamar a cargarNivelesYRondas aquí, verificarAuth lo hará
console.log('Index.js cargado correctamente');