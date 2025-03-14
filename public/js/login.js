import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword, 
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
    Timestamp,
    serverTimestamp,      
    deleteDoc    
} from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-functions.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Manejar el formulario de login
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    // Iniciar sesión con correo y contraseña
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Obtener el usuario actual
    const user = userCredential.user;

    // Obtener los datos del usuario desde Firestore
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Consultar la empresa por nombre
      const empresaQuery = query(
        collection(db, "empresas"),
        where("nombre_empresa", "==", userData.empresa)
      );

      const empresaSnapshot = await getDocs(empresaQuery);

      if (!empresaSnapshot.empty) {
        const empresaData = empresaSnapshot.docs[0].data();

        // Verificar si la empresa NO está activa
        if (empresaData.status_empresa === false) {
          await Swal.fire({
            icon: 'warning',
            title: 'Licencia Inactiva',
            html: `
              <p>La licencia de su empresa está inactiva.</p>
              <p>Puede continuar, pero es posible que algunas funcionalidades estén limitadas.</p>
              <p>Por favor, contacte con su administrador para más información.</p>
            `,
            confirmButtonText: 'Entendido',
            footer: '<a href="mailto:info@inouttime.es">Contactar Soporte</a>'
          });
        }

        // Validar la fecha de expiración
        const fechaExpiracion = empresaData.fecha_expiracion.toDate(); // Asegúrate de que sea un objeto Date
        const fechaActual = new Date();
        
        if (fechaExpiracion < fechaActual) {
          const diasDesdeExpiracion = Math.floor((fechaActual - fechaExpiracion) / (1000 * 60 * 60 * 24));

          if (diasDesdeExpiracion > 7) {
            await Swal.fire({
              icon: 'error',
              title: 'Licencia Expirada',
              text: 'La licencia de su empresa ha expirado. Por favor, contacte con su administrador.',
              confirmButtonText: 'Entendido'
            });
            return; // Detener el flujo si la licencia ha expirado más de 7 días
          } else {
            await Swal.fire({
              icon: 'warning',
              title: 'Licencia Casi Expirada',
              text: `La licencia de su empresa ha expirado hace ${diasDesdeExpiracion} días. Puede continuar, pero es recomendable que se ponga en contacto con su administrador.`,
              confirmButtonText: 'Entendido'
            });
          }
        }

        // Continuar con la autenticación
        const notificarYRedirigir = (mensaje, url) => {
          Swal.fire({
            icon: 'success',
            title: 'Inicio de Sesión Exitoso',
            text: mensaje,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
          }).then(() => {
            window.location.href = url;
          });
        };

        // Determinar la URL de redirección
        let dashboardUrl = "dashboard.html"; // URL por defecto

        if (userData.empresa === "Milala.es") {
          dashboardUrl = "dashboard-milala.html";
        }

        switch (userData.rol) {
          case "user":
            notificarYRedirigir(`Bienvenido, usuario ${userData.nombre}`, dashboardUrl);
            break;
          case "admin":
            notificarYRedirigir(`Bienvenido, administrador ${userData.nombre}`, "admin-dash.html");
            break;
          case "root":
            notificarYRedirigir(`Bienvenido, usuario root ${userData.nombre}`, "root-dash.html");
            break;
          default:
            Swal.fire({
              icon: 'warning',
              title: 'Rol no válido',
              text: 'Serás redirigido a la página principal',
              confirmButtonText: 'Entendido'
            }).then(() => {
              window.location.href = "index.html";
            });
        }
      } else {
        // Empresa no encontrada
        Swal.fire({
          icon: 'error',
          title: 'Empresa no encontrada',
          text: 'No se encontraron datos para la empresa del usuario',
          confirmButtonText: 'Intentar de nuevo'
        });
      }
    } else {
      // Usuario no encontrado
      Swal.fire({
        icon: 'error',
        title: 'Usuario no encontrado',
         text: 'No se encontraron datos para este usuario',
        confirmButtonText: 'Intentar de nuevo'
      });
    }
  } catch (error) {
    // Manejo de errores de autenticación
    let errorMessage = "Error de autenticación";
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = "No se encontró un usuario con este correo";
        break;
      case 'auth/wrong-password':
        errorMessage = "Contraseña incorrecta";
        break;
      case 'auth/invalid-email':
        errorMessage = "Correo electrónico inválido";
        break;
      default:
        errorMessage = error.message;
    }

    Swal.fire({
      icon: 'error',
      title: 'Error de Inicio de Sesión',
      text: errorMessage,
      confirmButtonText: 'Intentar de nuevo'
    });
  }
});

// Manejar recuperación de contraseña
document.getElementById("forgot-password").addEventListener("click", async (e) => {
  e.preventDefault();

  const { value: email } = await Swal.fire({
    title: 'Recuperar Contraseña',
    input: 'email',
    inputLabel: 'Introduce tu correo electrónico',
    inputPlaceholder: 'Correo electrónico',
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value) {
        return 'Necesitas introducir un correo electrónico';
      }
    }
  });

  if (email) {
    try {
      await sendPasswordResetEmail(auth, email);
      Swal.fire({
        icon: 'success',
        title: 'Correo de Recuperación Enviado',
        text: 'Revisa tu bandeja de entrada para restablecer tu contraseña',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al Enviar Correo',
        text: error.message,
        confirmButtonText: 'Entendido'
      });
    }
  }
});

//////////////////////
// Mostrar password //
/////////////////////
document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('password');
  const togglePasswordButton = document.getElementById('toggle-password');

  if (togglePasswordButton) {
      togglePasswordButton.addEventListener('click', () => {
          // Cambiar el tipo de input
          if (passwordInput.type === 'password') {
              passwordInput.type = 'text';
              togglePasswordButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
          } else {
              passwordInput.type = 'password';
              togglePasswordButton.innerHTML = '<i class="fas fa-eye"></i>';
          }
      });
  }
});