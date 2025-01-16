import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getAuth, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    updateProfile,
    fetchSignInMethodsForEmail, 
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

//Variables

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

                // Verificar si el rol del usuario es admin
                if (userData.rol === "admin") {
                    content.style.display = "block";
                    //empresaGlobal = userData.empresa ;
                    window.empresaGlobal = userData.empresa;

                    // Llamar a la función cargarUsuarios
                    await cargarUsuarios();
                    
                    // Usar una notificación más moderna
                    Swal.fire({
                        icon: 'success',
                        title: 'Acceso Concedido',
                        text: `Bienvenido, usuario admin de ${window.empresaGlobal}`,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                } else {
                    // Redirigir si no es admin
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

////////////////////////
//funcion CargarUsuario
async function cargarUsuarios() {
    try {
        console.log("Iniciando carga de usuarios");

        if (!window.empresaGlobal) {
            throw new Error("Empresa no definida");
        }

        const usuariosRef = collection(db, 'usuarios');
        const q = query(usuariosRef, where('empresa', '==', window.empresaGlobal));
        const querySnapshot = await getDocs(q);  // Asegúrate de usar 'await'

        console.log(`Número de usuarios encontrados en ${window.empresaGlobal}: ${querySnapshot.size}`);

        const listaUsuarios = document.getElementById('listaUsuarios');
        listaUsuarios.innerHTML = ''; // Limpiar lista actual

        // Actualizar contador de usuarios
        document.getElementById('totalUsuarios').textContent = querySnapshot.size;

        if (querySnapshot.empty) {
            listaUsuarios.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No hay usuarios registrados en ${window.empresaGlobal}</td>
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
                            <button class="btn btn-warning btn-sm" onclick="restablecerUsuario('${usuario.email}')">
                                <i class="fas fa-key"></i>
                            </button>
                            <button class="btn btn-info btn-sm" onclick="modificarUsuario('${documento.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="desactivarUsuario('${usuario.email}')">
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

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonText: 'Entendido'
        });
    }
}




//////////////////////////
// CREAR NUEVO USUARIO //
////////////////////////

window.crearNuevoUsuario = async function (event) {
    event.preventDefault();

    // Obtener valores del formulario
    const nombre = document.getElementById("nombre").value;
    const apellidos = document.getElementById("apellidos").value;
    const dni = document.getElementById("dni").value;
    const email = document.getElementById("email").value;
    const rol = document.getElementById("rol").value;

    try {
        // Verificar usuario autenticado
        const userActual = auth.currentUser;
        if (!userActual) {
            throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
        }

        // Obtener datos del usuario autenticado desde Firestore
        const userDoc = await getDoc(doc(db, "usuarios", userActual.uid));
        if (!userDoc.exists()) {
            throw new Error("No se encontraron datos del usuario actual en Firestore.");
        }
        console.log("Datos del usuario autenticado:", userDoc.data());

        // Obtener el ID de la empresa del usuario actual
        const empresaId = userDoc.data().empresa;
        if (!empresaId) {
            throw new Error("El usuario autenticado no tiene asignada una empresa.");
        }
        console.log("ID de la empresa del usuario actual:", empresaId);

        /* Obtener el nombre de la empresa
        let nombreEmpresa = 'Sin empresa';
        try {
            const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
            if (empresaDoc.exists()) {
                nombreEmpresa = empresaDoc.data().nombre_empresa;
            }
        } catch (empresaError) {
            console.error("Error al obtener nombre de empresa:", empresaError);
        }*/

        // Generar contraseña temporal
        const passwordTemporal = window.generarPasswordTemporal();

        // Llamar a la Cloud Function para crear el usuario
        const createUserFunction = httpsCallable(functions, 'createUser');
        const result = await createUserFunction({
            nombre,
            apellidos,
            dni,
            email,
            empresa: empresaId,
            rol,
            password: passwordTemporal
        });

        if (result.data && result.data.success) {
            // Mostrar confirmación con SweetAlert2
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
            const modalElement = document.getElementById("modalNuevoUsuario");
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();

            // Limpiar formulario
            event.target.reset();

            // Recargar lista de usuarios
            await cargarUsuarios();
        } else {
            throw new Error(result.data.message || "Error desconocido al crear el usuario.");
        }
    } catch (error) {
        console.error("Error al crear usuario:", error);
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
const passwordTemporal = window.generarPasswordTemporal();


// Funciones de acciones de usuario
window.restablecerUsuario = function(email) {
    console.log("Restablecer usuario: ", email);
    // Implementar lógica de restablecimiento de contraseña
    alert('Funcionalidad de restablecer contraseña pendiente');
    
}

window.modificarUsuario = function(id) {
    console.log("Modificar usuario: ", id);
    // Implementar lógica de modificación de usuario
    alert('Funcionalidad de modificar usuario pendiente');
}
/*
window.desactivarUsuario = function(id) {
    console.log("Desactivar usuario: ", id);
    // Implementar lógica de desactivación de usuario
    alert('Funcionalidad de desactivar usuario pendiente');
}*/
/*
window.desactivarUsuario = async function(email) {
    try {
        console.log(`Iniciando la eliminación del usuario con email: ${email}`);

        // Confirmar la eliminación
        const resultado = await Swal.fire({
            title: '¿Estás seguro de eliminar este usuario?',
            text: "Esta acción eliminará permanentemente la cuenta del usuario del sistema",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar usuario',
            cancelButtonText: 'Cancelar'
        });

        if (resultado.isConfirmed) {
            console.log('Usuario confirmado para eliminación');

            // Obtener referencia del usuario actual
            const userActual = auth.currentUser;
            console.log(`Usuario actual: ${userActual.email}`);

            // Verificar que el usuario actual sea administrador
            const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
            const datosUsuarioActual = userDoc.data();
            console.log(`Datos del usuario actual: ${JSON.stringify(datosUsuarioActual)}`);

            if (datosUsuarioActual.rol !== 'admin') {
                throw new Error('Solo los administradores pueden eliminar usuarios');
            }

            // Prevenir que un admin se elimine a sí mismo
            if (email === userActual.email) {
                throw new Error('No puedes eliminarte a ti mismo');
            }

            // Obtener los datos del usuario a eliminar usando su correo
            const usuarioEliminarQuery = await getDocs(query(collection(db, 'usuarios'), where('email', '==', email)));
            const usuarioEliminar = usuarioEliminarQuery.docs[0]?.data();
            const usuarioEliminarId = usuarioEliminarQuery.docs[0]?.id;

            if (!usuarioEliminar) {
                console.error('El usuario no se encuentra en Firestore');
                throw new Error('El usuario no se encuentra en Firestore');
            }

            // Buscar el UID del usuario en Authentication
            let usuarioAuthUID = null;
            try {
                const userRecord = await fetchSignInMethodsForEmail(auth, email);
                if (userRecord.length > 0) {
                    // El usuario existe en Authentication
                    console.log(`Usuario encontrado en Authentication: ${userRecord.length}`);
                    usuarioAuthUID = userRecord[0];
                }
            } catch (authError) {
                console.warn('No se pudo encontrar el usuario en Authentication', authError);
            }

            // Eliminar el documento del usuario de Firestore
            await deleteDoc(doc(db, 'usuarios', usuarioEliminarId));
            console.log(`Documento de usuario eliminado de Firestore: ${usuarioEliminarId}`);

            // Notificación de éxito
            await Swal.fire({
                icon: 'success',
                title: 'Usuario Eliminado',
                html: `
                    <p>El usuario <strong>${usuarioEliminar.nombre} ${usuarioEliminar.apellidos}</strong> ha sido eliminado.</p>
                    <p>Email: ${usuarioEliminar.email}</p>
                `,
                confirmButtonText: 'Entendido'
            });

            // Recargar lista de usuarios
            await cargarUsuarios();
            console.log('Lista de usuarios recargada');

        }
    } catch (error) {
        console.error("Error al eliminar usuario:", error);

        let mensajeError = "No se pudo eliminar el usuario";
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || mensajeError,
            confirmButtonText: 'Entendido'
        });
    }
};*/

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





// Función para mostrar usuarios eliminados
window.mostrarUsuariosEliminados = async function() {
    try {
        // Verificar permisos (ROOT o ADMIN)
        const userActual = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
        const datosUsuarioActual = userDoc.data();
        
        if (datosUsuarioActual.rol !== 'root' && datosUsuarioActual.rol !== 'admin') {
            throw new Error('No tienes permisos para ver usuarios eliminados');
        }

        // Obtener usuarios eliminados (últimos 50)
        const usuariosEliminadosQuery = query(
            collection(db, 'usuarios_eliminados'),
            orderBy('fechaEliminacion', 'desc'),
            limit(50)
        );

        const usuariosEliminados = await getDocs(usuariosEliminadosQuery);

        // Renderizar en tabla
        const tablaUsuariosEliminados = document.getElementById('tablaUsuariosEliminados');
        tablaUsuariosEliminados.innerHTML = ''; // Limpiar tabla

        usuariosEliminados.forEach((doc) => {
            const usuario = doc.data();
            const fila = `
                <tr>
                    <td>${usuario.nombre} ${usuario.apellidos}</td>
                    <td>${usuario.email}</td>
                    <td>${usuario.fechaEliminacion.toDate().toLocaleString()}</td>
                    <td>${usuario.eliminadoPor.email} (${usuario.eliminadoPor.rol})</td>
                </tr>
            `;
            tablaUsuariosEliminados.insertAdjacentHTML('beforeend', fila);
        });

    } catch (error) {
        console.error('Error al cargar usuarios eliminados:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonText: 'Entendido'
        });
    }
};



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
        //window.cargarUsuarios();
    }
});

