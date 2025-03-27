import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getAuth, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    updateProfile, 
    updateEmail, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js";
import { 
    getFirestore, 
    doc,
    query,
    where, 
    getDoc,
    setDoc, 
    collection,
    orderBy,  
    getDocs,     
    addDoc,
    updateDoc,
    Timestamp,
    serverTimestamp,      
    deleteDoc    
} from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-functions.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBF7gSoZD2mebyD_Kwl-sq5y1ZfErYZfrs",
  authDomain: "inouttime-25fe6.firebaseapp.com",
  projectId: "inouttime-25fe6",
  storageBucket: "inouttime-25fe6.appspot.com",
  messagingSenderId: "652540896490",
  appId: "1:652540896490:web:3126fd620a097e7ab52393",
  measurementId: "G-DDB4BPZ5Z6"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app); 

// Definir todas las funciones como globales desde el principio
window.abrirModalNuevaEmpresa = function() {
    console.log("Abriendo modal nueva empresa");
    const modalElement = document.getElementById('modalNuevaEmpresa');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

window.abrirModalNuevoGrupo = function() {
    console.log("Abriendo modal nuevo grupo");
    const modalElement = document.getElementById('modalNuevoGrupo');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

////////////////////////
// CREAR NUEVA EMPRESA//
////////////////////////

window.crearNuevaEmpresa = async function(event) {
    event.preventDefault();
    
    // Obtener valores del formulario
    const nombre = document.getElementById('nombreEmpresa').value;
    const cif = document.getElementById('cifEmpresa').value;
    const direccion = document.getElementById('direccionEmpresa').value;
    const telefono = document.getElementById('telefonoEmpresa').value;
    const email = document.getElementById('emailEmpresa').value;
    const responsable = document.getElementById('responsableEmpresa').value;
    const statusInput = document.getElementById('statusEmpresa').value;
    const periodicidad = document.getElementById('periodicidadContrato').value;
    const tipoLicencia = document.getElementById('tipoLicencia').value;

    // Convertir status a booleano
    const status = statusInput.toUpperCase() === 'ACTIVA' ? true : false;

    // Calcular fechas
    const fechaAlta = new Date(); // Fecha actual
    const fechaExpiracion = calcularFechaExpiracion(periodicidad);

    try {
        // Añadir documento a Firestore
        const docRef = await addDoc(collection(db, 'empresas'), {
            nombre_empresa: nombre,
            CIF: cif,
            direccion_empresa: direccion,
            telefono_empresa: telefono,
            email_empresa: email,
            responsable_empresa: responsable,
            status_empresa: status,
            
            // Nuevos campos
            fecha_alta: fechaAlta,
            tipo_contrato: periodicidad,
            fecha_expiracion: fechaExpiracion,
            tipo_licencia: tipoLicencia // Añadido tipo de licencia
        });

        console.log("Empresa creada con ID: ", docRef.id);

        // Cerrar modal
        const modalElement = document.getElementById('modalNuevaEmpresa');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();

        // Limpiar formulario
        event.target.reset();

        // Recargar lista de empresas
        window.cargarEmpresas();

        // Notificación de éxito
        Swal.fire({
            icon: 'success',
            title: 'Empresa Creada',
            text: 'La empresa se ha registrado correctamente',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

    } catch (error) {
        console.error("Error al crear empresa: ", error);
        
        // Notificación de error
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo crear la empresa',
            confirmButtonText: 'Entendido'
        });
    }
}

// Función para crear un nuevo grupo de empresas
window.crearNuevoGrupo = async function(event) {
    event.preventDefault();
    
    // Obtener valores del formulario
    const nombreGrupo = document.getElementById('nombreGrupo').value;
    const descripcionGrupo = document.getElementById('descripcionGrupo').value;
    const gestorGrupo = document.getElementById('GestorGrupo').value;

    // Array para almacenar los IDs de las empresas asociadas
    const empresasAsociadas = []; // Aquí puedes agregar lógica para seleccionar empresas

    try {
        // Añadir documento a Firestore
        const docRef = await addDoc(collection(db, 'grupos'), {
            nombre: nombreGrupo,
            descripcion: descripcionGrupo,
            gestor: gestorGrupo,
            empresas_asociadas: empresasAsociadas // Inicialmente vacío, puedes llenarlo después
        });

        console.log("Grupo creado con ID: ", docRef.id);

        // Cerrar modal
        const modalElement = document.getElementById('modalNuevoGrupo');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();

        // Limpiar formulario
        event.target.reset();

        // Recargar lista de grupos (si tienes una función para ello)
        window.cargarGrupos(); // Asegúrate de implementar esta función

        // Notificación de éxito
        Swal.fire({
            icon: 'success',
            title: 'Grupo Creado',
            text: 'El grupo se ha registrado correctamente',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

    } catch (error) {
        console.error("Error al crear grupo: ", error);
        
        // Notificación de error
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo crear el grupo',
            confirmButtonText: 'Entendido'
        });
    }
}

// Añadir el event listener al formulario
document.getElementById('formNuevoGrupo').addEventListener('submit', crearNuevoGrupo);

// Función para calcular la fecha de expiración
function calcularFechaExpiracion(periodicidad) {
    const fechaActual = new Date();
    
    if (periodicidad === 'mensual') {
        // Añadir 1 mes
        fechaActual.setMonth(fechaActual.getMonth() + 1);
    } else if (periodicidad === 'anual') {
        // Añadir 1 año
        fechaActual.setFullYear(fechaActual.getFullYear() + 1);
    }
    
    return fechaActual;
}

// Añadir event listener al formulario
document.getElementById('formNuevaEmpresa').addEventListener('submit', crearNuevaEmpresa);

///////////////////////////////
// CREAR NUEVA EMPRESA - FIN //
//////////////////////////////

//////////////////////////////////////////
// Mostrar lista empresas en ROOT - FIN //
/////////////////////////////////////////
window.cargarEmpresas = async function() {
    try {
        console.log("Iniciando carga de empresas");

        const empresasRef = collection(db, 'empresas');
        const querySnapshot = await getDocs(empresasRef);
        
        console.log(`Número de empresas encontradas: ${querySnapshot.size}`);

        const listaEmpresas = document.getElementById('listaEmpresas');
        listaEmpresas.innerHTML = ''; // Limpiar lista actual

        // Actualizar contador de empresas
        document.getElementById('totalEmpresas').textContent = querySnapshot.size;

        if (querySnapshot.empty) {
            console.log("No hay empresas en la base de datos");
            listaEmpresas.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">No hay empresas registradas</td>
                </tr>
            `;
            return;
        }

        querySnapshot.forEach((documento) => {
            const empresa = documento.data();
            console.log("Empresa encontrada:", empresa);

            // Formatear fechas
            const formatearFecha = (fecha) => {
                if (!fecha) return 'No especificada';
                return fecha.toDate ? fecha.toDate().toLocaleDateString() : 'Formato inválido';
            };

            const fila = `
                <tr data-id="${documento.id}">
                    <td>${empresa.nombre_empresa || 'Sin nombre'}</td>
                    <td>${empresa.grupo_empresa || 'X'}</td>
                    <td>${empresa.CIF || 'Sin CIF'}</td>
                    <td>${empresa.email_empresa || 'No especificada'}</td>
                    <td>${empresa.responsable_empresa || 'No especificada'}</td>
                    <td>${empresa.tipo_contrato || 'Contrato'}</td>
                    <td>${empresa.tipo_licencia || 'No especificada'}</td>
                    <td>${formatearFecha(empresa.fecha_alta)}</td>
                    <td>${formatearFecha(empresa.fecha_expiracion)}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-success btn-sm" 
                                    onclick="mostrarInformacionEmpresa('${documento.id}')"
                                    title="Mostrar Información">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            <button class="btn btn-info btn-sm" 
                                    onclick="modificarEmpresa('${documento.id}')"
                                    title="Editar Empresa">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" 
                                    onclick="eliminarEmpresa('${documento.id}')"
                                    title="Eliminar Empresa">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            listaEmpresas.insertAdjacentHTML('beforeend', fila);
        });
    } catch (error) {
        console.error("Error detallado al cargar empresas: ", error);
        
        const listaEmpresas = document.getElementById('listaEmpresas');
        listaEmpresas.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger">
                    Error al cargar empresas: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Funciones de acciones (implementaciones básicas, deberás completarlas)
window.mostrarInformacionEmpresa = async function(empresaId) {
    try {
        const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
        const empresa = empresaDoc.data();

        // Función para formatear fechas de manera segura
        const formatearFecha = (fecha) => {
            if (!fecha) return 'No especificada';
            
            // Si es un Timestamp de Firestore
            if (fecha.toDate && typeof fecha.toDate === 'function') {
                return fecha.toDate().toLocaleDateString();
            }
            
            // Si es un objeto Date de JavaScript
            if (fecha instanceof Date) {
                return fecha.toLocaleDateString();
            }
            
            // Si es un string de fecha
            if (typeof fecha === 'string') {
                const fechaParseada = new Date(fecha);
                return !isNaN(fechaParseada) ? fechaParseada.toLocaleDateString() : 'Fecha inválida';
            }
            
            return 'Formato de fecha no reconocido';
        };

        Swal.fire({
            title: `Información de Empresa: ${empresa.nombre_empresa}`,
            html: `
                <div class="text-start">
                    <p><strong>Nombre:</strong> ${empresa.nombre_empresa || 'No especificado'}</p>
                    <p><strong>CIF:</strong> ${empresa.CIF || 'No especificado'}</p>
                    <p><strong>Dirección:</strong> ${empresa.direccion_empresa || 'No especificada'}</p>
                    <p><strong>Teléfono:</strong> ${empresa.telefono_empresa || 'No especificado'}</p>
                    <p><strong>Email:</strong> ${empresa.email_empresa || 'No especificado'}</p>
                    <p><strong>Responsable:</strong> ${empresa.responsable_empresa || 'No especificado'}</p>
                    <p><strong>Estado:</strong> ${empresa.status_empresa ? 'ACTIVA' : 'DESACTIVADA'}</p>
                    <p><strong>Tipo de Licencia:</strong> ${empresa.tipo_licencia || 'No especificada'}</p>
                    <p><strong>Tipo de Contrato:</strong> ${empresa.tipo_contrato || 'No especificado'}</p>
                    <p><strong>Fecha de Alta:</strong> ${formatearFecha(empresa.fecha_alta)}</p>
                    <p><strong>Fecha de Expiración:</strong> ${formatearFecha(empresa.fecha_expiracion)}</p>
                </div>
            `,
            confirmButtonText: 'Cerrar'
        });
    } catch (error) {
        console.error("Error al mostrar información de empresa:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la información de la empresa',
            footer: error.message
        });
    }
}
window.modificarEmpresa = async function(empresaId) {
    try {
        const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
        const empresa = empresaDoc.data();

        // Función para formatear fecha de manera segura
        const formatearFecha = (fecha) => {
            // Si es un Timestamp de Firestore
            if (fecha && fecha.toDate && typeof fecha.toDate === 'function') {
                return fecha.toDate().toISOString().split('T')[0];
            }
            
            // Si es un objeto Date de JavaScript
            if (fecha instanceof Date) {
                return fecha.toISOString().split('T')[0];
            }
            
            // Si es un string de fecha
            if (typeof fecha === 'string') {
                const fechaParseada = new Date(fecha);
                return !isNaN(fechaParseada) ? fechaParseada.toISOString().split('T')[0] : '';
            }
            
            // Si no es un formato reconocido
            return '';
        };

        const { value: formValues } = await Swal.fire({
            title: `Modificar Empresa: ${empresa.nombre_empresa}`,
            html: `
                <style>
                    .swal2-input, .swal2-select {
                        margin-bottom: 10px;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .form-section {
                        font-weight: bold;
                        margin-top: 15px;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #3085d6;
                        color: #3085d6;
                        text-align: left;
                        padding-bottom: 5px;
                    }
                    .input-label {
                        text-align: left;
                        margin-bottom: 5px;
                        font-weight: bold;
                        color: #555;
                    }
                </style>
                <div class="form-section">Información Principal</div>
                
                <div class="input-label">Nombre de la Empresa *</div>
                <input id="swal-nombre" class="swal2-input" 
                       placeholder="Nombre completo de la empresa" 
                       value="${empresa.nombre_empresa || ''}"
                       title="Nombre legal completo de la empresa">
                
                <div class="input-label">CIF / NIF *</div>
                <input id="swal-cif" class="swal2-input" 
                       placeholder="Código de Identificación Fiscal" 
                       value="${empresa.CIF || ''}"
                       title="Código de Identificación Fiscal de la empresa">
                
                <div class="input-label">Dirección de la Empresa</div>
                <input id="swal-direccion" class="swal2-input" 
                       placeholder="Dirección completa" 
                       value="${empresa.direccion_empresa || ''}"
                       title="Dirección física de la empresa">
                
                <div class="form-section">Información de Contacto</div>
                
                <div class="input-label">Teléfono de Contacto</div>
                <input id="swal-telefono" class="swal2-input" 
                       placeholder="Número de teléfono" 
                       value="${empresa.telefono_empresa || ''}"
                       title="Número de teléfono principal de la empresa">
                
                <div class="input-label">Email Corporativo</div>
                <input id="swal-email" class="swal2-input" 
                       placeholder="Correo electrónico" 
                       value="${empresa.email_empresa || ''}"
                       title="Dirección de correo electrónico oficial">
                
                <div class="input-label">Responsable de la Empresa</div>
                <input id="swal-responsable" class="swal2-input" 
                       placeholder="Nombre del responsable" 
                       value="${empresa.responsable_empresa || ''}"
                       title="Nombre de la persona responsable de la empresa">
                
                <div class="form-section">Configuración</div>
                
                <div class="input-label">Estado de la Empresa</div>
                <select id="swal-status" class="swal2-select"
                        title="Estado actual de la empresa">
                    <option value="true" ${empresa.status_empresa === true ? 'selected' : ''}>ACTIVA</option>
                    <option value="false" ${empresa.status_empresa === false ? 'selected' : ''}>DESACTIVADA</option>
                </select>
                
                <div class="input-label">Tipo de Licencia</div>
                <select id="swal-tipo-licencia" class="swal2-select"
                        title="Nivel de licencia contratada">
                    <option value="basic" ${empresa.tipo_licencia === 'basic' ? 'selected' : ''}>Basic</option>
                    <option value="standard" ${empresa.tipo_licencia === 'standard' ? 'selected' : ''}>Standard</option>
                    <option value="prime" ${empresa.tipo_licencia === 'prime' ? 'selected' : ''}>Prime</option>
                </select>
                
                <div class="input-label">Tipo de Contrato</div>
                <select id="swal-tipo-contrato" class="swal2-select"
                        title="Periodicidad del contrato">
                    <option value="mensual" ${empresa.tipo_contrato === 'mensual' ? 'selected' : ''}>Mensual</option>
                    <option value="anual" ${empresa.tipo_contrato === 'anual' ? 'selected' : ''}>Anual</option>
                </select>
                
                <div class="form-section">Fechas</div>
                
                <div class="input-label">Fecha de Alta</div>
                <input type="date" id="swal-fecha-alta" class="swal2-input"
                       value="${formatearFecha(empresa.fecha_alta)}"
                       title="Fecha de inicio del contrato">
                
                <div class="input-label">Fecha de Expiración</div>
                <input type="date" id="swal-fecha-expiracion" class="swal2-input"
                       value="${formatearFecha(empresa.fecha_expiracion)}"
                       title="Fecha de finalización del contrato">
            `,
            width: '600px',
            focusConfirm: false,
            preConfirm: () => {
                // Validaciones
                const nombre = document.getElementById('swal-nombre').value.trim();
                const cif = document.getElementById('swal-cif').value.trim();
                
                if (!nombre) {
                    Swal.showValidationMessage('El nombre de la empresa es obligatorio');
                    return false;
                }
                
                if (!cif) {
                    Swal.showValidationMessage('El CIF es obligatorio');
                    return false;
                }

                // Parsear fechas
                const fechaAlta = document.getElementById('swal-fecha-alta').value 
                    ? new Date(document.getElementById('swal-fecha-alta').value) 
                    : null;
                const fechaExpiracion = document.getElementById('swal-fecha-expiracion').value 
                    ? new Date(document.getElementById('swal-fecha-expiracion').value) 
                    : null;

                return {
                    nombre_empresa: nombre,
                    CIF: cif,
                    direccion_empresa: document.getElementById('swal-direccion').value.trim(),
                    telefono_empresa: document.getElementById('swal-telefono').value.trim(),
                    email_empresa: document.getElementById('swal-email').value.trim(),
					responsable_empresa: document.getElementById('swal-responsable').value.trim(),
                    status_empresa: document.getElementById('swal-status').value === 'true',
                    tipo_licencia: document.getElementById('swal-tipo-licencia').value,
                    tipo_contrato: document.getElementById('swal-tipo-contrato').value,
                    fecha_alta: fechaAlta,
                    fecha_expiracion: fechaExpiracion
                };
            },
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar'
        });

        if (formValues) {
            // Preparar objeto para actualizar
            const updateData = {
                ...formValues
            };

            // Convertir fechas a Timestamp solo si existen
            if (formValues.fecha_alta) {
                updateData.fecha_alta = Timestamp.fromDate(formValues.fecha_alta);
            }

            if (formValues.fecha_expiracion) {
                updateData.fecha_expiracion = Timestamp.fromDate(formValues.fecha_expiracion);
            }

            // Actualizar documento
            await updateDoc(doc(db, 'empresas', empresaId), updateData);
            
            // Notificación de éxito
            await Swal.fire({
                icon: 'success',
                title: 'Empresa Actualizada',
                text: `Los datos de ${formValues.nombre_empresa} han sido modificados`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });

            // Recargar lista de empresas
            cargarEmpresas();
        }
    } catch (error) {
        console.error("Error al modificar empresa:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo modificar la empresa',
            footer: error.message
        });
    }
}


window.eliminarEmpresa = async function(empresaId) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, 'empresas', empresaId));
            
            // Notificación de éxito
            Swal.fire({
                icon: 'success',
                title: 'Empresa Eliminada',
                text: 'La empresa ha sido eliminada correctamente',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });

            // Recargar lista de empresas
            cargarEmpresas();
        } catch (error) {
            console.error("Error al eliminar empresa:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar la empresa',
                confirmButtonText: 'Entendido'
            });
        }
    }
}

