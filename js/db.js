// Firestore database layer for Financie
import { db } from './config.js';
import { getCurrentUser } from './auth.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
  writeBatch, limit, startAfter
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

// ─────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────

export async function createTransaction(data) {
  const user = getCurrentUser();
  return await addDoc(collection(db, 'transactions'), {
    ...data,
    createdBy: user?.uid || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateTransaction(id, data) {
  const ref = doc(db, 'transactions', id);
  return await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTransaction(id) {
  return await deleteDoc(doc(db, 'transactions', id));
}

/**
 * Subscribe to all transactions, ordered by date desc.
 * Returns unsubscribe function.
 */
export function subscribeTransactions(callback, filters = {}) {
  let q = collection(db, 'transactions');
  const constraints = [orderBy('date', 'desc')];

  if (filters.type) constraints.push(where('type', '==', filters.type));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  if (filters.categoryId) constraints.push(where('categoryId', '==', filters.categoryId));
  if (filters.accountId) constraints.push(where('accountId', '==', filters.accountId));

  q = query(q, ...constraints);
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(docs);
  }, err => console.error('subscribeTransactions error:', err));
}

/**
 * Get transactions for a specific month/year (for bills view)
 */
export function subscribeTransactionsByMonth(month, year, callback) {
  const start = Timestamp.fromDate(new Date(year, month, 1));
  const end = Timestamp.fromDate(new Date(year, month + 1, 0, 23, 59, 59));
  const q = query(
    collection(db, 'transactions'),
    where('dueDate', '>=', start),
    where('dueDate', '<=', end),
    orderBy('dueDate', 'asc')
  );
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(docs);
  }, err => console.error('subscribeTransactionsByMonth error:', err));
}

/**
 * Get overdue pending transactions from previous months
 */
export async function getOverduePendingBills() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, 'transactions'),
    where('status', '==', 'pending'),
    where('dueDate', '<', Timestamp.fromDate(today))
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get upcoming due transactions within next N days
 */
