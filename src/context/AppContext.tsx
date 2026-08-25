import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { 
  UserProfile, 
  ThemeMode, 
  BankAccount, 
  Transaction, 
  Bill, 
  CategoryBudget, 
  FinancialGoal, 
  InvestmentItem,
  PluggyCredentials,
  FirebaseCredentials 
} from '../types';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_BILLS, 
  INITIAL_BUDGETS, 
  INITIAL_GOALS, 
  INITIAL_INVESTMENTS 
} from '../services/mockData';
import { PluggyService } from '../services/pluggyService';
import type { PluggyConnector } from '../services/pluggyService';
import { FirebaseService } from '../services/firebase';
import { NotificationService } from '../services/notificationService';

interface AppContextType {
  user: UserProfile | null;
  theme: ThemeMode;
  accounts: BankAccount[];
  transactions: Transaction[];
  bills: Bill[];
  budgets: CategoryBudget[];
  goals: FinancialGoal[];
  investments: InvestmentItem[];
  pluggyCreds: PluggyCredentials;
  firebaseCreds: FirebaseCredentials;
  isSyncingPluggy: boolean;
  isAuthModalOpen: boolean;
  isLoadingCloudData: boolean;
  
  // Actions
  setTheme: (theme: ThemeMode) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  
  // Financial Actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addBill: (bill: Omit<Bill, 'id' | 'status'>) => void;
  payBill: (id: string) => void;
  deleteBill: (id: string) => void;
  
  // Pluggy Actions
  importPluggyData: (newAccounts: BankAccount[], newTransactions: Transaction[], newInvestments?: InvestmentItem[]) => void;
  connectPluggyBank: (connector: PluggyConnector) => Promise<void>;
  syncPluggyAccounts: () => Promise<void>;
  savePluggyConfig: (clientId: string, clientSecret: string) => void;
  saveFirebaseConfig: (creds: Partial<FirebaseCredentials>) => void;
  
  // Budget & Goals
  updateBudget: (id: string, limitAmount: number) => void;
  addGoal: (goal: Omit<FinancialGoal, 'id' | 'currentAmount'>) => void;
  addGoalAmount: (goalId: string, amount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('aura_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('aura_theme') as ThemeMode) || 'luxury';
  });

  // Financial state — always start empty/default; cloud data will override on login
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(INITIAL_BUDGETS);
  const [goals, setGoals] = useState<FinancialGoal[]>(INITIAL_GOALS);
  const [investments, setInvestments] = useState<InvestmentItem[]>(INITIAL_INVESTMENTS);