//////////////////////////////////////////
// Mostrar lista empresas en ROOT - FIN //
/////////////////////////////////////////
/*
window.eliminarEmpresa = async function(id) {
    try {
        await deleteDoc(doc(db, 'empresas', id));
        
        // Recargar lista de empresas
        window.cargarEmpresas();

        alert('Empresa eliminada exitosamente');
    } catch (error) {
        console.error("Error al eliminar empresa: ", error);
        alert('No se pudo eliminar la empresa');
    }
}
*/

// Event listener para cargar empresas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM completamente cargado");
    
    // Añadir event listener al formulario de nueva empresa
    const formNuevaEmpresa = document.getElementById('formNuevaEmpresa');
    if (formNuevaEmpresa) {
        formNuevaEmpresa.addEventListener('submit', window.crearNuevaEmpresa);
    }

    // Cargar empresas al iniciar
    if (document.getElementById('empresas-section')) {
        console.log("Sección de empresas encontrada, cargando empresas");
        window.cargarEmpresas();
    }
});

// Resto de funciones globales
window.showSection = function(seccion) {
    document.querySelectorAll('.content-section').forEach(el => {
        el.classList.remove('active-section');
    });

    const seccionSeleccionada = document.getElementById(`${seccion}-section`);
    if (seccionSeleccionada) {
        seccionSeleccionada.classList.add('active-section');
    }
}

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    
    sidebar.classList.toggle('sidebar-hidden');
    content.classList.toggle('content-expanded');
}