/////////// ACCIONES CON BOTONES USUARIO////////////////////////





/*
window.desactivarUsuario = async function(uid) {
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
        //window.cargarUsuarios();
    } catch (error) {
        console.error("Error al desactivar usuario:", error);
        alert('No se pudo desactivar el usuario');
    }
}
*/
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
        //window.cargarUsuarios();

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



// Función para descargar informe de usuarios
window.descargarInformeUsuarios = async function () {
    try {
        // Mostrar spinner de carga
        Swal.fire({
            title: 'Generando informe...',
            html: 'Por favor, espere',
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Obtener el usuario autenticado
        const user = auth.currentUser;
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No hay un usuario autenticado.'
            });
            return;
        }
  
        // Obtener información del usuario autenticado desde Firestore
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (!userDoc.exists()) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se encontró la información del usuario.'
            });
            return;
        }
  
        const empresaUsuario = userDoc.data().empresa;
  
        // Obtener todos los registros desde Firestore
        const registrosRef = collection(db, "registros");
        const q = query(
            registrosRef,
            where("empresa", "==", empresaUsuario),
            orderBy("fecha", "asc")
        );
        const registrosSnapshot = await getDocs(q);
        
        const registros = registrosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
  
        if (registros.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sin Registros',
                text: 'No hay registros para descargar de tu empresa.'
            });
            return;
        }

        // Agrupar registros por día y por usuario
        const registrosPorDiaYUsuario = {};

        registros.forEach(registro => {
            const fecha = registro.fecha.toDate();
            const fechaFormateada = fecha.toLocaleDateString('es-ES');
            const email = registro.email;

            if (!registrosPorDiaYUsuario[fechaFormateada]) {
                registrosPorDiaYUsuario[fechaFormateada] = {};
            }

            if (!registrosPorDiaYUsuario[fechaFormateada][email]) {
                registrosPorDiaYUsuario[fechaFormateada][email] = {
                    entradas: [],
                    salidas: [],
                    nombre: registro.nombre,
                    empresa: registro.empresa
                };
            }

            if (registro.accion_registro === 'entrada') {
                registrosPorDiaYUsuario[fechaFormateada][email].entradas.push(fecha);
            } else if (registro.accion_registro === 'salida') {
                registrosPorDiaYUsuario[fechaFormateada][email].salidas.push(fecha);
            }
        });

        // Preparar contenido CSV
        const encabezados = [
            "Fecha",
            "Email",
            "Nombre",
            "Primera Entrada",
            "Última Salida",
            "Horas Trabajadas",
            "Empresa"
        ];

        const filas = [];

        // Calcular horas trabajadas por día y usuario
        Object.entries(registrosPorDiaYUsuario).forEach(([fecha, usuarios]) => {
            Object.entries(usuarios).forEach(([email, registroUsuario]) => {
                // Ordenar entradas y salidas
                registroUsuario.entradas.sort((a, b) => a - b);
                registroUsuario.salidas.sort((a, b) => b - a);

                // Calcular tiempo trabajado
                let tiempoTrabajado = 0;
                const entradasOrdenadas = registroUsuario.entradas;
                const salidasOrdenadas = registroUsuario.salidas;

                for (let i = 0; i < Math.min(entradasOrdenadas.length, salidasOrdenadas.length); i++) {
                    tiempoTrabajado += (salidasOrdenadas[i] - entradasOrdenadas[i]) / (1000 * 60 * 60); // Convertir a horas
                }

                // Formatear tiempo trabajado
                const horasTrabajadas = tiempoTrabajado.toFixed(2);

                // Formatear primera entrada y última salida
                const primeraEntrada = entradasOrdenadas.length > 0 
                    ? entradasOrdenadas[0].toLocaleTimeString('es-ES') 
                    : 'N/A';
                const ultimaSalida = salidasOrdenadas.length > 0 
                    ? salidasOrdenadas[salidasOrdenadas.length - 1].toLocaleTimeString('es-ES') 
                    : 'N/A';

                filas.push([
                    fecha,
                    email,
                    registroUsuario.nombre,
                    primeraEntrada,
                    ultimaSalida,
                    horasTrabajadas,
                    registroUsuario.empresa
                ].map(valor => `"${valor.replace(/"/g, '""')}"`).join(','));
            });
        });

        // Contenido CSV
        const contenidoCSV = [
            `Informe de Horas Trabajadas - ${empresaUsuario}`,
            `Fecha de Generación: ${new Date().toLocaleString("es-ES")}`,
            "", // Línea en blanco
            encabezados.join(','),
            ...filas
        ].join('\n');

        // Crear y descargar el archivo CSV
        const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
        const nombreArchivo = `informe_horas_${empresaUsuario}_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Descargar con animación
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(blob);
        enlace.download = nombreArchivo;
        
        // Trigger de descarga con pequeña animación
        enlace.style.display = "none";
        document.body.appendChild(enlace);
        
        setTimeout(() => {
            enlace.click();
            document.body.removeChild(enlace);

            // Mostrar notificación de éxito
            Swal.fire({
                icon: 'success',
                title: 'Informe Generado',
                text: `Se ha generado el informe de horas trabajadas`,
                showConfirmButton: false
            });
        }, 1000);
    } catch (error) {
        console.error("Error al descargar el informe:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al descargar el informe: ' + error.message
        });
    }
};
  
  // Asignar la función al botón "Informe de Usuarios"
  document.querySelector('.btn-warning').addEventListener('click', descargarInformeUsuarios);
  
  // Función para descargar usuarios en CSV
function descargarListaUsuarios() {
    try {
        // Verificar si hay usuarios
        const listaUsuarios = document.getElementById('listaUsuarios');
        const filasUsuarios = listaUsuarios.querySelectorAll('tr[data-id]');
        
        if (filasUsuarios.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sin Usuarios',
                text: 'No hay usuarios para generar el informe.',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        // Preparar datos para CSV
        const encabezados = [
            'Nombre', 
            'Apellidos', 
            'Email', 
            'Empresa', 
            'Rol', 
            'Estado', 
            'Fecha de Registro'
        ];

        // Recopilar datos de usuarios
        const datosUsuarios = Array.from(filasUsuarios).map(fila => {
            // Obtener datos de la fila
            const nombre = fila.querySelector('td:nth-child(1)').textContent.split(' ')[0];
            const apellidos = fila.querySelector('td:nth-child(1)').textContent.split(' ').slice(1).join(' ');
            const email = fila.querySelector('td:nth-child(2)').textContent;
            const empresa = fila.querySelector('td:nth-child(3)').textContent;
            const rol = fila.querySelector('td:nth-child(4)').textContent;

            return [
                nombre,
                apellidos,
                email,
                empresa,
                rol,
                'Activo', // Puedes modificar esto si tienes un estado real
                new Date().toLocaleDateString('es-ES') // Fecha actual como ejemplo
            ];
        });

        // Generar contenido CSV
        const contenidoCSV = [
            `Informe de Usuarios - ${window.empresaGlobal || 'Sin Empresa'}`,
            `Fecha de Generación: ${new Date().toLocaleString('es-ES')}`,
            `Total de Usuarios: ${filasUsuarios.length}`,
            '', // Línea en blanco
            encabezados.join(','),
            ...datosUsuarios.map(fila => 
                fila.map(valor => `"${valor.replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n');

        // Crear y descargar archivo CSV
        const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
        const nombreArchivo = `informe_usuarios_${window.empresaGlobal || 'empresa'}_${new Date().toISOString().split('T')[0]}.csv`;

        // Crear enlace de descarga
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blob);
        enlace.download = nombreArchivo;
        
        // Añadir y disparar descarga
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);

        // Notificación de éxito
        Swal.fire({
            icon: 'success',
            title: 'Informe Generado',
            text: `Se ha generado el informe de ${filasUsuarios.length} usuarios.`,
            confirmButtonText: 'Entendido'
        });

    } catch (error) {
        console.error('Error al generar informe de usuarios:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el informe de usuarios.',
            confirmButtonText: 'Entendido'
        });
    }
}

// Asignar la función al botón
document.querySelector('.btn-success').addEventListener('click', descargarListaUsuarios);