import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence, GoogleAuthProvider, signInWithPopup, signInWithCredential, signOut, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import firebaseConfig from '@/firebase-applet-config.json';

// true solo dentro de la app Android instalada; en la web (Vercel) es false y todo funciona como antes.
export const isNativeApp = Capacitor.isNativePlatform();

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
// En la app Android no se usan ventanas emergentes, así que la sesión se guarda directamente en el dispositivo.
export const auth = isNativeApp ? initializeAuth(app, { persistence: indexedDBLocalPersistence }) : getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    if (isNativeApp) {
      // Android: el selector de cuentas nativo devuelve el token de Google y con él se inicia
      // la sesión en el mismo proyecto de Firebase. La cuenta (UID) es la misma que en la web.
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error('No se recibió la cuenta de Google.');
      const cred = GoogleAuthProvider.credential(idToken, result.credential?.accessToken);
      return (await signInWithCredential(auth, cred)).user;
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
}

export async function logout() {
  if (isNativeApp) {
    // Cierra también la cuenta de Google del selector nativo, para poder elegir otra la próxima vez.
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut();
    } catch (err) {
      console.error('[FutData] No se pudo cerrar la sesión nativa de Google:', err);
    }
  }
  return signOut(auth);
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();

export async function loginComplexAccount(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function sendComplexPasswordReset() {
  return sendPasswordResetEmail(auth, 'complejofd@gmail.com');
}
