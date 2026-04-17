// Main app controller — auth guard, navigation, global state
import { onAuthChange, signOut } from './auth.js';
import { subscribeCategories, subscribeAccounts, getOverduePendingBills, getUpcomingBills, subscribeSettings } from './db.js';
import { showToast, getMonthName, getShortMonthName } from './utils.js';

import { initDashboard, destroyDashboard } from './dashboard.js';
import { initTransactions, destroyTransactions, openTransactionModal } from './transactions.js';
import { initBills, destroyBills } from './bills.js';
import { initRecurring, destroyRecurring } from './recurring.js';
import { initCategories, destroyCategories } from './categories.js';
import { initAccounts, destroyAccounts } from './accounts.js';
import { initSettings, destroySettings } from './settings.js';

// ── Global state ──
let currentPage = 'dashboard';
let categories = [];
let accounts = [];
let settings = { alertDaysBefore: 3, monthlyBudget: 0 };

let unsubCats = null;
let unsubAccs = null;
let unsubSettings = null;

// ── Page meta ──
const pages = {
  dashboard:    { title: 'Dashboard',          showAdd: false },
  transactions: { title: 'Transações',         showAdd: true },
  bills:        { title: 'Contas a Pagar',     showAdd: false },
  recurring:    { title: 'Recorrências',       showAdd: false },
  categories:   { title: 'Categorias',         showAdd: false },
  accounts:     { title: 'Contas e Carteiras', showAdd: false },
  settings:     { title: 'Configurações',      showAdd: false }
};

// ── Auth guard ──
onAuthChange(user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  onUserReady(user);
});

function onUserReady(user) {
  // Hide loading overlay
  document.getElementById('auth-loading').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';

  // Fill user info in sidebar
  fillUserInfo(user);

  // Update topbar date
  const now = new Date();
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) {
    dateEl.textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(now);
  }

  // Subscribe to global data
  unsubCats = subscribeCategories(cats => {
    categories = cats;
    if (currentPage === 'dashboard') initDashboard(categories, accounts, settings);
  });
  unsubAccs = subscribeAccounts(accs => {
    accounts = accs;
    if (currentPage === 'dashboard') initDashboard(categories, accounts, settings);
  });
  unsubSettings = subscribeSettings(s => {
    settings = s;
  });

  // Setup navigation
  setupNavigation();
  setupSidebar();
  setupTopbar(user);
  setupModals();

  // Check alerts for badge
  checkAlertsBadge();
  setInterval(checkAlertsBadge, 5 * 60 * 1000); // every 5 min

  // Navigate to dashboard
  navigateTo('dashboard');

  // Expose globally
  window.navigateTo = navigateTo;
  window.openTransactionModal = openTransactionModal;
}

function fillUserInfo(user) {
  const nameEl = document.getElementById('user-display-name');
  const emailEl = document.getElementById('user-email');
  const initialsEl = document.getElementById('user-initials');
  const wrapper = document.getElementById('user-avatar-wrapper');

  if (nameEl) nameEl.textContent = user.displayName || 'Usuário';
  if (emailEl) emailEl.textContent = user.email || '';
  if (initialsEl) {
    const name = user.displayName || user.email || 'U';
    initialsEl.textContent = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // Try to use Google photo
  if (user.photoURL && wrapper) {
    wrapper.innerHTML = `<img src="${user.photoURL}" class="user-avatar" alt="${user.displayName || ''}">`;
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateTo(page);
      // Close mobile sidebar
      document.getElementById('sidebar')?.classList.remove('mobile-open');
    });
  });
}

function navigateTo(page) {
  if (!pages[page]) return;

  // Destroy current page module
  destroyCurrentPage();

  currentPage = page;

  // Update nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update topbar title
  const meta = pages[page];
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = meta.title;

  // Show/hide add button
  const addBtn = document.getElementById('btn-add-main');
  if (addBtn) addBtn.style.display = meta.showAdd ? 'flex' : 'none';

  // Hide all views
  document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
  const view = document.getElementById(`view-${page}`);
  if (view) view.style.display = 'block';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Init page module
  initPage(page);
}

function destroyCurrentPage() {
  switch (currentPage) {
    case 'dashboard':    destroyDashboard(); break;
    case 'transactions': destroyTransactions(); break;
    case 'bills':        destroyBills(); break;
    case 'recurring':    destroyRecurring(); break;
    case 'categories':   destroyCategories(); break;
    case 'accounts':     destroyAccounts(); break;
    case 'settings':     destroySettings(); break;
  }
}

function initPage(page) {
  switch (page) {
    case 'dashboard':    initDashboard(categories, accounts, settings); break;
    case 'transactions': initTransactions(categories, accounts); break;
    case 'bills':        initBills(categories, accounts); break;
    case 'recurring':    initRecurring(categories, accounts); break;
    case 'categories':   initCategories(); break;
    case 'accounts':     initAccounts(); break;
    case 'settings':     initSettings(); break;
  }
}

async function checkAlertsBadge() {
  try {
    const [overdue, upcoming] = await Promise.all([
      getOverduePendingBills(),
      getUpcomingBills(settings.alertDaysBefore || 3)
    ]);
    const badge = document.getElementById('bills-badge');
    const total = overdue.length + upcoming.length;
    if (badge) {
      badge.textContent = total;
      badge.style.display = total > 0 ? 'inline-flex' : 'none';
    }
  } catch(e) {
    // Silently ignore
  }
}

function setupSidebar() {
  // Mobile hamburger
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  if (window.innerWidth <= 900 && toggleBtn) {
    toggleBtn.style.display = 'flex';
  }

  toggleBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('mobile-open');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      toggleBtn && (toggleBtn.style.display = 'none');
      sidebar?.classList.remove('mobile-open');
    } else {
      toggleBtn && (toggleBtn.style.display = 'flex');
    }
  });

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', e => {
    if (window.innerWidth > 900) return;
    if (!sidebar?.contains(e.target) && !toggleBtn?.contains(e.target)) {
      sidebar?.classList.remove('mobile-open');
    }
  });
}

function setupTopbar(user) {
  const addBtn = document.getElementById('btn-add-main');
  addBtn?.addEventListener('click', () => {
    openTransactionModal({ type: 'expense' });
  });
}

function setupModals() {
  // Sign out
  document.getElementById('btn-signout')?.addEventListener('click', async () => {
    try {
      await signOut();
      window.location.href = 'index.html';
    } catch(e) {
      showToast('Erro ao sair', 'error');
    }
  });
}
