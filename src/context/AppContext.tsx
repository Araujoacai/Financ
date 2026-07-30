import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const [accounts, setAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('aura_accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('aura_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem('aura_bills');
    return saved ? JSON.parse(saved) : INITIAL_BILLS;
  });

  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => {
    const saved = localStorage.getItem('aura_budgets');
    return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
  });

  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    const saved = localStorage.getItem('aura_goals');
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [investments, setInvestments] = useState<InvestmentItem[]>(() => {
    const saved = localStorage.getItem('aura_investments');
    return saved ? JSON.parse(saved) : INITIAL_INVESTMENTS;
  });

  const [pluggyCreds, setPluggyCreds] = useState<PluggyCredentials>(PluggyService.getStoredCredentials());
  const [firebaseCreds, setFirebaseCreds] = useState<FirebaseCredentials>(FirebaseService.getStoredCredentials());
  const [isSyncingPluggy, setIsSyncingPluggy] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

  // Load Firestore financial data on login securely BEFORE allowing saves
  useEffect(() => {
    if (user?.uid && user.uid !== 'guest-demo') {
      setIsCloudLoaded(false);
      FirebaseService.loadUserFinancialData(user.uid).then(data => {
        if (data) {
          if (data.accounts) setAccounts(data.accounts);
          if (data.transactions) setTransactions(data.transactions);
          if (data.bills) setBills(data.bills);
          if (data.budgets) setBudgets(data.budgets);
          if (data.goals) setGoals(data.goals);
          if (data.investments) setInvestments(data.investments);
        }
        setIsCloudLoaded(true);
      }).catch(err => {
        console.error('Error loading Firestore data:', err);
        setIsCloudLoaded(true);
      });
    } else {
      setIsCloudLoaded(true);
    }
  }, [user?.uid]);

  // Sync to Firestore ONLY after initial cloud load completes to prevent overwriting
  useEffect(() => {
    if (user?.uid && user.uid !== 'guest-demo' && isCloudLoaded) {
      FirebaseService.saveUserFinancialData(user.uid, {
        accounts,
        transactions,
        bills,
        budgets,
        goals,
        investments
      });
    }
  }, [user?.uid, isCloudLoaded, accounts, transactions, bills, budgets, goals, investments]);

  useEffect(() => {
    localStorage.setItem('aura_theme', theme);
    document.documentElement.className = 'dark';
    document.documentElement.classList.remove('theme-emerald', 'theme-cyber', 'theme-gold');
    if (theme !== 'luxury') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('aura_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('aura_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('aura_bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('aura_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('aura_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('aura_investments', JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    NotificationService.checkAndNotifyDueBills(bills);
  }, []);

  const setTheme = (newTheme: ThemeMode) => setThemeState(newTheme);

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
  };

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

  const importPluggyData = (newAccounts: BankAccount[], newTransactions: Transaction[], newInvestments?: InvestmentItem[]) => {
    setAccounts(prev => {
      const accountMap = new Map(prev.map(a => [a.id, a]));
      for (const newAcc of newAccounts) {
        accountMap.set(newAcc.id, newAcc);
      }
      const updated = Array.from(accountMap.values());
      localStorage.setItem('aura_accounts', JSON.stringify(updated));
      return updated;
    });

    setTransactions(prev => {
      const existingTxIds = new Set(prev.map(t => t.id || t.pluggyTransactionId));
      const unique = newTransactions.filter(t => !existingTxIds.has(t.id) && !existingTxIds.has(t.pluggyTransactionId));
      const updated = [...unique, ...prev];
      localStorage.setItem('aura_transactions', JSON.stringify(updated));
      return updated;
    });

    if (newInvestments && newInvestments.length > 0) {
      setInvestments(prev => {
        const existingInvIds = new Set(prev.map(i => i.id));
        const unique = newInvestments.filter(i => !existingInvIds.has(i.id));
        const updated = [...prev, ...unique];
        localStorage.setItem('aura_investments', JSON.stringify(updated));
        return updated;
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
