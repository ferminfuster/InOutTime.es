import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, sendPasswordResetEmail  } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBF7gSoZD2mebyD_Kwl-sq5y1ZfErYZfrs",
  authDomain: "inouttime-25fe6.firebaseapp.com",
  projectId: "inouttime-25fe6",
  storageBucket: "inouttime-25fe6.firebasestorage.app",
  messagingSenderId: "652540896490",
  appId: "1:652540896490:web:3126fd620a097e7ab52393",
  measurementId: "G-DDB4BPZ5Z6"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function obtenerUltimoRegistro(userId) {
    try {
      const registrosRef = collection(db, "registros");
      const q = query(
        registrosRef, 
        where("userId", "==", userId)
      );
  
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Filtrar y ordenar manualmente
        const registros = querySnapshot.docs
          .map(doc => doc.data())
          .filter(registro => registro.userId === userId)
          .sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());

        const ultimoRegistro = registros[0];
        console.log("Último registro encontrado:", ultimoRegistro);
        return ultimoRegistro;
      } else {
        console.log("No se encontraron registros para este usuario");
        return null;
      }
    } catch (error) {
      console.error("Error al obtener último registro:", error);
      return null;
    }
  }
  // Función para validar la acción de registro
  /*
  async function validarAccionRegistro(accion) {
    try {
      const user = auth.currentUser;
      if (!user) {
        mostrarError("Usuario no autenticado");
        return false;
      }
  
      const ultimoRegistro = await obtenerUltimoRegistro(user.uid);
  
      // Si no hay registros previos, solo permite entrada
      if (!ultimoRegistro) {
        return accion === 'entrada';
      }
  
      // Lógica de validación basada en el último registro
      switch(accion) {
        case 'entrada':
          // Solo permite entrada si el último registro es salida
          return ultimoRegistro.accion_registro === 'salida';
        case 'salida':
          // Solo permite salida si el último registro es entrada
          return ultimoRegistro.accion_registro === 'entrada';
        case 'incidencia':
          // Solo permite incidencia si el último registro es entrada
          return ultimoRegistro.accion_registro === 'entrada';
        default:
          return false;
      }
    } catch (error) {
      console.error("Error al validar acción:", error);
      return false;
    }
  }*/


// Función para validar la acción de registro
// Tiempo mínimo entre registros en milisegundos (Ejemplo: 30 segundos)
const TIEMPO_MINIMO_ENTRE_REGISTROS = 30000; 

// Función para validar la acción de registro
async function validarAccionRegistro(accion) {
  try {
    const user = auth.currentUser;
    if (!user) {
      mostrarNotificacionError("Usuario no autenticado");
      return false;
    }

    const ultimoRegistro = await obtenerUltimoRegistro(user.uid);

    // Si no hay registros previos, solo permite entrada
    if (!ultimoRegistro) {
      return accion === 'entrada';
    }

    // Convertir la fecha del último registro a un objeto Date
    const fechaUltimoRegistro = new Date(ultimoRegistro.fecha.seconds * 1000); // Firestore almacena timestamps con seconds y nanoseconds
    const fechaActual = new Date();

    // Verificar si el último registro fue hace menos del tiempo mínimo permitido
    if (fechaActual - fechaUltimoRegistro < TIEMPO_MINIMO_ENTRE_REGISTROS) {
      mostrarNotificacionError("Debes esperar unos segundos antes de fichar nuevamente.");
      return false;
    }

    // Verificar si el último registro es de otro día
    const esOtroDia = fechaUltimoRegistro.toDateString() !== fechaActual.toDateString();

    // Lógica de validación basada en el último registro y la fecha actual
    switch (accion) {
      case 'entrada':
        if (ultimoRegistro.accion_registro === 'salida' || ultimoRegistro.accion_registro === 'incidencia') {
          return true; // Permitir entrada
        } else if (esOtroDia && ultimoRegistro.accion_registro === 'entrada') {
          notificarPendienteCierre(user);
          return true; // Permitir entrada con advertencia
        }
        return false; // No permitir entrada en otros casos

      case 'salida':
      case 'incidencia':
        return ultimoRegistro.accion_registro === 'entrada' && !esOtroDia;

      default:
        return false;
    }
  } catch (error) {
    console.error("Error al validar acción:", error);
    return false;
  }
}

