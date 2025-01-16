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

// Función para registrar acción con notificaciones
async function registrarAccion(accion) {
  try {
    // Validar primero si se puede realizar la acción
    const puedeRegistrar = await validarAccionRegistro(accion);

    if (!puedeRegistrar) {
      // Mensaje de error personalizado según la acción
      switch (accion) {
        case 'entrada':
          mostrarNotificacionError("Solo puedes registrar entrada después de una salida");
          break;
        case 'salida':
          mostrarNotificacionError("Solo puedes registrar salida después de una entrada");
          break;
        case 'incidencia':
          mostrarNotificacionError("Solo puedes registrar incidencia después de una entrada");
          break;
      }
      return;
    }

    const user = auth.currentUser;

    // Obtener datos del usuario
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    const userData = userDoc.data();

    // Crear nuevo registro
    const nuevoRegistro = {
      userId: user.uid,
      accion_registro: accion,
      fecha: serverTimestamp(),
      lugar: obtenerLugarActual(),
      email: user.email,
      empresa: userData.empresa,
      nombre: userData.nombre
    };

    // Guardar el registro en Firestore
    const registrosRef = collection(db, "registros");
    const nuevoDocRef = doc(registrosRef);
    await setDoc(nuevoDocRef, nuevoRegistro);

    // Notificación de éxito con mensaje personalizado
    mostrarNotificacionExito(`¡${accion.charAt(0).toUpperCase() + accion.slice(1)} registrada correctamente!`);

  } catch (error) {
    console.error(`Error al registrar ${accion}:`, error);
    mostrarNotificacionError('Hubo un problema al registrar la acción. Inténtalo nuevamente.');
  }
}

  
  // Funciones globales para registrar acciones
  window.registrarEntrada = async function() {
    await registrarAccion('entrada');
  };
  
  window.registrarSalida = async function() {
    await registrarAccion('salida');
  };
  
  window.registrarIncidencia = async function() {
    await registrarAccion('incidencia');
  };

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

    } else {
      console.log("No se encontraron datos para este usuario.");
      alert("Usuario no autorizado.");
      window.location.href = "login.html";
    }
  } else {
    // Si no hay un usuario logueado, redirigir al login y mostrar una alerta
    alert("Usuario no autorizado.");
    window.location.href = "login.html";
  }
});

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

// Hacer funciones globalmente accesibles
//window.LogOut = LogOut;

