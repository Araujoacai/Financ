import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged
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

function initFirebase(config: FirebaseCredentials) {
  try {
    // Prevent "Firebase App named '[DEFAULT]' already exists" error
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(config);
    }
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('[Firebase] Initialized successfully. Project:', config.projectId);
  } catch (e) {
    console.error('[Firebase] Initialization error:', e);
    app = null;
    auth = null;
    db = null;
  }
}

// Initialize on module load
const savedConfig = (() => {
  try {
    const raw = localStorage.getItem('aura_firebase_credentials');
    return raw ? JSON.parse(raw) : DEFAULT_FIREBASE_CONFIG;
  } catch {
    return DEFAULT_FIREBASE_CONFIG;
  }
})();

initFirebase(savedConfig);

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
    // Re-init only if project changed
    initFirebase(updated);
    return updated;
  }

  /** Returns the current Firebase Auth user's UID, waiting for auth state to resolve */
  static getCurrentUid(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!auth) return resolve(null);
      // onAuthStateChanged resolves immediately if auth state is already known
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user ? user.uid : null);
      });
    });
  }

  static async signInWithGoogle(): Promise<UserProfile> {
    if (!auth) {
      throw new Error('Firebase Auth não inicializado. Verifique a configuração do Firebase.');
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
        console.log('[Firebase] User profile saved to Firestore:', user.uid);
      } catch (e) {
        console.error('[Firebase] Error saving user profile:', e);
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
    } catch {
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
        console.error('[Firebase] Error saving email user:', e);
      }
    }

    return userProfile;
  }

  /**
   * Save user financial data to Firestore.
   * Waits for Firebase Auth state before writing to ensure the token is valid.
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

    // Ensure Firebase Auth has resolved before writing (prevents permission-denied)
    const currentUid = await this.getCurrentUid();
    if (!currentUid || currentUid !== uid) {
      console.warn('[Firebase] Save skipped: Auth UID mismatch or not authenticated.', { currentUid, uid });
      return;
    }

    try {
      await setDoc(doc(db, 'users', uid), {
        financialData: data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('[Firebase] Financial data saved for:', uid);
    } catch (e: any) {
      console.error('[Firebase] Error saving financial data:', e?.code, e?.message);
    }
  }

  /**
   * Load user financial data from Firestore.
   * Waits for Firebase Auth state before reading.
   */
  static async loadUserFinancialData(uid: string) {
    if (!db || !uid || uid === 'guest-demo') {
      console.log('[Firebase] Load skipped: db=', !!db, 'uid=', uid);
      return null;
    }

    // Wait for auth state to be ready before reading
    const currentUid = await this.getCurrentUid();
    if (!currentUid || currentUid !== uid) {
      console.warn('[Firebase] Load skipped: Auth UID mismatch.', { currentUid, uid });
      return null;
    }

    try {
      console.log('[Firebase] Loading financial data for:', uid);
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const d = snap.data();
        console.log('[Firebase] Document found. Has financialData:', !!d.financialData);
        if (d.financialData) {
          return d.financialData;
        }
      } else {
        console.log('[Firebase] No document found for user:', uid);
      }
    } catch (e: any) {
      console.error('[Firebase] Error loading financial data:', e?.code, e?.message);
    }
    return null;
  }
}