// Función para registrar acción con notificaciones
async function registrarAccion(accion) {
  try {
    const puedeRegistrar = await validarAccionRegistro(accion);

    if (!puedeRegistrar) {
      return;
    }

    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    const userData = userDoc.data();

    const nuevoRegistro = {
      userId: user.uid,
      accion_registro: accion,
      fecha: serverTimestamp(),
      lugar: obtenerLugarActual(),
      email: user.email,
      empresa: userData.empresa,
      nombre: userData.nombre
    };

    const registrosRef = collection(db, "registros");
    await setDoc(doc(registrosRef), nuevoRegistro);

    mostrarNotificacionExito(`¡${accion.charAt(0).toUpperCase() + accion.slice(1)} registrada correctamente!`);
    await mostrarUltimoRegistro(user.uid);

  } catch (error) {
    console.error(`Error al registrar ${accion}:`, error);
    mostrarNotificacionError('Hubo un problema al registrar la acción. Inténtalo nuevamente.');
  }
}

// Función para notificar día pendiente de cierre
function notificarPendienteCierre() {
  Swal.fire({
    icon: 'warning',
    title: '¡Día pendiente de cierre!',
    text: `Tu último fichaje fue una "Entrada" de otro día. Contacta con el administrador.`,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000
  });
}
  // Función para registrar acción
 // Función para mostrar notificación de éxito
 function mostrarNotificacionExito(mensaje) {
  Swal.fire({
    icon: 'success',
    title: '¡Registro Exitoso!',
    text: mensaje,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000
  });
}

