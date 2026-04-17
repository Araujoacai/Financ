// Recurring bills module — CRUD and month generation
import {
  subscribeRecurringBills, createRecurringBill, updateRecurringBill,
  deleteRecurringBill, generateMonthlyRecurring
} from './db.js';
import {
  formatCurrency, showToast, confirmDialog, parseAmount, getMonthName
} from './utils.js';

let unsub = null;
let _categories = [];
let _accounts = [];
let currentRType = 'expense';
let editRId = null;

export function initRecurring(categories, accounts) {
  _categories = categories;
  _accounts = accounts;
  const el = document.getElementById('view-recurring');
  el.innerHTML = renderShell();
  setupListeners();

  if (unsub) unsub();
  unsub = subscribeRecurringBills(bills => renderList(bills));
}

export function destroyRecurring() {
  if (unsub) { unsub(); unsub = null; }
}

function renderShell() {
  const now = new Date();
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Recorrências</h2>
        <p>Contas fixas que se repetem todo mês</p>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-ghost" id="btn-generate-month">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
          Gerar ${getMonthName(now.getMonth())}
        </button>
        <button class="btn btn-primary" id="btn-new-recurring">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Recorrência
        </button>
      </div>
    </div>

    <!-- Info card -->
    <div class="card" style="padding:16px 20px;margin-bottom:24px;background:var(--accent-light);border-color:rgba(99,102,241,0.3)">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="font-size:1.4rem">🔄</span>
        <div>
          <div style="font-weight:600;font-size:0.9rem;color:var(--accent-hover)">Como funciona</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px">
            Recorrências são modelos de contas que se repetem mensalmente. Clique em <strong>"Gerar [Mês]"</strong> para criar automaticamente as transações deste mês com base nas recorrências ativas. Contas já geradas são ignoradas para evitar duplicatas.
          </div>
        </div>
      </div>
    </div>

    <div id="recurring-list">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
  `;
}

function setupListeners() {
  document.getElementById('btn-new-recurring')?.addEventListener('click', () => openRecurringModal());
  document.getElementById('btn-generate-month')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-generate-month');
    btn.disabled = true;
    const now = new Date();
    try {
      const count = await generateMonthlyRecurring(now.getMonth(), now.getFullYear());
      if (count > 0) {
        showToast(`${count} transação(ões) gerada(s) para ${getMonthName(now.getMonth())}!`, 'success');
      } else {
        showToast('Nenhuma nova transação a gerar (já foram criadas).', 'info');
      }
    } catch(e) {
      console.error(e);
      showToast('Erro ao gerar transações', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // Modal events
  setupModalListeners();
}

function setupModalListeners() {
  const modal = document.getElementById('recurring-modal');
  const form = document.getElementById('recurring-form');
  const closeBtn = document.getElementById('recurring-modal-close');
  const cancelBtn = document.getElementById('recurring-modal-cancel');

  const closeModal = () => { modal.classList.remove('modal-open'); editRId = null; };
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);

  // Type tabs
  document.querySelectorAll('#recurring-type-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentRType = btn.dataset.type;
      document.getElementById('r-type-val').value = currentRType;
      document.querySelectorAll('#recurring-type-tabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      populateCategorySelect('r-category', currentRType);
    });
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const data = {
        type: document.getElementById('r-type-val').value || currentRType,
        description: document.getElementById('r-description').value.trim(),
        amount: parseAmount(document.getElementById('r-amount').value),
        categoryId: document.getElementById('r-category').value,
        accountId: document.getElementById('r-account').value,
        dayOfMonth: parseInt(document.getElementById('r-day').value) || 1,
        active: document.getElementById('r-active').checked,
        notes: document.getElementById('r-notes').value.trim()
      };
      if (editRId) {
        await updateRecurringBill(editRId, data);
        showToast('Recorrência atualizada!', 'success');
      } else {
        await createRecurringBill(data);
        showToast('Recorrência criada!', 'success');
      }
      closeModal();
    } catch(e) {
      showToast('Erro ao salvar', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

function openRecurringModal(bill = null) {
  editRId = bill?.id || null;
  currentRType = bill?.type || 'expense';

  document.getElementById('recurring-modal-title').textContent = editRId ? 'Editar Recorrência' : 'Nova Recorrência';
  document.querySelectorAll('#recurring-type-tabs .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === currentRType);
  });
  document.getElementById('r-type-val').value = currentRType;
  document.getElementById('r-description').value = bill?.description || '';
  document.getElementById('r-amount').value = bill?.amount || '';
  document.getElementById('r-day').value = bill?.dayOfMonth || '';
  document.getElementById('r-active').checked = bill ? bill.active !== false : true;
  document.getElementById('r-notes').value = bill?.notes || '';

  populateCategorySelect('r-category', currentRType, bill?.categoryId);
  populateAccountSelect('r-account', bill?.accountId);

  document.getElementById('recurring-modal').classList.add('modal-open');
}

function renderList(bills) {
  const el = document.getElementById('recurring-list');
  if (!el) return;

  if (!bills.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔄</div>
        <h3>Nenhuma recorrência cadastrada</h3>
        <p>Adicione contas fixas como aluguel, assinaturas, salário, etc.</p>
        <button class="btn btn-primary" onclick="document.getElementById('btn-new-recurring').click()" style="margin-top:8px">Adicionar Recorrência</button>
      </div>
    `;
    return;
  }

  const catMap = {};
  _categories.forEach(c => { catMap[c.id] = c; });
  const accMap = {};
  _accounts.forEach(a => { accMap[a.id] = a; });

  const expense = bills.filter(b => b.type === 'expense');
  const income = bills.filter(b => b.type === 'income');

  const renderSection = (title, items, color) => {
    if (!items.length) return '';
    const total = items.reduce((s, b) => s + (b.amount || 0), 0);
    return `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span style="font-size:0.85rem;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.06em">${title}</span>
          <span style="font-size:0.875rem;font-weight:600;color:${color}">Total: ${formatCurrency(total)}/mês</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${items.map(b => renderRecurringCard(b, catMap, accMap)).join('')}
        </div>
      </div>
    `;
  };

  el.innerHTML = renderSection('💰 Receitas Recorrentes', income, 'var(--success)') +
    renderSection('💸 Despesas Recorrentes', expense, 'var(--danger)');

  // Event listeners
  el.querySelectorAll('.btn-edit-recurring').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const bill = bills.find(b => b.id === id);
      if (bill) openRecurringModal(bill);
    });
  });
  el.querySelectorAll('.btn-delete-recurring').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const ok = await confirmDialog('Excluir recorrência', 'Excluir esta recorrência? Transações já geradas não serão afetadas.', 'Excluir', true);
      if (!ok) return;
      try {
        await deleteRecurringBill(id);
        showToast('Recorrência excluída', 'info');
      } catch(e) {
        showToast('Erro ao excluir', 'error');
      }
    });
  });
  el.querySelectorAll('.toggle-recurring-active').forEach(chk => {
    chk.addEventListener('change', async () => {
      await updateRecurringBill(chk.dataset.id, { active: chk.checked });
      showToast(chk.checked ? 'Recorrência ativada' : 'Recorrência pausada', 'info');
    });
  });
}