  const [pluggyCreds, setPluggyCreds] = useState<PluggyCredentials>(PluggyService.getStoredCredentials());
  const [firebaseCreds, setFirebaseCreds] = useState<FirebaseCredentials>(FirebaseService.getStoredCredentials());
  const [isSyncingPluggy, setIsSyncingPluggy] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoadingCloudData, setIsLoadingCloudData] = useState(false);

  // Ref to block Firestore saves until initial load completes
  const cloudLoadedRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------
  // Real-time Firestore listener when user logs in
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!user?.uid || user.uid === 'guest-demo') {
      // Guest or no user: use localStorage for persistence
      cloudLoadedRef.current = true;
      const savedAccounts = localStorage.getItem('aura_accounts');
      const savedTx = localStorage.getItem('aura_transactions');
      const savedBills = localStorage.getItem('aura_bills');
      const savedBudgets = localStorage.getItem('aura_budgets');
      const savedGoals = localStorage.getItem('aura_goals');
      const savedInvestments = localStorage.getItem('aura_investments');
      if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
      if (savedTx) setTransactions(JSON.parse(savedTx));
      if (savedBills) setBills(JSON.parse(savedBills));
      if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
      if (savedGoals) setGoals(JSON.parse(savedGoals));
      if (savedInvestments) setInvestments(JSON.parse(savedInvestments));
      return;
    }

    // Authenticated user: subscribe to real-time updates from Firestore
    cloudLoadedRef.current = false;
    setIsLoadingCloudData(true);

    const unsubscribe = FirebaseService.subscribeToFinancialData(user.uid, (data) => {
      if (data) {
        isRemoteUpdateRef.current = true;
        if (data.accounts !== undefined) setAccounts(data.accounts);
        if (data.transactions !== undefined) setTransactions(data.transactions);
        if (data.bills !== undefined) setBills(data.bills);
        if (data.budgets !== undefined) setBudgets(data.budgets);
        if (data.goals !== undefined) setGoals(data.goals);
        if (data.investments !== undefined) setInvestments(data.investments);
      }
      cloudLoadedRef.current = true;
      setIsLoadingCloudData(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]);

  // ---------------------------------------------------------------
  // SAVE to Firestore — debounced, only after cloud data is loaded
  // ---------------------------------------------------------------
  const saveToFirestore = useCallback(() => {
    if (!user?.uid || user.uid === 'guest-demo') return;
    if (!cloudLoadedRef.current) return; // Block saves until loaded
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return; // Skip saving back what just came from remote
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      FirebaseService.saveUserFinancialData(user.uid, {
        accounts,
        transactions,
        bills,
        budgets,
        goals,
        investments,
      });
    }, 1200);
  }, [user?.uid, accounts, transactions, bills, budgets, goals, investments]);

  useEffect(() => {
    if (cloudLoadedRef.current) {
      saveToFirestore();
    }
  }, [saveToFirestore]);

  // ---------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------
  useEffect(() => {
    localStorage.setItem('aura_theme', theme);
    document.documentElement.className = 'dark';
    document.documentElement.classList.remove('theme-emerald', 'theme-cyber', 'theme-gold');
    if (theme !== 'luxury') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  // ---------------------------------------------------------------
  // localStorage sync (for guest / offline fallback)
  // ---------------------------------------------------------------
  useEffect(() => { localStorage.setItem('aura_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('aura_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('aura_bills', JSON.stringify(bills)); }, [bills]);
  useEffect(() => { localStorage.setItem('aura_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('aura_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('aura_investments', JSON.stringify(investments)); }, [investments]);

  useEffect(() => {
    NotificationService.checkAndNotifyDueBills(bills);
  }, []);

  const setTheme = (newTheme: ThemeMode) => setThemeState(newTheme);

  // ---------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------
  const loginWithGoogle = async () => {
    const loggedUser = await FirebaseService.signInWithGoogle();
    setUser(loggedUser);
    localStorage.setItem('aura_user', JSON.stringify(loggedUser));
    setIsAuthModalOpen(false);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const loggedUser = await FirebaseService.signInWithEmail(email, pass);
    setUser(loggedUser);
    localStorage.setItem('aura_user', JSON.stringify(loggedUser));
    setIsAuthModalOpen(false);
  };

  const loginAsGuest = () => {
    const guestUser: UserProfile = {
      uid: 'guest-demo',
      name: 'Usuário Visitante',
      email: 'visitante@aurafinance.app',
      provider: 'guest',
      createdAt: new Date().toISOString()
    };
    setUser(guestUser);
    localStorage.setItem('aura_user', JSON.stringify(guestUser));
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aura_user');
    // Clear financial state on logout so next login starts fresh from cloud
    cloudLoadedRef.current = false;
    setAccounts(INITIAL_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setBills(INITIAL_BILLS);
    setBudgets(INITIAL_BUDGETS);
    setGoals(INITIAL_GOALS);
    setInvestments(INITIAL_INVESTMENTS);
  };

  // ---------------------------------------------------------------
  // Financial Actions
  // ---------------------------------------------------------------
  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`
    };
    setTransactions(prev => [newTx, ...prev]);

    setAccounts(prev => prev.map(acc => {
      if (acc.id === txData.accountId) {
        const delta = txData.type === 'income' ? txData.amount : -txData.amount;
        return { ...acc, balance: acc.balance + delta };
      }
      return acc;
    }));

    if (txData.type === 'expense') {
      setBudgets(prev => prev.map(b => {
        if (b.category.toLowerCase() === txData.category.toLowerCase()) {
          return { ...b, spentAmount: b.spentAmount + txData.amount };
        }
        return b;
      }));
    }
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      setAccounts(prev => prev.map(acc => {
        if (acc.id === tx.accountId) {
          const delta = tx.type === 'income' ? -tx.amount : tx.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      }));
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addBill = (billData: Omit<Bill, 'id' | 'status'>) => {
    const newBill: Bill = {
      ...billData,
      id: `bill-${Date.now()}`,
      status: 'pending'
    };
    setBills(prev => [newBill, ...prev]);
  };

  const payBill = (id: string) => {
    setBills(prev => prev.map(b => {
      if (b.id === id) {
        if (b.accountId) {
          addTransaction({
            description: `Pagamento: ${b.title}`,
            amount: b.amount,
            type: 'expense',
            category: b.category,
            accountId: b.accountId,
            accountName: accounts.find(a => a.id === b.accountId)?.name || 'Conta Padrão',
            date: new Date().toISOString().split('T')[0],
            status: 'completed',
            paymentMethod: 'Débito Automático'
          });
        }
        return { ...b, status: 'paid' as const };
      }
      return b;
    }));
  };

  const deleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  // ---------------------------------------------------------------
  // Pluggy Integration
  // ---------------------------------------------------------------
  const importPluggyData = (newAccounts: BankAccount[], newTransactions: Transaction[], newInvestments?: InvestmentItem[]) => {
    setAccounts(prev => {
      const accountMap = new Map(prev.map(a => [a.id, a]));
      for (const newAcc of newAccounts) {
        accountMap.set(newAcc.id, newAcc);
      }
      return Array.from(accountMap.values());
    });

    setTransactions(prev => {
      const existingIds = new Set([
        ...prev.map(t => t.id),
        ...prev.map(t => t.pluggyTransactionId).filter(Boolean)
      ]);
      const unique = newTransactions.filter(t =>
        !existingIds.has(t.id) && !existingIds.has(t.pluggyTransactionId)
      );
      return [...unique, ...prev];
    });

    if (newInvestments && newInvestments.length > 0) {
      setInvestments(prev => {
        const existingInvIds = new Set(prev.map(i => i.id));
        const unique = newInvestments.filter(i => !existingInvIds.has(i.id));
        return [...prev, ...unique];
      });
    }
  };

  const connectPluggyBank = async (connector: PluggyConnector) => {
    setIsSyncingPluggy(true);
    try {
      const res = await PluggyService.createItemAndFetch(connector.id);
      importPluggyData(res.accounts, res.transactions, res.investments);
    } finally {
      setIsSyncingPluggy(false);
    }
  };

  const syncPluggyAccounts = async () => {
    setIsSyncingPluggy(true);
    try {
      const { updatedAccounts } = await PluggyService.syncAllAccounts(accounts);
      setAccounts(updatedAccounts);
    } finally {
      setIsSyncingPluggy(false);
    }
  };

  const savePluggyConfig = (clientId: string, clientSecret: string) => {
    const updated = PluggyService.saveCredentials({ clientId, clientSecret });
    setPluggyCreds(updated);
  };

  const saveFirebaseConfig = (creds: Partial<FirebaseCredentials>) => {
    const updated = FirebaseService.saveCredentials(creds);
    setFirebaseCreds(updated);
  };

  // ---------------------------------------------------------------
  // Budget & Goals
  // ---------------------------------------------------------------
  const updateBudget = (id: string, limitAmount: number) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, limitAmount } : b));
  };

  const addGoal = (goalData: Omit<FinancialGoal, 'id' | 'currentAmount'>) => {
    const newGoal: FinancialGoal = {
      ...goalData,
      id: `goal-${Date.now()}`,
      currentAmount: 0
    };
    setGoals(prev => [...prev, newGoal]);
  };

  const addGoalAmount = (goalId: string, amount: number) => {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g));
  };

  return (
    <AppContext.Provider value={{
      user,
      theme,
      accounts,
      transactions,
      bills,
      budgets,
      goals,
      investments,
      pluggyCreds,
      firebaseCreds,
      isSyncingPluggy,
      isAuthModalOpen,
      isLoadingCloudData,
      setTheme,
      setIsAuthModalOpen,
      loginWithGoogle,
      loginWithEmail,
      loginAsGuest,
      logout,
      addTransaction,
      deleteTransaction,
      addBill,
      payBill,
      deleteBill,
      importPluggyData,
      connectPluggyBank,
      syncPluggyAccounts,
      savePluggyConfig,
      saveFirebaseConfig,
      updateBudget,
      addGoal,
      addGoalAmount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