////////////////// SECCION USUARIOS /////////////////////
// Función para abrir modal de nuevo usuario
window.abrirModalNuevoUsuario = function() {
    console.log("Abriendo modal nuevo usuario");
    const modalElement = document.getElementById('modalNuevoUsuario');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Cargar empresas en el select
    cargarEmpresasEnSelect();
}

// Función para cargar empresas en el select de usuarios
async function cargarEmpresasEnSelect() {
    try {
        const selectEmpresas = document.getElementById('empresa');
        selectEmpresas.innerHTML = '<option value="">Seleccionar Empresa</option>';

        const empresasRef = collection(db, 'empresas');
        const querySnapshot = await getDocs(empresasRef);

        querySnapshot.forEach((doc) => {
            const empresa = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = empresa.nombre_empresa;
            selectEmpresas.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar empresas en select: ", error);
    }
}

// Función para cargar usuarios
window.cargarUsuarios = async function() {
    try {
        console.log("Iniciando carga de usuarios");

        const usuariosRef = collection(db, 'usuarios');
        const querySnapshot = await getDocs(usuariosRef);
        
        console.log(`Número de usuarios encontrados: ${querySnapshot.size}`);

        const listaUsuarios = document.getElementById('listaUsuarios');
        listaUsuarios.innerHTML = ''; // Limpiar lista actual

        // Actualizar contador de usuarios
        document.getElementById('totalUsuarios').textContent = querySnapshot.size;

        if (querySnapshot.empty) {
            console.log("No hay usuarios en la base de datos");
            listaUsuarios.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No hay usuarios registrados</td>
                </tr>
            `;
            return;
        }

        querySnapshot.forEach((documento) => {
            const usuario = documento.data();
            console.log("Usuario encontrado:", usuario);

            const fila = `
                <tr data-id="${documento.id}">
                    <td>${usuario.nombre || 'Sin nombre'} ${usuario.apellidos || ''}</td>
                    <td>${usuario.email || 'No especificado'}</td>
                    <td>${usuario.empresa || 'Sin empresa'}</td>
                    <td>${usuario.rol || 'Sin rol'}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-success btn-sm" 
                                    onclick="mostrarInformacionUsuario('${usuario.email}')"
                                    title="Mostrar Información">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            <button class="btn btn-warning btn-sm" 
                                    onclick="restablecerUsuario('${usuario.email}')"
                                    title="Restablecer Contraseña">
                                <i class="fas fa-key"></i>
                            </button>
                            <button class="btn btn-info btn-sm" 
                                    onclick="modificarUsuario('${usuario.email}')"
                                    title="Editar Usuario">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" 
                                    onclick="desactivarUsuario('${usuario.email}')"
                                    title="Desactivar Usuario">
                                <i class="fas fa-user-slash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            listaUsuarios.insertAdjacentHTML('beforeend', fila);
        });
    } catch (error) {
        console.error("Error detallado al cargar usuarios: ", error);
        
        const listaUsuarios = document.getElementById('listaUsuarios');
        listaUsuarios.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Error al cargar usuarios: ${error.message}
                </td>
            </tr>
        `;
    }
}

//////////////////////////////////
// CREAR USUARIO - INICIO //
///////////////////////////

window.crearNuevoUsuario = async function(event) {
    event.preventDefault();

        // Crear spinner con texto
        const spinner = Swal.fire({
            title: 'Creando Usuario',
            html: `
                <div class="d-flex justify-content-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                </div>
                <p class="mt-2">Procesando solicitud...</p>
            `,
            showConfirmButton: false,
            allowOutsideClick: false
        });

    // Campos del nuevo modal
    const nombre = document.getElementById('nombre').value;
    const apellidos = document.getElementById('apellidos').value;
    const dni = document.getElementById('dni').value;
    const email = document.getElementById('email').value;
    const empresaId = document.getElementById('empresa').value;
    const rol = document.getElementById('rol').value;

    // Nuevos campos de contacto
    const telefonoPrefijo = document.getElementById('telefonoPrefijo').value;
    const telefonoNumero = document.getElementById('telefonoNumero').value;
    const direccionCalle = document.getElementById('direccionCalle').value;
    const direccionCodigoPostal = document.getElementById('direccionCodigoPostal').value;
    const direccionCiudad = document.getElementById('direccionCiudad').value;
    const direccionProvincia = document.getElementById('direccionProvincia').value;
    const direccionPais = document.getElementById('direccionPais').value;

    // Validaciones adicionales
    if (!telefonoNumero.match(/^[0-9]{9}$/)) {
        await Swal.fire({
            icon: 'error',
            title: 'Error de Validación',
            text: 'El número de teléfono debe tener 9 dígitos',
            confirmButtonText: 'Entendido'
        });
        return;
    }

    try {
        const passwordTemporal = window.generarPasswordTemporal();

        // Obtener el nombre de la empresa
        let nombreEmpresa = 'Sin empresa';
        if (empresaId) {
            try {
                const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
                if (empresaDoc.exists()) {
                    nombreEmpresa = empresaDoc.data().nombre_empresa;
                }
            } catch (empresaError) {
                console.error("Error al obtener nombre de empresa:", empresaError);
            }
        }

        // Preparar objeto de datos completo
        const userData = {
            // Información personal
            nombre,
            apellidos,
            dni,
            email,
            empresa: nombreEmpresa,
            rol,
            password: passwordTemporal,

            // Información de contacto
            telefono: {
                prefijo: telefonoPrefijo,
                numero: telefonoNumero
            },
            direccion: {
                calle: direccionCalle,
                codigoPostal: direccionCodigoPostal,
                ciudad: direccionCiudad,
                provincia: direccionProvincia,
                pais: direccionPais
            }
        };

        // Llamar a la Cloud Function
        const createUserFunction = httpsCallable(functions, 'createUser');
        const result = await createUserFunction(userData);

        console.log("Respuesta de createUser:", result);

        if (result.data && result.data.success) {
            // Notificación amigable con SweetAlert2
            await Swal.fire({
                icon: 'success',
                title: '✅ Usuario Creado',
                html: `
                    <p>El usuario <strong>${nombre} ${apellidos}</strong> ha sido creado exitosamente.</p>
                    <p>📧 <strong>Email:</strong> ${email}</p>
                    <p>🏢 <strong>Empresa:</strong> ${nombreEmpresa}</p>
                    <p>📱 <strong>Teléfono:</strong> ${telefonoPrefijo} ${telefonoNumero}</p>
                    <p>🔑 <strong>Contraseña Temporal:</strong> <code>${result.data.passwordTemporal}</code></p>
                    <p>✅ Pídele que cambie su contraseña al iniciar sesión.</p>
                `,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#3085d6'
            });

            // Cerrar modal
            const modalElement = document.getElementById('modalNuevoUsuario');
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();

            // Limpiar formulario
            event.target.reset();

            // Recargar usuarios
            window.cargarUsuarios();
        } else {
            throw new Error(result.data.message || "Error desconocido al crear el usuario.");
        }

    } catch (error) {
        console.error("❌ Error al crear usuario:", error);
        await Swal.fire({
            icon: 'error',
            title: 'Error al Crear Usuario',
            text: error.message,
            confirmButtonText: 'Cerrar'
        });
    }
};



// Función para generar una contraseña temporal segura
window.generarPasswordTemporal = function() {
    const longitud = 12;
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let password = '';
    
    // Asegurar al menos un carácter de cada tipo
    const mayuscula = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const minuscula = 'abcdefghijklmnopqrstuvwxyz';
    const numero = '0123456789';
    const especial = '!@#$%^&*()_+';
    
    password += mayuscula[Math.floor(Math.random() * mayuscula.length)];
    password += minuscula[Math.floor(Math.random() * minuscula.length)];
    password += numero[Math.floor(Math.random() * numero.length)];
    password += especial[Math.floor(Math.random() * especial.length)];
    
    // Rellenar el resto de la contraseña
    for (let i = password.length; i < longitud; i++) {
        password += caracteres[Math.floor(Math.random() * caracteres.length)];
    }
    
    // Mezclar la contraseña
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// En la función de crear usuario, cambia a:
//const passwordTemporal = window.generarPasswordTemporal();


// Funciones de acciones de usuario
// Funciones de acciones de usuario

////////////////////////////////////////////////////
//Mostrar Información Usurio en Modal - Root   /////
////////////////////////////////////////////////////

window.mostrarInformacionUsuario = async function(email) {
    try {
        // 1. Verificar permisos (solo admin o root)
        const userActual = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
        const datosUsuarioActual = userDoc.data();
        
        if (datosUsuarioActual.rol !== 'root' && datosUsuarioActual.rol !== 'admin') {
            throw new Error('No tienes permisos para ver información de usuarios');
        }

        // 2. Buscar datos del usuario
        const usuarioQuery = await getDocs(
            query(collection(db, 'usuarios'), where('email', '==', email))
        );

        if (usuarioQuery.empty) {
            throw new Error('Usuario no encontrado');
        }

        const usuarioDoc = usuarioQuery.docs[0];
        const usuarioData = usuarioDoc.data();

        // 3. Preparar HTML para mostrar información
        const formatearFecha = (fecha) => {
            if (!fecha) return 'No disponible';
            return fecha.toDate ? fecha.toDate().toLocaleString() : 'Formato inválido';
        };

        await Swal.fire({
            title: `Información de Usuario: ${usuarioData.nombre} ${usuarioData.apellidos}`,
            html: `
                <style>
                    .user-info-modal {
                        text-align: left;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        padding: 20px;
                    }
                    .info-section {
                        border-bottom: 1px solid #e0e0e0;
                        padding-bottom: 10px;
                        margin-bottom: 10px;
                    }
                    .info-label {
                        font-weight: bold;
                        color: #3085d6;
                        margin-right: 10px;
                    }
                </style>
                <div class="user-info-modal">
                    <div>
                        <h4 class="info-section">Información Personal</h4>
                        <p><span class="info-label">Nombre:</span> ${usuarioData.nombre || 'No disponible'}</p>
                        <p><span class="info-label">Apellidos:</span> ${usuarioData.apellidos || 'No disponible'}</p>
                        <p><span class="info-label">Email:</span> ${usuarioData.email || 'No disponible'}</p>
                        <p><span class="info-label">DNI:</span> ${usuarioData.dni || 'No disponible'}</p>
                        <p><span class="info-label">Rol:</span> ${usuarioData.rol || 'No disponible'}</p>
                        <p><span class="info-label">Estado:</span> ${usuarioData.estado || 'No disponible'}</p>
                    </div>
                    
                    <div>
                        <h4 class="info-section">Información de Contacto</h4>
                        <p><span class="info-label">Teléfono:</span> 
                            ${usuarioData.contactoPersonal?.telefono?.prefijo || ''} 
                            ${usuarioData.contactoPersonal?.telefono?.numero || 'No disponible'}
                        </p>
                        <p><span class="info-label">Dirección:</span> 
                            ${usuarioData.contactoPersonal?.direccion?.calle || 'No disponible'}
                        </p>
                        <p><span class="info-label">Código Postal:</span> 
                            ${usuarioData.contactoPersonal?.direccion?.codigoPostal || 'No disponible'}
                        </p>
                        <p><span class="info-label">Ciudad:</span> 
                            ${usuarioData.contactoPersonal?.direccion?.ciudad || 'No disponible'}
                        </p>
                        <p><span class="info-label">Provincia:</span> 
                            ${usuarioData.contactoPersonal?.direccion?.provincia || 'No disponible'}
                        </p>
                        <p><span class="info-label">País:</span> 
                            ${usuarioData.contactoPersonal?.direccion?.pais || 'No disponible'}
                        </p>
                    </div>
                    
                    <div style="grid-column: 1 / 3;">
                        <h4 class="info-section">Información del Sistema</h4>
                        <p><span class="info-label">Fecha de Registro:</span> 
                            ${formatearFecha(usuarioData.fechaRegistro)}
                        </p>
                        <p><span class="info-label">Empresa:</span> 
                            ${usuarioData.empresa || 'No disponible'}
                        </p>
                    </div>
                </div>
            `,
            width: '800px',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#3085d6'
        });

    } catch (error) {
        console.error("Error al mostrar información de usuario:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonText: 'Entendido'
        });
    }
};

/////////////////////////////////
// Restablecer usuario - ROOT //
////////////////////////////////

window.restablecerUsuario = function(email) {
     
        if (email) {
          Swal.fire({
            title: `¿Deseas cambiar tu contraseña de ${email}?`,
            text: `Se enviará un correo de restablecimiento a ${email}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar correo',
            cancelButtonText: 'Cancelar'
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                await sendPasswordResetEmail(auth, email);
                Swal.fire({
                  icon: 'success',
                  title: 'Correo enviado',
                  text: `Se ha enviado un correo al usuario ${email}.`,
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 3000
                });
              } catch (error) {
                console.error("Error al enviar el correo:", error);
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'No se pudo enviar el correo. Inténtalo más tarde.',
                  confirmButtonText: 'Entendido'
                });
              }
            }
          });
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Usuario no autenticado',
            text: 'Inicia sesión para cambiar tu contraseña.',
            confirmButtonText: 'Iniciar sesión'
          });
        }
      };


