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
            fecha_expiracion: fechaExpiracion
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
                    <td colspan="6" class="text-center">No hay empresas registradas</td>
                </tr>
            `;
            return;
        }

        querySnapshot.forEach((documento) => {
            const empresa = documento.data();
            console.log("Empresa encontrada:", empresa);

            const fila = `
                <tr data-id="${documento.id}">
                    <td>${empresa.nombre_empresa || 'Sin nombre'}</td>
                    <td>${empresa.CIF || 'Sin CIF'}</td>
                    <td>${empresa.email_empresa || 'No especificada'}</td>
                    <td>${empresa.responsable_empresa || 'No especificada'}</td>
                    <td>${empresa.status_empresa ? 'ACTIVA' : 'DESACTIVADA'}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="eliminarEmpresa('${documento.id}')">
                            Eliminar
                        </button>
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
                <td colspan="6" class="text-center text-danger">
                    Error al cargar empresas: ${error.message}
                </td>
            </tr>
        `;
    }
}

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

// Función para crear nuevo usuario 
// Función para crear nuevo usuario FUNCIONA
/*
window.crearNuevoUsuario = async function(event) {
    event.preventDefault();

    // Obtener valores del formulario
    const nombre = document.getElementById('nombre').value;
    const apellidos = document.getElementById('apellidos').value;
    const dni = document.getElementById('dni').value;
    const email = document.getElementById('email').value;
    const empresaId = document.getElementById('empresa').value;
    const rol = document.getElementById('rol').value;

    try {
        // Generar una contraseña temporal segura
        const passwordTemporal = window.generarPasswordTemporal();

        // Crear usuario sin cambiar el contexto actual
        const userCredential = await createUserWithEmailAndPassword(auth, email, passwordTemporal);
        const user = userCredential.user;

        console.log("Usuario creado en Authentication:", user.uid);

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

        // Guardar información adicional en Firestore
        await setDoc(doc(db, 'usuarios', user.uid), {
            nombre: nombre,
            apellidos: apellidos,
            dni: dni,
            email: email,
            empresa: nombreEmpresa,
            rol: rol,
            uid: user.uid,
            fechaRegistro: new Date(),
            estado: 'activo'
        });

        // Mostrar mensaje con contraseña temporal
        alert(`Usuario creado exitosamente. 
Contraseña temporal: ${passwordTemporal}
Por favor, indique al usuario que cambie su contraseña al iniciar sesión por primera vez.`);

        // Cerrar modal
        const modalElement = document.getElementById('modalNuevoUsuario');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();

        // Limpiar formulario
        event.target.reset();

        // Recargar lista de usuarios
        window.cargarUsuarios();

    } catch (error) {
        console.error("Error completo al crear usuario: ", error);
        alert("No se pudo crear el usuario: " + error.message);
    }
};
*/
window.crearNuevoUsuario = async function(event) {
    event.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const apellidos = document.getElementById('apellidos').value;
    const dni = document.getElementById('dni').value;
    const email = document.getElementById('email').value;
    const empresaId = document.getElementById('empresa').value;
    const rol = document.getElementById('rol').value;

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

        // Llamar a la Cloud Function
        const createUserFunction = httpsCallable(functions, 'createUser');
        const result = await createUserFunction({
            nombre,
            apellidos,
            dni,
            email,
            empresa: nombreEmpresa,
            rol,
            password: passwordTemporal
        });

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

///////////////////////////////////////////
// Restablecer usuario - ROOT 
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
