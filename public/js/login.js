// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword , sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";

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
  const errorContainer = document.getElementById("error-container");

  try {
    // Iniciar sesión con correo y contraseña
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Obtener el usuario actual
    const user = userCredential.user;
    
    // Obtener los datos del usuario desde Firestore
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Verificar el estado de la empresa
      const empresaDoc = await getDoc(doc(db, "empresas", userData.empresa));
      
      if (empresaDoc.exists()) {
        const empresaData = empresaDoc.data();

        // Verificar si la empresa está activa
        if (!empresaData.status_empresa) {
          // Empresa no activa
          await Swal.fire({
            icon: 'warning',
            title: 'Licencia Expirada',
            text: 'La licencia de su empresa ha expirado. Por favor, póngase en contacto con su administrador.',
            confirmButtonText: 'Entendido',
            footer: '<a href="mailto:soporte@suempresa.com">Contactar Soporte</a>'
          });
        }

        // Continuar con la autenticación independientemente del estado
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

        // Redirigir según el rol
        switch(userData.rol) {
          case "user":
            notificarYRedirigir("Bienvenido, usuario", "dashboard.html");
            break;
          case "admin":
            notificarYRedirigir("Bienvenido, administrador", "dashboard.html");
            break;
          case "root":
            notificarYRedirigir("Bienvenido, usuario root", "root-dash.html");
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
    // Manejo de errores de autenticación (código anterior)
    let errorMessage = "Error de autenticación";
    switch(error.code) {
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