/////////////////////////////////////////////////
// Funcion Modificar usuario - Igual que Admin //
/////////////////////////////////////////////////
window.modificarUsuario = async function(email) {
    try {
        console.log("Iniciando modificación de usuario con email:", email);

        const userActual = auth.currentUser;
        console.log("Usuario actual:", userActual);

        const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
        const datosUsuarioActual = userDoc.data();
        
        if (datosUsuarioActual.rol !== 'root' && datosUsuarioActual.rol !== 'admin') {
            throw new Error('No tienes permisos para modificar usuarios');
        }

        const usuarioQuery = await getDocs(query(collection(db, 'usuarios'), where('email', '==', email)));
        console.log("Resultado de la consulta de usuario:", usuarioQuery);

        if (usuarioQuery.empty) {
            throw new Error('Usuario no encontrado');
        }

        const usuarioDoc = usuarioQuery.docs[0];
        const usuarioData = usuarioDoc.data();
        console.log("Datos del usuario a modificar:", usuarioData);

        const { value: formValues } = await Swal.fire({
            title: `Modificar Usuario: ${usuarioData.nombre} ${usuarioData.apellidos}`,
            html: `
                <style>
                    .swal-form {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        text-align: left;
                    }
                    .swal-section-title {
                        grid-column: 1 / 3;
                        font-weight: bold;
                        border-bottom: 2px solid #3085d6;
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                        color: #3085d6;
                    }
                    .swal2-input, .swal2-select {
                        width: 100%;
                        box-sizing: border-box;
                    }
                </style>
                <div class="swal-form">
                    <div class="swal-section-title">Información Personal</div>
                    <div>
                        <label>Nombre</label>
                        <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${usuarioData.nombre || ''}">
                    </div>
                    <div>
                        <label>Apellidos</label>
                        <input id="swal-apellidos" class="swal2-input" placeholder="Apellidos" value="${usuarioData.apellidos || ''}">
                    </div>
                    <div>
                        <label>Rol</label>
                        <select id="swal-rol" class="swal2-select">
                            <option value="usuario" ${usuarioData.rol === 'usuario' ? 'selected' : ''}>Usuario</option>
                            <option value="admin" ${usuarioData.rol === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="root" ${usuarioData.rol === 'root' ? 'selected' : ''}>Root</option>
                        </select>
                    </div>
                    <div>
                        <label>Email</label>
                        <input id="swal-email" class="swal2-input" value="${usuarioData.email}" readonly>
                    </div>

                    <div class="swal-section-title">Información de Contacto</div>
                    <div>
                        <label>Teléfono</label>
                        <div class="input-group">
                            <select id="swal-telefono-prefijo" class="swal2-select" style="max-width: 100px;">
                                <option value="+34" ${usuarioData.contactoPersonal?.telefono?.prefijo === '+34' ? 'selected' : ''}>+34</option>
                                <option value="+351" ${usuarioData.contactoPersonal?.telefono?.prefijo === '+351' ? 'selected' : ''}>+351</option>
                            </select>
                            <input type="tel" id="swal-telefono-numero" class="swal2-input" 
                                   placeholder="Número de teléfono" 
                                   value="${usuarioData.contactoPersonal?.telefono?.numero || ''}" 
                                   pattern="[0-9]{9}">
                        </div>
                    </div>
                    <div>
                        <label>Dirección</label>
                        <input id="swal-direccion-calle" class="swal2-input" 
                               placeholder="Calle y número" 
                               value="${usuarioData.contactoPersonal?.direccion?.calle || ''}">
                    </div>
                    <div class="input-group">
                        <input id="swal-direccion-codigo-postal" class="swal2-input" 
                               placeholder="Código Postal" 
                               value="${usuarioData.contactoPersonal?.direccion?.codigoPostal || ''}" 
                               pattern="[0-9]{5}">
                        <input id="swal-direccion-ciudad" class="swal2-input" 
                               placeholder="Ciudad" 
                               value="${usuarioData.contactoPersonal?.direccion?.ciudad || ''}">
                    </div>
                    <div>
                        <label>Provincia y País</label>
                        <div class="input-group">
                            <input id="swal-direccion-provincia" class="swal2-input" 
                                   placeholder="Provincia" 
                                   value="${usuarioData.contactoPersonal?.direccion?.provincia || ''}">
                            <select id="swal-direccion-pais" class="swal2-select">
                                <option value="España" ${usuarioData.contactoPersonal?.direccion?.pais === 'España' ? 'selected' : ''}>España</option>
                                <option value="Portugal" ${usuarioData.contactoPersonal?.direccion?.pais === 'Portugal' ? 'selected' : ''}>Portugal</option>
                            </select>
                        </div>
                    </div>
                </div>
            `,
            width: '800px',
            background: '#f4f4f4',
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            focusConfirm: false,
            preConfirm: () => {
                const nombre = document.getElementById('swal-nombre').value.trim();
                const apellidos = document.getElementById('swal-apellidos').value.trim();
                const rol = document.getElementById('swal-rol').value;
                
                // Datos de contacto
                const telefonoPrefijo = document.getElementById('swal-telefono-prefijo').value;
                const telefonoNumero = document.getElementById('swal-telefono-numero').value.trim();
                const direccionCalle = document.getElementById('swal-direccion-calle').value.trim();
                const direccionCodigoPostal = document.getElementById('swal-direccion-codigo-postal').value.trim();
                const direccionCiudad = document.getElementById('swal-direccion-ciudad').value.trim();
                const direccionProvincia = document.getElementById('swal-direccion-provincia').value.trim();
                const direccionPais = document.getElementById('swal-direccion-pais').value;

                console.log("Valores del formulario:", {
                    nombre,
                    apellidos,
                    rol,
                    telefonoPrefijo,
                    telefonoNumero,
                    direccionCalle,
                    direccionCodigoPostal,
                    direccionCiudad,
                    direccionProvincia,
                    direccionPais
                });

                // Validaciones
                if (!nombre) {
                    Swal.show
					                    Swal.showValidationMessage('El nombre es obligatorio');
                    return false;
                }

                // Validación de teléfono (opcional)
                if (telefonoNumero && !/^\d{9}$/.test(telefonoNumero)) {
                    Swal.showValidationMessage('Número de teléfono inválido. Debe tener 9 dígitos.');
                    return false;
                }

                // Validación de código postal (opcional)
                if (direccionCodigoPostal && !/^\d{5}$/.test(direccionCodigoPostal)) {
                    Swal.showValidationMessage('Código Postal inválido. Debe tener 5 dígitos.');
                    return false;
                }

                return {
                    nombre,
                    apellidos,
                    rol,
                    contactoPersonal: {
                        telefono: {
                            prefijo: telefonoPrefijo,
                            numero: telefonoNumero,
                            tipo: 'móvil'
                        },
                        direccion: {
                            calle: direccionCalle,
                            codigoPostal: direccionCodigoPostal,
                            ciudad: direccionCiudad,
                            provincia: direccionProvincia,
                            pais: direccionPais
                        }
                    }
                };
            }
        });

        // Verificar si se han proporcionado valores
        console.log("Valores del formulario recibidos:", formValues);

        if (formValues) {
            // Actualizar en Firestore
            const usuarioRef = doc(db, 'usuarios', usuarioDoc.id);
            console.log("Referencia del usuario a actualizar:", usuarioRef);

            await updateDoc(usuarioRef, {
                nombre: formValues.nombre,
                apellidos: formValues.apellidos,
                rol: formValues.rol,
                contactoPersonal: formValues.contactoPersonal,
                fechaUltimaModificacion: serverTimestamp()
            });

            console.log("Usuario actualizado correctamente");

            // Log de modificación
            await addDoc(collection(db, 'logs_modificaciones'), {
                usuarioModificado: email,
                modificadoPor: {
                    uid: userActual.uid,
                    email: userActual.email
                },
                fechaModificacion: serverTimestamp(),
                cambiosRealizados: formValues
            });

            // Notificación de éxito
            await Swal.fire({
                icon: 'success',
                title: 'Usuario Modificado',
                text: `Los datos de ${email} han sido actualizados correctamente`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });

            // Recargar lista de usuarios
            if (typeof cargarUsuarios === 'function') {
                await cargarUsuarios();
            } else {
                console.warn('La función cargarUsuarios no está definida');
            }
        }

    } catch (error) {
        console.error("Error completo al modificar usuario:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Ocurrió un error al modificar el usuario',
            confirmButtonText: 'Entendido'
        });
    }
};