function renderRecurringCard(bill, catMap, accMap) {
  const cat = catMap[bill.categoryId];
  const acc = accMap[bill.accountId];
  const isIncome = bill.type === 'income';

  return `
    <div class="transaction-item" style="opacity:${bill.active === false ? 0.5 : 1}">
      <div style="width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${cat?.color ? cat.color + '22' : 'var(--bg-surface-3)'};font-size:1.2rem;flex-shrink:0">
        ${cat?.icon || (isIncome ? '💰' : '💸')}
      </div>
      <div class="transaction-info">
        <div class="transaction-desc">${bill.description}</div>
        <div class="transaction-meta">
          <span>Todo dia <strong>${bill.dayOfMonth || '?'}</strong></span>
          ${cat ? `<span>· ${cat.name}</span>` : ''}
          ${acc ? `<span>· ${acc.icon || ''} ${acc.name}</span>` : ''}
          ${bill.notes ? `<span>· ${bill.notes}</span>` : ''}
        </div>
      </div>
      <span class="transaction-amount" style="color:${isIncome ? 'var(--success)' : 'var(--danger)'}">
        ${isIncome ? '+' : '-'}${formatCurrency(bill.amount)}
      </span>
      <label class="toggle" title="${bill.active !== false ? 'Ativa' : 'Pausada'}">
        <input type="checkbox" class="toggle-recurring-active" data-id="${bill.id}" ${bill.active !== false ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
      <button class="btn-icon btn-sm btn-edit-recurring" data-id="${bill.id}" title="Editar">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn-icon btn-sm btn-delete-recurring" data-id="${bill.id}" title="Excluir" style="color:var(--danger)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  `;
}

function populateCategorySelect(selectId, type = 'expense', selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const filtered = _categories.filter(c => c.type === type || c.type === 'both');
  sel.innerHTML = `<option value="">— Sem categoria —</option>` +
    filtered.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.icon || ''} ${c.name}</option>`).join('');
}

function populateAccountSelect(selectId, selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">— Sem conta —</option>` +
    _accounts.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.icon || ''} ${a.name}</option>`).join('');
}
