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
    limit,
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
                if (userData.rol === "admin" || userData.rol === "root") {
                    content.style.display = "block";
                    //Cargar Información del usuario
                    
                    document.getElementById("nombreUser").textContent = userData.nombre || "No disponible";
                    document.getElementById("empresaUser").textContent = userData.empresa || "No disponible";
                    //empresaGlobal = userData.empresa ;
                    window.empresaGlobal = userData.empresa;

                    // Llamar a la función cargarUsuarios
                    await cargarUsuarios();
                    await cargarUsuariosEnCombo()
                    
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

        // LLamar a la función contarFichajesHoy
        contarFichajesHoy();

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
////////////////////////////////////////////////////
//Mostrar Información Usurio en Modal - Inicio /////
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


//////////////////////////
// CREAR NUEVO USUARIO //
////////////////////////
window.crearNuevoUsuario = async function (event) {
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


/////////////////////////////////////
// Añadir fichajes en Dashboard
/////////////////////////////////////
async function contarFichajesHoy() {
    try {
        if (!window.empresaGlobal) {
            throw new Error("Empresa no definida");
        }

        // Obtener la fecha de hoy al inicio del día
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Referencia a la colección de registros
        const registrosRef = collection(db, 'registros');
        
        // Consulta para filtrar registros de hoy de la empresa actual
        const q = query(
            registrosRef, 
            where('empresa', '==', window.empresaGlobal),
            where('accion_registro', '==', 'entrada'),
            where('fecha', '>=', Timestamp.fromDate(hoy)),
            where('fecha', '<', Timestamp.fromDate(new Date(hoy.getTime() + 24 * 60 * 60 * 1000)))
        );

        // Obtener snapshot
        const querySnapshot = await getDocs(q);

        // Actualizar contador en el HTML
        const contadorFichajes = document.getElementById('fichajeshoy');
        contadorFichajes.textContent = querySnapshot.size;

        console.log(`Usuarios fichados hoy en ${window.empresaGlobal}: ${querySnapshot.size}`);

        // Si quieres más detalle, puedes hacer un mapeo de usuarios
        const usuariosFichados = new Set();
        querySnapshot.forEach((doc) => {
            usuariosFichados.add(doc.data().email);
        });

        console.log('Usuarios fichados:', Array.from(usuariosFichados));

        return querySnapshot.size;

    } catch (error) {
        console.error("Error al contar fichajes de hoy:", error);
        
        // Mostrar 0 en caso de error
        const contadorFichajes = document.getElementById('fichajeshoy');
        contadorFichajes.textContent = '0';

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo contar los fichajes de hoy',
            confirmButtonText: 'Entendido'
        });

        return 0;
    }
}

// Función para obtener más detalles de los fichajes de hoy
async function obtenerDetallesFichajesHoy() {
    try {
        if (!window.empresaGlobal) {
            throw new Error("Empresa no definida");
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const registrosRef = collection(db, 'registros');
        
        const q = query(
            registrosRef, 
            where('empresa', '==', window.empresaGlobal),
            where('accion_registro', '==', 'entrada'),
            where('fecha', '>=', Timestamp.fromDate(hoy)),
            where('fecha', '<', Timestamp.fromDate(new Date(hoy.getTime() + 24 * 60 * 60 * 1000)))
        );

        const querySnapshot = await getDocs(q);

        // Crear un mapa de usuarios fichados con detalles
        const usuariosFichados = new Map();
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            usuariosFichados.set(data.email, {
                nombre: data.nombre,
                email: data.email,
                lugar: data.lugar,
                hora: data.fecha.toDate() // Convertir timestamp a Date
            });
        });

        return usuariosFichados;

    } catch (error) {
        console.error("Error al obtener detalles de fichajes:", error);
        return new Map();
    }
}


// Llamar a la función de actualización cuando sea necesario
//window.addEventListener('load', actualizarContadores);

// FIN AÑADIR FICHAJES EN DASHBOARD ///
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

