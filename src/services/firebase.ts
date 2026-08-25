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
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import type { Firestore, Unsubscribe } from 'firebase/firestore';
import type { UserProfile, FirebaseCredentials, BotConnectionInfo } from '../types';

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

  static getFirestoreInstance(): Firestore | null {
    return db;
  }

  static getAuthInstance(): Auth | null {
    return auth;
  }

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
   */
  private static waitForAuthReady(): Promise<void> {
    return new Promise((resolve) => {
      if (!auth) return resolve();
      if (typeof (auth as any).authStateReady === 'function') {
        (auth as any).authStateReady().then(resolve).catch(resolve);
      } else {
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
    } catch (e: any) {
      console.error('[Firebase] Save error:', e?.code, e?.message);
    }
  }

  /**
   * Load financial data from Firestore.
   */
  static async loadUserFinancialData(uid: string) {
    if (!db || !uid || uid === 'guest-demo') {
      return null;
    }

    await this.waitForAuthReady();

    const currentUser = auth?.currentUser;
    if (!currentUser || currentUser.uid !== uid) {
      console.warn('[Firebase] Auth mismatch — cannot load Firestore data.');
      return null;
    }

    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        return d.financialData || null;
      }
    } catch (e: any) {
      console.error('[Firebase] Load error:', e?.code, e?.message);
    }
    return null;
  }

  /**
   * Subscribe to real-time changes in Firestore financialData.
   */
  static subscribeToFinancialData(uid: string, onUpdate: (data: any, updatedAt?: string) => void): Unsubscribe | null {
    if (!db || !uid || uid === 'guest-demo') return null;

    try {
      const userDocRef = doc(db, 'users', uid);
      return onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.financialData) {
            onUpdate(d.financialData, d.updatedAt);
          }
        }
      }, (err) => {
        console.error('[Firebase] onSnapshot error:', err);
      });
    } catch (e) {
      console.error('[Firebase] subscribe error:', e);
      return null;
    }
  }

  /**
   * Generates a 6-digit pairing code for Bot connection (WhatsApp/Telegram).
   */
  static async generatePairingCode(uid: string): Promise<string> {
    if (!db || !uid) throw new Error('Database not initialized or no user.');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // 1. Update in user document first (authorized for authenticated user)
    await setDoc(doc(db, 'users', uid), {
      pairingCode: code,
      pairingExpiresAt: expiresAt
    }, { merge: true });

    // 2. Also try saving in bot_links collection if permitted by Firestore rules
    try {
      await setDoc(doc(db, 'bot_links', code), {
        code,
        userId: uid,
        createdAt: new Date().toISOString(),
        expiresAt
      });
    } catch (err) {
      console.warn('[Firebase] bot_links write skipped (using users fallback):', err);
    }

    return code;
  }

  /**
   * Subscribe to user's bot connection info (phoneNumber, telegramChatId, pairingCode).
   */
  static subscribeToBotInfo(uid: string, onUpdate: (info: BotConnectionInfo) => void): Unsubscribe | null {
    if (!db || !uid || uid === 'guest-demo') return null;
    try {
      const userDocRef = doc(db, 'users', uid);
      return onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          onUpdate({
            linkedWhatsApp: d.phoneNumber || undefined,
            linkedTelegram: d.telegramUsername ? `@${d.telegramUsername}` : (d.telegramChatId ? `ID: ${d.telegramChatId}` : undefined),
            pairingCode: d.pairingCode || undefined,
            pairingExpiresAt: d.pairingExpiresAt || undefined
          });
        }
      });
    } catch (e) {
      console.error('[Firebase] subscribeToBotInfo error:', e);
      return null;
    }
  }

  /**
   * Unlink WhatsApp or Telegram
   */
  static async unlinkBotChannel(uid: string, channel: 'whatsapp' | 'telegram'): Promise<void> {
    if (!db || !uid) return;
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return;
    const data = snap.data();

    if (channel === 'whatsapp' && data.phoneNumber) {
      await deleteDoc(doc(db, 'phoneLinks', data.phoneNumber)).catch(() => {});
      await updateDoc(userDocRef, { phoneNumber: null });
    } else if (channel === 'telegram' && data.telegramChatId) {
      await deleteDoc(doc(db, 'telegramLinks', String(data.telegramChatId))).catch(() => {});
      await updateDoc(userDocRef, { telegramChatId: null, telegramUsername: null });
    }
  }
}

