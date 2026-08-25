export type ThemeMode = 'luxury' | 'emerald' | 'cyber' | 'gold';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  provider: 'google' | 'email' | 'guest';
  phoneNumber?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  createdAt: string;
}

export interface BotConnectionInfo {
  linkedWhatsApp?: string;
  linkedTelegram?: string;
  pairingCode?: string;
  pairingExpiresAt?: string;
}


export type AccountType = 'checking' | 'savings' | 'credit' | 'investment';

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  bankCode: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  usedCredit?: number;
  color: string;
  logoUrl?: string;
  pluggyItemId?: string;
  accountNumber?: string;
  updatedAt: string;
  status: 'active' | 'syncing' | 'error';
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  accountName: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'pending';
  paymentMethod?: string;
  pluggyTransactionId?: string;
  notes?: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: string;
  accountId?: string;
  status: 'paid' | 'pending';
  recurring: 'monthly' | 'yearly' | 'none';
  notifyDaysBefore: number;
  notes?: string;
  barcode?: string;
}

export interface CategoryBudget {
  id: string;
  category: string;
  limitAmount: number;
  spentAmount: number;
  color: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  icon: string;
}

export interface InvestmentItem {
  id: string;
  name: string;
  type: 'Renda Fixa' | 'Ações' | 'FIIs' | 'Cripto' | 'Tesouro Direct';
  amountInvested: number;
  currentValue: number;
  yieldPercentage: number;
  institution: string;
}

export interface PluggyCredentials {
  clientId: string;
  clientSecret: string;
  isConfigured: boolean;
}

export interface FirebaseCredentials {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  isConfigured: boolean;
}
