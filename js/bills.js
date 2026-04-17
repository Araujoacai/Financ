// Bills module — monthly view with rollover, status editing, and due date alerts
import {
  subscribeTransactionsByMonth, getOverduePendingBills,
  updateTransaction, markAsPaid, createTransaction, deleteTransaction
} from './db.js';
import {
  formatCurrency, formatDate, formatDateInput, getMonthName, getStatusClass,
  getStatusLabel, getDaysUntilDue, getMonthYearLabel, showToast, confirmDialog, toDate
} from './utils.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let unsub = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let _categories = [];
let _accounts = [];

export function initBills(categories, accounts) {
  _categories = categories;
  _accounts = accounts;
  const el = document.getElementById('view-bills');
  el.innerHTML = renderShell();
  setupListeners();
  loadMonth();
  checkOverdue();
}

export function destroyBills() {
  if (unsub) { unsub(); unsub = null; }
}

function renderShell() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Contas a Pagar / Receber</h2>
        <p>Gerencie seus vencimentos mensais</p>
      </div>
      <button class="btn btn-primary" id="btn-new-bill">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Conta
      </button>
    </div>

    <!-- Month picker + filters -->
    <div style="display:flex;align-items:center;gap:16px;justify-content:space-between;flex-wrap:wrap;margin-bottom:20px">
      <div class="month-picker">
        <button class="btn btn-ghost btn-sm" id="btn-prev-month">← Anterior</button>
        <span class="month-label" id="month-label">${getMonthYearLabel(currentMonth, currentYear)}</span>
        <button class="btn btn-ghost btn-sm" id="btn-next-month">Próximo →</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap" id="status-filter-bar">
        <button class="status-btn" data-status="">Todos</button>
        <button class="status-btn" data-status="pending">Pendentes</button>
        <button class="status-btn" data-status="paid">Pagos</button>
        <button class="status-btn" data-status="overdue">Atrasados</button>
        <button class="status-btn" data-status="cancelled">Cancelados</button>
      </div>
    </div>

    <!-- Summary cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px" id="bills-kpis">
      <div class="card" style="padding:16px;text-align:center">
        <div class="card-title">Total do Mês</div>
        <div id="bkpi-total" class="card-value" style="font-size:1.3rem">R$ 0,00</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div class="card-title">Pago</div>
        <div id="bkpi-paid" class="card-value" style="font-size:1.3rem;color:var(--success)">R$ 0,00</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div class="card-title">Pendente</div>
        <div id="bkpi-pending" class="card-value" style="font-size:1.3rem;color:var(--warning)">R$ 0,00</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div class="card-title">Atrasado</div>
        <div id="bkpi-overdue" class="card-value" style="font-size:1.3rem;color:var(--danger)">R$ 0,00</div>
      </div>
    </div>

    <!-- Overdue rollover banner -->
    <div id="rollover-banner" style="display:none;align-items:center;gap:12px;padding:14px 20px;background:var(--danger-light);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);margin-bottom:20px">
      <span style="font-size:1.2rem">⚠️</span>
      <span id="rollover-text" style="flex:1;font-size:0.875rem;color:var(--danger);font-weight:500"></span>
      <button class="btn btn-danger btn-sm" id="btn-rollover">Transferir para este mês</button>
      <button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.1rem" id="btn-dismiss-rollover">✕</button>
    </div>

    <!-- Bills list -->
    <div id="bills-list">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
  `;
}

function setupListeners() {
  document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    document.getElementById('month-label').textContent = getMonthYearLabel(currentMonth, currentYear);
    loadMonth();
  });
  document.getElementById('btn-next-month')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    document.getElementById('month-label').textContent = getMonthYearLabel(currentMonth, currentYear);
    loadMonth();
  });
  document.getElementById('btn-new-bill')?.addEventListener('click', () => {
    window.navigateTo('transactions');
    setTimeout(() => window.openTransactionModal && window.openTransactionModal({ type: 'expense' }), 100);
  });

  // Status filter
  document.querySelectorAll('#status-filter-bar .status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.status; // usa a variável de módulo
      document.querySelectorAll('#status-filter-bar .status-btn').forEach(b => {
        b.classList.remove('active', 'active-paid', 'active-pending', 'active-overdue', 'active-cancelled');
      });
      if (activeFilter) {
        btn.classList.add('active', `active-${activeFilter}`);
      } else {
        btn.classList.add('active'); // botão "Todos"
      }
      filterBills(activeFilter);
    });
  });

  // Marca "Todos" como ativo por padrão
  const todosBtn = document.querySelector('#status-filter-bar .status-btn[data-status=""]');
  if (todosBtn) todosBtn.classList.add('active');

  document.getElementById('btn-dismiss-rollover')?.addEventListener('click', () => {
    document.getElementById('rollover-banner').style.display = 'none';
  });
}

let currentBills = [];
let activeFilter = '';

function filterBills(status) {
  activeFilter = status;
  renderBills(status ? currentBills.filter(b => b.status === status) : currentBills);
}

function loadMonth() {
  if (unsub) unsub();
  const list = document.getElementById('bills-list');
  if (list) list.innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;

  unsub = subscribeTransactionsByMonth(currentMonth, currentYear, bills => {
    currentBills = bills;
    updateKPIs(bills);
    renderBills(activeFilter ? bills.filter(b => b.status === activeFilter) : bills);
  });
}

function updateKPIs(bills) {
  const expense = bills.filter(b => b.type === 'expense' && b.status !== 'cancelled');
  const total = expense.reduce((s, b) => s + (b.amount || 0), 0);
  const paid = expense.filter(b => b.status === 'paid').reduce((s, b) => s + (b.amount || 0), 0);
  const pending = expense.filter(b => b.status === 'pending').reduce((s, b) => s + (b.amount || 0), 0);
  const overdue = expense.filter(b => b.status === 'overdue').reduce((s, b) => s + (b.amount || 0), 0);

  document.getElementById('bkpi-total').textContent = formatCurrency(total);
  document.getElementById('bkpi-paid').textContent = formatCurrency(paid);
  document.getElementById('bkpi-pending').textContent = formatCurrency(pending);
  document.getElementById('bkpi-overdue').textContent = formatCurrency(overdue);
}

function renderBills(bills) {
  const list = document.getElementById('bills-list');
  if (!list) return;

  const catMap = {};
  _categories.forEach(c => { catMap[c.id] = c; });
  const accMap = {};
  _accounts.forEach(a => { accMap[a.id] = a; });

  if (!bills.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📅</div><h3>Nenhuma conta neste mês</h3><p>Adicione transações com vencimento neste período</p></div>`;
    return;
  }

  // Group by status
  const groups = {
    overdue: bills.filter(b => b.status === 'overdue'),
    pending: bills.filter(b => b.status === 'pending'),
    paid: bills.filter(b => b.status === 'paid'),
    cancelled: bills.filter(b => b.status === 'cancelled')
  };

  let html = '';
  const renderGroup = (label, items, color) => {
    if (!items.length) return '';
    const total = items.reduce((s, b) => s + (b.amount || 0), 0);
    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 4px">
          <span style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${color}">${label} (${items.length})</span>
          <span style="font-size:0.875rem;font-weight:600;color:${color}">${formatCurrency(total)}</span>
        </div>
        ${items.map(bill => renderBillRow(bill, catMap, accMap)).join('')}
      </div>
    `;
  };

  html += renderGroup('⚠️ Atrasados', groups.overdue, 'var(--danger)');
  html += renderGroup('⏳ Pendentes', groups.pending, 'var(--warning)');
  html += renderGroup('✅ Pagos', groups.paid, 'var(--success)');
  html += renderGroup('❌ Cancelados', groups.cancelled, 'var(--text-muted)');

  list.innerHTML = html;

  // Event listeners
  list.querySelectorAll('.quick-pay-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await markAsPaid(id);
        showToast('Pago! ✅', 'success');
      } catch(e) {
        showToast('Erro ao marcar como pago', 'error');
        btn.disabled = false;
      }
    });
  });

  list.querySelectorAll('.status-select-inline').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id = sel.dataset.id;
      const newStatus = sel.value;
      try {
        const update = { status: newStatus };
        if (newStatus === 'paid') update.paidDate = Timestamp.now();
        await updateTransaction(id, update);
        showToast('Status atualizado', 'success');
      } catch(e) {
        showToast('Erro ao atualizar', 'error');
      }
    });
  });

  list.querySelectorAll('.bill-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const ok = await confirmDialog('Excluir conta', 'Deseja excluir esta conta?', 'Excluir', true);
      if (!ok) return;
      try {
        await deleteTransaction(id);
        showToast('Conta excluída', 'info');
      } catch(e) {
        showToast('Erro ao excluir', 'error');
      }
    });
  });
}

function renderBillRow(bill, catMap, accMap) {
  const cat = catMap[bill.categoryId];
  const acc = accMap[bill.accountId];
  const days = getDaysUntilDue(bill.dueDate);
  const isIncome = bill.type === 'income';

  let dueLabel = '';
  if (bill.status !== 'paid' && bill.status !== 'cancelled') {
    if (days === null) dueLabel = '';
    else if (days < 0) dueLabel = `<span style="color:var(--danger);font-size:0.75rem;font-weight:600">${Math.abs(days)}d atrás</span>`;
    else if (days === 0) dueLabel = `<span style="color:var(--warning);font-size:0.75rem;font-weight:600">Hoje!</span>`;
    else if (days <= 3) dueLabel = `<span style="color:var(--warning);font-size:0.75rem">Em ${days}d</span>`;
    else dueLabel = `<span style="color:var(--text-muted);font-size:0.75rem">Em ${days}d</span>`;
  }

  return `
    <div class="bill-item ${bill.status === 'overdue' ? 'overdue' : days !== null && days <= 3 && bill.status === 'pending' ? 'due-soon' : ''}" style="margin-bottom:8px">
      <div style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:${cat?.color ? cat.color + '22' : 'var(--bg-surface-3)'};flex-shrink:0;font-size:1.1rem">
        ${cat?.icon || (isIncome ? '💰' : '💸')}
      </div>
      <div class="bill-info">
        <div class="bill-name">${bill.description}</div>
        <div class="bill-date" style="display:flex;align-items:center;gap:8px">
          ${bill.dueDate ? `Vence ${formatDate(bill.dueDate)}` : '﻿Sem vencimento'}
          ${dueLabel}
          ${acc ? `<span>· ${acc.icon || ''} ${acc.name}</span>` : ''}
          ${cat ? `<span>· ${cat.name}</span>` : ''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="bill-amount" style="color:${isIncome ? 'var(--success)' : 'var(--danger)'}">
          ${isIncome ? '+' : '-'}${formatCurrency(bill.amount)}
        </div>
        <div style="margin-top:4px">
          <select class="status-select-inline form-select" data-id="${bill.id}" style="padding:3px 6px;font-size:0.75rem;height:26px">
            <option value="pending" ${bill.status === 'pending' ? 'selected' : ''}>Pendente</option>
            <option value="paid" ${bill.status === 'paid' ? 'selected' : ''}>Pago</option>
            <option value="overdue" ${bill.status === 'overdue' ? 'selected' : ''}>Atrasado</option>
            <option value="cancelled" ${bill.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </div>
      ${bill.status !== 'paid' && bill.status !== 'cancelled' ? `
        <button class="quick-pay-btn bill-pay-btn" data-id="${bill.id}">✓ Pagar</button>
      ` : ''}
      <button class="btn-icon btn-sm bill-delete-btn" data-id="${bill.id}" title="Excluir" style="color:var(--danger)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  `;
}

async function checkOverdue() {
  try {
    const overdue = await getOverduePendingBills();
    const banner = document.getElementById('rollover-banner');
    const text = document.getElementById('rollover-text');
    const rollBtn = document.getElementById('btn-rollover');

    if (!overdue.length || !banner) return;

    // Filter out current month
    const now = new Date();
    const pastOverdue = overdue.filter(b => {
      const d = toDate(b.dueDate);
      return d && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear());
    });

    if (!pastOverdue.length) return;

    text.textContent = `${pastOverdue.length} conta${pastOverdue.length > 1 ? 's' : ''} de meses anteriores ${pastOverdue.length > 1 ? 'estão' : 'está'} em aberto. Deseja transferir para o mês atual?`;
    banner.style.display = 'flex';

    rollBtn.addEventListener('click', async () => {
      rollBtn.disabled = true;
      rollBtn.textContent = 'Transferindo...';
      try {
        for (const bill of pastOverdue) {
          const newDue = new Date(now.getFullYear(), now.getMonth(), toDate(bill.dueDate)?.getDate() || 1, 12, 0, 0);
          await createTransaction({
            ...bill,
            id: undefined,
            date: Timestamp.fromDate(newDue),
            dueDate: Timestamp.fromDate(newDue),
            status: 'pending',
            paidDate: null,
            description: bill.description,
            notes: `[Rollover] ${bill.notes || ''}`
          });
          // Mark original as cancelled
          await updateTransaction(bill.id, { status: 'cancelled' });
        }
        showToast(`${pastOverdue.length} conta(s) transferidas para ${getMonthName(now.getMonth())}!`, 'success');
        banner.style.display = 'none';
      } catch(e) {
        showToast('Erro no rollover', 'error');
        rollBtn.disabled = false;
        rollBtn.textContent = 'Transferir para este mês';
      }
    });
  } catch(e) {
    console.error('checkOverdue:', e);
  }
}