export async function getUpcomingBills(days = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = new Date(today);
  future.setDate(future.getDate() + days);
  const q = query(
    collection(db, 'transactions'),
    where('status', '==', 'pending'),
    where('dueDate', '>=', Timestamp.fromDate(today)),
    where('dueDate', '<=', Timestamp.fromDate(future)),
    orderBy('dueDate', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Mark a transaction as paid
 */
export async function markAsPaid(id) {
  return await updateTransaction(id, {
    status: 'paid',
    paidDate: serverTimestamp()
  });
}

// ─────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────

export async function createCategory(data) {
  return await addDoc(collection(db, 'categories'), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function updateCategory(id, data) {
  return await updateDoc(doc(db, 'categories', id), data);
}

export async function deleteCategory(id) {
  return await deleteDoc(doc(db, 'categories', id));
}

export function subscribeCategories(callback) {
  const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => console.error('subscribeCategories error:', err));
}

// ─────────────────────────────────────────────
// ACCOUNTS
// ─────────────────────────────────────────────

export async function createAccount(data) {
  return await addDoc(collection(db, 'accounts'), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function updateAccount(id, data) {
  return await updateDoc(doc(db, 'accounts', id), data);
}

export async function deleteAccount(id) {
  return await deleteDoc(doc(db, 'accounts', id));
}

export function subscribeAccounts(callback) {
  const q = query(collection(db, 'accounts'), orderBy('name', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => console.error('subscribeAccounts error:', err));
}

// ─────────────────────────────────────────────
// RECURRING BILLS
// ─────────────────────────────────────────────

export async function createRecurringBill(data) {
  return await addDoc(collection(db, 'recurringBills'), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function updateRecurringBill(id, data) {
  return await updateDoc(doc(db, 'recurringBills', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteRecurringBill(id) {
  return await deleteDoc(doc(db, 'recurringBills', id));
}

export function subscribeRecurringBills(callback) {
  const q = query(collection(db, 'recurringBills'), orderBy('description', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => console.error('subscribeRecurringBills error:', err));
}

/**
 * Generate monthly transactions from active recurring bills.
 * Avoids duplicates by checking recurringId + month.
 */
export async function generateMonthlyRecurring(month, year) {
  const user = getCurrentUser();
  const snap = await getDocs(query(
    collection(db, 'recurringBills'),
    where('active', '==', true)
  ));
  const bills = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const start = Timestamp.fromDate(new Date(year, month, 1));
  const end = Timestamp.fromDate(new Date(year, month + 1, 0, 23, 59, 59));

  // Get already generated transactions for this month from recurring
  const existingSnap = await getDocs(query(
    collection(db, 'transactions'),
    where('dueDate', '>=', start),
    where('dueDate', '<=', end),
    where('fromRecurring', '==', true)
  ));
  const existingRecurringIds = new Set(
    existingSnap.docs.map(d => d.data().recurringId).filter(Boolean)
  );

  const batch = writeBatch(db);
  let count = 0;

  for (const bill of bills) {
    if (existingRecurringIds.has(bill.id)) continue;
    const day = Math.min(bill.dayOfMonth || 1, new Date(year, month + 1, 0).getDate());
    const dueDate = Timestamp.fromDate(new Date(year, month, day, 12, 0, 0));
    const ref = doc(collection(db, 'transactions'));
    batch.set(ref, {
      type: bill.type || 'expense',
      amount: bill.amount || 0,
      description: bill.description,
      categoryId: bill.categoryId || '',
      accountId: bill.accountId || '',
      date: dueDate,
      dueDate,
      paidDate: null,
      status: 'pending',
      fromRecurring: true,
      recurringId: bill.id,
      notes: bill.notes || '',
      tags: bill.tags || [],
      createdBy: user?.uid || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    count++;
  }

  if (count > 0) await batch.commit();
  return count;
}

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────

export async function getSettings() {
  const ref = doc(db, 'settings', 'global');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {
    currency: 'BRL',
    alertDaysBefore: 3,
    monthlyBudget: 0,
    theme: 'dark'
  };
}

export async function updateSettings(data) {
  const ref = doc(db, 'settings', 'global');
  return await updateDoc(ref, data).catch(() =>
    addDoc(collection(db, 'settings'), data)
  );
}

export function subscribeSettings(callback) {
  const ref = doc(db, 'settings', 'global');
  return onSnapshot(ref, snap => {
    callback(snap.exists() ? snap.data() : {
      currency: 'BRL',
      alertDaysBefore: 3,
      monthlyBudget: 0
    });
  });
}

// ─────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────

export async function seedDefaultData() {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  const categories = [
    { name: 'Alimentação', type: 'expense', icon: '🛒', color: '#EF4444', budget: 1500 },
    { name: 'Transporte', type: 'expense', icon: '🚗', color: '#F59E0B', budget: 500 },
    { name: 'Moradia', type: 'expense', icon: '🏠', color: '#8B5CF6', budget: 2000 },
    { name: 'Saúde', type: 'expense', icon: '💊', color: '#10B981', budget: 300 },
    { name: 'Lazer', type: 'expense', icon: '🎮', color: '#6366F1', budget: 400 },
    { name: 'Educação', type: 'expense', icon: '📚', color: '#0EA5E9', budget: 300 },
    { name: 'Vestuário', type: 'expense', icon: '👕', color: '#EC4899', budget: 200 },
    { name: 'Assinaturas', type: 'expense', icon: '📱', color: '#14B8A6', budget: 150 },
    { name: 'Salário', type: 'income', icon: '💰', color: '#22C55E', budget: 0 },
    { name: 'Freelance', type: 'income', icon: '💻', color: '#84CC16', budget: 0 },
    { name: 'Investimentos', type: 'income', icon: '📈', color: '#F97316', budget: 0 },
    { name: 'Outros', type: 'both', icon: '📦', color: '#6B7280', budget: 0 },
  ];

  const accounts = [
    { name: 'Conta Corrente', type: 'checking', balance: 0, color: '#6366F1', icon: '🏦', includeInTotal: true, active: true },
    { name: 'Poupança', type: 'savings', balance: 0, color: '#10B981', icon: '💰', includeInTotal: true, active: true },
    { name: 'Cartão de Crédito', type: 'credit', balance: 0, color: '#EF4444', icon: '💳', includeInTotal: false, active: true },
    { name: 'Dinheiro', type: 'cash', balance: 0, color: '#F59E0B', icon: '💵', includeInTotal: true, active: true },
  ];

  for (const cat of categories) {
    batch.set(doc(collection(db, 'categories')), { ...cat, createdAt: now });
  }
  for (const acc of accounts) {
    batch.set(doc(collection(db, 'accounts')), { ...acc, createdAt: now });
  }

  // Default settings
  batch.set(doc(db, 'settings', 'global'), {
    currency: 'BRL',
    alertDaysBefore: 3,
    monthlyBudget: 0,
    theme: 'dark',
    createdAt: now
  });

  await batch.commit();
}
