// juego.js - Lógica del juego con selección de cuentas
import { db } from './firebase-config.js';

let ejerciciosRonda = [];
let indiceActual = 0;
let aciertos = 0;
let errores = 0;
let penalizaciones = 0;

// Elementos del DOM
const enunciadoContainer = document.getElementById('enunciado-container');
const cuenta1NombreSelect = document.getElementById('cuenta1_nombre');
const cuenta2NombreSelect = document.getElementById('cuenta2_nombre');
const btnVerificar = document.getElementById('btn-verificar');
const btnSiguiente = document.getElementById('btn-siguiente');
const feedbackDiv = document.getElementById('feedback');
const resultadoFinalDiv = document.getElementById('resultado-final');
const aciertosSpan = document.getElementById('aciertos');
const erroresSpan = document.getElementById('errores');
const penalizacionesSpan = document.getElementById('penalizaciones');
const ejercicioActualSpan = document.getElementById('ejercicio-actual');
const totalEjerciciosSpan = document.getElementById('total-ejercicios');
const progressBar = document.getElementById('progress-bar');
const nivelRondaInfo = document.getElementById('nivel-ronda-info');

// Inputs de valores
const inputCuenta1Debe = document.getElementById('ct_cuenta1Debe');
const inputCuenta1Haber = document.getElementById('ct_cuenta1Haber');
const inputCuenta2Debe = document.getElementById('ct_cuenta2Debe');
const inputCuenta2Haber = document.getElementById('ct_cuenta2Haber');

// Lista de cuentas disponibles para los selects
const cuentasDisponibles = [
    "Caja", "Banco", "Inventario de Mercancías", "Clientes", "Deudores por Ventas",
    "Proveedores", "Acreedores", "Capital Social", "Ventas", "Compras",
    "Edificios","Terrenos", "Maquinaria y Equipo",
    "Gastos de Alquiler","Gastos pagados por anticipado", "Gastos de Sueldos", "Equipos de Oficina",
    "Préstamos Bancarios", "Cuentas por Cobrar",
    "Cuentas por Pagar", "Depreciación Acumulada", "Gastos de Depreciación",
    "Gastos Pagados por anticipado", "Intereses Pagados", "Intereses Cobrados", "Inversiones Temporales", 
    "Seguros Pagados por anticipado", "Propaganda y Publicidad", "Vehículos", "Anticipos de Clientes"
];

function cargarDatosRonda() {
    const data = localStorage.getItem('rondaActual');
    if (!data) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró la ronda. Regresando al inicio.',
            confirmButtonColor: '#ef4444',
            timer: 2000,
            showConfirmButton: true
        }).then(() => {
            window.location.href = "../index.html";
        });
        return false;
    }
    
    const ronda = JSON.parse(data);
    ejerciciosRonda = ronda.ejercicios;
    nivelRondaInfo.innerHTML = `Nivel: <strong>${ronda.nivel.toUpperCase()}</strong> | Ronda ${ronda.ronda}`;
    totalEjerciciosSpan.innerText = ejerciciosRonda.length;
    return true;
}

function cargarOpcionesCuentas() {
    // Limpiar selects
    cuenta1NombreSelect.innerHTML = '<option value="">Seleccione una cuenta</option>';
    cuenta2NombreSelect.innerHTML = '<option value="">Seleccione una cuenta</option>';
    
    // Agregar opciones ordenadas alfabéticamente
    const cuentasOrdenadas = [...cuentasDisponibles].sort();
    
    cuentasOrdenadas.forEach(cuenta => {
        const option1 = document.createElement('option');
        option1.value = cuenta;
        option1.textContent = cuenta;
        cuenta1NombreSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = cuenta;
        option2.textContent = cuenta;
        cuenta2NombreSelect.appendChild(option2);
    });
}

function mostrarEjercicio() {
    if (indiceActual >= ejerciciosRonda.length) {
        mostrarResultadoFinal();
        return;
    }
    
    const ejercicio = ejerciciosRonda[indiceActual];
    enunciadoContainer.innerHTML = `<strong>📖 Enunciado:</strong> ${ejercicio.enunciado}`;
    
    // Limpiar todos los campos
    cuenta1NombreSelect.value = '';
    cuenta2NombreSelect.value = '';
    inputCuenta1Debe.value = '';
    inputCuenta1Haber.value = '';
    inputCuenta2Debe.value = '';
    inputCuenta2Haber.value = '';
    
    // Resetear UI
    feedbackDiv.style.display = 'none';
    feedbackDiv.className = 'feedback';
    btnVerificar.style.display = 'inline-block';
    btnSiguiente.style.display = 'none';
    resultadoFinalDiv.style.display = 'none';
    
    // Mostrar tabla nuevamente si estaba oculta
    const tabla = document.querySelector('.modern-table');
    if (tabla) tabla.style.display = 'table';
    
    actualizarProgreso();
}

