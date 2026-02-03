// Cliente de autenticación para el frontend
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';

// Lazy import de auth para evitar inicialización automática
function getAuth() {
  const { auth } = require('./firebase-config');
  return auth;
}

/**
 * Inicia sesión con email y contraseña usando Firebase Auth
 */
export async function signIn(email: string, password: string) {
  try {
    const authInstance = getAuth();
    if (!authInstance) {
      throw new Error('Firebase Auth no está disponible');
    }
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    // Guardar token en cookie (esto se hace desde el servidor)
    // Por ahora, el token se manejará desde el servidor
    
    return {
      user: userCredential.user,
      token: idToken,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Error al iniciar sesión');
  }
}

/**
 * Cierra sesión
 */
export async function signOut() {
  try {
    const authInstance = getAuth();
    if (!authInstance) {
      return; // Si no hay auth, no hay nada que cerrar
    }
    await firebaseSignOut(authInstance);
  } catch (error: any) {
    throw new Error(error.message || 'Error al cerrar sesión');
  }
}