// Exportar funciones si es necesario
/*export {
    LogOut
};*/
/*
//////// Mostrar Registros ///////
// Función para mostrar modal de registros
window.mostrarMisRegistros = function() {
    const modal = document.getElementById('modalMisRegistros');
    modal.style.display = 'block';

    // Establecer fechas por defecto
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('fechaDesde').valueAsDate = firstDayOfMonth;
    document.getElementById('fechaHasta').valueAsDate = today;

    // Cargar registros inicialmente
    cargarRegistros();
}

// Función para cerrar modal
window.cerrarModalRegistros = function() {
    const modal = document.getElementById('modalMisRegistros');
    modal.style.display = 'none';
}

// Función para cargar registros
async function cargarRegistros() {
  try {
      const user = auth.currentUser;
      if (!user) {
          mostrarError("Usuario no autenticado");
          return;
      }

      // Obtener fechas
      const fechaDesde = Timestamp.fromDate(new Date(document.getElementById('fechaDesde').value));
      const fechaHasta = Timestamp.fromDate(new Date(document.getElementById('fechaHasta').value));
      fechaHasta.toDate().setHours(23, 59, 59); // Establecer hora final del día

      // Referencia a la colección de registros
      const registrosRef = collection(db, "registros");

      // Construir consulta con filtros
      const q = query(
          registrosRef, 
          where("userId", "==", user.uid),
          where("fecha", ">=", fechaDesde),
          where("fecha", "<=", fechaHasta),
          orderBy("fecha", "desc")
      );

      const querySnapshot = await getDocs(q);
      console.log("Registros encontrados:", querySnapshot.docs.map(doc => doc.data()));

      // Limpiar tabla anterior
      const registrosBody = document.getElementById('registrosBody');
      registrosBody.innerHTML = '';

      // Almacenar registros para exportación
      window.registrosParaExportar = [];

      // Llenar tabla
      querySnapshot.forEach((doc) => {
          const registro = doc.data();
          const fecha = registro.fecha.toDate();

          // Formatear fecha y hora
          const formatoFecha = new Intl.DateTimeFormat('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
          }).format(fecha);

          const formatoHora = new Intl.DateTimeFormat('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
          }).format(fecha);

          // Crear fila
          const fila = `
              <tr>
                  <td>${formatoFecha}</td>
                  <td>${registro.accion_registro.toUpperCase()}</td>
                  <td>${registro.lugar}</td>
                  <td>${formatoHora}</td>
              </tr>
          `;

          registrosBody.innerHTML += fila;

          // Guardar para exportación
          window.registrosParaExportar.push({
              fecha: formatoFecha,
              accion: registro.accion_registro.toUpperCase(),
              lugar: registro.lugar,
              hora: formatoHora
          });
      });

  } catch (error) {
      console.error("Error al cargar registros:", error);
      mostrarError("No se pudieron cargar los registros");
  }
}


// Función para exportar PDF
function exportarPDF() {
    // Asegúrate de incluir las librerías jsPDF
    if (!window.registrosParaExportar || window.registrosParaExportar.length === 0) {
        mostrarError("No hay registros para exportar");
        return;
    }

    // Importar jsPDF dinámicamente
    import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    .then(module => {
        const { jsPDF } = module;
        const doc = new jsPDF();

        // Título del documento
        doc.setFontSize(18);
        doc.text('Mis Registros', 14, 22);

        // Datos del usuario
        const user = auth.currentUser;
        doc.setFontSize(10);
        doc.text(`Usuario: ${user.email}`, 14, 30);
        doc.text(`Fecha de exportación : ${new Date().toLocaleDateString()}`, 14, 36);

        // Configurar tabla
        doc.autoTable({
            startY: 45,
            head: [['Fecha', 'Acción', 'Lugar', 'Hora']],
            body: window.registrosParaExportar.map(registro => [
                registro.fecha,
                registro.accion,
                registro.lugar,
                registro.hora
            ])
        });

        // Guardar PDF
        doc.save(`Registros_${user.email}_${new Date().toISOString().split('T')[0]}.pdf`);
    })
    .catch(error => {
        console.error("Error al cargar jsPDF:", error);
        mostrarError("No se pudo exportar el PDF");
    });
}
*/
//// Mostrar Información del utlimo registro
async function mostrarUltimoRegistro(userId) {
  const statusUser = document.getElementById("statusUser");
  
  if (!statusUser) {
    console.error("Elemento 'statusUser' no encontrado en el DOM.");
    return;
  }

  const ultimoRegistro = await obtenerUltimoRegistro(userId);

  if (ultimoRegistro) {
    const fechaRegistro = ultimoRegistro.fecha.toDate(); // Convertir a Date
    const fechaFormateada = fechaRegistro.toLocaleString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });

    // Seleccionar icono y color según la acción
    let icono, colorFondo;
    switch (ultimoRegistro.accion_registro.toLowerCase()) {
        case "entrada":
            icono = "🟢"; // Icono de entrada
            //colorFondo = "#e8f5e9"; // Verde suave
            break;
        case "salida":
            icono = "🔴"; // Icono de salida
            //colorFondo = "#ffebee"; // Rojo suave
            break;
        case "incidencia":
            icono = "⚠️"; // Icono de incidencia
            //colorFondo = "#fff3e0"; // Amarillo suave
            break;
        default:
            icono = "❓";
            //colorFondo = "#e0e0e0"; // Gris suave
    }

    // Aplicar estilo y contenido al contenedor
    statusUser.innerHTML = `
        <div style="
            padding: 10px;
            border-radius: 10px;
            //background-color: ${colorFondo};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        ">
            <span style="font-size: 1.5em; margin-right: 10px;">${icono}</span>
            Última acción: ${ultimoRegistro.accion_registro || "Desconocida"}  📅 Fecha: ${fechaFormateada}
           
        </div>
    `;
} else {
    statusUser.innerHTML = `
        <div style="
            padding: 10px;
            border-radius: 10px;
            background-color: #f0f0f0;
            text-align: center;
        ">
            ❌ No se encontraron registros previos.
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
//
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

      // Obtener los registros desde Firestore
      const registrosSnapshot = await getDocs(
          query(
              collection(db, "registros"), 
              where("userId", "==", userId),
              orderBy("fecha", "desc")
          )
      );

      const registros = registrosSnapshot.docs.map(doc => doc.data());

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
      mostrarModalRegistros(registrosProcesados, user);

  } catch (error) {
      console.error("Error al mostrar informes:", error);
      Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al cargar los registros.'
      });
  }
};

function procesarRegistrosDiarios(registros) {
  // Agrupar registros por fecha
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

      if (registro.accion_registro === 'entrada') {
          registrosPorFecha[fechaKey].entrada = fecha;
      } else if (registro.accion_registro === 'salida') {
          registrosPorFecha[fechaKey].salida = fecha;
      }
  });

  // Calcular horas trabajadas
  return Object.entries(registrosPorFecha).map(([fecha, registroDia]) => {
      const { entrada, salida } = registroDia;
      let horasTrabajadas = 'N/A';

      if (entrada && salida) {
          const diferenciaMs = salida - entrada;
          const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
          const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
          horasTrabajadas = `${horas} horas ${minutos} minutos`;
      }

      return {
          fecha,
          entrada: entrada ? entrada.toLocaleTimeString('es-ES') : 'N/A',
          salida: salida ? salida.toLocaleTimeString('es-ES') : 'N/A',
          horasTrabajadas
      };
  });
}

function mostrarModalRegistros(registrosProcesados, user) {
  // Crear HTML para la tabla de registros
  const tablaRegistros = registrosProcesados.map(registro => `
      <tr>
          <td>${registro.fecha}</td>
          <td>${registro.entrada}</td>
          <td>${registro.salida}</td>
          <td>${registro.horasTrabajadas}</td>
      </tr>
  `).join('');

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
                      ${tablaRegistros}
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
          // Añadir eventos a los botones
          document.getElementById('btnDescargarInforme').addEventListener('click', () => descargarInformeCSV(registrosProcesados));
          document.getElementById('btnEnviarInforme').addEventListener('click', () => enviarInformePorEmail(registrosProcesados, user));
          document.getElementById('btnImprimirInforme').addEventListener('click', imprimirInforme);
      }
  });
}

function descargarInformeCSV(registros) {
  // Similar a tu función original, pero usando los nuevos registros procesados
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

function enviarInformePorEmail(registros, user) {
  // Implementar lógica de envío de informe por email
  Swal.fire({
      icon: 'info',
      title: 'Enviar Informe',
      text: 'Funcionalidad de envío por email próximamente.'
  });
}

function imprimirInforme() {
  window.print();
}

// Añadir al objeto window para poder llamarla globalmente
window.mostrarMisInformes = mostrarMisInformes;
// Función para enviar informe por email (usando Firebase Cloud Functions o servicio externo)
async function enviarInformePorEmail(registros, user) {
  try {
      // Generar contenido HTML del informe
      const contenidoInforme = generarContenidoInformeHTML(registros);

      // Llamar a Cloud Function para enviar email
      const enviarEmailFuncion = httpsCallable(functions, 'enviarInformePorEmail');
      
      const resultado = await enviarEmailFuncion({
          email: user.email,
          nombreUsuario: user.displayName || user.email,
          contenidoInforme: contenidoInforme,
          fechaInforme: new Date().toLocaleDateString('es-ES')
      });

      if (resultado.data.success) {
          Swal.fire({
              icon: 'success',
              title: 'Informe Enviado',
              text: 'El informe ha sido enviado a su correo electrónico.',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000
          });
      } else {
          throw new Error(resultado.data.message || 'Error al enviar el informe');
      }
  } catch (error) {
      console.error("Error al enviar informe por email:", error);
      Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo enviar el informe. Inténtelo más tarde.'
      });
  }
}

// Función para generar contenido HTML del informe
function generarContenidoInformeHTML(registros) {
  const filas = registros.map(registro => `
      <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${registro.fecha}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${registro.entrada}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${registro.salida}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${registro.horasTrabajadas}</td>
      </tr>
  `).join('');

  return `
      <html>
          <head>
              <style>
                  body { font-family: Arial, sans-serif; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                  th { background-color: #f2f2f2; }
                  h1 { color: #333; }
              </style>
          </head>
          <body>
              <h1>Informe de Horas Trabajadas</h1>
              <p>Fecha del informe: ${new Date().toLocaleDateString('es-ES')}</p>
              <table>
                  <thead>
                      <tr>
                          <th>Fecha</th>
                          <th>Hora Entrada</th>
                          <th>Hora Salida</th>
                          <th>Horas Trabajadas</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${filas}
                  </tbody>
              </table>
              <p>Informe generado por InOutTime</p>
          </body>
      </html>
  `;
}

// Función de filtrado avanzado
function mostrarModalFiltroInformes() {
  Swal.fire({
      title: 'Filtrar Informes',
      html: `
          <div class="filtro-informes">
              <div class="form-group">
                  <label>Rango de Fechas</label>
                  <div class="input-group">
                      <input type="date" id="fechaDesde" class="swal2-input">
                      <input type="date" id="fechaHasta" class="swal2-input">
                  </div>
              </div>
              <div class="form-group">
                  <label>Tipo de Registro</label>
                  <select id="tipoRegistro" class="swal2-select">
                      <option value="todos">Todos los Registros</option>
                      <option value="completos">Solo Registros Completos</option>
                      <option value="incompletos">Registros Incompletos</option>
                  </select>
              </div>
              <div class="form-group">
                  <label>Ordenar Por</label>
                  <select id="ordenRegistros" class="swal2-select">
                      <option value="fecha-desc">Fecha (Más Reciente)</option>
                      <option value="fecha-asc">Fecha (Más Antigua)</option>
                      <option value="horas-desc">Horas Trabajadas (Mayor a Menor)</option>
                      <option value="horas-asc">Horas Trabajadas (Menor a Mayor)</option>
                  </select>
              </div>
          </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Aplicar Filtros',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
          return {
              fechaDesde: document.getElementById('fechaDesde').value,
              fechaHasta: document.getElementById('fechaHasta').value,
              tipoRegistro: document.getElementById('tipoRegistro').value,
              ordenRegistros: document.getElementById('ordenRegistros').value
          };
      }
  }).then((result) => {
      if (result.isConfirmed) {
          // Aplicar filtros y recargar registros
          aplicarFiltrosRegistros(result.value);
      }
  });
}

