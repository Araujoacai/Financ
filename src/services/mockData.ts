import type { BankAccount, Transaction, Bill, CategoryBudget, FinancialGoal, InvestmentItem } from '../types';

export const INITIAL_ACCOUNTS: BankAccount[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_BILLS: Bill[] = [];

export const INITIAL_BUDGETS: CategoryBudget[] = [
  { id: 'b-1', category: 'Alimentação', limitAmount: 2000, spentAmount: 0, color: '#f59e0b' },
  { id: 'b-2', category: 'Moradia', limitAmount: 4000, spentAmount: 0, color: '#ef4444' },
  { id: 'b-3', category: 'Transporte', limitAmount: 1000, spentAmount: 0, color: '#3b82f6' },
  { id: 'b-4', category: 'Lazer', limitAmount: 800, spentAmount: 0, color: '#8b5cf6' },
  { id: 'b-5', category: 'Saúde', limitAmount: 1200, spentAmount: 0, color: '#10b981' }
];

export const INITIAL_GOALS: FinancialGoal[] = [];

export const INITIAL_INVESTMENTS: InvestmentItem[] = [];