function actualizarProgreso() {
    ejercicioActualSpan.innerText = indiceActual + 1;
    aciertosSpan.innerText = aciertos;
    erroresSpan.innerText = errores;
    penalizacionesSpan.innerText = penalizaciones;
    const porcentaje = (indiceActual / ejerciciosRonda.length) * 100;
    progressBar.style.width = `${porcentaje}%`;
}

function verificarRespuesta() {
    const ejercicio = ejerciciosRonda[indiceActual];
    
    const cuenta1Seleccionada = cuenta1NombreSelect.value;
    const cuenta2Seleccionada = cuenta2NombreSelect.value;
    
    const debe1 = parseFloat(inputCuenta1Debe.value) || 0;
    const haber1 = parseFloat(inputCuenta1Haber.value) || 0;
    const debe2 = parseFloat(inputCuenta2Debe.value) || 0;
    const haber2 = parseFloat(inputCuenta2Haber.value) || 0;
    
    const cuenta1Correcta = (cuenta1Seleccionada === ejercicio.cuenta1.nombre);
    const cuenta2Correcta = (cuenta2Seleccionada === ejercicio.cuenta2.nombre);
    
    const valoresCorrectos = (debe1 === ejercicio.cuenta1.debe && 
                              haber1 === ejercicio.cuenta1.haber &&
                              debe2 === ejercicio.cuenta2.debe && 
                              haber2 === ejercicio.cuenta2.haber);
    
    let cuentasIncorrectas = 0;
    let detallesPenalizacion = [];
    
    if (!cuenta1Correcta && cuenta1Seleccionada !== '') {
        cuentasIncorrectas++;
        detallesPenalizacion.push(`Cuenta 1: "${cuenta1Seleccionada}" → debía ser "${ejercicio.cuenta1.nombre}"`);
    }
    if (!cuenta2Correcta && cuenta2Seleccionada !== '') {
        cuentasIncorrectas++;
        detallesPenalizacion.push(`Cuenta 2: "${cuenta2Seleccionada}" → debía ser "${ejercicio.cuenta2.nombre}"`);
    }
    
    const cuentasCorrectas = cuenta1Correcta && cuenta2Correcta;
    const respuestaCompletaCorrecta = cuentasCorrectas && valoresCorrectos;
    
    if (respuestaCompletaCorrecta) {
        aciertos++;
        feedbackDiv.className = 'feedback correcto';
        feedbackDiv.innerHTML = `
            <span style="color:#10b981;">✅ ¡Respuesta completamente correcta!</span><br><br>
            <strong>📋 Detalles:</strong><br>
            • ${ejercicio.cuenta1.nombre}: Debe ${formatearNumero(ejercicio.cuenta1.debe)} | Haber ${formatearNumero(ejercicio.cuenta1.haber)}<br>
            • ${ejercicio.cuenta2.nombre}: Debe ${formatearNumero(ejercicio.cuenta2.debe)} | Haber ${formatearNumero(ejercicio.cuenta2.haber)}<br><br>
            <small>💡 ¡Excelente trabajo! Has aplicado correctamente las reglas del debe y haber.</small>
        `;
        
        // Animación de celebración
        Swal.fire({
            icon: 'success',
            title: '¡Correcto!',
            text: 'Has respondido correctamente el ejercicio',
            confirmButtonColor: '#10b981',
            timer: 1500,
            showConfirmButton: false,
            background: '#ffffff'
        });
        
    } else {
        let puntosPenalizados = cuentasIncorrectas;
        penalizaciones += puntosPenalizados;
        
        if (!cuentasCorrectas && !valoresCorrectos) {
            errores++;
        } else if (!valoresCorrectos) {
            errores++;
        }
        
        let mensajeError = '';
        if (!cuentasCorrectas) {
            mensajeError += `<span style="color:#ef4444;">❌ Cuentas incorrectas seleccionadas. Se penalizan ${puntosPenalizados} punto(s).</span><br><br>`;
            mensajeError += `<strong>⚠️ Corrección de cuentas:</strong><br>`;
            detallesPenalizacion.forEach(detalle => {
                mensajeError += `• ${detalle}<br>`;
            });
            mensajeError += `<br>`;
        }
        
        if (!valoresCorrectos) {
            mensajeError += `<strong>📋 Valores correctos:</strong><br>`;
            mensajeError += `• ${ejercicio.cuenta1.nombre}: Debe ${formatearNumero(ejercicio.cuenta1.debe)} | Haber ${formatearNumero(ejercicio.cuenta1.haber)}<br>`;
            mensajeError += `• ${ejercicio.cuenta2.nombre}: Debe ${formatearNumero(ejercicio.cuenta2.debe)} | Haber ${formatearNumero(ejercicio.cuenta2.haber)}<br><br>`;
        }
        
        mensajeError += `<small>💡 <strong>Recordatorio:</strong> El DEBE aumenta Activos y Gastos, el HABER aumenta Pasivos, Capital e Ingresos.</small>`;
        
        feedbackDiv.className = 'feedback incorrecto';
        feedbackDiv.innerHTML = mensajeError;
        
        // Mostrar alerta de error
        Swal.fire({
            icon: 'error',
            title: 'Respuesta incorrecta',
            html: `Se han penalizado ${puntosPenalizados} punto(s) por cuentas incorrectas.<br><br>Revisa el feedback para más detalles.`,
            confirmButtonColor: '#ef4444',
            background: '#ffffff'
        });
    }
    
    feedbackDiv.style.display = 'block';
    btnVerificar.style.display = 'none';
    btnSiguiente.style.display = 'inline-block';
    actualizarProgreso();
}