// Función para mostrar notificación de error
function mostrarNotificacionError(mensaje) {
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: mensaje,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
}

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Obtener los datos del usuario desde Firestore
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Mostrar los datos del usuario en la página
      document.getElementById("nombreUser").textContent = userData.nombre || "No disponible";
      document.getElementById("emailUser").textContent = userData.email || "No disponible";
      document.getElementById("empresaUser").textContent = userData.empresa || "No disponible";

      // Mostrar u ocultar elementos según el rol
      if (userData.rol === "admin") {
        // Mostrar los botones solo para administradores
        document.getElementById("admin-buttons").style.display = "block";
      } else {
        // Ocultar los botones de administrador para los usuarios comunes
        document.getElementById("admin-buttons").style.display = "none";
      }
      // Mostrar último registro del usuario
      await mostrarUltimoRegistro(user.uid);
      await calcularHorasTrabajadasHoy();
      //verificarSalidaAnterior();

    } else {
      //console.log("No se encontraron datos para este usuario.");
      //alert("Usuario no autorizado.");
      //window.location.href = "login.html";
      handleUnauthorizedAccess();
    }
  } else {
    // Si no hay un usuario logueado, redirigir al login y mostrar una alerta
    //alert("Usuario no autorizado.");
    //window.location.href = "login.html";
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

// Funciones auxiliares de mensajes
function mostrarMensaje(mensaje) {
    // Puedes personalizar esto para usar un toast o modal
    alert(mensaje);
}

function mostrarError(mensaje) {
    // Puedes personalizar esto para usar un toast o modal de error
    alert(mensaje);
}

// Función para obtener lugar actual
function obtenerLugarActual() {
    // Puedes implementar geolocalización o usar un valor predeterminado
    return 'Oficina Principal';
}

// Definir funciones globales para registrar acciones
window.registrarEntrada = function() {
    registrarAccion('entrada');
};

window.registrarSalida = function() {
    registrarAccion('salida');
};

window.registrarIncidencia = function() {
    registrarAccion('incidencia');
};

//// Mostrar Información del último registro

async function mostrarUltimoRegistro(userId) {
  const statusUser = document.getElementById("statusUser");

  if (!statusUser) {
      console.error("Elemento 'statusUser' no encontrado en el DOM.");
      return;
  }

  const ultimoRegistro = await obtenerUltimoRegistro(userId);

  if (ultimoRegistro) {
      const fechaRegistro = ultimoRegistro.fecha.toDate();
      const fechaFormateada = fechaRegistro.toLocaleString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric"
      });

      const horaFormateada = fechaRegistro.toLocaleString("es-ES", {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
      });

      const configuraciones = {
          "entrada": {
              icono: "fas fa-sign-in-alt",
              clase: "status-entrada",
              texto: "Entrada"
          },
          "salida": {
              icono: "fas fa-sign-out-alt",
              clase: "status-salida",
              texto: "Salida"
          },
          "incidencia": {
              icono: "fas fa-exclamation-triangle",
              clase: "status-incidencia",
              texto: "Incidencia"
          },
          "default": {
              icono: "fas fa-question",
              clase: "",
              texto: "Desconocida"
          }
      };

      const config = configuraciones[ultimoRegistro.accion_registro.toLowerCase()] || configuraciones.default;

      statusUser.innerHTML = `
      <div class="user-status-element ${config.clase}">
          <span>${config.texto} el ${fechaFormateada} a las ${horaFormateada}</span>
      </div>
    `;
    

  } else {
      statusUser.innerHTML = `
          <div class="user-status-container">
              <div class="user-status-element">
                  <span>Sin Registros</span>
              </div>
          </div>
      `;
  }
}
//// Descargar csv
// Función para descargar registros como CSV
/*
window.descargarRegistrosComoCSV = async function () {
  try {
      // Obtener el usuario autenticado
      const user = auth.currentUser;
      if (!user) {
          alert("No hay un usuario autenticado.");
          return;
      }

      const userId = user.uid; // Obtener el ID del usuario autenticado

      // Obtener los registros desde Firestore
      const registrosSnapshot = await getDocs(collection(db, "registros"));
      const registros = registrosSnapshot.docs
          .map(doc => doc.data())
          .filter(registro => registro.userId === userId); // Filtrar por el usuario autenticado

      if (registros.length === 0) {
          alert("No hay registros para descargar.");
          return;
      }

      // Encabezados CSV
      const encabezados = [
          "Fecha",
          "Hora",
          "Acción",
          "Email",
          "Lugar",
          "UserID",
          "Nombre",
          "Empresa"
      ];

      // Construcción de filas CSV
      const filas = registros.map(registro => {
          // Convertir marca de tiempo a una fecha legible
          const fecha = registro.fecha && registro.fecha.toDate
              ? registro.fecha.toDate().toLocaleString("es-ES", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZoneName: "short"
                })
              : "Sin fecha";

          return [
              fecha, // Fecha formateada
              registro.accion_registro || "N/A", // Acción
              registro.email || "N/A", // Email
              registro.lugar || "N/A", // Lugar
              registro.userId || "N/A", // UserID
              registro.nombre || "N/A", // Nombre
              registro.empresa || "N/A" // Empresa
          ]
              .map(valor => `"${valor.replace(/"/g, '""')}"`) // Escapar comillas
              .join(",");
      });

      const contenidoCSV = [encabezados.join(","), ...filas].join("\n");

      // Crear y descargar el archivo CSV
      const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      enlace.download = `registros_usuario_${userId}_${new Date().toISOString().split('T')[0]}.csv`;
      enlace.click();
  } catch (error) {
      console.error("Error al descargar registros:", error);
      alert("Ocurrió un error al descargar los registros.");
  }
};
*/

