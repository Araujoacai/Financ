// Transactions module — full CRUD with filters
import {
  createTransaction, updateTransaction, deleteTransaction, subscribeTransactions, markAsPaid
} from './db.js';
import {
  formatCurrency, formatDate, formatDateInput, getStatusClass, getStatusLabel,
  parseAmount, showToast, confirmDialog, debounce, toDate, truncate
} from './utils.js';
import { adjustAccountBalance } from './accounts.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let unsub = null;
let allTransactions = [];
let currentType = 'expense';
let editId = null;
let _categories = [];
let _accounts = [];

// Filters state
const filters = { type: '', status: '', categoryId: '', accountId: '', search: '', dateFrom: '', dateTo: '' };

export function initTransactions(categories, accounts) {
  _categories = categories;
  _accounts = accounts;
  const el = document.getElementById('view-transactions');
  el.innerHTML = renderShell();
  setupShellListeners();

  if (unsub) unsub();
  unsub = subscribeTransactions(txns => {
    allTransactions = txns;
    renderList();
  });
}

export function destroyTransactions() {
  if (unsub) { unsub(); unsub = null; }
}

export function openTransactionModal(prefill = {}) {
  editId = prefill.id || null;
  currentType = prefill.type || 'expense';

  const modal = document.getElementById('transaction-modal');
  const titleEl = document.getElementById('transaction-modal-title');
  titleEl.textContent = editId ? 'Editar Transação' : 'Nova Transação';

  // Set type tabs
  document.querySelectorAll('#type-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentType);
  });

  // Populate selects
  populateCategorySelect('t-category', currentType, prefill.categoryId);
  populateAccountSelect('t-account', prefill.accountId);

  // Fill form
  document.getElementById('t-id').value = editId || '';
  document.getElementById('t-description').value = prefill.description || '';
  document.getElementById('t-amount').value = prefill.amount || '';
  document.getElementById('t-date').value = prefill.date ? formatDateInput(prefill.date) : new Date().toISOString().split('T')[0];
  document.getElementById('t-due-date').value = prefill.dueDate ? formatDateInput(prefill.dueDate) : '';
  document.getElementById('t-status').value = prefill.status || 'pending';
  document.getElementById('t-paid-date').value = prefill.paidDate ? formatDateInput(prefill.paidDate) : '';
  document.getElementById('t-notes').value = prefill.notes || '';

  modal.classList.add('modal-open');
}

