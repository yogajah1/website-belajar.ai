import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBCep8YtYyYEBb8f_oRqdkJcqCL1Rq0sSM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "shdjhds-1100e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "shdjhds-1100e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "shdjhds-1100e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "160059528607",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:160059528607:web:4a3f06fa2e95b0d83fd9aa",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-PMM1YZT92X",
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (typeof window !== 'undefined' || isFirebaseConfigured) {
  try {
    if (isFirebaseConfigured) {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({
        prompt: 'select_account',
      });
    }
  } catch (error) {
    console.warn('Firebase initialization error:', error);
  }
}

export { app, auth, db, googleProvider };