*/
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
///////////////////////////////////////////////////
// REDIMENSIONAR TABLA RESGISTROS
////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
    function transformRegistrosForMobile() {
        console.log('Transforming registros, window width:', window.innerWidth);
        
        const table = document.getElementById('listaRegistros');
        const mobileList = document.getElementById('mobileRegistrosList');

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
            rows.forEach((row) => {
                const cells = row.querySelectorAll('td');

                // Crear un contenedor para cada registro
                const registroCard = document.createElement('div');
                registroCard.classList.add('registro-card');

                registroCard.innerHTML = `
                    <div class="registro-card-content">
                        <h3>${cells[0].textContent}</h3>
                        <p><strong>Email:</strong> ${cells[1].textContent}</p>
                        <p><strong>Hora:</strong> ${cells[2].textContent}</p>
                        <p><strong>Acción:</strong> ${cells[3].textContent}</p>
                        <p><strong>Comentarios:</strong> ${cells[4].textContent || 'Sin Comentarios'}</p>
                        <p><strong>Horas:</strong> ${cells[5].textContent || 'N/A'}</p>
                        <div class="registro-card-actions">
                            ${cells[6].innerHTML}
                        </div>
                    </div>
                `;

                mobileList.appendChild(registroCard);
            });

            // Mostrar lista móvil
            mobileList.style.display = 'block';
        } else {
            // Mostrar tabla en modo escritorio
            table.style.display = 'table';
            mobileList.style.display = 'none';
        }
    }

    //    // Función para ejecutar la transformación de forma inmediata
    function initializeRegistrosTransform() {
        // Ejecutar transformación
        transformRegistrosForMobile();
        
        // Añadir un pequeño retraso para asegurar que el contenido esté completamente cargado
        setTimeout(transformRegistrosForMobile, 100);
    }

    // Eventos para transformación
    window.addEventListener('load', initializeRegistrosTransform);
    window.addEventListener('resize', transformRegistrosForMobile);

    // Observador de mutaciones para detectar cambios en la tabla
    const registrosTable = document.getElementById('listaRegistros');
    if (registrosTable) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    transformRegistrosForMobile();
                }
            });
        });

        // Configurar observador en el tbody
        observer.observe(registrosTable.querySelector('tbody'), {
            childList: true,
            subtree: true
        });
    }
});
///////////////////////////////////////////////////
// Función para abrir el modal de registro manual//
//////////////////////////////////////////////////
// Función para abrir el modal de registro manual
// Función para abrir el modal de registro manual
/*
async function abrirModalRegistroManual() {
    try {
        // Verificar permisos (ROOT o ADMIN)
        const userActual = auth.currentUser;
        
        // Verificar si hay usuario autenticado
        if (!userActual) {
            throw new Error('Usuario no autenticado');
        }

        const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
        
        // Verificar si existe el documento del usuario
        if (!userDoc.exists()) {
            throw new Error('Documento de usuario no encontrado');
        }

        const datosUsuarioActual = userDoc.data();
        
        // Validar permisos
        if (datosUsuarioActual.rol !== 'root' && datosUsuarioActual.rol !== 'admin') {
            throw new Error('No tienes permisos para realizar registros manuales');
        }

        // Verificar que la empresa global esté definida
        if (!window.empresaGlobal) {
            throw new Error('Empresa no definida');
        }

        // Abrir modal con Swal
        const { value: formValues } = await Swal.fire({
            title: 'Registro Manual',
            html: `
                <style>
                    .swal-form {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 15px;
                        text-align: left;
                    }
                    .swal2-input, .swal2-select {
                        width: 100%;
                        box-sizing: border-box;
                    }
                </style>
                <div class="swal-form">
                    <div>
                        <label>Seleccionar Usuario</label>
                        <select id="swal-usuario" class="swal2-select" required>
                            <option value="">Seleccionar usuario</option>
                            <!-- Se llenará dinámicamente -->
                        </select>
                    </div>
                    
                    <div>
                        <label>Tipo de Registro</label>
                        <select id="swal-tipo-registro" class="swal2-select" required>
                            <option value="">Seleccionar tipo</option>
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                            <option value="incidencia">Incidencia</option>
                        </select>
                    </div>
                    
                    <div id="swal-incidencia-section" style="display:none;">
                        <label>Tipo de Incidencia</label>
                        <select id="swal-tipo-incidencia" class="swal2-select">
                            <option value="">Seleccionar tipo</option>
                            <option value="tecnica">Incidencia Técnica</option>
                            <option value="administrativa">Incidencia Administrativa</option>
                            <option value="otra">Otra</option>
                        </select>
                    </div>
                    
                    <div>
                        <label>Fecha y Hora</label>
                        <input type="datetime-local" id="swal-fecha-registro" class="swal2-input" required>
                    </div>
                    
                    <div>
                        <label>Justificación</label>
                        <textarea id="swal-justificacion" class="swal2-input" placeholder="Introduce una justificación para el registro manual" rows="3" required></textarea>
                    </div>
                </div>
            `,
            didOpen: () => {
                // Cargar usuarios
                cargarUsuariosEnSelect();

                // Mostrar/ocultar sección de incidencia
                const tipoRegistro = document.getElementById('swal-tipo-registro');
                const incidenciaSection = document.getElementById('swal-incidencia-section');
                
                tipoRegistro.addEventListener('change', () => {
                    incidenciaSection.style.display = 
                        tipoRegistro.value === 'incidencia' ? 'block' : 'none';
                });

                // Establecer valor por defecto de fecha y hora actual
                const fechaRegistro = document.getElementById('swal-fecha-registro');
                const now = new Date();
                // Formatear fecha para datetime-local
                const formattedDate = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0') + 'T' + 
                    String(now.getHours()).padStart(2, '0') + ':' + 
                    String(now.getMinutes()).padStart(2, '0');
                fechaRegistro.value = formattedDate;
            },
            showCancelButton: true,
            confirmButtonText: 'Guardar Registro',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const usuario = document.getElementById('swal-usuario').value;
                const tipoRegistro = document.getElementById('swal-tipo-registro').value;
                const fechaRegistro = document.getElementById('swal-fecha-registro').value;
                const justificacion = document.getElementById('swal-justificacion').value;
                const tipoIncidencia = tipoRegistro === 'incidencia' 
                    ? document.getElementById('swal-tipo-incidencia').value 
                    : null;

                // Validaciones
                if (!usuario) {
                    Swal.showValidationMessage('Debe seleccionar un usuario');
                    return false;
                }
                if (!tipoRegistro) {
                    Swal.showValidationMessage('Debe seleccionar un tipo de registro');
                    return false;
                }
                if (!fechaRegistro) {
                    Swal.showValidationMessage('Debe seleccionar una fecha y hora');
                    return false;
                }
                if (!justificacion) {
                    Swal.showValidationMessage('Debe introducir una justificación');
                    return false;
                }
                if (tipoRegistro === 'incidencia' && !tipoIncidencia) {
                    Swal.showValidationMessage('Debe seleccionar un tipo de incidencia');
                    return false;
                }

                return {
                    usuario,
                    tipoRegistro,
                    fechaRegistro,
                    justificacion,
                    tipoIncidencia
                };
            }
        });

        // Si se proporcionaron valores
        if (formValues) {
            await guardarRegistroManual(formValues);
        }

    } catch (error) {
        console.error('Error en registro manual:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            html: `
                <p>No se pudo abrir el registro manual:</p>
                <strong>${error.message}</strong>
            `,
            confirmButtonText: 'Entendido'
        });
    }
}

// Función para cargar usuarios en el select
async function cargarUsuariosEnSelect() {
    const selectUsuarios = document.getElementById('swal-usuario');
    
    try {
        // Log inicial
        console.log('Iniciando carga de usuarios');

        // Obtener usuario actual
        const userActual = auth.currentUser;
        if (!userActual) {
            throw new Error('Usuario no autenticado');
        }

        // Log de usuario actual
        console.log('Usuario actual:', userActual.uid, userActual.email);

        // Obtener documento del usuario actual
        const userDoc = await getDoc(doc(db, 'usuarios', userActual.uid));
        
        // Verificar existencia del documento
        if (!userDoc.exists()) {
            throw new Error('Documento de usuario no encontrado');
        }

        // Obtener empresa del usuario
        const empresaUsuario = userDoc.data().empresa;
        
        // Log de empresa
        console.log('Empresa del usuario:', empresaUsuario);

        // Verificar que la empresa exista
        if (!empresaUsuario) {
            throw new Error('Empresa no definida para el usuario');
        }

        // Consulta de usuarios
        const usuariosRef = collection(db, 'usuarios');
        const q = query(
            usuariosRef, 
            where('empresa', '==', empresaUsuario)
            // Eliminar filtro de estado para mostrar todos los usuarios
        );

        // Obtener snapshot de usuarios
        const querySnapshot = await getDocs(q);

        // Log de usuarios encontrados
        console.log(`Usuarios encontrados para ${empresaUsuario}:`, 
            querySnapshot.docs.length
        );

        // Limpiar select
        selectUsuarios.innerHTML = '<option value="">Seleccionar usuario</option>';

        // Añadir usuarios ordenados alfabéticamente
        const usuarios = querySnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => 
                `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`)
            );

        // Añadir usuarios al select
        usuarios.forEach((usuario) => {
            const option = document.createElement('option');
            option.value = usuario.id;
            option.textContent = `${usuario.nombre} ${usuario.apellidos || ''} (${usuario.email})`;
            
            // Opcional: Deshabilitar usuarios inactivos
            if (usuario.estado !== 'activo') {
                option.disabled = true;
                option.textContent += ' [Inactivo]';
            }
            
            selectUsuarios.appendChild(option);
        });

        // Log final
        console.log('Usuarios cargados en el select:', 
            Array.from(selectUsuarios.options)
                .map(option => option.textContent)
        );

    } catch (error) {
        // Log de error detallado
        console.error('Error COMPLETO al cargar usuarios:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            fullError: error
        });

        // Notificación de error
        Swal.fire({
            icon: 'error',
            title: 'Error al Cargar Usuarios',
            html: `
                <p>No se pudieron cargar los usuarios:</p>
                <strong>${error.message}</strong>
            `,
            confirmButtonText: 'Entendido'
        });
    }
}

// Función para guardar registro manual
async function guardarRegistroManual(datos) {
    try {
        // Log inicial de datos
        console.log('Datos recibidos para registro manual:', datos);

        const userActual = auth.currentUser;
        
        // Verificar que userActual existe
        if (!userActual) {
            throw new Error('Usuario no autenticado');
        }

        // Log de usuario actual
        console.log('Usuario actual:', userActual.uid, userActual.email);

        // Verificar empresa global
        if (!window.empresaGlobal) {
            throw new Error('Empresa no definida');
        }

        // Obtener datos del usuario seleccionado
        const usuarioDoc = await getDoc(doc(db, 'usuarios', datos.usuario));
        if (!usuarioDoc.exists()) {
            throw new Error('Usuario seleccionado no encontrado');
        }
        const usuarioData = usuarioDoc.data();

        // Preparar datos para guardar
        const registroData = {
            user_id: datos.usuario,
            email: usuarioData.email,
            nombre: `${usuarioData.nombre} ${usuarioData.apellidos || ''}`,
            fecha: Timestamp.fromDate(new Date(datos.fechaRegistro)),
            accion_registro: datos.tipoRegistro,
            justificacion: datos.justificacion,
            registrado_por: {
                uid: userActual.uid,
                email: userActual.email
            },
            empresa: window.empresaGlobal,
            created_at: serverTimestamp(),
            tipo_registro: 'manual'
        };

        // Log de datos a guardar
        console.log('Datos de registro a guardar:', registroData);

        // Determinar colección según tipo de registro
        let coleccionTarget = 'registros';
        
        // Añadir detalles específicos según el tipo de registro
        if (datos.tipoRegistro === 'incidencia') {
            coleccionTarget = 'incidencias';
            registroData.tipo_incidencia = datos.tipoIncidencia;
        }

        // Log de colección target
        console.log(`Guardando en colección: ${coleccionTarget}`);

        // Intentar guardar el documento
        const docRef = await addDoc(collection(db, coleccionTarget), registroData);

        // Log de documento guardado
        console.log(`Registro manual guardado con ID: ${docRef.id}`);

        // Notificación de éxito detallada
        await Swal.fire({
            icon: 'success',
            title: 'Registro Guardado',
            html: `
                <p>Registro manual guardado correctamente:</p>
                <ul>
                    <li><strong>Usuario:</strong> ${usuarioData.nombre} ${usuarioData.apellidos || ''}</li>
                    <li><strong>Tipo:</strong> ${datos.tipoRegistro}</li>
                    <li><strong>Fecha:</strong> ${new Date(datos.fechaRegistro).toLocaleString()}</li>
                    <li><strong>ID Registro:</strong> ${docRef.id}</li>
                </ul>
            `,
            confirmButtonText: 'Entendido'
        });

        // Opcional: Recargar contadores o lista
        try {
            if (typeof contarFichajesHoy === 'function') {
                await contarFichajesHoy();
            }
        } catch (reloadError) {
            console.warn('Error al recargar contadores:', reloadError);
        }

        return docRef;

    } catch (error) {
        // Log de error detallado
        console.error('Error COMPLETO al guardar registro manual:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            fullError: error
        });

        // Notificación de error detallada
        await Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Registro',
            html: `
                <p>No se pudo guardar el registro:</p>
                <strong>${error.message}</strong>
                <p>Detalles del error:</p>
                <pre>${JSON.stringify(error, null, 2)}</pre>
            `,
            confirmButtonText: 'Entendido'
        });

        // Re-lanzar el error para manejo adicional si es necesario
        throw error;
    }
}

// Añadir al objeto window para acceso global
window.abrirModalRegistroManual = abrirModalRegistroManual;
*/
// Cargar usuarios en el combo de selección
// Cargar usuarios en el combo de selección
async function cargarUsuariosEnCombo() {
    const selectUsuarios = document.getElementById('selectUsuario');
    selectUsuarios.innerHTML = '<option value="">Seleccione un usuario</option>';

    try {
        console.log("Iniciando carga de usuarios en el combo");

        // Verificar si la empresa global está definida
        if (!window.empresaGlobal) {
            throw new Error("Empresa no definida");
        }

        // Consultar usuarios de la misma empresa
        const usuariosRef = collection(db, 'usuarios');
        const q = query(usuariosRef, where('empresa', '==', window.empresaGlobal));
        const querySnapshot = await getDocs(q);

        console.log(`Número de usuarios encontrados en ${window.empresaGlobal}: ${querySnapshot.size}`);

        // Verificar si no hay usuarios
        if (querySnapshot.empty) {
            console.log("No hay usuarios registrados en la empresa");
            return;
        }

        // Llenar el select con los usuarios
        querySnapshot.forEach((doc) => {
            const usuario = doc.data();
            const option = document.createElement('option');
            option.value = doc.id; // Usar el ID del documento como valor
            option.textContent = `${usuario.nombre} ${usuario.apellidos || ''} (${usuario.email})`;
            selectUsuarios.appendChild(option);
        });

        console.log("Usuarios cargados en el combo correctamente");
    } catch (error) {
        console.error("Error al cargar usuarios en el combo:", error);

        // Mostrar mensaje de error en la interfaz
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los usuarios en el combo',
            confirmButtonText: 'Entendido'
        });
    }
}