// Añadir al objeto window para poder llamarla globalmente
window.modificarUsuario = modificarUsuario;


/*window.modificarUsuario = function(id) {
    console.log("Modificar usuario: ", id);
    // Implementar lógica de modificación de usuario
    alert('Funcionalidad de modificar usuario pendiente');
}*/

/*window.desactivarUsuario = function(id) {
    console.log("Desactivar usuario: ", id);
    // Implementar lógica de desactivación de usuario
    alert('Funcionalidad de desactivar usuario pendiente');
}*/

// Event listener para cargar usuarios cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Añadir event listener al formulario de nuevo usuario
    const formNuevoUsuario = document.getElementById('formNuevoUsuario');
    if (formNuevoUsuario) {
        formNuevoUsuario.addEventListener('submit', window.crearNuevoUsuario);
    }

    // Cargar usuarios al iniciar
    if (document.getElementById('usuarios-section')) {
        console.log("Sección de usuarios encontrada, cargando usuarios");
        window.cargarUsuarios();
    }


});

/////////// ACCIONES CON BOTONES USUARIO////////////////////////


window.restablecerPassword = async function(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        alert('Se ha enviado un correo para restablecer la contraseña');
    } catch (error) {
        console.error("Error al restablecer contraseña:", error);
        alert('No se pudo restablecer la contraseña');
    }
}



/*window.desactivarUsuario = async function(uid) {
    try {
        // Obtener referencia del usuario en Firestore
        const userDoc = await getDoc(doc(db, 'usuarios', uid));
        const userData = userDoc.data();

        // Actualizar estado en Firestore
        await updateDoc(doc(db, 'usuarios', uid), {
            estado: 'inactivo'
        });

        // En Authentication, puedes actualizar el perfil
        const user = auth.currentUser;
        await updateProfile(user, {
            displayName: `[INACTIVO] ${userData.nombre} ${userData.apellidos}`
        });

        alert('Usuario desactivado exitosamente');
        
        // Recargar lista de usuarios
        window.cargarUsuarios();
    } catch (error) {
        console.error("Error al desactivar usuario:", error);
        alert('No se pudo desactivar el usuario');
    }
}*/

// Función para cargar datos de usuario en modal de modificación
window.cargarDatosModificacion = async function(uid) {
    try {
        // Obtener documento del usuario
        const userDoc = await getDoc(doc(db, 'usuarios', uid));
        const userData = userDoc.data();

        // Llenar campos del modal
        document.getElementById('modificar-nombre').value = userData.nombre;
        document.getElementById('modificar-apellidos').value = userData.apellidos;
        document.getElementById('modificar-email').value = userData.email;
        document.getElementById('modificar-dni').value = userData.dni;
        document.getElementById('modificar-rol').value = userData.rol;
        document.getElementById('modificar-empresa').value = userData.empresa;

        // Mostrar modal
        const modalModificar = new bootstrap.Modal(document.getElementById('modalModificarUsuario'));
        modalModificar.show();

        // Guardar UID para uso posterior
        document.getElementById('modalModificarUsuario').dataset.uid = uid;
    } catch (error) {
        console.error("Error al cargar datos de usuario:", error);
        alert('No se pudieron cargar los datos del usuario');
    }
}

