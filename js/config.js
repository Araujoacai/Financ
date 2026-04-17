// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyCOxnj-RvM-PmD99olqY8wmzZTEu762VK8",
  authDomain: "financie-bf62f.firebaseapp.com",
  projectId: "financie-bf62f",
  storageBucket: "financie-bf62f.firebasestorage.app",
  messagingSenderId: "53270732423",
  appId: "1:53270732423:web:d0b57d2e074852ed42e222"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
