// Utility functions for Financie app

/**
 * Format a number as Brazilian currency (BRL)
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(amount));
}

/**
 * Format a Firestore Timestamp or Date to a readable date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Format date as input value (YYYY-MM-DD)
 */
export function formatDateInput(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toISOString().split('T')[0];
}

/**
 * Get a JS Date from a Firestore Timestamp or ISO string
 */
export function toDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
}

/**
 * Return a relative label for a due date
 */
export function formatRelativeDate(timestamp) {
  if (!timestamp) return '';
  const date = toDate(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return `Atrasado ${Math.abs(diff)}d`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff <= 7) return `Em ${diff} dias`;
  return formatDate(timestamp);
}

/**
 * Get month name in Portuguese
 */
export function getMonthName(monthIndex) {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[monthIndex];
}

/**
 * Get short month name
 */
export function getShortMonthName(monthIndex) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[monthIndex];
}

/**
 * Return label "Abril 2026" for a given month/year
 */
export function getMonthYearLabel(month, year) {
  return `${getMonthName(month)} ${year}`;
}

/**
 * Check if a bill is overdue (status pending and due date in the past)
 */
export function isOverdue(dueDate, status) {
  if (status === 'paid' || status === 'cancelled') return false;
  if (!dueDate) return false;
  const date = toDate(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Return number of days until due (negative if past)
 */
export function getDaysUntilDue(dueDate) {
  if (!dueDate) return null;
  const date = toDate(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date - today) / (1000 * 60 * 60 * 24));
}

/**
 * Get badge class based on transaction status
 */
export function getStatusClass(status) {
  switch (status) {
    case 'paid': return 'badge-success';
    case 'pending': return 'badge-warning';
    case 'overdue': return 'badge-danger';
    case 'cancelled': return 'badge-muted';
    default: return 'badge-warning';
  }
}

/**
 * Get status label in Portuguese
 */
export function getStatusLabel(status) {
  switch (status) {
    case 'paid': return 'Pago';
    case 'pending': return 'Pendente';
    case 'overdue': return 'Atrasado';
    case 'cancelled': return 'Cancelado';
    default: return 'Pendente';
  }
}

/**
 * Debounce a function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Parse and sanitize a number from a string input (handles comma decimal)
 */
export function parseAmount(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Create a date from year, month, day numbers
 */
export function createDate(year, month, day) {
  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Format number as compact (e.g. 1500 -> 1,5k)
 */
export function formatCompact(amount) {
  if (Math.abs(amount) >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (Math.abs(amount) >= 1000) return (amount / 1000).toFixed(1) + 'k';
  return formatCurrency(amount);
}

/**
 * Generate a unique local ID (not Firestore)
 */
export function generateLocalId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str, max = 30) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

/**
 * Get today's date at midnight
 */
export function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if two dates are in the same month/year
 */
export function isSameMonthYear(d1, d2) {
  if (!d1 || !d2) return false;
  const a = toDate(d1);
  const b = toDate(d2);
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-show'));

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/**
 * Confirm dialog (returns promise)
 */
export function confirmDialog(title, message, confirmLabel = 'Confirmar', danger = false) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    if (!modal) { resolve(false); return; }

    modal.querySelector('#confirm-title').textContent = title;
    modal.querySelector('#confirm-message').textContent = message;
    const btn = modal.querySelector('#confirm-ok');
    btn.textContent = confirmLabel;
    btn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;

    modal.classList.add('modal-open');

    const ok = () => { cleanup(); resolve(true); };
    const cancel = () => { cleanup(); resolve(false); };
    const cleanup = () => {
      modal.classList.remove('modal-open');
      btn.removeEventListener('click', ok);
      modal.querySelector('#confirm-cancel').removeEventListener('click', cancel);
      modal.querySelector('.modal-backdrop').removeEventListener('click', cancel);
    };

    btn.addEventListener('click', ok);
    modal.querySelector('#confirm-cancel').addEventListener('click', cancel);
    modal.querySelector('.modal-backdrop').addEventListener('click', cancel);
  });
}

/**
 * Extract icon initials for account/category fallback
 */
export function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
