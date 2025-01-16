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

exports.createUser = functions.https.onCall(async (data, context) => {
    // Validar si el usuario que llama tiene permisos
    const uid = context.auth?.uid;
    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'No estás autenticado.');
    }

    const requester = await admin.auth().getUser(uid);
    if (requester.customClaims?.rol !== 'root' && requester.customClaims?.rol !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'No tienes permisos para crear usuarios.');
    }

    try {
        // Crear usuario en Authentication
        const userRecord = await admin.auth().createUser({
            email: data.email,
            password: data.password,
            displayName: `${data.nombre} ${data.apellidos}`,
        });

        // Guardar información en Firestore
        await admin.firestore().collection('usuarios').doc(userRecord.uid).set({
            nombre: data.nombre,
            apellidos: data.apellidos,
            dni: data.dni,
            email: data.email,
            empresa: data.empresa,
            rol: data.rol,
            uid: userRecord.uid,
            fechaRegistro: new Date(),
            estado: 'activo'
        });

        return { success: true, uid: userRecord.uid };
    } catch (error) {
        throw new functions.https.HttpsError('internal', 'Error al crear usuario', error);
    }
});
