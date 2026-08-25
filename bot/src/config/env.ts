import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Evolution API (WhatsApp)
  evolution: {
    apiUrl: (process.env.EVOLUTION_API_URL || 'http://localhost:8080').replace(/\/$/, ''),
    apiKey: process.env.EVOLUTION_API_KEY || 'evolution-global-api-key',
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'financ-bot',
    webhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET || '',
  },

  // Telegram Bot
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
    usePolling: process.env.TELEGRAM_USE_POLLING !== 'false', // default true for simple setup
  },

  // Gemini AI (Natural Language Processing)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },

  // Firebase Configuration (Matching Financ web app project)
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCOxnj-RvM-PmD99olqY8wmzZTEu762VK8",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "financie-bf62f.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "financie-bf62f",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "financie-bf62f.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "53270732423",
    appId: process.env.FIREBASE_APP_ID || "1:53270732423:web:d0b57d2e074852ed42e222",
  }
};