// Función para guardar modificaciones
window.guardarModificacionUsuario = async function() {
    const uid = document.getElementById('modalModificarUsuario').dataset.uid;
    
    try {
        // Recoger datos modificados
        const datosModificados = {
            nombre: document.getElementById('modificar-nombre').value,
            apellidos: document.getElementById('modificar-apellidos').value,
            dni: document.getElementById('modificar-dni').value,
            rol: document.getElementById('modificar-rol').value,
            empresa: document.getElementById('modificar-empresa').value
        };

        // Actualizar en Firestore
        await updateDoc(doc(db, 'usuarios', uid), datosModificados);

        // Actualizar email si es necesario (requiere re-autenticación)
        const nuevoEmail = document.getElementById('modificar-email').value;
        const user = auth.currentUser;
        if (nuevoEmail !== user.email) {
            await updateEmail(user, nuevoEmail);
        }

        // Cerrar modal
        const modalModificar = bootstrap.Modal.getInstance(document.getElementById('modalModificarUsuario'));
        modalModificar.hide();

        // Recargar lista de usuarios
        window.cargarUsuarios();

        alert('Usuario modificado exitosamente');
    } catch (error) {
        console.error("Error al modificar usuario:", error);
        alert('No se pudo modificar el usuario');
    }
}
//import { onAuthStateChanged } from "firebase/auth";
//import { doc, getDoc } from "firebase/firestore";

// Obtener referencia al div de contenido
const content = document.getElementById('content');

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, async (user) => {
    // Ocultar contenido por defecto
    content.style.display = 'none';

    if (user) {
        try {
            // Obtener los datos del usuario desde Firestore
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();

                // Verificar si el rol del usuario es root
                if (userData.rol === "root") {
                    content.style.display = "block";
                    
                    // Usar una notificación más moderna
                    Swal.fire({
                        icon: 'success',
                        title: 'Acceso Concedido',
                        text: 'Bienvenido, usuario root',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                } else {
                    // Redirigir si no es root
                    handleUnauthorizedAccess();
                }
            } else {
                // No se encontraron datos de usuario
                handleUnauthorizedAccess("Usuario no encontrado en la base de datos");
            }
        } catch (error) {
            // Manejar errores de consulta
            console.error("Error al verificar usuario:", error);
            handleUnauthorizedAccess("Error al verificar las credenciales");
        }
    } else {
        // No hay usuario logueado
        handleUnauthorizedAccess();
    }
});

// Función centralizada para manejar accesos no autorizados
function handleUnauthorizedAccess(message = "Acceso denegado") {
    // Usar SweetAlert para notificaciones
    Swal.fire({
        icon: 'error',
        title: 'Acceso Denegado',
        text: message,
        confirmButtonText: 'Entendido'
    }).then(() => {
        // Cerrar sesión (por si acaso)
        signOut(auth).then(() => {
            // Redirigir al login
            window.location.href = "login.html";
        });
    });
}



// Función para cerrar sesión
window.logout = async function() {
    try {
        // Mostrar confirmación antes de cerrar sesión
        const resultado = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Vas a cerrar tu sesión actual",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar'
        });

        // Si confirma el cierre de sesión
        if (resultado.isConfirmed) {
            // Cerrar sesión en Firebase
            await signOut(auth);

            // Notificación de cierre de sesión
            Swal.fire({
                icon: 'success',
                title: 'Sesión cerrada',
                text: 'Has cerrado sesión correctamente',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });

            // Redirigir a la página de login
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    } catch (error) {
        // Manejar cualquier error durante el cierre de sesión
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cerrar la sesión. Intenta de nuevo.',
            confirmButtonText: 'Entendido'
        });
        console.error("Error al cerrar sesión:", error);
    }
}

