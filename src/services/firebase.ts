import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword
} from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { UserProfile, FirebaseCredentials } from '../types';

export const DEFAULT_FIREBASE_CONFIG: FirebaseCredentials = {
  apiKey: "AIzaSyCOxnj-RvM-PmD99olqY8wmzZTEu762VK8",
  authDomain: "financie-bf62f.firebaseapp.com",
  projectId: "financie-bf62f",
  storageBucket: "financie-bf62f.firebasestorage.app",
  messagingSenderId: "53270732423",
  appId: "1:53270732423:web:d0b57d2e074852ed42e222",
  isConfigured: true
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  const savedConfig = localStorage.getItem('aura_firebase_credentials');
  const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_FIREBASE_CONFIG;

  if (config.apiKey && config.projectId) {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error('Firebase initialization error:', e);
}

export class FirebaseService {
  private static CREDENTIALS_KEY = 'aura_firebase_credentials';

  static getStoredCredentials(): FirebaseCredentials {
    const raw = localStorage.getItem(this.CREDENTIALS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error parsing stored Firebase config', e);
      }
    }
    return DEFAULT_FIREBASE_CONFIG;
  }

  static saveCredentials(creds: Partial<FirebaseCredentials>) {
    const current = this.getStoredCredentials();
    const updated: FirebaseCredentials = {
      ...current,
      ...creds,
      isConfigured: Boolean((creds.apiKey || current.apiKey) && (creds.projectId || current.projectId))
    };
    localStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(updated));
    
    // Re-initialize Firebase
    try {
      app = initializeApp(updated);
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (e) {
      console.error('Error reinitializing Firebase:', e);
    }

    return updated;
  }

  static async signInWithGoogle(): Promise<UserProfile> {
    if (!auth) {
      throw new Error('Firebase Auth não inicializado.');
    }
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || 'Usuário Google',
      email: user.email || '',
      photoURL: user.photoURL || undefined,
      provider: 'google',
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });
      } catch (e) {
        console.warn('Error saving user profile to Firestore:', e);
      }
    }

    return userProfile;
  }

  static async signInWithEmail(email: string, pass: string): Promise<UserProfile> {
    if (!auth) {
      throw new Error('Firebase Auth não inicializado.');
    }
    let user;
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      user = res.user;
    } catch (e) {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      user = res.user;
    }

    const userProfile: UserProfile = {
      uid: user.uid,
      name: email.split('@')[0],
      email: email,
      provider: 'email',
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });
      } catch (e) {
        console.warn('Error saving user to Firestore:', e);
      }
    }

    return userProfile;
  }

  /**
   * Save user financial data (accounts, transactions, bills, budgets, goals, investments) to Firestore
   */
  static async saveUserFinancialData(uid: string, data: {
    accounts?: any[];
    transactions?: any[];
    bills?: any[];
    budgets?: any[];
    goals?: any[];
    investments?: any[];
  }) {
    if (!db || !uid || uid === 'guest-demo') return;
    try {
      await setDoc(doc(db, 'users', uid), {
        financialData: data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Error saving financial data to Firestore:', e);
    }
  }

  /**
   * Load user financial data from Firestore
   */
  static async loadUserFinancialData(uid: string) {
    if (!db || !uid || uid === 'guest-demo') return null;
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data().financialData) {
        return snap.data().financialData;
      }
    } catch (e) {
      console.warn('Error loading financial data from Firestore:', e);
    }
    return null;
  }
}
