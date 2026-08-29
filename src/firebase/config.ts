import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Hardcoded Firebase configuration for nyabihu-yego-center
export const firebaseConfig = {
  apiKey: "AIzaSyBDOQSY7_Mm8vKRDTNoBKwnVxQTxg17H5k",
  authDomain: "nyabihu-yego-center.firebaseapp.com",
  projectId: "nyabihu-yego-center",
  storageBucket: "nyabihu-yego-center.firebasestorage.app",
  messagingSenderId: "214676788309",
  appId: "1:214676788309:web:3ac62c22228c24ab0230dc",
  measurementId: "G-8Q9HP3ED5L",
  firestoreDatabaseId: "(default)"
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics (supported in browser environments)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Graceful fallback if analytics is blocked by ad-blocker or iframe
  });
}

// Initialize Auth with persistent session retention (1-3+ months)
export const auth = getAuth(app);
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Auth local persistence configuration notice:', err);
  });
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore
export const db = getFirestore(app);

export const DEFAULT_DIRECTOR_EMAIL = 'nyirabakundamarie@gmail.com';

export const SUPER_ADMIN_EMAILS = [
  'nyirabakundamarie@gmail.com',
  'myvesrobert@gmail.com'
];

export const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return SUPER_ADMIN_EMAILS.some(e => e.toLowerCase().trim() === clean);
};