function renderShell() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Transações</h2>
        <p>Histórico completo de receitas e despesas</p>
      </div>
      <button class="btn btn-primary" id="btn-new-transaction">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Transação
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-input-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="form-input" id="filter-search" placeholder="Buscar por descrição...">
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-select" id="filter-type">
          <option value="">Todos</option>
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="filter-status">
          <option value="">Todos</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="overdue">Atrasado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-select" id="filter-category">
          <option value="">Todas</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Conta</label>
        <select class="form-select" id="filter-account">
          <option value="">Todas</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">De</label>
        <input type="date" class="form-input" id="filter-from">
      </div>
      <div class="form-group">
        <label class="form-label">Até</label>
        <input type="date" class="form-input" id="filter-to">
      </div>
      <button class="btn btn-ghost btn-sm" id="btn-clear-filters" style="align-self:flex-end">Limpar</button>
    </div>

    <!-- Summary Bar -->
    <div id="txn-summary" style="display:flex;gap:20px;padding:12px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:16px;flex-wrap:wrap">
      <span id="sum-count" style="font-size:0.85rem;color:var(--text-muted)"></span>
      <span id="sum-income" style="font-size:0.85rem;color:var(--success)"></span>
      <span id="sum-expense" style="font-size:0.85rem;color:var(--danger)"></span>
      <span id="sum-net" style="font-size:0.85rem;font-weight:700"></span>
    </div>

    <!-- Table -->
    <div class="data-table">
      <div class="table-head" style="grid-template-columns:2fr 1fr 1fr 1fr 120px 100px 90px">
        <span>Descrição</span>
        <span>Categoria</span>
        <span>Conta</span>
        <span>Data</span>
        <span>Valor</span>
        <span>Status</span>
        <span style="text-align:right">Ações</span>
      </div>
      <div id="transactions-body">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>
  `;
}

function setupShellListeners() {
  document.getElementById('btn-new-transaction')?.addEventListener('click', () => openTransactionModal());

  // Filters
  const dSearch = debounce(v => { filters.search = v; renderList(); }, 300);
  document.getElementById('filter-search')?.addEventListener('input', e => dSearch(e.target.value));
  document.getElementById('filter-type')?.addEventListener('change', e => { filters.type = e.target.value; renderList(); });
  document.getElementById('filter-status')?.addEventListener('change', e => { filters.status = e.target.value; renderList(); });
  document.getElementById('filter-category')?.addEventListener('change', e => { filters.categoryId = e.target.value; renderList(); });
  document.getElementById('filter-account')?.addEventListener('change', e => { filters.accountId = e.target.value; renderList(); });
  document.getElementById('filter-from')?.addEventListener('change', e => { filters.dateFrom = e.target.value; renderList(); });
  document.getElementById('filter-to')?.addEventListener('change', e => { filters.dateTo = e.target.value; renderList(); });
  document.getElementById('btn-clear-filters')?.addEventListener('click', clearFilters);

  // Populate filter selects
  const catSel = document.getElementById('filter-category');
  if (catSel) {
    _categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = `${c.icon || ''} ${c.name}`;
      catSel.appendChild(opt);
    });
  }
  const accSel = document.getElementById('filter-account');
  if (accSel) {
    _accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id; opt.textContent = `${a.icon || ''} ${a.name}`;
      accSel.appendChild(opt);
    });
  }

  // Modal events
  setupModalListeners();
}

function setupModalListeners() {
  const modal = document.getElementById('transaction-modal');
  if (!modal) return;

  // Clonar modal-box inteiro remove todos os listeners anteriores
  const box = modal.querySelector('.modal-box');
  if (box) {
    const newBox = box.cloneNode(true);
    box.parentNode.replaceChild(newBox, box);
  }

  const closeModal = () => { modal.classList.remove('modal-open'); editId = null; };
  modal.querySelector('#transaction-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#transaction-modal-cancel')?.addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);

  // Type tabs
  modal.querySelectorAll('#type-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentType = btn.dataset.type;
      modal.querySelectorAll('#type-tabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      populateCategorySelect('t-category', currentType);
    });
  });

  modal.querySelector('#transaction-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const saveBtn = modal.querySelector('#transaction-modal-save');
    saveBtn.disabled = true;
    modal.querySelector('#t-save-text').textContent = 'Salvando...';

    try {
      const data = buildFormData();

      if (editId) {
        // Edição: reverter saldo antigo e aplicar novo
        const old = allTransactions.find(t => t.id === editId);
        if (old?.accountId && old.status === 'paid') {
          // Reverter impacto antigo
          const oldDelta = old.type === 'income' ? -(old.amount || 0) : (old.amount || 0);
          await adjustAccountBalance(old.accountId, oldDelta);
        }
        await updateTransaction(editId, data);
        // Aplicar novo impacto se pago
        if (data.accountId && data.status === 'paid') {
          const newDelta = data.type === 'income' ? (data.amount || 0) : -(data.amount || 0);
          await adjustAccountBalance(data.accountId, newDelta);
        }
        showToast('Transação atualizada!', 'success');
      } else {
        await createTransaction(data);
        // Aplicar impacto no saldo se já marcado como pago
        if (data.accountId && data.status === 'paid') {
          const delta = data.type === 'income' ? (data.amount || 0) : -(data.amount || 0);
          await adjustAccountBalance(data.accountId, delta);
        }
        showToast('Transação criada!', 'success');
      }
      closeModal();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar transação', 'error');
    } finally {
      saveBtn.disabled = false;
      modal.querySelector('#t-save-text').textContent = 'Salvar';
    }
  });
}

function buildFormData() {
  const dateStr = document.getElementById('t-date').value;
  const dueDateStr = document.getElementById('t-due-date').value;
  const paidDateStr = document.getElementById('t-paid-date').value;

  return {
    type: currentType,
    description: document.getElementById('t-description').value.trim(),
    amount: parseAmount(document.getElementById('t-amount').value),
    categoryId: document.getElementById('t-category').value,
    accountId: document.getElementById('t-account').value,
    date: dateStr ? Timestamp.fromDate(new Date(dateStr + 'T12:00:00')) : Timestamp.now(),
    dueDate: dueDateStr ? Timestamp.fromDate(new Date(dueDateStr + 'T12:00:00')) : null,
    paidDate: paidDateStr ? Timestamp.fromDate(new Date(paidDateStr + 'T12:00:00')) : null,
    status: document.getElementById('t-status').value,
    notes: document.getElementById('t-notes').value.trim(),
    fromRecurring: false,
    recurringId: null
  };
}

function clearFilters() {
  filters.type = ''; filters.status = ''; filters.categoryId = '';
  filters.accountId = ''; filters.search = ''; filters.dateFrom = ''; filters.dateTo = '';
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-account').value = '';
  document.getElementById('filter-from').value = '';
  document.getElementById('filter-to').value = '';
  renderList();
}

function applyFilters(txns) {
  return txns.filter(t => {
    if (filters.type && t.type !== filters.type) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
    if (filters.accountId && t.accountId !== filters.accountId) return false;
    if (filters.search && !t.description?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.dateFrom) {
      const d = toDate(t.date);
      if (!d || d < new Date(filters.dateFrom)) return false;
    }
    if (filters.dateTo) {
      const d = toDate(t.date);
      if (!d || d > new Date(filters.dateTo + 'T23:59:59')) return false;
    }
    return true;
  });
}

function renderList() {
  const body = document.getElementById('transactions-body');
  if (!body) return;

  const filtered = applyFilters(allTransactions);

  // Summary
  const income = filtered.filter(t => t.type === 'income' && t.status !== 'cancelled').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = filtered.filter(t => t.type === 'expense' && t.status !== 'cancelled').reduce((s, t) => s + (t.amount || 0), 0);
  document.getElementById('sum-count').textContent = `${filtered.length} transações`;
  document.getElementById('sum-income').textContent = `Receitas: ${formatCurrency(income)}`;
  document.getElementById('sum-expense').textContent = `Despesas: ${formatCurrency(expense)}`;
  const net = income - expense;
  const netEl = document.getElementById('sum-net');
  netEl.textContent = `Líquido: ${formatCurrency(net)}`;
  netEl.style.color = net >= 0 ? 'var(--success)' : 'var(--danger)';

  if (!filtered.length) {
    body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>Nenhuma transação encontrada</h3><p>Tente ajustar os filtros</p></div>`;
    return;
  }

  const catMap = {};
  _categories.forEach(c => { catMap[c.id] = c; });
  const accMap = {};
  _accounts.forEach(a => { accMap[a.id] = a; });

  body.innerHTML = filtered.map(t => {
    const cat = catMap[t.categoryId];
    const acc = accMap[t.accountId];
    const isIncome = t.type === 'income';
    return `
      <div class="table-row" style="grid-template-columns:2fr 1fr 1fr 1fr 120px 100px 90px">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <div style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:${cat?.color ? cat.color + '22' : 'var(--bg-surface-3)'};flex-shrink:0;font-size:1rem">
            ${cat?.icon || (isIncome ? '💰' : '💸')}
          </div>
          <div style="min-width:0">
            <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.description}</div>
            ${t.notes ? `<div style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${truncate(t.notes, 40)}</div>` : ''}
          </div>
        </div>
        <span style="color:var(--text-secondary);font-size:0.875rem">${cat ? `${cat.icon || ''} ${cat.name}` : '—'}</span>
        <span style="color:var(--text-secondary);font-size:0.875rem">${acc ? `${acc.icon || ''} ${acc.name}` : '—'}</span>
        <span style="color:var(--text-muted);font-size:0.875rem">${formatDate(t.date)}</span>
        <span style="font-weight:700;color:${isIncome ? 'var(--success)' : 'var(--danger)'}">
          ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
        </span>
        <div>
          <select class="form-select" style="padding:4px 8px;font-size:0.78rem;height:30px" data-id="${t.id}" onchange="window._changeStatus(this.value, '${t.id}')">
            <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Pendente</option>
            <option value="paid" ${t.status === 'paid' ? 'selected' : ''}>Pago</option>
            <option value="overdue" ${t.status === 'overdue' ? 'selected' : ''}>Atrasado</option>
            <option value="cancelled" ${t.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
        <div class="table-actions">
          <button class="btn-icon btn-sm" title="Editar" onclick="window._editTransaction('${t.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-sm" title="Excluir" style="color:var(--danger)" onclick="window._deleteTransaction('${t.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Register global handlers (reatribuição é segura pois são closures que capturam allTransactions)
  window._editTransaction = (id) => {
    const t = allTransactions.find(x => x.id === id);
    if (t) openTransactionModal({ ...t, id });
  };
  window._deleteTransaction = async (id) => {
    const ok = await confirmDialog('Excluir transação', 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.', 'Excluir', true);
    if (!ok) return;
    try {
      const t = allTransactions.find(x => x.id === id);
      // Reverter impacto no saldo se estava pago
      if (t?.accountId && t.status === 'paid') {
        const delta = t.type === 'income' ? -(t.amount || 0) : (t.amount || 0);
        await adjustAccountBalance(t.accountId, delta);
      }
      await deleteTransaction(id);
      showToast('Transação excluída', 'info');
    } catch (err) {
      showToast('Erro ao excluir', 'error');
    }
  };
  window._changeStatus = async (status, id) => {
    try {
      const t = allTransactions.find(x => x.id === id);
      const update = { status };
      if (status === 'paid') {
        update.paidDate = Timestamp.now();
        // Aplicar impacto no saldo ao marcar como pago
        if (t?.accountId) {
          const delta = t.type === 'income' ? (t.amount || 0) : -(t.amount || 0);
          await adjustAccountBalance(t.accountId, delta);
        }
      } else if (t?.status === 'paid') {
        // Estava pago e mudou para outro status: reverter
        if (t?.accountId) {
          const delta = t.type === 'income' ? -(t.amount || 0) : (t.amount || 0);
          await adjustAccountBalance(t.accountId, delta);
        }
      }
      await updateTransaction(id, update);
      showToast('Status atualizado!', 'success');
    } catch (e) {
      showToast('Erro ao atualizar status', 'error');
    }
  };
}

export function populateCategorySelect(selectId, type = 'expense', selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const filtered = _categories.filter(c => c.type === type || c.type === 'both');
  sel.innerHTML = `<option value="">— Sem categoria —</option>` +
    filtered.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.icon || ''} ${c.name}</option>`).join('');
}

export function populateAccountSelect(selectId, selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">— Sem conta —</option>` +
    _accounts.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.icon || ''} ${a.name}</option>`).join('');
}