// Función para aplicar filtros a los registros
function aplicarFiltrosRegistros(filtros) {
  // Lógica para filtrar y ordenar registros según los criterios seleccionados
  console.log("Filtros aplicados:", filtros);
  
  // Implementar la lógica de filtrado y ordenación
  // 1. Filtrar por rango de fechas
  // 2. Filtrar por tipo de registro (completos/incompletos)
  // 3. Ordenar según el criterio seleccionado
}

// Estadísticas rápidas
function mostrarEstadisticasRegistros(registros) {
  const totalRegistros = registros.length;
  const totalHorasTrabajadas = registros.reduce((total, registro) => {
      // Convertir horas trabajadas a minutos
      if (registro.horasTrabajadas !== 'N/A') {
          const [horas, minutos] = registro.horasTrabajadas.split(' ');
          return total + (parseInt(horas) * 60 + parseInt(minutos));
      }
      return total;
  }, 0);

  const promedioHorasDiarias = totalHorasTrabajadas / totalRegistros;

  Swal.fire({
      title: 'Estadísticas de Registros',
      html: `
          <div class="estadisticas-registros">
              <p>Total de Registros: <strong>${totalRegistros}</strong></p>
              <p>Total Horas Trabajadas: <strong>${Math.floor(totalHorasTrabajadas / 60)} horas ${totalHorasTrabajadas % 60} minutos</strong></p>
              <p>Promedio Horas Diarias: <strong>${promedioHorasDiarias.toFixed(2)} horas</strong></p>
          </div>
      `,
      icon: 'info'
  });
}

// Exportar funciones
window.mostrarMisInformes = mostrarMisInformes;
window.mostrarModalFiltroInformes = mostrarModalFiltroInformes;
window.mostrarEstadisticasRegistros = mostrarEstadisticasRegistros;
