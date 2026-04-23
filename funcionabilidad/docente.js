// Lógica del panel del docente
import { auth, db } from './firebase-config.js';
import { protegerRutaDocente } from './auth.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Proteger la ruta (requiere autenticación)
protegerRutaDocente("../index.html");

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

// Elementos del DOM
const form = document.getElementById('form-crear-ejercicio');
const listaContainer = document.getElementById('lista-ejercicios');
const ejercicioIdInput = document.getElementById('ejercicio-id');
const formTitle = document.getElementById('form-title');
const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');

// Filtros
const filtroNivel = document.getElementById('filtro-nivel');
const filtroRonda = document.getElementById('filtro-ronda');
const filtroEstado = document.getElementById('filtro-estado');
const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');

// Variables globales
let ejerciciosOriginales = [];
let modoEdicion = false;
let ejercicioEditandoId = null;

// Mostrar notificación temporal
function mostrarNotificacion(mensaje, tipo = 'exito') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <i class="fas ${tipo === 'exito' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${mensaje}</span>
    `;
    notificacion.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${tipo === 'exito' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notificacion);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (notificacion.parentNode) {
                document.body.removeChild(notificacion);
            }
        }, 300);
    }, 3000);
}

// Cargar opciones de cuentas en los selects del formulario
function cargarOpcionesCuentasEnFormulario() {
    const cuenta1Select = document.getElementById('cuenta1_nombre');
    const cuenta2Select = document.getElementById('cuenta2_nombre');
    
    // Limpiar selects
    cuenta1Select.innerHTML = '<option value="">Seleccione una cuenta...</option>';
    cuenta2Select.innerHTML = '<option value="">Seleccione una cuenta...</option>';
    
    // Agregar opciones ordenadas
    const cuentasOrdenadas = [...cuentasDisponibles].sort();
    
    cuentasOrdenadas.forEach(cuenta => {
        const option1 = document.createElement('option');
        option1.value = cuenta;
        option1.textContent = cuenta;
        cuenta1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = cuenta;
        option2.textContent = cuenta;
        cuenta2Select.appendChild(option2);
    });
}

// Cargar opciones de rondas para el filtro
async function cargarOpcionesRondasParaFiltro() {
    try {
        const snapshot = await getDocs(collection(db, "ejercicios"));
        const ejercicios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const rondasDisponibles = [...new Set(ejercicios.map(ej => ej.ronda))].sort((a, b) => a - b);
        
        filtroRonda.innerHTML = '<option value="todos">Todas las rondas</option>';
        rondasDisponibles.forEach(ronda => {
            const option = document.createElement('option');
            option.value = ronda;
            option.textContent = `Ronda ${ronda}`;
            filtroRonda.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando rondas para filtro:", error);
    }
}

// Aplicar filtros a los ejercicios
function aplicarFiltros() {
    const nivelSeleccionado = filtroNivel.value;
    const rondaSeleccionada = filtroRonda.value;
    const estadoSeleccionado = filtroEstado.value;
    
    let ejerciciosFiltrados = [...ejerciciosOriginales];
    
    // Filtrar por nivel
    if (nivelSeleccionado !== 'todos') {
        ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => ej.nivel === nivelSeleccionado);
    }
    
    // Filtrar por ronda
    if (rondaSeleccionada !== 'todos') {
        ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => ej.ronda === parseInt(rondaSeleccionada));
    }
    
    // Filtrar por estado
    if (estadoSeleccionado === 'activo') {
        ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => ej.activo === true);
    } else if (estadoSeleccionado === 'inactivo') {
        ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => ej.activo === false);
    }
    
    renderizarTabla(ejerciciosFiltrados);
}

// Renderizar tabla de ejercicios
function renderizarTabla(ejercicios) {
    if (ejercicios.length === 0) {
        listaContainer.innerHTML = `
            <div class="sin-resultados">
                <i class="fas fa-search"></i>
                <p>No hay ejercicios que coincidan con los filtros seleccionados.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Nivel</th>
                    <th>Ronda</th>
                    <th>Enunciado</th>
                    <th>Cuenta 1</th>
                    <th>Debe 1</th>
                    <th>Haber 1</th>
                    <th>Cuenta 2</th>
                    <th>Debe 2</th>
                    <th>Haber 2</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    ejercicios.forEach(ej => {
        const estadoClass = ej.activo ? 'true' : 'false';
        const estadoText = ej.activo ? 'Activo' : 'Inactivo';
        
        html += `
            <tr>
                <td>${getNivelIcon(ej.nivel)} ${ej.nivel}</td>
                <td>${ej.ronda}</td>
                <td style="text-align:left; max-width:250px;">${ej.enunciado.substring(0, 80)}${ej.enunciado.length > 80 ? '...' : ''}</td>
                <td>${ej.cuenta1.nombre}</td>
                <td>${formatNumber(ej.cuenta1.debe)}</td>
                <td>${formatNumber(ej.cuenta1.haber)}</td>
                <td>${ej.cuenta2.nombre}</td>
                <td>${formatNumber(ej.cuenta2.debe)}</td>
                <td>${formatNumber(ej.cuenta2.haber)}</td>
                <td><span class="estado-activo ${estadoClass}">${estadoText}</span></td>
                <td>
                    <div class="accion-buttons-container">
                        <button class="accion-btn editar" data-id="${ej.id}"><i class="fas fa-edit"></i> Editar</button>
                        <button class="accion-btn toggle-activo" data-id="${ej.id}" data-activo="${ej.activo}">${ej.activo ? '<i class="fas fa-ban"></i> Desactivar' : '<i class="fas fa-check-circle"></i> Activar'}</button>
                        <button class="accion-btn eliminar" data-id="${ej.id}"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    listaContainer.innerHTML = html;
    
    // Eventos para botones de editar
    document.querySelectorAll('.editar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            await cargarEjercicioParaEditar(id);
        });
    });
    
    // Eventos para botones de activar/desactivar
    document.querySelectorAll('.toggle-activo').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const actualActivo = btn.dataset.activo === 'true';
            const nuevoActivo = !actualActivo;
            const accion = nuevoActivo ? 'activar' : 'desactivar';
            
            const result = await Swal.fire({
                title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} ejercicio?`,
                text: `¿Estás seguro de que deseas ${accion} este ejercicio?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: nuevoActivo ? '#10b981' : '#f59e0b',
                cancelButtonColor: '#64748b',
                confirmButtonText: `Sí, ${accion}`,
                cancelButtonText: 'Cancelar'
            });
            
            if (result.isConfirmed) {
                try {
                    await updateDoc(doc(db, "ejercicios", id), { activo: nuevoActivo });
                    await Swal.fire({
                        icon: 'success',
                        title: `Ejercicio ${nuevoActivo ? 'activado' : 'desactivado'}`,
                        text: `El ejercicio ha sido ${nuevoActivo ? 'activado' : 'desactivado'} correctamente`,
                        confirmButtonColor: '#10b981',
                        timer: 1500,
                        showConfirmButton: true
                    });
                    await cargarEjercicios();
                } catch (error) {
                    console.error("Error al actualizar:", error);
                    await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo cambiar el estado del ejercicio',
                        confirmButtonColor: '#ef4444'
                    });
                }
            }
        });
    });
    
    // Eventos para botones de eliminar
    document.querySelectorAll('.eliminar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const result = await Swal.fire({
                title: '¿Eliminar ejercicio?',
                text: 'Esta acción no se puede deshacer. ¿Estás seguro?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });
            
            if (result.isConfirmed) {
                try {
                    await deleteDoc(doc(db, "ejercicios", btn.dataset.id));
                    await Swal.fire({
                        icon: 'success',
                        title: '¡Ejercicio eliminado!',
                        text: 'El ejercicio ha sido eliminado permanentemente',
                        confirmButtonColor: '#10b981',
                        timer: 1500,
                        showConfirmButton: true
                    });
                    await cargarEjercicios();
                    if (modoEdicion) {
                        cancelarEdicion();
                    }
                    await cargarOpcionesRondasParaFiltro();
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo eliminar el ejercicio',
                        confirmButtonColor: '#ef4444'
                    });
                }
            }
        });
    });
}

// Cargar ejercicio para editar
async function cargarEjercicioParaEditar(id) {
    try {
        const ejercicio = ejerciciosOriginales.find(ej => ej.id === id);
        
        if (ejercicio) {
            ejercicioEditandoId = id;
            modoEdicion = true;
            
            formTitle.innerHTML = '<i class="fas fa-edit"></i> Editar ejercicio';
            btnCancelarEdicion.style.display = 'block';
            
            document.getElementById('nivel').value = ejercicio.nivel;
            document.getElementById('ronda').value = ejercicio.ronda;
            document.getElementById('enunciado').value = ejercicio.enunciado;
            document.getElementById('cuenta1_nombre').value = ejercicio.cuenta1.nombre;
            document.getElementById('cuenta1_debe').value = ejercicio.cuenta1.debe;
            document.getElementById('cuenta1_haber').value = ejercicio.cuenta1.haber;
            document.getElementById('cuenta2_nombre').value = ejercicio.cuenta2.nombre;
            document.getElementById('cuenta2_debe').value = ejercicio.cuenta2.debe;
            document.getElementById('cuenta2_haber').value = ejercicio.cuenta2.haber;
            document.getElementById('activo').value = ejercicio.activo ? 'true' : 'false';
            
            document.querySelector('.form-ejercicio').scrollIntoView({ behavior: 'smooth' });
            
            await Swal.fire({
                icon: 'info',
                title: 'Editando ejercicio',
                text: 'Cargando datos del ejercicio seleccionado',
                confirmButtonColor: '#0FC9F2',
                timer: 1500,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error("Error al cargar ejercicio para editar:", error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los datos del ejercicio',
            confirmButtonColor: '#ef4444'
        });
    }
}

// Cancelar edición
function cancelarEdicion() {
    modoEdicion = false;
    ejercicioEditandoId = null;
    formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Crear nuevo ejercicio';
    btnCancelarEdicion.style.display = 'none';
    form.reset();
    document.getElementById('ronda').value = '1';
    document.getElementById('cuenta1_debe').value = '0';
    document.getElementById('cuenta1_haber').value = '0';
    document.getElementById('cuenta2_debe').value = '0';
    document.getElementById('cuenta2_haber').value = '0';
    document.getElementById('activo').value = 'true';
    
    Swal.fire({
        icon: 'info',
        title: 'Edición cancelada',
        text: 'Puedes crear un nuevo ejercicio',
        confirmButtonColor: '#0FC9F2',
        timer: 1500,
        showConfirmButton: false
    });
}

// Guardar ejercicio (crear o actualizar)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevoEjercicio = {
        nivel: document.getElementById('nivel').value,
        ronda: parseInt(document.getElementById('ronda').value),
        enunciado: document.getElementById('enunciado').value,
        cuenta1: {
            nombre: document.getElementById('cuenta1_nombre').value,
            debe: parseFloat(document.getElementById('cuenta1_debe').value) || 0,
            haber: parseFloat(document.getElementById('cuenta1_haber').value) || 0
        },
        cuenta2: {
            nombre: document.getElementById('cuenta2_nombre').value,
            debe: parseFloat(document.getElementById('cuenta2_debe').value) || 0,
            haber: parseFloat(document.getElementById('cuenta2_haber').value) || 0
        },
        activo: document.getElementById('activo').value === 'true'
    };
    
    // Validaciones
    if (!nuevoEjercicio.cuenta1.nombre || !nuevoEjercicio.cuenta2.nombre || !nuevoEjercicio.enunciado) {
        await Swal.fire({
            icon: 'warning',
            title: 'Campos incompletos',
            text: 'Por favor completa todos los campos obligatorios',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }
    
    if (nuevoEjercicio.cuenta1.debe === 0 && nuevoEjercicio.cuenta1.haber === 0) {
        await Swal.fire({
            icon: 'warning',
            title: 'Validación contable',
            text: 'La Cuenta 1 debe tener un valor en DEBE o HABER',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }
    
    if (nuevoEjercicio.cuenta2.debe === 0 && nuevoEjercicio.cuenta2.haber === 0) {
        await Swal.fire({
            icon: 'warning',
            title: 'Validación contable',
            text: 'La Cuenta 2 debe tener un valor en DEBE o HABER',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }
    
    try {
        if (modoEdicion && ejercicioEditandoId) {
            await updateDoc(doc(db, "ejercicios", ejercicioEditandoId), nuevoEjercicio);
            await Swal.fire({
                icon: 'success',
                title: '¡Ejercicio actualizado!',
                text: 'El ejercicio ha sido modificado correctamente',
                confirmButtonColor: '#10b981',
                timer: 2000,
                showConfirmButton: true
            });
            cancelarEdicion();
        } else {
            await addDoc(collection(db, "ejercicios"), nuevoEjercicio);
            await Swal.fire({
                icon: 'success',
                title: '¡Ejercicio creado!',
                text: 'El nuevo ejercicio ha sido guardado correctamente',
                confirmButtonColor: '#10b981',
                timer: 2000,
                showConfirmButton: true
            });
            form.reset();
            document.getElementById('ronda').value = '1';
            document.getElementById('cuenta1_debe').value = '0';
            document.getElementById('cuenta1_haber').value = '0';
            document.getElementById('cuenta2_debe').value = '0';
            document.getElementById('cuenta2_haber').value = '0';
            document.getElementById('activo').value = 'true';
        }
        
        await cargarEjercicios();
        await cargarOpcionesRondasParaFiltro();
        
    } catch (error) {
        console.error("Error al guardar:", error);
        await Swal.fire({
            icon: 'error',
            title: 'Error al guardar',
            text: error.message,
            confirmButtonColor: '#ef4444'
        });
    }
});

// Cargar lista de ejercicios
async function cargarEjercicios() {
    listaContainer.innerHTML = '<div class="loading-spinner">Cargando ejercicios...</div>';
    
    try {
        const snapshot = await getDocs(collection(db, "ejercicios"));
        ejerciciosOriginales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (ejerciciosOriginales.length === 0) {
            listaContainer.innerHTML = '<p style="text-align:center; padding:2rem;">📭 No hay ejercicios creados. ¡Crea el primero!</p>';
            return;
        }
        
        // Ordenamiento de ejercicios por nivel y luego por ronda
        const ordenNiveles = { 'facil': 1, 'medio': 2, 'dificil': 3 };
        ejerciciosOriginales.sort((a, b) => {
            // Primero ordenar por nivel
            if (ordenNiveles[a.nivel] !== ordenNiveles[b.nivel]) {
                return ordenNiveles[a.nivel] - ordenNiveles[b.nivel];
            }
            // Luego por ronda
            return a.ronda - b.ronda;
        });
        
        aplicarFiltros();
        
    } catch (error) {
        console.error("Error cargando ejercicios:", error);
        listaContainer.innerHTML = '<p style="text-align:center; padding:2rem; color:#ef4444;">❌ Error al cargar los ejercicios</p>';
    }
}

// Eventos de filtros
filtroNivel.addEventListener('change', () => {
    aplicarFiltros();
});
filtroRonda.addEventListener('change', () => {
    aplicarFiltros();
});
filtroEstado.addEventListener('change', () => {
    aplicarFiltros();
});
btnLimpiarFiltros.addEventListener('click', () => {
    filtroNivel.value = 'todos';
    filtroRonda.value = 'todos';
    filtroEstado.value = 'todos';
    aplicarFiltros();
});
btnCancelarEdicion.addEventListener('click', cancelarEdicion);

// Funciones auxiliares
function getNivelIcon(nivel) {
    switch(nivel) {
        case 'facil': return '⭐';
        case 'medio': return '⭐⭐';
        case 'dificil': return '⭐⭐⭐';
        default: return '';
    }
}

function formatNumber(num) {
    if (num === 0) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Inicializar
cargarOpcionesCuentasEnFormulario();
cargarEjercicios();
cargarOpcionesRondasParaFiltro();

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);