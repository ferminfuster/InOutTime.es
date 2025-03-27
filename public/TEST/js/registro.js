// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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

// Manejar el formulario de registro
document.getElementById("registro-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Capturar los valores del formulario
    const nombre = document.getElementById("nombre").value;
    const apellidos = document.getElementById("apellidos").value;
    const empresa = document.getElementById("empresa").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const mensajeRegistro = document.getElementById("mensaje-registro");

    // Validar que las contraseñas coinciden
    if (password !== confirmPassword) {
        mensajeRegistro.textContent = "Las contraseñas no coinciden.";
        mensajeRegistro.style.color = "red";
        return;
    }

    try {
        // Crear usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Actualizar el perfil del usuario con el nombre completo
        await updateProfile(userCredential.user, {
            displayName: `${nombre} ${apellidos}`
        });

        // Guardar información adicional en Firestore con rol por defecto
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
            nombre: nombre,
            apellidos: apellidos,
            empresa: empresa,
            email: email,
            uid: userCredential.user.uid,
            rol: "user",  // Asignar el rol por defecto
            fechaRegistro: new Date()
        });

        // Mensaje de éxito
        mensajeRegistro.textContent = "Usuario registrado exitosamente.";
        mensajeRegistro.style.color = "green";

        // Redirigir al login después de unos segundos
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
    } catch (error) {
        // Mostrar error en el registro
        mensajeRegistro.textContent = `Error: ${error.message}`;
        mensajeRegistro.style.color = "red";
    }
});
