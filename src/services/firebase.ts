import { initializeApp, getApps, getApp } from 'firebase/app';
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

function initFirebase(config: FirebaseCredentials) {
  try {
    // Prevent "Firebase App named '[DEFAULT]' already exists" error
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('[Firebase] Initialized. Project:', config.projectId);
  } catch (e) {
    console.error('[Firebase] Init error:', e);
    app = null; auth = null; db = null;
  }
}

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
    try {
      const raw = localStorage.getItem(this.CREDENTIALS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_FIREBASE_CONFIG;
    } catch {
      return DEFAULT_FIREBASE_CONFIG;
    }
  }

  static saveCredentials(creds: Partial<FirebaseCredentials>) {
    const current = this.getStoredCredentials();
    const updated: FirebaseCredentials = {
      ...current,
      ...creds,
      isConfigured: Boolean((creds.apiKey || current.apiKey) && (creds.projectId || current.projectId))
    };
    localStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(updated));
    initFirebase(updated);
    return updated;
  }

  /**
   * Waits for Firebase Auth to fully restore its session from persistence.
   * This is critical on page load — auth state may not be ready immediately.
   */
  private static waitForAuthReady(): Promise<void> {
    return new Promise((resolve) => {
      if (!auth) return resolve();
      // authStateReady() resolves once Firebase Auth determines the current user
      // (whether from IndexedDB, cookie, etc.)
      if (typeof (auth as any).authStateReady === 'function') {
        (auth as any).authStateReady().then(resolve).catch(resolve);
      } else {
        // Fallback for older SDK versions
        resolve();
      }
    });
  }

  static async signInWithGoogle(): Promise<UserProfile> {
    if (!auth) throw new Error('Firebase Auth não inicializado.');
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
        console.log('[Firebase] User profile saved:', user.uid);
      } catch (e: any) {
        console.error('[Firebase] Error saving profile:', e?.code, e?.message);
      }
    }
    return userProfile;
  }

  static async signInWithEmail(email: string, pass: string): Promise<UserProfile> {
    if (!auth) throw new Error('Firebase Auth não inicializado.');
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
      } catch (e: any) {
        console.error('[Firebase] Error saving email user:', e?.code, e?.message);
      }
    }
    return userProfile;
  }

  /**
   * Save financial data to Firestore.
   * Firebase SDK automatically attaches the current user's auth token.
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
      console.log('[Firebase] Data saved for:', uid, '| accounts:', data.accounts?.length, '| transactions:', data.transactions?.length);
    } catch (e: any) {
      console.error('[Firebase] Save error:', e?.code, e?.message);
    }
  }

  /**
   * Load financial data from Firestore.
   * Waits for auth state to be fully initialized before reading.
   */
  static async loadUserFinancialData(uid: string) {
    if (!db || !uid || uid === 'guest-demo') {
      console.log('[Firebase] Load skipped: db=', !!db, 'uid=', uid);
      return null;
    }

    // Wait for Firebase Auth to fully restore session from persistence
    await this.waitForAuthReady();

    const currentUser = auth?.currentUser;
    console.log('[Firebase] Loading data. uid=', uid, '| auth.currentUser=', currentUser?.uid || 'null');

    if (!currentUser || currentUser.uid !== uid) {
      console.warn('[Firebase] Auth mismatch — cannot load Firestore data. User must be logged in via Firebase Auth.');
      return null;
    }

    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        console.log('[Firebase] Document found. Has financialData:', !!d.financialData,
          '| accounts:', d.financialData?.accounts?.length ?? 'none',
          '| transactions:', d.financialData?.transactions?.length ?? 'none'
        );
        return d.financialData || null;
      } else {
        console.log('[Firebase] No document found for user:', uid, '(first login)');
      }
    } catch (e: any) {
      console.error('[Firebase] Load error:', e?.code, e?.message);
    }
    return null;
  }
}
