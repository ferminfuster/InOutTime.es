const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar admin SDK
admin.initializeApp();

// Función de ejemplo
exports.eliminarUsuario = functions.https.onCall(async (data, context) => {
    // Verificar que el usuario esté autenticado
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado');
    }

    // Verificar rol de administrador
    const userDoc = await admin.firestore().collection('usuarios').doc(context.auth.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden eliminar usuarios');
    }

    const { email } = data;

    try {
        // Buscar usuario por email
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // Eliminar documento en Firestore (si existe)
        await admin.firestore().collection('usuarios')
            .where('email', '==', email)
            .get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    doc.ref.delete();
                });
            });

        // Eliminar usuario de Authentication
        await admin.auth().deleteUser(userRecord.uid);

        return { 
            success: true, 
            message: 'Usuario eliminado completamente',
            uid: userRecord.uid
        };

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
