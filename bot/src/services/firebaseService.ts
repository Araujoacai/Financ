import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { config } from '../config/env.js';

const app = getApps().length > 0 ? getApp() : initializeApp(config.firebase);
const db = getFirestore(app);

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  accountId: string;
  accountName: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'pending';
  paymentMethod?: string;
  notes?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  bankCode: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  balance: number;
  creditLimit?: number;
  usedCredit?: number;
  color: string;
  status: 'active' | 'syncing' | 'error';
  updatedAt: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category: string;
  accountId?: string;
  status: 'paid' | 'pending';
  recurring: 'monthly' | 'yearly' | 'none';
  notifyDaysBefore: number;
  notes?: string;
}

export interface CategoryBudget {
  id: string;
  category: string;
  limitAmount: number;
  spentAmount: number;
  color: string;
}

export interface UserFinancialData {
  accounts: BankAccount[];
  transactions: Transaction[];
  bills: Bill[];
  budgets: CategoryBudget[];
  goals: any[];
  investments: any[];
}

export class FirebaseBotService {
  /**
   * Find user UID by phone number (WhatsApp)
   */
  static async findUserByPhone(rawPhone: string): Promise<string | null> {
    const cleanPhone = rawPhone.replace(/\D/g, '');
    
    // Check in phoneLinks collection
    try {
      const phoneDoc = await getDoc(doc(db, 'phoneLinks', cleanPhone));
      if (phoneDoc.exists() && phoneDoc.data()?.userId) {
        return phoneDoc.data().userId;
      }
    } catch (e) {
      console.error('[FirebaseBotService] Error checking phoneLinks:', e);
    }

    // Fallback: search in users collection
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', cleanPhone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].id;
      }
    } catch (e) {
      console.error('[FirebaseBotService] Error querying users by phone:', e);
    }

    return null;
  }

  /**
   * Find user UID by Telegram Chat ID
   */
  static async findUserByTelegram(chatId: string | number): Promise<string | null> {
    const stringChatId = String(chatId);

    // Check in telegramLinks collection
    try {
      const tgDoc = await getDoc(doc(db, 'telegramLinks', stringChatId));
      if (tgDoc.exists() && tgDoc.data()?.userId) {
        return tgDoc.data().userId;
      }
    } catch (e) {
      console.error('[FirebaseBotService] Error checking telegramLinks:', e);
    }

    // Fallback: search in users collection
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('telegramChatId', '==', stringChatId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].id;
      }
    } catch (e) {
      console.error('[FirebaseBotService] Error querying users by telegramChatId:', e);
    }

    return null;
  }

  /**
   * Link user with a 6-digit PIN code
   */
  static async linkWithPairingCode(
    code: string, 
    channelInfo: { phone?: string; telegramChatId?: string | number; telegramUsername?: string }
  ): Promise<{ success: boolean; message: string; userId?: string; userName?: string }> {
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 6) {
      return { success: false, message: 'Código de pareamento inválido.' };
    }

    try {
      // 1. Check in bot_links
      let userId: string | null = null;
      const botLinkRef = doc(db, 'bot_links', cleanCode);
      const botLinkSnap = await getDoc(botLinkRef);

      if (botLinkSnap.exists()) {
        const linkData = botLinkSnap.data();
        if (new Date(linkData.expiresAt) < new Date()) {
          return { success: false, message: 'Código expirado. Gere um novo PIN no painel web.' };
        }
        userId = linkData.userId;
      } else {
        // Fallback: search in users collection for pairingCode
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('pairingCode', '==', cleanCode));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDoc = snap.docs[0];
          const userData = userDoc.data();
          if (userData.pairingExpiresAt && new Date(userData.pairingExpiresAt) < new Date()) {
            return { success: false, message: 'Código expirado. Gere um novo PIN no painel web.' };
          }
          userId = userDoc.id;
        }
      }

      if (!userId) {
        return { success: false, message: 'Código não encontrado. Verifique o PIN gerado no menu Configurações do Financ.' };
      }

      // 2. Fetch User Profile
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};
      const userName = userData.name || 'Usuário';

      // 3. Save Links
      const updates: any = {};

      if (channelInfo.phone) {
        const cleanPhone = channelInfo.phone.replace(/\D/g, '');
        updates.phoneNumber = cleanPhone;
        await setDoc(doc(db, 'phoneLinks', cleanPhone), {
          userId,
          phoneNumber: cleanPhone,
          linkedAt: new Date().toISOString()
        }, { merge: true });
      }

      if (channelInfo.telegramChatId) {
        const chatId = String(channelInfo.telegramChatId);
        updates.telegramChatId = chatId;
        if (channelInfo.telegramUsername) {
          updates.telegramUsername = channelInfo.telegramUsername;
        }
        await setDoc(doc(db, 'telegramLinks', chatId), {
          userId,
          telegramChatId: chatId,
          telegramUsername: channelInfo.telegramUsername || null,
          linkedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Clear the one-time pairing code
      updates.pairingCode = null;
      updates.pairingExpiresAt = null;
      await updateDoc(userRef, updates);

      // Clean bot_links document
      await deleteDoc(botLinkRef).catch(() => {});

      return {
        success: true,
        message: `Conta vinculada com sucesso! Olá, ${userName}.`,
        userId,
        userName
      };
    } catch (e: any) {
      console.error('[FirebaseBotService] Error linking pairing code:', e);
      return { success: false, message: `Erro ao vincular: ${e?.message || 'Falha interna'}` };
    }
  }

  /**
   * Get user's financial data
   */
  static async getUserFinancialData(userId: string): Promise<UserFinancialData | null> {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        const d = snap.data();
        const fin = d.financialData || {};
        return {
          accounts: fin.accounts || [],
          transactions: fin.transactions || [],
          bills: fin.bills || [],
          budgets: fin.budgets || [],
          goals: fin.goals || [],
          investments: fin.investments || [],
        };
      }
    } catch (e) {
      console.error('[FirebaseBotService] Error fetching financial data:', e);
    }
    return null;
  }

  /**
   * Add a new transaction (Expense or Income) and automatically update accounts and budgets
   */
  static async addTransaction(
    userId: string,
    params: {
      description: string;
      amount: number;
      type: 'income' | 'expense';
      category?: string;
      paymentMethod?: string;
      accountName?: string;
      date?: string; // YYYY-MM-DD
    }
  ): Promise<{
    success: boolean;
    transaction?: Transaction;
    account?: BankAccount;
    budgetAlert?: { category: string; limit: number; spent: number; exceeded: boolean };
    error?: string;
  }> {
    try {
      const currentData = await this.getUserFinancialData(userId);
      if (!currentData) {
        return { success: false, error: 'Dados financeiros não encontrados para o usuário.' };
      }

      const txDate = params.date || new Date().toISOString().split('T')[0];
      const category = params.category || (params.type === 'income' ? 'Salário' : 'Outros');

      // Find matching bank account or use primary/first account
      let targetAccount = currentData.accounts.find(a => 
        params.accountName && a.name.toLowerCase().includes(params.accountName.toLowerCase())
      ) || currentData.accounts[0];

      if (!targetAccount) {
        // Create a default account if none exists
        targetAccount = {
          id: 'acc-default',
          name: 'Conta Principal',
          bankName: 'Carteira',
          bankCode: '000',
          type: 'checking',
          balance: 0,
          color: '#10b981',
          status: 'active',
          updatedAt: new Date().toISOString()
        };
        currentData.accounts.push(targetAccount);
      }

      const newTx: Transaction = {
        id: `tx-bot-${Date.now()}`,
        description: params.description,
        amount: Math.abs(params.amount),
        type: params.type,
        category,
        accountId: targetAccount.id,
        accountName: targetAccount.name,
        date: txDate,
        status: 'completed',
        paymentMethod: params.paymentMethod || 'Dinheiro/Pix',
        notes: 'Adicionado via Bot'
      };

      // 1. Prepend transaction
      currentData.transactions.unshift(newTx);

      // 2. Update Account Balance
      const balanceDelta = params.type === 'income' ? newTx.amount : -newTx.amount;
      targetAccount.balance += balanceDelta;
      targetAccount.updatedAt = new Date().toISOString();

      currentData.accounts = currentData.accounts.map(acc => 
        acc.id === targetAccount.id ? targetAccount : acc
      );

      // 3. Update Category Budget if expense
      let budgetAlert: { category: string; limit: number; spent: number; exceeded: boolean } | undefined;

      if (params.type === 'expense') {
        currentData.budgets = currentData.budgets.map(b => {
          if (b.category.toLowerCase() === category.toLowerCase()) {
            const updatedSpent = b.spentAmount + newTx.amount;
            budgetAlert = {
              category: b.category,
              limit: b.limitAmount,
              spent: updatedSpent,
              exceeded: updatedSpent > b.limitAmount
            };
            return { ...b, spentAmount: updatedSpent };
          }
          return b;
        });
      }

      // 4. Save to Firestore
      await setDoc(doc(db, 'users', userId), {
        financialData: currentData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return {
        success: true,
        transaction: newTx,
        account: targetAccount,
        budgetAlert
      };
    } catch (e: any) {
      console.error('[FirebaseBotService] Error adding transaction:', e);
      return { success: false, error: e?.message || 'Falha ao salvar transação' };
    }
  }

  /**
   * Query transactions by period (today, yesterday, specific date, month)
   */
  static async queryTransactionsByPeriod(
    userId: string,
    period: { type: 'today' | 'yesterday' | 'date' | 'month' | 'all'; targetDate?: string }
  ): Promise<{
    periodTitle: string;
    totalExpense: number;
    totalIncome: number;
    transactions: Transaction[];
    categoryTotals: Record<string, number>;
  }> {
    const data = await this.getUserFinancialData(userId);
    if (!data) {
      return { periodTitle: 'Período', totalExpense: 0, totalIncome: 0, transactions: [], categoryTotals: {} };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

    let filterFn: (tx: Transaction) => boolean;
    let periodTitle = 'Transações';

    switch (period.type) {
      case 'today':
        filterFn = tx => tx.date === todayStr;
        periodTitle = `Hoje (${todayStr.split('-').reverse().join('/')})`;
        break;
      case 'yesterday':
        filterFn = tx => tx.date === yesterdayStr;
        periodTitle = `Ontem (${yesterdayStr.split('-').reverse().join('/')})`;
        break;
      case 'date':
        const d = period.targetDate || todayStr;
        filterFn = tx => tx.date === d;
        periodTitle = `Data: ${d.split('-').reverse().join('/')}`;
        break;
      case 'month':
        const monthPrefix = period.targetDate || currentMonthStr;
        filterFn = tx => tx.date.startsWith(monthPrefix);
        const [year, month] = monthPrefix.split('-');
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const monthName = monthNames[parseInt(month, 10) - 1] || monthPrefix;
        periodTitle = `${monthName} de ${year}`;
        break;
      default:
        filterFn = () => true;
        periodTitle = 'Histórico Geral';
    }

    const filtered = data.transactions.filter(filterFn);
    let totalExpense = 0;
    let totalIncome = 0;
    const categoryTotals: Record<string, number> = {};

    for (const tx of filtered) {
      if (tx.type === 'expense') {
        totalExpense += tx.amount;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      } else if (tx.type === 'income') {
        totalIncome += tx.amount;
      }
    }

    return {
      periodTitle,
      totalExpense,
      totalIncome,
      transactions: filtered,
      categoryTotals
    };
  }

  /**
   * Get all accounts and general balance
   */
  static async getAccountsSummary(userId: string): Promise<{
    accounts: BankAccount[];
    totalBalance: number;
  }> {
    const data = await this.getUserFinancialData(userId);
    if (!data) return { accounts: [], totalBalance: 0 };

    const totalBalance = data.accounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);
    return {
      accounts: data.accounts,
      totalBalance
    };
  }

  /**
   * Get pending and upcoming bills
   */
  static async getPendingBills(userId: string): Promise<Bill[]> {
    const data = await this.getUserFinancialData(userId);
    if (!data) return [];

    return data.bills
      .filter(b => b.status === 'pending')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }
}
