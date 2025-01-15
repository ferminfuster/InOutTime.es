const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
