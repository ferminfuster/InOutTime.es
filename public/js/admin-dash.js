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
        document.getElementById('fichajeshoy').textContent = querySnapshot.size;
        document.getElementById('usuariosRevisar').textContent = querySnapshot.size;

        // LLamar a la función contarUsuariosTrabajando y contarUsuariosRevisar
        contarUsuariosTrabajando();
        contarUsuariosRevisar();
        //fichajesPendientes();


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
// Añadir Usuarios online en Dashboard
/////////////////////////////////////
async function contarUsuariosTrabajando() {
    try {
        if (!window.empresaGlobal) {
            throw new Error("Empresa no definida");
        }

        // Obtener la fecha de hoy al inicio del día
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Referencia a la colección de registros
        const registrosRef = collection(db, 'registros');

        // Consulta para obtener todos los fichajes (entrada y salida) de hoy
        const q = query(
            registrosRef,
            where('empresa', '==', window.empresaGlobal),
            where('fecha', '>=', Timestamp.fromDate(hoy)),
            where('fecha', '<', Timestamp.fromDate(new Date(hoy.getTime() + 24 * 60 * 60 * 1000)))
        );

        // Obtener snapshot
        const querySnapshot = await getDocs(q);

        // Objeto para almacenar el último registro de cada usuario
        const registrosPorUsuario = new Map();

        querySnapshot.forEach((doc) => {
            const { email, accion_registro, fecha } = doc.data();

            // Guardar solo el registro más reciente de cada usuario
            if (!registrosPorUsuario.has(email) || registrosPorUsuario.get(email).fecha.toMillis() < fecha.toMillis()) {
                registrosPorUsuario.set(email, { accion_registro, fecha });
            }
        });

        // Convertir el Map a un array de usuarios trabajando
        const usuariosTrabajando = Array.from(registrosPorUsuario.entries())
            .filter(([_, registro]) => registro.accion_registro === 'entrada')
            .map(([email, registro]) => ({
                email,
                ultimoRegistro: registro.fecha.toDate().toLocaleString()
            }));

        // Actualizar el contador en el HTML
        const contadorElement = document.getElementById('fichajeshoy');
        contadorElement.textContent = usuariosTrabajando.length;

        // Hacer la tarjeta clickeable solo si hay usuarios trabajando
        const cardElement = contadorElement.closest('.card');
        if (usuariosTrabajando.length > 0) {
            cardElement.style.cursor = 'pointer';
            cardElement.onclick = () => {
                Swal.fire({
                    title: 'Usuarios Trabajando',
                    icon: 'info',
                    html: `
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Último Registro</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${usuariosTrabajando.map(user => `
                                    <tr>
                                        <td>${user.email}</td>
                                        <td>${user.ultimoRegistro}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `,
                    confirmButtonText: 'Entendido',
                    width: '800px'
                });
            };
        } else {
            cardElement.style.cursor = 'default';
            cardElement.onclick = null; // Eliminar evento de clic si no hay usuarios
        }

        console.log(`Usuarios actualmente trabajando en ${window.empresaGlobal}: ${usuariosTrabajando.length}`);
        return usuariosTrabajando.length;

    } catch (error) {
        console.error("Error al contar usuarios trabajando:", error);
        
        // Mostrar 0 en caso de error
        document.getElementById('fichajeshoy').textContent = '0';

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo contar los usuarios trabajando',
            confirmButtonText: 'Entendido'
        });

        return 0;
    }
}
///////////////////////////////
// Añadir Usuarios a Revisar //
///////////////////////////////
async function contarUsuariosRevisar() {
    try {
        if (!window.empresaGlobal) {
            throw new Error("Empresa no definida");
        }

        // Obtener la fecha de hoy al inicio del día
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Referencia a la colección de registros
        const registrosRef = collection(db, 'registros');

        // Consulta para obtener todos los registros de la empresa
        const q = query(
            registrosRef,
            where('empresa', '==', window.empresaGlobal),
            orderBy('fecha', 'desc') // Ordenar por fecha descendente para obtener el último registro
        );

        // Obtener snapshot
        const querySnapshot = await getDocs(q);

        // Objeto para almacenar el último registro de cada usuario
        const ultimosRegistrosPorUsuario = new Map();

        querySnapshot.forEach((doc) => {
            const { email, accion_registro, fecha } = doc.data();

            // Verificar si fecha es un Timestamp
            if (fecha instanceof Timestamp) {
                const fechaRegistro = fecha.toDate();

                // Guardar solo el registro más reciente del usuario
                if (!ultimosRegistrosPorUsuario.has(email)) {
                    ultimosRegistrosPorUsuario.set(email, { 
                        accion_registro, 
                        fecha: fechaRegistro 
                    });
                } else {
                    // Actualizar el registro si es más reciente
                    const registroActual = ultimosRegistrosPorUsuario.get(email);
                    if (fechaRegistro > registroActual.fecha) {
                        ultimosRegistrosPorUsuario.set(email, { 
                            accion_registro, 
                            fecha: fechaRegistro 
                        });
                    }
                }
            } else {
                console.warn(`El campo 'fecha' no es un Timestamp para el usuario: ${email}`);
            }
        });

        // Filtrar usuarios cuyo último registro fue "entrada" y es anterior a hoy
        const usuariosRevisar = Array.from(ultimosRegistrosPorUsuario.entries())
            .filter(([_, registro]) => registro.accion_registro === 'entrada' && registro.fecha < hoy)
            .map(([email, registro]) => ({
                email,
                ultimoRegistro: registro.fecha.toLocaleString()
            }));

        // Actualizar el contador en el HTML
        const contadorElement = document.getElementById('usuariosRevisar');
        contadorElement.textContent = usuariosRevisar.length;

        // Hacer la tarjeta clickeable solo si hay usuarios a revisar
        const cardElement = contadorElement.closest('.card');
        if (usuariosRevisar.length > 0) {
            cardElement.style.cursor = 'pointer';
            cardElement.onclick = () => {
                Swal.fire({
                    title: 'Usuarios a Revisar',
                    icon: 'warning',
                    html: `
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Último Registro</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${usuariosRevisar.map(user => `
                                    <tr>
                                        <td>${user.email}</td>
                                        <td>${user.ultimoRegistro}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `,
                    confirmButtonText: 'Entendido',
                    width: '800px'
                });
            };
        } else {
            cardElement.style.cursor = 'default';
            cardElement.onclick = null;
        }

        console.log(`Usuarios a revisar en ${window.empresaGlobal}: ${usuariosRevisar.length}`);
        return usuariosRevisar.length;

    } catch (error) {
        console.error("Error al contar usuarios a revisar:", error);
        
        document.getElementById('usuariosRevisar').textContent = '0';

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo contar los usuarios a revisar',
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
/*
async function revisarFichajesPendientes() {
    try {
        if (!window.empresaGlobal) {
            throw new Error("Empresa no definida");
        }

        // Obtener la fecha de ayer al final del día
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        ayer.setHours(0, 0, 0, 0); // Inicio del día
        const inicioAyer = Timestamp.fromDate(ayer);

        // Obtener la fecha de hoy al inicio del día
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Inicio del día
        const finAyer = Timestamp.fromDate(hoy); // Fin del día anterior

        // Referencia a la colección de registros
        const registrosRef = collection(db, 'registros');

        // Consulta para obtener registros del día anterior
        const q = query(
            registrosRef,
            where('empresa', '==', window.empresaGlobal),
            where('fecha', '>=', inicioAyer),
            where('fecha', '<', finAyer),
            orderBy('fecha', 'asc') // Ordenar por fecha
        );

        // Obtener snapshot
        const querySnapshot = await getDocs(q);

        // Crear un objeto para almacenar los usuarios a revisar
        const usuariosARevisar = {};

        // Procesar los registros
        querySnapshot.forEach((doc) => {
            const registro = doc.data();
            const email = registro.email; // Suponiendo que el campo email existe
            const accion = registro.accion_registro;

            // Si el registro es de entrada, lo marcamos
            if (accion === 'entrada') {
                usuariosARevisar[email] = 'a revisar'; // Marcar como "a revisar"
            } else if (accion === 'salida') {
                // Si hay un registro de salida, eliminamos al usuario de la lista
                delete usuariosARevisar[email];
            }
        });

        // Mostrar los usuarios a revisar
        console.log('Usuarios a revisar:', usuariosARevisar);

        // Actualizar el contador en el HTML o mostrar en la interfaz
        const contadorPendientes = document.getElementById('fichajesPendientes');
        contadorPendientes.textContent = Object.keys(usuariosARevisar).length;

        // Opcional: Mostrar detalles de los usuarios a revisar
        if (Object.keys(usuariosARevisar).length > 0) {
            Swal.fire({
                title: 'Usuarios a Revisar',
                text: `Los siguientes usuarios no han cerrado su día: ${Object.keys(usuariosARevisar).join(', ')}`,
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
        }

        return usuariosARevisar; // Retornar la lista de usuarios a revisar

    } catch (error) {
        console.error("Error al revisar fichajes pendientes:", error);
        
        // Mostrar 0 en caso de error
        const contadorPendientes = document.getElementById('fichajesPendientes');
        contadorPendientes.textContent = '0';

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo revisar los fichajes pendientes',
            confirmButtonText: 'Entendido'
        });

        return {};
    }
}
*/
// En la función revisarFichajesPendientes
//const contadorPendientes = document.getElementById('fichajesPendientes');
//contadorPendientes.textContent = Object.keys(usuariosARevisar).length;

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
        await addDoc(collection(db, 'log_usuarios_eliminados'), {
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
            await addDoc(collection(db, 'log_modificaciones_usuarios'), {
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
            collection(db, 'log_usuarios_eliminados'),
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
////////////////////////////////////
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


/////////////////////////////////////////////
// REDIMENSIONAR TABLA INFORMES ASISTENCIA //
////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
    function transformRegistrosForMobile() {
        console.log('Transforming registros, window width:', window.innerWidth);
        
        const table = document.getElementById('listaTodosAsistencia');
        const mobileList = document.getElementById('mobilelistaTodosAsistencia');

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
                        <p><strong>Días Trabajados:</strong> ${cells[2].textContent}</p>
                        <p><strong>Horas Trabajadas:</strong> ${cells[3].textContent || 'Sin Horas'}</p>
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
    
    // Ejecutar transformación de inmediato
    function initializeRegistrosTransform() {
        // Ejecutar transformación
        transformRegistrosForMobile();
        
        // Añadir un pequeño retraso para asegurar que el contenido esté completamente cargado
        setTimeout(transformRegistrosForMobile, 100);
    }

    // Ejecutar transformación al cargar la página y al redimensionar
    window.addEventListener('load', initializeRegistrosTransform);
    window.addEventListener('resize', transformRegistrosForMobile);

    // Observador de mutaciones para detectar cambios en la tabla
    const registrosTable = document.getElementById('listaTodosAsistencia');
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
/////////////////////////////////////////////
// REDIMENSIONAR TABLA INFORMES DETALLES   //
////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
    function transformRegistrosForMobile() {
        console.log('Transforming registros, window width:', window.innerWidth);
        
        const table = document.getElementById('listaTodosRegistros');
        const mobileList = document.getElementById('mobilelistaTodosRegistros');

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
                        <p><strong>Fecha:</strong> ${cells[0].textContent}</p>
                        <p><strong>Email:</strong> ${cells[1].textContent}</p>
                        <p><strong>Hora:</strong> ${cells[2].textContent}</p>
                        <p><strong>Acción:</strong> ${cells[3].textContent}</p>
                        <p><strong>Comentarios:</strong> ${cells[4].textContent || 'Sin Comentarios'}</p>
                        <div class="acciones">
                            ${cells[5].innerHTML} <!-- Acciones (botones) -->
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
    
    // Ejecutar transformación de inmediato
    function initializeRegistrosTransform() {
        // Ejecutar transformación
        transformRegistrosForMobile();
        
        // Añadir un pequeño retraso para asegurar que el contenido esté completamente cargado
        setTimeout(transformRegistrosForMobile, 100);
    }

    // Ejecutar transformación al cargar la página y al redimensionar
    window.addEventListener('load', initializeRegistrosTransform);
    window.addEventListener('resize', transformRegistrosForMobile);

    // Observador de mutaciones para detectar cambios en la tabla
    const registrosTable = document.getElementById('listaTodosRegistros');
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

///////////////////////////////////////////////
// Cargar usuarios en el combo de selección //
//////////////////////////////////////////////
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
// Cargar contenido por usuario
async function cargarRegistrosPorUsuario() {
    const usuarioId = document.getElementById('selectUsuario').value;
    const mesSeleccionado = document.getElementById('selectMes').value;
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
            orderBy('fecha', 'desc') // Orden descendente por fecha
        );

        const querySnapshot = await getDocs(q);
        
        // Filtrar registros por mes si se ha seleccionado un mes
        let registrosFiltrados = querySnapshot.docs;
        if (mesSeleccionado !== "") {
            registrosFiltrados = querySnapshot.docs.filter(doc => {
                const fecha = doc.data().fecha?.toDate();
                return fecha && fecha.getMonth() == mesSeleccionado; // Filtrar por mes
            });
        }

        // Actualizar total de registros
        totalRegistros.textContent = registrosFiltrados.length;

        if (registrosFiltrados.length === 0) {
            listaRegistros.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No hay registros para este usuario</td>
                </tr>
            `;
            return;
        }

        // Depuración: Verificar registros filtrados
        console.log("Registros filtrados:", registrosFiltrados);

        // Procesar registros y agrupar por días
        const registrosPorDia = agruparRegistrosPorDia(registrosFiltrados);

        // Renderizar tabla
        Object.keys(registrosPorDia).forEach((dia) => {
            const registros = registrosPorDia[dia];
            const horasTrabajadas = calcularHorasTrabajadas(registros);

            registros.forEach((registro, index) => {
                // Depuración: Verificar cada registro
                console.log("Registro individual:", registro);

                const fecha = registro.fecha?.toDate();
                const hora = fecha ? fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'; // Formato de hora
                const fila = `
                    <tr data-id="${registro.id}">
                        <td>${index === 0 ? dia : ''}</td>
                        <td>${registro.email || 'N/A'}</td>
                        <td>${hora}</td>
                        <td>${registro.accion_registro || 'N/A'}</td>
                        <td>${registro.comentario || 'Sin Comentarios'}</td>
                        <td>${index === 0 ? horasTrabajadas : ''}</td>
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

//////////////////////////////////////
// Agregar comentario a un registro //
//////////////////////////////////////
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
            // Mostrar notificación
            Swal.fire('Comentario añadido', '', 'success');
            
            // Cargar de nuevo la pagina de registro
            cargarRegistrosPorUsuario();
        } catch (error) {
            Swal.fire('Error', 'No se pudo añadir el comentario', 'error');
        }
    }
}

window.agregarComentario = agregarComentario;
window.editarRegistro = editarRegistro;
//////////////////////
// Editar registro ///
//////////////////////
async function editarRegistro(registroId) {
    const auth = getAuth();
    const usuarioActual = auth.currentUser;

    if (!usuarioActual) {
        Swal.fire({
            icon: 'error',
            title: 'No autorizado',
            text: 'Debes estar logueado para editar un registro.',
        });
        return;
    }

    const registroRef = doc(db, 'registros', registroId);
    const registroSnapshot = await getDoc(registroRef);

    if (!registroSnapshot.exists()) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'El registro no existe.',
        });
        return;
    }

    const registroData = registroSnapshot.data();

    const { value: formValues } = await Swal.fire({
        title: 'Editar Registro',
        html: `
            <div class="form-group">
                <label for="editarAccion">Acción:</label>
                <select id="editarAccion" class="swal2-input form-control">
                    <option value="entrada" ${registroData.accion_registro === 'entrada' ? 'selected' : ''}>Entrada</option>
                    <option value="salida" ${registroData.accion_registro === 'salida' ? 'selected' : ''}>Salida</option>
                    <option value="incidencia" ${registroData.accion_registro === 'incidencia' ? 'selected' : ''}>Incidencia</option>
                </select>
            </div>
            <div class="form-group">
                <label for="editarFecha">Fecha y Hora:</label>
                <input type="datetime-local" id="editarFecha" class="swal2-input form-control" value="${registroData.fecha.toDate().toISOString().slice(0, 16)}" required>
            </div>
            <div class="form-group">
                <label for="editarComentarios">Comentarios:</label>
                <input type="text" id="editarComentarios" class="swal2-input form-control" placeholder="Opcional" value="${registroData.comentario || ''}">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const accion = document.getElementById('editarAccion').value;
            const fecha = document.getElementById('editarFecha').value;
            const comentarios = document.getElementById('editarComentarios').value;

            if (!accion || !fecha) {
                Swal.showValidationMessage('Por favor, completa todos los campos obligatorios.');
                return;
            }

            return { accion, fecha, comentarios };
        },
    });

    if (formValues) {
        try {
            const cambios = {
                accion_anterior: registroData.accion_registro,
                accion_nueva: formValues.accion,
                fecha_anterior: registroData.fecha,
                fecha_nueva: Timestamp.fromDate(new Date(formValues.fecha)),
                comentario_anterior: registroData.comentario || '',
                comentario_nuevo: formValues.comentarios || '',
                usuarioModifico: usuarioActual.email,
                fechaModificacion: serverTimestamp(),
            };

            // Guardar en la colección de modificaciones_registros
            await addDoc(collection(db, 'log_modificaciones_registros'), {
                registroId,
                ...cambios,
            });

            // Actualizar el registro original en la colección registros
            await updateDoc(registroRef, {
                accion_registro: formValues.accion,
                fecha: Timestamp.fromDate(new Date(formValues.fecha)),
                comentario: formValues.comentarios || '',
                comentario_fecha: serverTimestamp(),
            });

            Swal.fire('Registro actualizado', '', 'success');

            // Recargar los registros
            await cargarRegistrosPorUsuario();
        } catch (error) {
            console.error('Error al actualizar el registro:', error);
            Swal.fire('Error', 'No se pudo actualizar el registro. Intenta nuevamente.', 'error');
        }
    }
}
//////////////////////////
///// Eliminar registro //
/////////////////////////
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
            const auth = getAuth();
            const usuario = auth.currentUser;

            if (!usuario) {
                Swal.fire('Error', 'No se pudo identificar al usuario. Inicia sesión nuevamente.', 'error');
                return;
            }

            // Obtener el registro antes de eliminarlo
            const registroRef = doc(db, 'registros', registroId);
            const registroSnapshot = await getDoc(registroRef);

            if (!registroSnapshot.exists()) {
                Swal.fire('Error', 'El registro no existe.', 'error');
                return;
            }

            const registroData = registroSnapshot.data();

            // Guardar información de la eliminación en modificaciones_registros
            const eliminacionData = {
                registroId: registroId,
                accion_realizada: "eliminado",
                fecha_modificacion: serverTimestamp(),
                usuario_modificador: usuario.email,
                detalles_anteriores: registroData,  // Guarda el estado antes de ser eliminado
            };

            await addDoc(collection(db, 'log_modificaciones_registros'), eliminacionData);

            // Eliminar el registro de Firestore
            await deleteDoc(registroRef);

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
/////////////////////////////////////////////////////
// Mostrar formulario para agregar registro manual //
/////////////////////////////////////////////////////

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
/*
async function agregarRegistroManual(usuarioEmail, { accion, fecha, comentarios }) {
    try {
        // Obtener referencia a la colección de usuarios
        const usuariosRef = collection(db, "usuarios");

        // Crear una consulta para buscar el documento que tenga el campo "email" igual al email proporcionado
        const q = query(usuariosRef, where("email", "==", usuarioEmail));
        const querySnapshot = await getDocs(q);

        // Verificar si se encontró algún documento
        if (querySnapshot.empty) {
            Swal.fire({
                icon: 'error',
                title: 'Usuario no encontrado',
                text: 'No se pudo encontrar el usuario con el email proporcionado.',
            });
            return;
        }

        // Tomar el primer documento encontrado (asumimos que el email es único en la base de datos)
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        // Crear nuevo registro
        const nuevoRegistro = {
            userId: userDoc.id,  // Usa el ID del documento en Firestore
            accion_registro: accion,
            fecha: Timestamp.fromDate(new Date(fecha)),  //
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
        // Cargar de nuevo la pagina de registro
        cargarRegistrosPorUsuario();

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
}*/
async function agregarRegistroManual(usuarioEmail, { accion, fecha, comentarios }) {
    try {
        const auth = getAuth();
        const usuarioActual = auth.currentUser;

        if (!usuarioActual) {
            Swal.fire({
                icon: 'error',
                title: 'No autorizado',
                text: 'Debes estar logueado para realizar esta acción.',
            });
            return;
        }

        const adminEmail = usuarioActual.email; // Usuario logueado que realiza la acción
        const usuariosRef = collection(db, "usuarios");
        const q = query(usuariosRef, where("email", "==", usuarioEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            Swal.fire({
                icon: 'error',
                title: 'Usuario no encontrado',
                text: 'No se pudo encontrar el usuario con el email proporcionado.',
            });
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        //Obtener IP del usuario que realiza la acción
        //const ipResponse = await fetch('https://api64.ipify.org?format=json');
        //const ipData = await ipResponse.json();
        //const userIp = ipData.ip;

        const nuevoRegistro = {
            userId: userDoc.id,
            accion_registro: accion,
            fecha: Timestamp.fromDate(new Date(fecha)),
            lugar: 'Administración',
            email: userData.email,
            empresa: userData.empresa,
            nombre: userData.nombre,
            comentarios: comentarios || 'Fichaje realizado de forma manual',
            modificadoPor: adminEmail,  // Usuario logueado que hizo la modificación
            fechaModificacion: Timestamp.now(),
           // ipModificacion: userIp,  // IP del usuario que modifica
        };

        const docRef = await addDoc(collection(db, 'registros'), nuevoRegistro);

        Swal.fire({
            icon: 'success',
            title: 'Registro agregado',
            text: 'El registro se agregó correctamente.',
        });

        cargarRegistrosPorUsuario();

    } catch (error) {
        console.error('Error al agregar registro:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo agregar el registro. Intenta nuevamente.',
        });
    }
}




function descargarRegistros() {
    const listaRegistros = document.getElementById('listaRegistros').outerHTML;
    const blob = new Blob([listaRegistros], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registros_usuario.xls'; // Nombre del archivo
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function imprimirRegistros() {
    const listaRegistros = document.getElementById('listaRegistros').outerHTML;
    const ventanaImpresion = window.open('', '', 'height=600,width=800');
    ventanaImpresion.document.write('<html><head><title>Imprimir Registros</title>');
    ventanaImpresion.document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">'); // Si usas Font Awesome
    ventanaImpresion.document.write('<style>table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #000; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style>');
    ventanaImpresion.document.write('</head><body>');
    ventanaImpresion.document.write('<h1>Registros del Usuario</h1>');
    ventanaImpresion.document.write(listaRegistros);
    ventanaImpresion.document.write('</body></html>');
    ventanaImpresion.document.close();
    ventanaImpresion.print();
}
window.imprimirRegistros = imprimirRegistros;
window.descargarRegistros = descargarRegistros;
////////////////////////
/// SECCION INFORMES ///
////////////////////////
window.cargarRegistrosTotales = cargarRegistrosTotales;
// Cargar Registros de todos los usuarios.
async function cargarRegistrosTotales() {
    const mesSeleccionado = document.getElementById('selectMestotal').value;
    const listaRegistros = document.getElementById('listaTodosRegistros').getElementsByTagName('tbody')[0];
   // const totalRegistros = document.getElementById('totalRegistros');

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
        const empresaId = await obtenerEmpresaId();
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

// Función para obtener el ID de la empresa del usuario actual
async function obtenerEmpresaId() {
    try {
        const user = auth.currentUser ; // Asegúrate de que 'auth' esté correctamente inicializado
        if (!user) {
            console.error('No hay usuario autenticado');
            return null;
        }

        const userDoc = await getDoc(doc(db, 'usuarios', user.uid)); // Asegúrate de que 'usuarios' sea la colección correcta
        if (userDoc.exists()) {
            return userDoc.data().empresa; // Asegúrate de que este campo coincida con tu estructura de datos
        } else {
            console.error('No se encontró el documento del usuario');
            return null;
        }
    } catch (error) {
        console.error('Error al obtener el ID de la empresa:', error);
        return null;
    }
}
///////////////////////////////////////////
// INFORMES - Cargan Resumen Asistencia //
/////////////////////////////////////////
async function cargarResumenAsistencia() {
    const mesSeleccionado = document.getElementById('selectMestotal').value;
    const listaAsistencia = document.getElementById('listaTodosAsistencia').getElementsByTagName('tbody')[0];

    //const mesSeleccionado = document.getElementById('selectMestotal').value;
    console.log("Mes seleccionado:", mesSeleccionado);  // Depuración para ver el valor obtenido

    //const listaAsistencia = document.getElementById('listaTodosAsistencia').getElementsByTagName('tbody')[0];

    // Validar que se haya seleccionado un mes (no vacío y es un número entre 0 y 11)
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

    try {
        const empresaId = await obtenerEmpresaId();
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
                ...(mesSeleccionado !== "" 
                    ? [where('fecha', '>=', new Date(new Date().getFullYear(), mesSeleccionado, 1)),
                       where('fecha', '<=', new Date(new Date().getFullYear(), mesSeleccionado + 1, 0))] 
                    : [])
            );

            const registrosSnapshot = await getDocs(qRegistros);

            // Calcular total de horas y días trabajados
            let totalHoras = 0; 
            const diasTrabajados = new Set(); 

            // Asegúrate de que los registros se procesen correctamente
            const registros = registrosSnapshot.docs.map(doc => doc.data());

            registros.forEach(registroDoc => {
                const registro = registroDoc;
                const fecha = registro.fecha.toDate();
                diasTrabajados.add(fecha.toLocaleDateString());
            });

            // Calcular horas trabajadas usando la función
            totalHoras = calcularHorasTrabajadas(registros);

            return {
                email: usuario.email,
                diasTrabajados: diasTrabajados.size,
                totalHoras: totalHoras // Mantener como número
            };
        });

        // Esperar a que se procesen todos los usuarios
        const resumen = await Promise.all(resumenPromises);

        // Renderizar resumen
        resumen.forEach(item => {
            const horasFormateadas = typeof item.totalHoras === 'string' ? item.totalHoras : item.totalHoras.toFixed(2) + ' hrs';
            const fila = `
                <tr>
                    <td>${mesSeleccionado !== "" 
                        ? new Date(new Date().getFullYear(), mesSeleccionado).toLocaleString('default', { month: 'long' }) 
                        : 'Todos los meses'}</td>
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

// Agregar el evento para cargar el resumen al cambiar el mes
document.getElementById('selectMestotal').addEventListener('change', () => {
    cargarResumenAsistencia();
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


//////////// Global //////
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