// Función para desactivar y eliminar usuario de Firestore y Firebase Authentication
window.desactivarUsuario = async function(email) {
    try {
        // Verificar permisos (ROOT o ADMIN)
        const userActual = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
        const datosUsuarioActual = userDoc.data();

        if (datosUsuarioActual.rol !== 'root' && datosUsuarioActual.rol !== 'admin') {
            throw new Error('No tienes permisos para eliminar usuarios');
        }

        // Confirmar eliminación
        const confirmacion = await Swal.fire({
            title: '¿Estás seguro?',
            html: `Vas a eliminar al usuario con email: <strong>${email}</strong>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });


        // Crear spinner con texto
        const spinner = Swal.fire({
            title: 'Eliminando Usuario',
            html: `
                <div class="d-flex justify-content-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                </div>
                <p class="mt-2">Procesando solicitud...</p>
            `,
            showConfirmButton: false,
            allowOutsideClick: false
        });


        if (!confirmacion.isConfirmed) return;

        // Buscar usuario a eliminar en Firestore
        const usuarioQuery = await getDocs(
            query(collection(db, 'usuarios'), where('email', '==', email))
        );

        if (usuarioQuery.empty) {
            throw new Error('Usuario no encontrado en Firestore');
        }

        const usuarioDoc = usuarioQuery.docs[0];
        const usuarioData = usuarioDoc.data();

        // Registrar usuario eliminado en otra colección
        await addDoc(collection(db, 'usuarios_eliminados'), {
            email: usuarioData.email,
            nombre: usuarioData.nombre,
            apellidos: usuarioData.apellidos || '',
            empresaId: usuarioData.empresaId || null,
            eliminadoPor: {
                uid: userActual.uid,
                email: userActual.email,
                rol: datosUsuarioActual.rol
            },
            fechaEliminacion: new Date(),
            datosOriginales: usuarioData
        });

        // Eliminar usuario de Firestore
        try {
            await deleteDoc(usuarioDoc.ref); // Intentar eliminar el documento de Firestore
            console.log(`Usuario ${email} eliminado de Firestore`);
        } catch (error) {
            console.error("Error al eliminar usuario de Firestore:", error);
            throw new Error('Error al eliminar usuario de Firestore');
        }

        // Llamar a la función de Cloud Functions para eliminar de Authentication
        const deleteUserFunction = httpsCallable(functions, 'deleteUser');
        await deleteUserFunction({ email });

        // Notificación de éxito
        await Swal.fire({
            icon: 'success',
            title: 'Usuario Eliminado',
            html: `
                <p>El usuario <strong>${usuarioData.nombre} ${usuarioData.apellidos || ''}</strong> ha sido eliminado de Firestore y Firebase Authentication.</p>
            `,
            confirmButtonText: 'Entendido'
        });

        // Recargar lista de usuarios
        await cargarUsuarios();

    } catch (error) {
        console.error("Error al eliminar usuario:", error);

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonText: 'Entendido'
        });
    }
};
////////////////////////////////////////////
// FUNCION ESCONDER EL BOTON EL MOVILES ////
////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    
    // Función para alternar sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('active');
    }

    // Añadir event listener al botón
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Cerrar sidebar al hacer clic fuera o en un elemento del menú
    document.addEventListener('click', (event) => {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggle = sidebarToggle.contains(event.target);

        if (sidebar.classList.contains('active') && 
            !isClickInsideSidebar && 
            !isClickOnToggle) {
            sidebar.classList.remove('active');
        }
    });

    // Cerrar sidebar al seleccionar una opción
    const sidebarMenuItems = document.querySelectorAll('.sidebar-menu li');
    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Cerrar sidebar solo en modo móvil
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    });
});
//////////////////////////////////////////////////////
// FUNCION REDIMENSIONAR TABLA EMPRESAS EN MOVILES //
////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
    function transformEmpresasTableForMobile() {
        console.log('Transforming empresas table, window width:', window.innerWidth);
        
        const table = document.getElementById('empresasTable');
        const mobileList = document.getElementById('mobileEmpresasList');

        // Validar que los elementos existan
        if (!table || !mobileList) {
            console.error('Empresas Table or mobile list not found');
            return;
        }

        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Ocultar tabla
            table.style.display = 'none';
            
            // Limpiar lista móvil anterior
            mobileList.innerHTML = '';

            // Obtener filas de la tabla
            const rows = table.querySelectorAll('tbody tr');
            
            // Verificar si hay filas
            if (rows.length === 0) {
                console.warn('No rows found in the empresas table');
                return;
            }

            // Iterar sobre las filas
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                
                // Verificar que haya suficientes celdas
                if (cells.length < 9) {
                    console.warn(`Row ${index} does not have enough cells`);
                    return;
                }

                const empresaCard = document.createElement('div');
                empresaCard.classList.add('empresa-card');

                empresaCard.innerHTML = `
                    <div class="empresa-card-content">
                        <h3>${cells[0].textContent}</h3>
                        <p><strong>CIF:</strong> ${cells[1].textContent}</p>
                        <p><strong>Email:</strong> ${cells[2].textContent}</p>
                        <p><strong>Responsable:</strong> ${cells[3].textContent}</p>
                        <p><strong>Contrato:</strong> ${cells[4].textContent}</p>
                        <p><strong>Licencia:</strong> ${cells[5].textContent}</p>
                        <p><strong>Fecha de Alta:</strong> ${cells[6].textContent}</p>
                        <p><strong>Fecha de Expiración:</strong> ${cells[7].textContent}</p>
                        <div class="empresa-card-actions">
                            ${cells[8].innerHTML}
                        </div>
                    </div>
                `;

                mobileList.appendChild(empresaCard);
            });

            // Mostrar lista móvil
            mobileList.style.display = 'block';
        } else {
            // Mostrar tabla en modo escritorio
            table.style.display = 'table';
            mobileList.style.display = 'none';
        }
    }

    // Función para ejecutar la transformación de forma inmediata
    function initializeEmpresasTableTransform() {
        // Ejecutar transformación
        transformEmpresasTableForMobile();
        
        // Añadir un pequeño retraso para asegurar que el contenido esté completamente cargado
        setTimeout(transformEmpresasTableForMobile, 100);
    }

    // Eventos para transformación
    window.addEventListener('load', initializeEmpresasTableTransform);
    window.addEventListener('resize', transformEmpresasTableForMobile);

    // Observador de mutaciones para detectar cambios en la tabla
    const table = document.getElementById('empresasTable');
    if (table) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    transformEmpresasTableForMobile();
                }
            });
        });

        // Configurar observador en el tbody
        observer.observe(table.querySelector('tbody'), {
            childList: true,
            subtree: true
        });
    }
});
//////////////////////////////////////////////////////
// FUNCION REDIMENSIONAR TABLA USUARIOS EN MOVILES //
////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
    function transformTableForMobile() {
        console.log('Transforming table, window width:', window.innerWidth);
        
        const table = document.getElementById('usuariosTable');
        const mobileList = document.getElementById('mobileUserList');

        // Validar que los elementos existan
        if (!table || !mobileList) {
            console.error('Table or mobile list not found');
            return;
        }

        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Ocultar tabla
            table.style.display = 'none';
            
            // Limpiar lista móvil anterior
            mobileList.innerHTML = '';

            // Obtener filas de la tabla
            const rows = table.querySelectorAll('tbody tr');
            
            // Verificar si hay filas
            if (rows.length === 0) {
                console.warn('No rows found in the table');
                return;
            }

            // Iterar sobre las filas
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                
                // Verificar que haya suficientes celdas
                if (cells.length < 5) {
                    console.warn(`Row ${index} does not have enough cells`);
                    return;
                }

                const userCard = document.createElement('div');
                userCard.classList.add('user-card');

                userCard.innerHTML = `
                    <div class="user-card-content">
                        <h3>${cells[0].textContent}</h3>
                        <p><strong>Email:</strong> ${cells[1].textContent}</p>
                        <p><strong>Empresa:</strong> ${cells[2].textContent}</p>
                        <p><strong>Rol:</strong> ${cells[3].textContent}</p>
                        <div class="user-card-actions">
                            ${cells[4].innerHTML}
                        </div>
                    </div>
                `;

                mobileList.appendChild(userCard);
            });

            // Mostrar lista móvil
            mobileList.style.display = 'block';
        } else {
            // Mostrar tabla en modo escritorio
            table.style.display = 'table';
            mobileList.style.display = 'none';
        }
    }

    // Función para ejecutar la transformación de forma inmediata
    function initializeTableTransform() {
        // Ejecutar transformación
        transformTableForMobile();
        
        // Añadir un pequeño retraso para asegurar que el contenido esté completamente cargado
        setTimeout(transformTableForMobile, 100);
    }

    // Eventos para transformación
    window.addEventListener('load', initializeTableTransform);
    window.addEventListener('resize', transformTableForMobile);

    // Observador de mutaciones para detectar cambios en la tabla
    const table = document.getElementById('usuariosTable');
    if (table) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    transformTableForMobile();
                }
            });
        });

        // Configurar observador en el tbody
        observer.observe(table.querySelector('tbody'), {
            childList: true,
            subtree: true
        });
    }
});

//////////////////////////
// Imprimir Generico ////
////////////////////////
window.imprimirDivGenerico = imprimirDivGenerico;
///
function imprimirDivGenerico(boton) {
    // Buscar el div contenedor más cercano al botón
    let divContenedor = boton.closest('div.table-responsive');

    if (!divContenedor) {
        alert("No se encontró el contenido a imprimir.");
        return;
    }

    // Obtener el contenido del div
    let contenido = divContenedor.innerHTML;

    // Ruta del logo (puedes poner la URL de tu logo o usar un archivo local)
    let logoUrl = 'images/logo.png'; // Cambia esto por la ruta de tu logo

    // Crear una nueva ventana emergente para imprimir
    let ventanaImpresion = window.open('', '', 'width=800,height=600');

    // Escribir el contenido en la nueva ventana
    ventanaImpresion.document.write(`
        <html>
        <head>
            <title>Impresión</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header img { max-width: 150px; }
                .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                th, td { border: 1px solid black; padding: 10px; text-align: left; }
                th { background-color: #f2f2f2; }
                .acciones { display: none; } /* Ocultar los botones al imprimir */
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="${logoUrl}" alt="Logo de la Empresa">
                <h2>InOutTime</h2>
                <p>Simplicidad que impulsa tu negocio</p>
            </div>

            ${contenido}

            <div class="footer">
                <p>Este documento ha sido generado por InOutTime.</p>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                }
            </script>
        </body>
        </html>
    `);

    // Cerrar la escritura del documento
    ventanaImpresion.document.close();
}


/////////////////////////////
// Exportar a PDF ///////////
///////////////////////////
window.descargarDivComoPDF = descargarDivComoPDF;
// Exportar a PDF
async function descargarDivComoPDF(boton) {
    // Cargar librerías dinámicamente si no están disponibles
    async function cargarScript(url) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${url}"]`)) {
                resolve();
                return;
            }
            let script = document.createElement("script");
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Cargar las librerías si no están ya cargadas
    await cargarScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await cargarScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");

    // Verificar que las librerías están disponibles
    if (!window.jspdf || !window.html2canvas) {
        alert("Error al cargar las librerías para generar el PDF.");
        return;
    }

    let divContenedor = boton.closest('div.table-responsive');
    if (!divContenedor) {
        alert("No se encontró el contenido a descargar.");
        return;
    }

    let nombreArchivo = "InOutTime_reporte.pdf";

    // Convertir el div a una imagen
    html2canvas(divContenedor, { scale: 2 }).then(canvas => {
        let imgData = canvas.toDataURL("image/png");
        let pdf = new jspdf.jsPDF("p", "mm", "a4");
        let imgWidth = 210; // Ancho de A4 en mm
        let pageHeight = 297; // Alto de A4 en mm
        let imgHeight = (canvas.height * imgWidth) / canvas.width; // Ajustar la altura proporcionalmente

        let yPos = 10; // Posición inicial en la página

        // Si la imagen es más alta que una página, dividir en varias páginas
        if (imgHeight > pageHeight) {
            let totalPages = Math.ceil(imgHeight / pageHeight);

            for (let i = 0; i < totalPages; i++) {
                let cropCanvas = document.createElement("canvas");
                let cropContext = cropCanvas.getContext("2d");
                cropCanvas.width = canvas.width;
                cropCanvas.height = (canvas.height / totalPages);

                cropContext.drawImage(canvas, 0, -(i * cropCanvas.height), canvas.width, canvas.height);
                
                let croppedImage = cropCanvas.toDataURL("image/png");
                
                if (i > 0) pdf.addPage(); // Agregar nueva página después de la primera
                pdf.addImage(croppedImage, "PNG", 0, yPos, imgWidth, pageHeight);
            }
        } else {
            pdf.addImage(imgData, "PNG", 0, yPos, imgWidth, imgHeight);
        }

        pdf.save(nombreArchivo);
    });
}

///////////////////////
// Seccion INFORMES //
//////////////////////

// Función para cargar empresas en el select
async function cargarEmpresasCombo() {
    try {
        const selectEmpresas = document.getElementById('selectEmpresa'); // Cambia el ID aquí
        selectEmpresas.innerHTML = '<option value="">Seleccionar Empresa</option>';

        const empresasRef = collection(db, 'empresas');
        const querySnapshot = await getDocs(empresasRef);

        querySnapshot.forEach((doc) => {
            const empresa = doc.data();
            const option = document.createElement('option');
            option.value = empresa.nombre_empresa;
            option.textContent = empresa.nombre_empresa; // Asegúrate de que el campo en Firestore se llama así
            selectEmpresas.appendChild(option);
        });

        console.log('Empresas cargadas en selectEmpresa');
    } catch (error) {
        console.error("Error al cargar empresas en selectEmpresa: ", error);
    }
}
// Llamada para cargar información en INFORMES - Resumen asistencia
async function cargarResumenAsistencia() {
    const mesSeleccionado = document.getElementById('selectMestotal').value;
    const empresaId = document.getElementById('selectEmpresa').value; // Ya es el ID de la empresa
    const listaAsistencia = document.getElementById('listaTodosAsistencia').getElementsByTagName('tbody')[0];
    const listaRegistros = document.getElementById('listaTodosRegistros').getElementsByTagName('tbody')[0]; //Limpia la tabla Mostrar detalles
    const totalRegistros = document.getElementById('totalRegistros'); // Limpia el valor de abajo.

    console.log("Mes seleccionado:", mesSeleccionado);
    console.log("ID de Empresa seleccionada:", empresaId);

    // Validar selección de mes
    if (mesSeleccionado === "" || isNaN(mesSeleccionado) || mesSeleccionado < 0 || mesSeleccionado > 11) {
        Swal.fire({
            icon: 'warning',
            title: 'Selecciona un mes',
            text: 'Por favor, elige un mes para generar el resumen de asistencia',
            confirmButtonText: 'Entendido'
        });
        return;
    }

    // Limpiar tabla
    listaAsistencia.innerHTML = '';

    // Limpiar tabla Totales
    listaRegistros.innerHTML = '';
    totalRegistros.textContent = '0';

    try {
        // Consultar todos los usuarios de la empresa
        const usuariosRef = collection(db, 'usuarios');
        const qUsuarios = query(usuariosRef, where('empresa', '==', empresaId));
        const usuariosSnapshot = await getDocs(qUsuarios);

        // Verificar si hay empleados
        if (usuariosSnapshot.empty) {
            console.log("No hay empleados registrados en la empresa");
            listaAsistencia.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">No hay empleados registrados en la empresa</td>
                </tr>
            `;
            return;
        }

        // Procesar cada usuario
        const resumenPromises = usuariosSnapshot.docs.map(async (usuarioDoc) => {
            const usuario = usuarioDoc.data();
            const usuarioId = usuarioDoc.id;

            // Consultar registros de este usuario
            const registrosRef = collection(db, 'registros');
            const qRegistros = query(
                registrosRef,
                where('userId', '==', usuarioId),
                where('fecha', '>=', new Date(new Date().getFullYear(), mesSeleccionado, 1)),
                where('fecha', '<=', new Date(new Date().getFullYear(), mesSeleccionado + 1, 0))
            );

            const registrosSnapshot = await getDocs(qRegistros);

            // Calcular total de horas y días trabajados
            let totalHoras = 0;
            const diasTrabajados = new Set();

            const registros = registrosSnapshot.docs.map(doc => doc.data());

            registros.forEach(registroDoc => {
                const fecha = registroDoc.fecha.toDate();
                diasTrabajados.add(fecha.toLocaleDateString());
            });

            totalHoras = calcularHorasTrabajadas(registros);

            return {
                email: usuario.email,
                diasTrabajados: diasTrabajados.size,
                totalHoras: totalHoras,
                nombre: usuario.nombre
            };
        });

        // Esperar a que se procesen todos los usuarios
        const resumen = await Promise.all(resumenPromises);

        // Renderizar resumen
        resumen.forEach(item => {
            const horasFormateadas = typeof item.totalHoras === 'string' ? item.totalHoras : item.totalHoras.toFixed(2) + ' hrs';
            const fila = `
                <tr>
                    <td>${new Date(new Date().getFullYear(), mesSeleccionado).toLocaleString('default', { month: 'long' })}</td>
                    <td>${item.nombre}</td>
                    <td>${item.email}</td>
                    <td>${item.diasTrabajados}</td>
                    <td>${horasFormateadas}</td>
                </tr>
            `;
            listaAsistencia.insertAdjacentHTML('beforeend', fila);
        });

    } catch (error) {
        console.error('Error al generar resumen de asistencia:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el resumen de asistencia'
        });
    }
}

// Evento para cargar el resumen cuando cambian el mes o la empresa
document.getElementById('selectMestotal').addEventListener('change', cargarResumenAsistencia);
document.getElementById('selectEmpresa').addEventListener('change', cargarResumenAsistencia);




// Cargar empresas cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    cargarEmpresasCombo();
});


// Función para calcular horas trabajadas a partir de registros de un día
function calcularHorasTrabajadas(registros) {
    let horasTrabajadas = 0;
    let horaEntrada = null;

    // Ordenar registros por fecha ascendente
    registros.sort((a, b) => a.fecha?.toDate() - b.fecha?.toDate());

    registros.forEach((registro) => {
        const fechaRegistro = registro.fecha?.toDate();

        if (registro.accion_registro === 'entrada') {
            horaEntrada = fechaRegistro;
        } else if (registro.accion_registro === 'salida' && horaEntrada) {
            const horaSalida = fechaRegistro;
            horasTrabajadas += (horaSalida - horaEntrada) / (1000 * 60 * 60); // Diferencia en horas
            horaEntrada = null; // Reiniciar para la siguiente entrada
        }
    });

    return horasTrabajadas > 0 ? horasTrabajadas.toFixed(2) + ' hrs' : 'N/A';
}

// Función para agrupar registros por día
function agruparRegistrosPorDia(querySnapshot) {
    const registrosPorDia = {};

    querySnapshot.forEach((doc) => {
        const registro = { ...doc.data(), id: doc.id };
        const fecha = registro.fecha?.toDate();
        const dia = fecha?.toLocaleDateString('es-ES');

        if (!registrosPorDia[dia]) {
            registrosPorDia[dia] = [];
        }
        registrosPorDia[dia].push(registro);
    });

    return registrosPorDia;
}

// Llamada Global - Cargar Registros de todos los usuarios
window.cargarRegistrosTotales = cargarRegistrosTotales;
// Cargar Registros de todos los usuarios.
async function cargarRegistrosTotales() {
    const mesSeleccionado = document.getElementById('selectMestotal').value;
    const listaRegistros = document.getElementById('listaTodosRegistros').getElementsByTagName('tbody')[0];
    const totalRegistros = document.getElementById('totalRegistros');
    const empresaId = document.getElementById('selectEmpresa').value; 

        // Validar que se haya seleccionado un mes (no vacío y es un número entre 0 y 11)
        if (mesSeleccionado === "") {
            Swal.fire({
                icon: 'warning',
                title: 'Selecciona un mes',
                text: 'Por favor, elige un mes para generar el resumen de asistencia',
                confirmButtonText: 'Entendido'
            });
            return;
        }

    // Limpiar tabla
    listaRegistros.innerHTML = '';
    totalRegistros.textContent = '0';

    try {
        // Obtener el ID de la empresa del usuario actual
        //const empresaId = await obtenerEmpresaId();
        if (!empresaId) {
            console.error('No se pudo obtener el ID de la empresa');
            return;
        }

        // Consultar todos los usuarios de la misma empresa
        const usuariosRef = collection(db, 'usuarios');
        const qUsuarios = query(usuariosRef, where('empresa', '==', empresaId));
        const usuariosSnapshot = await getDocs(qUsuarios);

        // Verificar si hay empleados
        if (usuariosSnapshot.empty) {
            console.log("No hay empleados registrados en la empresa");
            listaRegistros.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No hay empleados registrados en la empresa</td>
                </tr>
            `;
            return;
        }

        // Crear un array para almacenar los registros de todos los empleados
        const todosLosRegistros = [];

        // Cargar registros de cada empleado
        for (const usuarioDoc of usuariosSnapshot.docs) {
            const usuarioId = usuarioDoc.id;

            // Consultar registros de este usuario
            const registrosRef = collection(db, 'registros');
            const qRegistros = query(
                registrosRef,
                where('userId', '==', usuarioId),
                orderBy('fecha', 'desc') // Orden descendente por fecha
            );

            const registrosSnapshot = await getDocs(qRegistros);

            // Filtrar registros por mes si se ha seleccionado un mes
            let registrosFiltrados = registrosSnapshot.docs;
            if (mesSeleccionado !== "") {
                registrosFiltrados = registrosSnapshot.docs.filter(doc => {
                    const fecha = doc.data().fecha?.toDate();
                    return fecha && fecha.getMonth() == mesSeleccionado; // Filtrar por mes
                });
            }

            // Agregar los registros filtrados al array
            todosLosRegistros.push(...registrosFiltrados);
        }

        // Actualizar total de registros
        totalRegistros.textContent = todosLosRegistros.length;

        if (todosLosRegistros.length === 0) {
            listaRegistros.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No hay registros para los empleados en este mes</td>
                </tr>
            `;
            return;
        }

        // Procesar registros y agrupar por días
        const registrosPorDia = agruparRegistrosPorDia(todosLosRegistros);

        // Renderizar tabla
        Object.keys(registrosPorDia).forEach((dia) => {
            const registros = registrosPorDia[dia];
            const horasTrabajadas = calcularHorasTrabajadas(registros);

            registros.forEach((registro, index) => {
                const fecha = registro.fecha?.toDate();
                const hora = fecha ? fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'; // Formato de hora
                const fila = `
                    <tr data-id="${registro.id}">
                        <td>${index === 0 ? dia : ''}</td>
                        <td>${registro.email || 'N/A'}</td>
                        <td>${hora}</td>
                        <td>${registro.accion_registro || 'N/A'}</td>
                        <td>${registro.comentario || 'Sin Comentarios'}</td>                   
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-info" onclick="agregarComentario('${registro.id}')">
                                    <i class="fas fa-comment"></i>
                                </button>
                                <button class="btn btn-sm btn-warning" onclick="editarRegistro('${registro.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="eliminarRegistro('${registro.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                listaRegistros.insertAdjacentHTML('beforeend', fila);
            });
        });
    } catch (error) {
        console.error('Error al cargar registros:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los registros'
        });
    }
}