// Obtener el primer y último día del mes en curso
function obtenerRangoMesActual() {
    const fechaActual = new Date();
    const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
    return { primerDia, ultimoDia };
}

async function cargarRegistrosPorUsuario() {
    const usuarioId = document.getElementById('selectUsuario').value;
    const listaRegistros = document.getElementById('listaRegistros').getElementsByTagName('tbody')[0];
    const totalRegistros = document.getElementById('totalRegistros');

    // Limpiar tabla
    listaRegistros.innerHTML = '';
    totalRegistros.textContent = '0';

    if (!usuarioId) return;

    try {
        const registrosRef = collection(db, 'registros');
        const q = query(
            registrosRef,
            where('userId', '==', usuarioId), // Asegúrate de que este campo coincida con tus datos
            orderBy('fecha', 'desc'), // Orden descendente por fecha
            limit(100) // Aumentamos el límite si es necesario
        );

        const querySnapshot = await getDocs(q);
        totalRegistros.textContent = querySnapshot.size;

        if (querySnapshot.empty) {
            listaRegistros.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No hay registros para este usuario</td>
                </tr>
            `;
            return;
        }

        // Procesar registros y agrupar por días
        const registrosPorDia = agruparRegistrosPorDia(querySnapshot);

        // Renderizar tabla
        Object.keys(registrosPorDia).forEach((dia) => {
            const registros = registrosPorDia[dia];
            const horasTrabajadas = calcularHorasTrabajadas(registros);

            registros.forEach((registro, index) => {
                const fecha = registro.fecha?.toDate();
                const hora = fecha ? fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'; // Formato de hora
                const fila = `
                    <tr data-id="${registro.id}">
                        <td>${index === 0 ? dia : ''}</td> <!-- Mostrar el día solo en la primera fila -->
                        <td>${registro.email || 'N/A'}</td>
                        <td>${hora}</td> <!-- Mostrar la hora de cada acción -->
                        <td>${registro.accion_registro || 'N/A'}</td>
                        <td>${registro.comentario || 'Sin Comentarios'}</td>
                        <td>${index === 0 ? horasTrabajadas : ''}</td> <!-- Mostrar las horas trabajadas solo en la primera fila -->
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



window.cargarRegistrosPorUsuario = cargarRegistrosPorUsuario;


// Agregar comentario a un registro
async function agregarComentario(registroId) {
    const { value: comentario } = await Swal.fire({
        title: 'Añadir Comentario',
        input: 'textarea',
        inputPlaceholder: 'Escribe un comentario...',
        showCancelButton: true
    });

    if (comentario) {
        try {
            await updateDoc(doc(db, 'registros', registroId), {
                comentario,
                comentario_fecha: serverTimestamp()
            });

            Swal.fire('Comentario añadido', '', 'success');
        } catch (error) {
            Swal.fire('Error', 'No se pudo añadir el comentario', 'error');
        }
    }
}

window.agregarComentario = agregarComentario;
// Editar registro
async function editarRegistro(registroId) {
    // Implementar lógica de edición
}

// Eliminar registro
async function eliminarRegistro(registroId) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
        try {
            // Eliminar el registro de Firestore
            await deleteDoc(doc(db, 'registros', registroId));
            
            // Mostrar notificación de éxito
            Swal.fire('Eliminado', 'El registro ha sido eliminado.', 'success');
            
            // Recargar los registros después de la eliminación
            cargarRegistrosPorUsuario();
        } catch (error) {
            console.error('Error al eliminar registro:', error);
            Swal.fire('Error', 'No se pudo eliminar el registro', 'error');
        }
    }
}

window.eliminarRegistro = eliminarRegistro;
// Función para abrir el modal de registro manual
async function abrirModalRegistroManual() {
    try {
        const { value: formValues } = await Swal.fire({
            title: 'Registro Manual',
            html: `
                <div class="swal-form">
                    <label>Seleccionar Usuario:</label>
                    <select id="swal-usuario" class="swal2-select" required>
                        <option value="">Seleccione un usuario</option>
                        <!-- Se llenará dinámicamente -->
                    </select>
                    <label>Tipo de Registro:</label>
                    <select id="swal-tipo-registro" class="swal2-select" required>
                        <option value="">Seleccionar tipo</option>
                        <option value="entrada">Entrada</option>
                        <option value="salida">Salida</option>
                        <option value="incidencia">Incidencia</option>
                    </select>
                    <label>Fecha y Hora:</label>
                    <input type="datetime-local" id="swal-fecha-registro" class="swal2-input" required>
                    <label>Justificación:</label>
                    <textarea id="swal-justificacion" class="swal2-input" placeholder="Introduce una justificación" rows="3" required></textarea>
                </div>
            `,
            focusConfirm: false,
            preConfirm: () => {
                return {
                    usuario: document.getElementById('swal-usuario').value,
                    tipoRegistro: document.getElementById('swal-tipo-registro').value,
                    fechaRegistro: document.getElementById('swal-fecha-registro').value,
                    justificacion: document.getElementById('swal-justificacion').value
                };
            },
            showCancelButton: true,
            confirmButtonText: 'Guardar Registro',
            cancelButtonText: 'Cancelar'
        });

        if (formValues) {
            await guardarRegistroManual(formValues);
        }
    } catch (error) {
        console.error('Error en registro manual:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
    }
}

// Función para guardar el registro manual
async function guardarRegistroManual(datos) {
    try {
        const registroData = {
            user_id: datos.usuario,
            fecha: Timestamp.fromDate(new Date(datos.fechaRegistro)),
            accion_registro: datos.tipoRegistro,
            justificacion: datos.justificacion,
            registrado_por: {
                uid: auth.currentUser .uid,
                email: auth.currentUser .email
            },
            empresa: window.empresaGlobal,
            created_at: serverTimestamp()
        };

        await addDoc(collection(db, 'registros'), registroData);

        Swal.fire({
            icon: 'success',
            title: 'Registro Guardado',
            text: 'El registro manual se ha guardado correctamente.'
        });

        // Recargar los registros después de guardar
        cargarRegistrosPorUsuario();
    } catch (error) {
        console.error('Error al guardar registro manual:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar el registro manual.'
        });
    }
}
/*
// Llamar a la función para cargar usuarios en el combo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarUsuariosEnCombo(); // Cargar usuarios en el combo
});
*/
// Mostrar formulario para agregar registro manual
window.mostrarFormularioRegistroManual = mostrarFormularioRegistroManual;
async function mostrarFormularioRegistroManual() {
    const { value: formValues } = await Swal.fire({
        title: 'Agregar Registro Manual',
        html: `
            <div class="form-group">
                <label for="registroAccion">Acción:</label>
                <select id="registroAccion" class="swal2-input form-control">
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="incidencia">Incidencia</option>
                </select>
            </div>
            <div class="form-group">
                <label for="registroFecha">Fecha y Hora:</label>
                <input type="datetime-local" id="registroFecha" class="swal2-input form-control" required>
            </div>
            <div class="form-group">
                <label for="registroComentarios">Comentarios:</label>
                <input type="text" id="registroComentarios" class="swal2-input form-control" placeholder="Opcional">
            </div>
            <div class="form-group">
                <label for="registroEmail">Email del Usuario:</label>
                <input type="email" id="registroEmail" class="swal2-input form-control" placeholder="Ingrese el email del usuario" required>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Agregar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const accion = document.getElementById('registroAccion').value;
            const fecha = document.getElementById('registroFecha').value;
            const comentarios = document.getElementById('registroComentarios').value;
            const email = document.getElementById('registroEmail').value;

            if (!accion || !fecha || !email) {
                Swal.showValidationMessage('Por favor, completa todos los campos obligatorios.');
                return;
            }

            return { accion, fecha, comentarios, email };
        },
    });

    if (formValues) {
        const { email } = formValues;
        await agregarRegistroManual(email, formValues);
    }
}

// Función para agregar registro manual
async function agregarRegistroManual(usuarioEmail, { accion, fecha, comentarios }) {
    try {
        // Obtener el usuario desde su email
        const userDoc = await getDoc(doc(db, "usuarios", usuarioEmail));
        
        if (!userDoc.exists()) {
            Swal.fire({
                icon: 'error',
                title: 'Usuario no encontrado',
                text: 'No se pudo encontrar el usuario con el email proporcionado.',
            });
            return;
        }

        const userData = userDoc.data();

        // Crear nuevo registro
        const nuevoRegistro = {
            userId: userDoc.id,  // Usa el ID del documento en Firestore
            accion_registro: accion,
            fecha: new Date(fecha).toISOString(),  // Convierte la fecha correctamente
            lugar: 'Oficina Principal',  // Lugar fijo por ahora, puedes modificarlo si es necesario
            email: userData.email,
            empresa: userData.empresa,
            nombre: userData.nombre,
            comentarios: comentarios || '', // Incluir comentarios si se pasan
        };

        // Añadir el registro a Firestore
        const docRef = await addDoc(collection(db, 'registros'), nuevoRegistro);

        // Notificación de éxito
        Swal.fire({
            icon: 'success',
            title: 'Registro agregado',
            text: 'El registro se agregó correctamente.',
        });

        // Actualizar el contador de registros
        const totalRegistros = document.getElementById('totalRegistros');
        if (totalRegistros) {
            totalRegistros.textContent = parseInt(totalRegistros.textContent) + 1;
        }

    } catch (error) {
        console.error('Error al agregar registro:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo agregar el registro. Intenta nuevamente.',
        });
    }
}

/* Función para agregar el registro a la tabla
function agregarRegistroATabla(registro, docId) {
    const tabla = document.getElementById('listaRegistros').querySelector('tbody');
    const fila = `
        <tr data-id="${docId}">
            <td>${new Date(registro.fecha).toLocaleString('es-ES')}</td>
            <td>${registro.email}</td>
            <td>${registro.accion_registro}</td>
            <td>${registro.comentarios || 'N/A'}</td>
            <td>N/A</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-info" onclick="agregarComentario('${docId}')">
                        <i class="fas fa-comment"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editarRegistro('${docId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarRegistro('${docId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
    tabla.insertAdjacentHTML('beforeend', fila);
}
*/