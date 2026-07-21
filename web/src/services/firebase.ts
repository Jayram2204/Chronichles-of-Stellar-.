import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCKlJfet_QCux1GmP61z3VBQ79KH4x6oAI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chronicles-of-stellar.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chronicles-of-stellar',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'chronicles-of-stellar.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '88357211453',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:88357211453:web:0046d3d42d5f1903338954',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-W8LTT5C3HS',
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
