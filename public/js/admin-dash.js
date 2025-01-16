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
    writeBatch,      
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
////////////////////////
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

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonText: 'Entendido'
        });
    }
}

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


//////////////////////////
// CREAR NUEVO USUARIO //
////////////////////////
/*
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
                    <p>🏢 <strong>Empresa:</strong> ${empresaId}</p>
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

*/

window.crearNuevoUsuario = async function (event) {
    event.preventDefault();

    // Obtener valores del formulario
    const nombre = document.getElementById("nombre").value;
    const apellidos = document.getElementById("apellidos").value;
    const dni = document.getElementById("dni").value;
    const email = document.getElementById("email").value;
    const rol = document.getElementById("rol").value;

    // Datos de contacto
    const telefonoPrefijo = document.getElementById("telefonoPrefijo").value;
    const telefonoNumero = document.getElementById("telefonoNumero").value;
    const direccionCalle = document.getElementById("direccionCalle").value;
    const direccionCodigoPostal = document.getElementById("direccionCodigoPostal").value;
    const direccionCiudad = document.getElementById("direccionCiudad").value;
    const direccionProvincia = document.getElementById("direccionProvincia").value;
    const direccionPais = document.getElementById("direccionPais").value;

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

        // Obtener el ID de la empresa del usuario actual
        const empresaId = userDoc.data().empresa;
        if (!empresaId) {
            throw new Error("El usuario autenticado no tiene asignada una empresa.");
        }

        // Validaciones adicionales
        if (telefonoNumero && !/^\d{9}$/.test(telefonoNumero)) {
            throw new Error("Número de teléfono inválido. Debe contener 9 dígitos.");
        }

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
            password: passwordTemporal,
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
        });

        if (result.data && result.data.success) {
            // Mostrar confirmación con SweetAlert2
            await Swal.fire({
                icon: 'success',
                title: '✅ Usuario Creado',
                html: `
                    <p>El usuario <strong>${nombre} ${apellidos}</strong> ha sido creado exitosamente.</p>
                    <p>📧 <strong>Email:</strong> ${email}</p>
                    <p>🏢 <strong>Empresa:</strong> ${empresaId}</p>
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


/////// Para borrar ////
// Función de actualización de contactos
async function actualizarContactosLocalmente() {
    try {
        // Verificar permisos
        const userActual = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
        const datosUsuarioActual = userDoc.data();
        
        if (datosUsuarioActual.rol !== 'root' && datosUsuarioActual.rol !== 'admin') {
            throw new Error('No tienes permisos para realizar esta acción');
        }

        // Mostrar confirmación
        const confirmacion = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción añadirá información de contacto por defecto a usuarios existentes sin ella.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, actualizar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacion.isConfirmed) return;

        // Mostrar loading
        Swal.fire({
            title: 'Actualizando usuarios...',
            html: 'Por favor, espera.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Obtener usuarios
        const usuariosQuery = await getDocs(collection(db, 'usuarios'));
        
        // Contador de actualizaciones
        let actualizados = 0;

        // Procesar cada usuario
        const batch = writeBatch(db);
        
        // Convertir a array y procesar
        const usuarios = usuariosQuery.docs;
        for (const usuarioDoc of usuarios) {
            const userData = usuarioDoc.data();

            // Si no tiene contactoPersonal
            if (!userData.contactoPersonal) {
                const userRef = doc(db, 'usuarios', usuarioDoc.id);
                
                batch.update(userRef, {
                    contactoPersonal: {
                        telefono: {
                            prefijo: '+34',
                            numero: '',
                            tipo: 'móvil'
                        },
                        direccion: {
                            calle: '',
                            codigoPostal: '',
                            ciudad: '',
                            provincia: '',
                            pais: 'España'
                        }
                    }
                });

                actualizados++;

                // Dividir batch si supera el límite de Firestore (500 operaciones)
                if (actualizados % 500 === 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                }
            }
        }

        // Commit del batch final
        if (actualizados % 500 !== 0) {
            await batch.commit();
        }

        // Notificación
        Swal.fire({
            icon: 'success',
            title: 'Actualización Completada',
            text: `Se han actualizado ${actualizados} usuarios con información de contacto por defecto.`
        });

    } catch (error) {
        console.error("Error al actualizar contactos:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
    }
}

// Añadir al objeto window para poder llamarla globalmente
window.actualizarContactosLocalmente = actualizarContactosLocalmente;

/// Para borrar

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
////////////////////
//Modificar usuario
///////////////////
/*
window.modificarUsuario = async function(email) {
    try {
        // 1. Verificar permisos (solo admin o root)
        const userActual = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
        const datosUsuarioActual = userDoc.data();
        
        if (datosUsuarioActual.rol !== 'root' && datosUsuarioActual.rol !== 'admin') {
            throw new Error('No tienes permisos para modificar usuarios');
        }

        // 2. Buscar datos del usuario a modificar
        const usuarioQuery = await getDocs(
            query(collection(db, 'usuarios'), where('email', '==', email))
        );

        if (usuarioQuery.empty) {
            throw new Error('Usuario no encontrado');
        }

        const usuarioDoc = usuarioQuery.docs[0];
        const usuarioData = usuarioDoc.data();

        // 3. Mostrar modal con información del usuario
        const { value: formValues } = await Swal.fire({
            title: 'Modificar Usuario',
            html: `
                <div class="swal-form">
                    <h3>Información Personal</h3>
                    <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${usuarioData.nombre || ''}">
                    <input id="swal-apellidos" class="swal2-input" placeholder="Apellidos" value="${usuarioData.apellidos || ''}">
                    <select id="swal-rol" class="swal2-select">
                        <option value="usuario" ${usuarioData.rol === 'usuario' ? 'selected' : ''}>Usuario</option>
                        <option value="admin" ${usuarioData.rol === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>

                    <h3>Información de Contacto</h3>
                    <div class="input-group mb-2">
                        <select id="swal-telefono-prefijo" class="form-control" style="max-width: 100px;">
                            <option value="+34" ${usuarioData.contactoPersonal?.telefono?.prefijo === '+34' ? 'selected' : ''}>+34</option>
                            <option value="+351" ${usuarioData.contactoPersonal?.telefono?.prefijo === '+351' ? 'selected' : ''}>+351</option>
                        </select>
                        <input type="tel" id="swal-telefono-numero" class="form-control" 
                               placeholder="Número de teléfono" 
                               value="${usuarioData.contactoPersonal?.telefono?.numero || ''}"
                               pattern="[0-9]{9}">
                    </div>

                    <h3>Dirección</h3>
                    <input id="swal-direccion-calle" class="swal2-input" 
                           placeholder="Calle y número" 
                           value="${usuarioData.contactoPersonal?.direccion?.calle || ''}">
                    <div class="row">
                        <div class="col-md-4">
                            <input id="swal-direccion-codigo-postal" class="swal2-input" 
                                   placeholder="Código Postal" 
                                   value="${usuarioData.contactoPersonal?.direccion?.codigoPostal || ''}"
                                   pattern="[0-9]{5}">
                        </div>
                        <div class="col-md-8">
                            <input id="swal-direccion-ciudad" class="swal2-input" 
                                   placeholder="Ciudad" 
                                   value="${usuarioData.contactoPersonal?.direccion?.ciudad || ''}">
                        </div>
                    </div>
                    <input id="swal-direccion-provincia" class="swal2-input" 
                           placeholder="Provincia" 
                           value="${usuarioData.contactoPersonal?.direccion?.provincia || ''}">
                    <select id="swal-direccion-pais" class="swal2-select">
                        <option value="España" ${usuarioData.contactoPersonal?.direccion?.pais === 'España' ? 'selected' : ''}>España</option>
                        <option value="Portugal" ${usuarioData.contactoPersonal?.direccion?.pais === 'Portugal' ? 'selected' : ''}>Portugal</option>
                    </select>
                </div>
            `,
            focusConfirm: false,
            preConfirm: () => {
                const nombre = document.getElementById('swal-nombre').value;
                const apellidos = document.getElementById('swal-apellidos').value;
                const rol = document.getElementById('swal-rol').value;
                
                // Datos de contacto
                const telefonoPrefijo = document.getElementById('swal-telefono-prefijo').value;
                const telefonoNumero = document.getElementById('swal-telefono-numero').value;
                const direccionCalle = document.getElementById('swal-direccion-calle').value;
                const direccionCodigoPostal = document.getElementById('swal-direccion-codigo-postal').value;
                const direccionCiudad = document.getElementById('swal-direccion-ciudad').value;
                const direccionProvincia = document.getElementById('swal-direccion-provincia').value;
                const direccionPais = document.getElementById('swal-direccion-pais').value;

                // Validaciones básicas
                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return false;
                }

                // Validación de teléfono (opcional)
                if (telefonoNumero && !/^\d{9}$/.test(telefonoNumero)) {
                    Swal.showValidationMessage('Número de teléfono inválido');
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
            },
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar'
        });

        // 4. Si se confirman los cambios
        if (formValues) {
            // 5. Actualizar en Firestore
            await updateDoc(usuarioDoc.ref, {
                nombre: formValues.nombre,
                apellidos: formValues.apellidos,
                rol: formValues.rol,
                contactoPersonal: formValues.contactoPersonal,
                fechaUltimaModificacion: new Date()
            });

            // 6. Log de modificación
            await addDoc(collection(db, 'logs_modificaciones'), {
                usuarioModificado: email,
                modificadoPor: {
                    uid: userActual.uid,
                    email: userActual.email
                },
                fechaModificacion: new Date(),
                cambiosRealizados: formValues
            });

            // 7. Notificación de éxito
            await Swal.fire({
                icon: 'success',
                title: 'Usuario Modificado',
                text: `Los datos de ${email} han sido actualizados correctamente`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });

            // 8. Recargar lista de usuarios
            await cargarUsuarios();

        }

    } catch (error) {
        console.error("Error al modificar usuario:", error);

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonText: 'Entendido'
        });
    }
};


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
*/
window.modificarUsuario = async function(email) {
    try {
        const userActual = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
        const datosUsuarioActual = userDoc.data();
        
        if (datosUsuarioActual.rol !== 'root' && datosUsuarioActual.rol !== 'admin') {
            throw new Error('No tienes permisos para modificar usuarios');
        }

        const usuarioQuery = await getDocs(query(collection(db, 'usuarios'), where('email', '==', email)));

        if (usuarioQuery.empty) {
            throw new Error('Usuario no encontrado');
        }

        const usuarioDoc = usuarioQuery.docs[0];
        const usuarioData = usuarioDoc.data();

        const { value: formValues } = await Swal.fire({
            title: `Modificar Usuario: ${usuarioData.nombre} ${usuarioData.apellidos}`,
            html: `
                <style>
                    .swal2-popup .swal-form {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        text-align: left;
                        width: 100%;
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
                        text-align: left;
                    }
                    .input-group {
                        display: flex;
                        gap: 5px;
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
                        <input id="swal-email" class="swal2-input" value="${usuarioData.email}" readonly style="background-color: #e0e0e0; cursor: not-allowed;">
                    </div>
                    <div class="swal-section-title">Información de Contacto</div>
                    <div>
                        <label>Teléfono</label>
                        <div class="input-group">
                            <select id="swal-telefono-prefijo" class="swal2-select" style="max-width: 100px;">
                                <option value="+34" ${usuarioData.contactoPersonal?.telefono?.prefijo === '+34' ? 'selected' : ''}>+34</option>
                                <option value="+351" ${usuarioData.contactoPersonal?.telefono?.prefijo === '+351' ? 'selected' : ''}>+351</option>
                            </select>
                            <input type="tel" id="swal-telefono-numero" class="swal2-input" placeholder="Número de teléfono" value="${usuarioData.contactoPersonal?.telefono?.numero || ''}" pattern="[0-9]{9}">
                        </div>
                    </div>
                    <div>
                        <label>Dirección</label>
                        <input id="swal-direccion-calle" class="swal2-input" placeholder="Calle y número" value="${usuarioData.contactoPersonal?.direccion?.calle || ''}">
                    </div>
                    <div class="input-group">
                        <input id="swal-direccion-codigo-postal" class="swal2-input" placeholder="Código Postal" style="max-width: 150px;" value="${usuarioData.contactoPersonal?.direccion?.codigoPostal || ''}" pattern="[0-9]{5}">
                        <input id="swal-direccion-ciudad" class="swal2-input" placeholder="Ciudad" value="${usuarioData.contactoPersonal?.direccion?.ciudad || ''}">
                    </div>
                    <div>
                        <label>Provincia y País</label>
                        <div class="input-group">
                            <input id="swal-direccion-provincia" class="swal2-input" placeholder="Provincia" value="${usuarioData.contactoPersonal?.direccion?.provincia || ''}">
                            <select id="swal-direccion-pais" class="swal2-select">
                                <option value="España" ${usuarioData.contactoPersonal?.direccion?.pais === 'España' ? 'selected' : ''}>España</option>
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
            cancelButtonColor: '#d33'
        });
    } catch (error) {
        console.error("Error al modificar usuario:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
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