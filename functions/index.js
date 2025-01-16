const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
//*************************************** */
//ELIMINAR USUARIO -- INICIO
//*************************************** */
exports.deleteUser = functions.https.onCall(async (data, context) => {
    // Verificar si el usuario que llama tiene permisos
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'No estás autenticado.'
        );
    }

    const callerUid = context.auth.uid;

    // Obtener datos del usuario que ejecuta la función
    const callerDoc = await admin.firestore().collection('usuarios').doc(callerUid).get();
    const callerData = callerDoc.data();

    // Solo 'admin' o 'root' pueden eliminar usuarios
    if (callerData.rol !== 'admin' && callerData.rol !== 'root') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'No tienes permisos para eliminar usuarios.'
        );
    }

    const email = data.email;

    if (!email) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'El email es obligatorio.'
        );
    }

    try {
        // Buscar usuario por email
        const userRecord = await admin.auth().getUserByEmail(email);

        // Eliminar usuario de Authentication
        await admin.auth().deleteUser(userRecord.uid);

        return { message: `Usuario con email ${email} eliminado correctamente.` };

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Error al eliminar usuario: ${error.message}`
        );
    }
});
//*************************************** */
//ELIMINAR USUARIO -- FIN
//*************************************** */


//*************************************** */
//CREAR USUARIO -- INICIO
//*************************************** */
/* ESTA FUNCIONA
///
exports.createUser = functions.https.onCall(async (data, context) => {
    // Verificar si el usuario que llama está autenticado
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'No estás autenticado.'
        );
    }

    const callerUid = context.auth.uid;

    // Obtener datos del usuario que ejecuta la función
    const callerDoc = await admin.firestore().collection('usuarios').doc(callerUid).get();
    const callerData = callerDoc.data();

    // Solo 'admin' o 'root' pueden crear usuarios
    if (callerData.rol !== 'admin' && callerData.rol !== 'root') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'No tienes permisos para crear usuarios.'
        );
    }

    // Validar datos recibidos
    const { nombre, apellidos, dni, email, empresa, rol } = data;

    if (!email || !rol) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'El email y el rol son obligatorios.'
        );
    }

    try {
        // Generar contraseña temporal segura
        const passwordTemporal = Math.random().toString(36).slice(-8);

        // Crear usuario en Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: passwordTemporal,
            displayName: `${nombre} ${apellidos}`,
        });

        // Guardar información adicional en Firestore
        await admin.firestore().collection('usuarios').doc(userRecord.uid).set({
            nombre: nombre,
            apellidos: apellidos,
            dni: dni,
            email: email,
            empresa: empresa,
            rol: rol,
            uid: userRecord.uid,
            fechaRegistro: new Date(),
            estado: 'activo'
        });

        return {
            success: true,
            message: `Usuario ${email} creado exitosamente.`,
            passwordTemporal: passwordTemporal
        };

    } catch (error) {
        console.error('Error al crear usuario:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Error al crear usuario: ${error.message}`
        );
    }
});
*/ // HASTA AQUÍ FUNCIONA
exports.createUser = functions.https.onCall(async (data, context) => {
    // Verificar si el usuario que llama está autenticado
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'No estás autenticado.'
        );
    }

    const callerUid = context.auth.uid;

    // Obtener datos del usuario que ejecuta la función
    const callerDoc = await admin.firestore().collection('usuarios').doc(callerUid).get();
    const callerData = callerDoc.data();

    // Solo 'admin' o 'root' pueden crear usuarios
    if (callerData.rol !== 'admin' && callerData.rol !== 'root') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'No tienes permisos para crear usuarios.'
        );
    }

    // Validar datos recibidos
    const { 
        nombre, 
        apellidos, 
        dni, 
        email, 
        empresa, 
        rol, 
        contactoPersonal 
    } = data;

    if (!email || !rol) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'El email y el rol son obligatorios.'
        );
    }

    try {
        // Generar contraseña temporal segura
        const passwordTemporal = Math.random().toString(36).slice(-8);

        // Crear usuario en Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: passwordTemporal,
            displayName: `${nombre} ${apellidos}`,
        });

        // Guardar información adicional en Firestore
        await admin.firestore().collection('usuarios').doc(userRecord.uid).set({
            nombre: nombre,
            apellidos: apellidos,
            dni: dni,
            email: email,
            empresa: empresa,
            rol: rol,
            uid: userRecord.uid,
            fechaRegistro: new Date(),
            estado: 'activo',
            contactoPersonal: contactoPersonal || {
                telefono: {
                    prefijo: '',
                    numero: '',
                    tipo: 'móvil'
                },
                direccion: {
                    calle: '',
                    codigoPostal: '',
                    ciudad: '',
                    provincia: '',
                    pais: ''
                }
            }
        });

        return {
            success: true,
            message: `Usuario ${email} creado exitosamente.`,
            passwordTemporal: passwordTemporal
        };

    } catch (error) {
        console.error('Error al crear usuario:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Error al crear usuario: ${error.message}`
        );
    }
});