function formatearNumero(num) {
    if (num === 0) return '0';
    return num.toLocaleString('es-ES');
}

function siguienteEjercicio() {
    indiceActual++;
    if (indiceActual < ejerciciosRonda.length) {
        mostrarEjercicio();
    } else {
        mostrarResultadoFinal();
    }
}

function mostrarResultadoFinal() {
    const total = ejerciciosRonda.length;
    const puntajeMaximo = total;
    const puntajeObtenido = aciertos;
    const porcentajeCorrecto = (puntajeObtenido / puntajeMaximo) * 100;
    const puntajeFinal = Math.max(0, puntajeObtenido - penalizaciones);
    const porcentajeFinal = (puntajeFinal / puntajeMaximo) * 100;
    
    const tabla = document.querySelector('.modern-table');
    if (tabla) tabla.style.display = 'none';
    
    btnVerificar.style.display = 'none';
    btnSiguiente.style.display = 'none';
    
    let mensajeConsejo = '';
    let emoji = '';
    let color = '';
    
    if (porcentajeFinal >= 90) {
        mensajeConsejo = '¡Excelente! Dominas este nivel.';
        emoji = '🏆';
        color = '#10b981';
    } else if (porcentajeFinal >= 70) {
        mensajeConsejo = '¡Bien hecho! Puedes avanzar al siguiente nivel.';
        emoji = '🎉';
        color = '#0FC9F2';
    } else if (porcentajeFinal >= 50) {
        mensajeConsejo = 'Buen intento. Repasa los conceptos y vuelve a intentarlo.';
        emoji = '📚';
        color = '#f59e0b';
    } else {
        mensajeConsejo = 'No te desanimes. Revisa la teoría de las cuentas T y practica más.';
        emoji = '💪';
        color = '#ef4444';
    }
    
    resultadoFinalDiv.style.display = 'block';
    resultadoFinalDiv.innerHTML = `
        <h3>🏁 Ronda completada</h3>
        <p>✅ Ejercicios correctos: <strong>${aciertos}</strong> / ${total}</p>
        <p>❌ Errores: ${errores}</p>
        <p>⚠️ Penalizaciones (cuentas incorrectas): ${penalizaciones}</p>
        <div class="score-highlight" style="color: ${color}">
            🎯 Puntaje final: ${puntajeFinal} / ${puntajeMaximo} (${porcentajeFinal.toFixed(1)}%)
        </div>
        <p style="margin-top: 1rem;">${emoji} ${mensajeConsejo}</p>
        <button onclick="window.location.href='../index.html'">🏠 Volver al inicio</button>
    `;
    
    // Mostrar resumen final con SweetAlert
    Swal.fire({
        icon: porcentajeFinal >= 70 ? 'success' : (porcentajeFinal >= 50 ? 'info' : 'warning'),
        title: `${emoji} Ronda completada`,
        html: `
            <strong>Resultados:</strong><br>
            ✅ Correctas: ${aciertos}/${total}<br>
            ❌ Incorrectas: ${errores}<br>
            ⚠️ Penalizaciones: ${penalizaciones}<br><br>
            <strong style="color:${color}">Puntaje final: ${puntajeFinal}/${puntajeMaximo} (${porcentajeFinal.toFixed(1)}%)</strong><br><br>
            ${mensajeConsejo}
        `,
        confirmButtonColor: '#0FC9F2',
        confirmButtonText: 'Ver detalles',
        background: '#ffffff'
    });
}

// Event listeners
btnVerificar?.addEventListener('click', verificarRespuesta);
btnSiguiente?.addEventListener('click', siguienteEjercicio);

// Inicializar juego
if (cargarDatosRonda()) {
    cargarOpcionesCuentas();
    mostrarEjercicio();
}