///Reset password
// Agregar la función al objeto global
window.cambiarPassword = function() {
  const user = auth.currentUser;

  if (user && user.email) {
    Swal.fire({
      title: '¿Deseas cambiar tu contraseña?',
      text: "Se enviará un correo de restablecimiento a tu email.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar correo',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await sendPasswordResetEmail(auth, user.email);
          Swal.fire({
            icon: 'success',
            title: 'Correo enviado',
            text: 'Revisa tu bandeja de entrada.',
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
///
// Mis Informes
// Función principal para mostrar informes
window.mostrarMisInformes = async function() {
  try {
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

      const userId = user.uid;

      // Consulta con el índice correcto
      const q = query(
          collection(db, "registros"), 
          where("userId", "==", userId)
      );

      const registrosSnapshot = await getDocs(q);

      const registros = registrosSnapshot.docs
          .map(doc => ({
              id: doc.id,
              ...doc.data()
          }))
          .filter(registro => registro.userId === userId)
          // Ordenar manualmente
          .sort((a, b) => b.fecha.toDate() - a.fecha.toDate());

      if (registros.length === 0) {
          Swal.fire({
              icon: 'info',
              title: 'Sin Registros',
              text: 'No hay registros disponibles.'
          });
          return;
      }

      // Procesar registros para crear resumen diario
      const registrosProcesados = procesarRegistrosDiarios(registros);

      // Mostrar modal con los registros
      Swal.fire({
          title: 'Mis Informes',
          html: `
              <style>
                  .informes-modal {
                      width: 100%;
                      max-width: 800px;
                  }
                  .tabla-informes {
                      width: 100%;
                      border-collapse: collapse;
                  }
                  .tabla-informes th, .tabla-informes td {
                      border: 1px solid #ddd;
                      padding: 8px;
                      text-align: center;
                  }
                  .tabla-informes thead {
                      background-color: #f2f2f2;
                  }
                  .acciones-informes {
                      display: flex;
                      justify-content: space-around;
                      margin-top: 20px;
                  }
              </style>
              <div class="informes-modal">
                  <table class="tabla-informes">
                      <thead>
                          <tr>
                              <th>Fecha</th>
                              <th>Hora Entrada</th>
                              <th>Hora Salida</th>
                              <th>Horas Trabajadas</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${registrosProcesados.map(registro => `
                              <tr>
                                  <td>${registro.fecha}</td>
                                  <td>${registro.entrada}</td>
                                  <td>${registro.salida}</td>
                                  <td>${registro.horasTrabajadas}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
                  <div class="acciones-informes">
                      <button id="btnDescargarInforme" class="btn btn-primary">
                          <i class="fas fa-download"></i> Descargar
                      </button>
                      <button id="btnEnviarInforme" class="btn btn-success">
                          <i class="fas fa-envelope"></i> Enviar por Email
                      </button>
                      <button id="btnImprimirInforme" class="btn btn-info">
                          <i class="fas fa-print"></i> Imprimir
                      </button>
                  </div>
              </div>
          `,
          showConfirmButton: false,
          width: '90%',
          didRender: () => {
              // Eventos para los botones
              document.getElementById('btnDescargarInforme').addEventListener('click', () => descargarInformeCSV(registrosProcesados));
              document.getElementById('btnEnviarInforme').addEventListener('click', () => enviarInformePorEmail(registrosProcesados, user));
              document.getElementById('btnImprimirInforme').addEventListener('click', imprimirInforme);
              //document.getElementById('btnCerrarModal').addEventListener('click', () => Swal.close());
          }
      });

  } catch (error) {
      console.error("Error al mostrar informes:", error);
      
      // Manejo específico de errores de índice
      if (error.message.includes("requires an index")) {
          Swal.fire({
              icon: 'warning',
              title: 'Índice Necesario',
              html: `
                  <p>Se requiere crear un índice en Firestore.</p>
                  <a href="https://console.firebase.google.com/v1/r/project/inouttime-25fe6/firestore/indexes" 
                     target="_blank" class="btn btn-primary">
                      Crear Índice
                  </a>
              `,
              showConfirmButton: false
          });
      } else {
          Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Ocurrió un error al cargar los registros: ' + error.message
          });
      }
  }
};

// Función para procesar registros
function procesarRegistrosDiarios(registros) {
  const registrosPorFecha = {};

  registros.forEach(registro => {
      const fecha = registro.fecha.toDate();
      const fechaKey = fecha.toLocaleDateString('es-ES');

      if (!registrosPorFecha[fechaKey]) {
          registrosPorFecha[fechaKey] = {
              entrada: null,
              salida: null
          };
      }

      if (registro.accion_registro === 'entrada' && 
          (!registrosPorFecha[fechaKey].entrada || 
           registro.fecha.toDate() < registrosPorFecha[fechaKey].entrada)) {
          registrosPorFecha[fechaKey].entrada = registro.fecha.toDate();
      } else if (registro.accion_registro === 'salida' && 
                 (!registrosPorFecha[fechaKey].salida || 
                  registro.fecha.toDate() > registrosPorFecha[fechaKey].salida)) {
          registrosPorFecha[fechaKey].salida = registro.fecha.toDate();
      }
  });

  return Object.keys(registrosPorFecha).map(fechaKey => {
      const registroDia = registrosPorFecha[fechaKey];
      const { entrada, salida } = registroDia;
      
      let horasTrabajadas = 'N/A';

      if (entrada && salida) {
          const diferenciaMs = salida - entrada;
          const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
          const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
          horasTrabajadas = `${horas} horas ${minutos} minutos`;
      }

      return {
          fecha: fechaKey,
          entrada: entrada ? entrada.toLocaleTimeString('es-ES') : 'N/A',
          salida: salida ? salida.toLocaleTimeString('es-ES') : 'N/A',
          horasTrabajadas
      };
  });
}

// Función para descargar CSV
function descargarInformeCSV(registros) {
  const encabezados = ["Fecha", "Hora Entrada", "Hora Salida", "Horas Trabajadas"];
  
  const filas = registros.map(registro => 
      [registro.fecha, registro.entrada, registro.salida, registro.horasTrabajadas]
                      .map(valor => `"${valor.replace(/"/g, '""')}"`)
          .join(",")
  );

  const contenidoCSV = [encabezados.join(","), ...filas].join("\n");

  const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `informe_horas_${new Date().toISOString().split('T')[0]}.csv`;
  enlace.click();
}

// Función de envío de email (placeholder)
function enviarInformePorEmail(registros, user) {
  Swal.fire({
      icon: 'info',
      title: 'Enviar Informe',
      text: 'Funcionalidad de envío por email próximamente.',
      confirmButtonText: 'Entendido'
  });
}

// Función de impresión
function imprimirInforme() {
  // Obtener el usuario actual
  const user = auth.currentUser;
  
  const contenidoImpresion = document.querySelector('.tabla-informes').outerHTML;
  
  const ventanaImpresion = window.open('', '', 'width=600,height=800');
  ventanaImpresion.document.open();
  ventanaImpresion.document.write(`
      <html>
          <head>
              <title>Informe de Horas</title>
              <style>
                  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
                  
                  body { 
                      font-family: 'Roboto', Arial, sans-serif; 
                      margin: 0;
                      padding: 20px;
                      line-height: 1.6;
                      color: #333;
                  }
                  .header {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      border-bottom: 2px solid #007bff;
                      padding-bottom: 15px;
                      margin-bottom: 20px;
                  }
                  .logo {
                      max-width: 80px;  // Reducido de 150px a 80px
                      max-height: 50px; // Reducido de 80px a 50px
                      object-fit: contain; // Mantiene la proporción
                  }
                  .header-info {
                      text-align: right;
                  }
                  table { 
                      width: 100%; 
                      border-collapse: collapse; 
                      margin-bottom: 20px;
                      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                  }
                  th, td { 
                      border: 1px solid #ddd; 
                      padding: 10px; 
                      text-align: center; 
                  }
                  th { 
                      background-color: #f8f9fa;
                      font-weight: 600;
                      color: #333;
                  }
                  .footer {
                      text-align: center;
                      border-top: 1px solid #ddd;
                      padding-top: 10px;
                      font-size: 0.9em;
                      color: #666;
                  }
                  @media print {
                      body { 
                          margin: 0; 
                          padding: 0;
                      }
                      .no-print {
                          display: none;
                      }
                  }
              </style>
          </head>
          <body>
              <div class="header">
              <img src="images/logo.png" alt="InOutTime Logo" class="logo">
                  <div class="header-info">
                      <h2>Informe de Horas Trabajadas</h2>
                      <p>Empleado: ${user ? user.email || user.email : 'Usuario'}</p>
                      <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
                  </div>
              </div>

              ${contenidoImpresion}

              <div class="footer">
                  <p>Informe generado por InOutTime | © ${new Date().getFullYear()}</p>
              </div>
          </body>
      </html>
  `);
  ventanaImpresion.document.close();
  
  // Abrir diálogo de impresión
  ventanaImpresion.print();
}
// Exportar funciones globalmente si es necesario
window.descargarInformeCSV = descargarInformeCSV;
window.enviarInformePorEmail = enviarInformePorEmail;
window.imprimirInforme = imprimirInforme;

/*
window.calcularHorasTrabajadasHoy = async function() {
  console.log("Acabo de entrar en la función Horas trabajadas");
  try {
    const user = auth.currentUser;
    if (!user) {
        document.getElementById('horasHoy').textContent = 'N/A';
        return;
    }

    const userId = user.uid;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mañana = new Date(hoy);
    mañana.setDate(hoy.getDate() + 1);

    const q = query(
        collection(db, "registros"),
        where("userId", "==", userId),
        where("fecha", ">=", hoy),
        where("fecha", "<", mañana),
        orderBy("fecha")
    );

    const registrosSnapshot = await getDocs(q);
    const registros = registrosSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.fecha.toDate() - b.fecha.toDate()); // En caso de que la consulta no lo ordene bien

    let primeraEntrada = null;
    let ultimaSalida = null;

    registros.forEach(registro => {
        if (registro.accion_registro === 'entrada') {
            if (!primeraEntrada || registro.fecha.toDate() < primeraEntrada) {
                primeraEntrada = registro.fecha.toDate();
            }
        } else if (registro.accion_registro === 'salida') {
            if (!ultimaSalida || registro.fecha.toDate() > ultimaSalida) {
                ultimaSalida = registro.fecha.toDate();
            }
        }
    });

    let horasTrabajadasHoy = 'N/A';
    if (primeraEntrada && ultimaSalida) {
        const diferenciaMs = ultimaSalida - primeraEntrada;
        const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
        const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
        horasTrabajadasHoy = `${horas} horas ${minutos} minutos`;
    } else if (primeraEntrada && !ultimaSalida) {
        const ahora = new Date();
        const diferenciaMs = ahora - primeraEntrada;
        const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
        const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
        horasTrabajadasHoy = `${horas} horas ${minutos} minutos (en curso)`;
    }

    document.getElementById('horasHoy').textContent = horasTrabajadasHoy;
  } catch (error) {
    console.error("Error al calcular horas trabajadas hoy:", error);
    document.getElementById('horasHoy').textContent = 'Error';
  }
};
*/
window.calcularHorasTrabajadasHoy = async function() {
  console.log("Calculando horas trabajadas hoy");
  try {
    const user = auth.currentUser;
    if (!user) {
        document.getElementById('horasHoy').textContent = 'N/A';
        return;
    }

    const userId = user.uid;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mañana = new Date(hoy);
    mañana.setDate(hoy.getDate() + 1);

    const q = query(
        collection(db, "registros"),
        where("userId", "==", userId),
        where("fecha", ">=", hoy),
        where("fecha", "<", mañana),
        orderBy("fecha")
    );

    const registrosSnapshot = await getDocs(q);
    const registros = registrosSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.fecha.toDate() - b.fecha.toDate());

    console.log("Registros del día:", registros);

    let primeraEntrada = null;
    let ultimaSalida = null;

    registros.forEach(registro => {
        const fechaRegistro = registro.fecha.toDate();
        
        if (registro.accion_registro === 'entrada') {
            if (!primeraEntrada || fechaRegistro < primeraEntrada) {
                primeraEntrada = fechaRegistro;
            }
        } else if (registro.accion_registro === 'salida') {
            if (!ultimaSalida || fechaRegistro > ultimaSalida) {
                ultimaSalida = fechaRegistro;
            }
        }
    });

    let horasTrabajadasHoy = 'N/A';
    if (primeraEntrada && ultimaSalida) {
        const diferenciaMs = ultimaSalida - primeraEntrada;
        const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
        const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
        horasTrabajadasHoy = `${horas} horas ${minutos} minutos`;
    } else if (primeraEntrada && !ultimaSalida) {
        const ahora = new Date();
        const diferenciaMs = ahora - primeraEntrada;
        const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
        const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
        horasTrabajadasHoy = `${horas} horas ${minutos} minutos (en curso)`;
    }

    console.log("Horas trabajadas hoy:", horasTrabajadasHoy);
    document.getElementById('horasHoy').textContent = horasTrabajadasHoy;
  } catch (error) {
    console.error("Error al calcular horas trabajadas hoy:", error);
    document.getElementById('horasHoy').textContent = 'Error';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (auth.currentUser) {
    calcularHorasTrabajadasHoy();
  }
});

setInterval(() => {
  if (auth.currentUser) {
    calcularHorasTrabajadasHoy();
  }
}, 60000); // Actualiza cada minuto

//////////////////////////////
// Modal Incidencia //
/////////////////////
// Función para abrir el modal de incidencia
window.registrarIncidencia = async function() {
  // Primero validamos si puede registrar incidencia
  const puedeRegistrar = await validarAccionRegistro('incidencia');
  
  if (!puedeRegistrar) {
      mostrarNotificacionError("Solo puedes registrar incidencia después de una entrada");
      return;
  }
  
  // Abrir el modal de incidencia
  const incidenciaModal = document.getElementById('incidenciaModal');
  incidenciaModal.style.display = 'block';
};

// Manejar el envío del formulario de incidencia
document.getElementById('incidenciaForm').addEventListener('submit', async function(event) {
  event.preventDefault();
  
  try {
      const user = auth.currentUser;
      const tipoIncidencia = document.getElementById('tipoIncidencia').value;
      const descripcionIncidencia = document.getElementById('descripcionIncidencia').value;
      //const archivoIncidencia = document.getElementById('archivoIncidencia').files[0];

      // Obtener datos del usuario
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const userData = userDoc.data();

      // Preparar datos de la incidencia
      const nuevoRegistro = {
          userId: user.uid,
          accion_registro: 'incidencia',
          fecha: serverTimestamp(),
          lugar: obtenerLugarActual(),
          email: user.email,
          empresa: userData.empresa,
          nombre: userData.nombre,
          tipoIncidencia: tipoIncidencia,
          descripcion: descripcionIncidencia
      };

      /* Manejar archivo adjunto (si existe)
      if (archivoIncidencia) {
          const storageRef = ref(storage, `incidencias/${user.uid}/${Date.now()}_${archivoIncidencia.name}`);
          const uploadResult = await uploadBytes(storageRef, archivoIncidencia);
          nuevoRegistro.archivoUrl = await getDownloadURL(uploadResult.ref);
      }*/

      // Guardar el registro en Firestore
      const registrosRef = collection(db, "registros");
      const nuevoDocRef = doc(registrosRef);
      await setDoc(nuevoDocRef, nuevoRegistro);

      // Cerrar modal
      cerrarModalIncidencia();

      // Notificación de éxito
      mostrarNotificacionExito('¡Incidencia registrada correctamente!');
      
      // Actualizar vista de últimos registros
      await mostrarUltimoRegistro(user.uid);

  } catch (error) {
      console.error('Error al registrar incidencia:', error);
      mostrarNotificacionError('Hubo un problema al registrar la incidencia. Inténtalo nuevamente.');
  }
});

// Función para cerrar el modal
function cerrarModalIncidencia() {
  const incidenciaModal = document.getElementById('incidenciaModal');
  incidenciaModal.style.display = 'none';
  
  // Limpiar formulario
  document.getElementById('incidenciaForm').reset();
}

// Añadir un event listener para cerrar el modal si se hace clic fuera de él
window.addEventListener('click', function(event) {
  const incidenciaModal = document.getElementById('incidenciaModal');
  if (event.target === incidenciaModal) {
      cerrarModalIncidencia();
  }
});
/////////////////////////
let logoutTimer;
let warningTimer;
const tiempoInactividad = 20000; // 15 segundos
const tiempoAdvertencia = 15000; // 10 segundos (5 segundos antes del logout)

// Función para cerrar sesión
async function cerrarSesion() {
  try {
    await auth.signOut();
    Swal.fire({
      icon: "error",
      title: "Sesión cerrada",
      text: "Tu sesión se cerró por inactividad.",
      confirmButtonText: "OK"
    }).then(() => {
      window.location.href = "/"; // Redirige a la página de login
    });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
}

// Función para mostrar advertencia antes del logout
function mostrarAdvertenciaCierre() {
  Swal.fire({
    icon: "warning",
    title: "Inactividad detectada",
    text: "Tu sesión se cerrará en 5 segundos si no interactúas.",
    toast: true,
    //position: "top-end",
    showConfirmButton: false,
    timer: 5000
  });
}

// Función para reiniciar el temporizador de inactividad
function reiniciarTemporizador() {
  if (logoutTimer) clearTimeout(logoutTimer);
  if (warningTimer) clearTimeout(warningTimer);

  // Configurar advertencia antes del logout
  warningTimer = setTimeout(mostrarAdvertenciaCierre, tiempoAdvertencia);

  // Configurar cierre de sesión tras inactividad
  logoutTimer = setTimeout(cerrarSesion, tiempoInactividad);
}

// Eventos que reinician el temporizador (movimiento del mouse, teclas, clics)
document.addEventListener("mousemove", reiniciarTemporizador);
document.addEventListener("keydown", reiniciarTemporizador);
document.addEventListener("click", reiniciarTemporizador);

// Iniciar el temporizador al cargar la página
reiniciarTemporizador();
