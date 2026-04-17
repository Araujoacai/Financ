// Accounts module — CRUD with balance management
import {
  subscribeAccounts, createAccount, updateAccount, deleteAccount
} from './db.js';
import { formatCurrency, parseAmount, showToast, confirmDialog } from './utils.js';

let unsub = null;

export function initAccounts() {
  const el = document.getElementById('view-accounts');
  el.innerHTML = renderShell();
  setupListeners();

  if (unsub) unsub();
  unsub = subscribeAccounts(accounts => renderCards(accounts));
}

export function destroyAccounts() {
  if (unsub) { unsub(); unsub = null; }
}

function renderShell() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Contas e Carteiras</h2>
        <p>Gerencie suas contas bancárias, cartões e carteiras</p>
      </div>
      <button class="btn btn-primary" id="btn-new-account">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Conta
      </button>
    </div>

    <!-- Total balance -->
    <div id="accounts-total-card" class="card" style="padding:24px;margin-bottom:28px;background:linear-gradient(135deg,var(--bg-surface-2),var(--bg-surface));border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div>
          <div class="card-title">Saldo Total Consolidado</div>
          <div id="total-balance" class="card-value" style="font-size:2rem;margin-top:4px">R$ 0,00</div>
          <div style="font-size:0.82rem;color:var(--text-muted);margin-top:6px">Soma de todas as contas marcadas como "incluir no total"</div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" width="56" height="56" opacity="0.3"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      </div>
    </div>

    <div class="accounts-grid" id="accounts-grid">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
  `;
}

const accountTypeLabel = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit: 'Cartão de Crédito',
  cash: 'Dinheiro',
  investment: 'Investimento'
};

function setupListeners() {
  document.getElementById('btn-new-account')?.addEventListener('click', () => openAccountModal());
  setupModalListeners();
}

function setupModalListeners() {
  const modal = document.getElementById('account-modal');
  const form = document.getElementById('account-form');
  const closeBtn = document.getElementById('account-modal-close');
  const cancelBtn = document.getElementById('account-modal-cancel');

  const closeModal = () => { modal.classList.remove('modal-open'); document.getElementById('a-id').value = ''; };
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const id = document.getElementById('a-id').value;
    const data = {
      name: document.getElementById('a-name').value.trim(),
      icon: document.getElementById('a-icon').value.trim() || '🏦',
      type: document.getElementById('a-type').value,
      color: document.getElementById('a-color').value,
      balance: parseAmount(document.getElementById('a-balance').value),
      includeInTotal: document.getElementById('a-include-total').checked,
      active: true
    };
    try {
      if (id) {
        await updateAccount(id, data);
        showToast('Conta atualizada!', 'success');
      } else {
        await createAccount(data);
        showToast('Conta criada!', 'success');
      }
      closeModal();
    } catch(e) {
      showToast('Erro ao salvar', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

function openAccountModal(acc = null) {
  document.getElementById('account-modal-title').textContent = acc ? 'Editar Conta' : 'Nova Conta';
  document.getElementById('a-id').value = acc?.id || '';
  document.getElementById('a-name').value = acc?.name || '';
  document.getElementById('a-icon').value = acc?.icon || '';
  document.getElementById('a-type').value = acc?.type || 'checking';
  document.getElementById('a-color').value = acc?.color || '#6366F1';
  document.getElementById('a-balance').value = acc?.balance ?? '';
  document.getElementById('a-include-total').checked = acc ? acc.includeInTotal !== false : true;
  document.getElementById('account-modal').classList.add('modal-open');
}

let balanceAdjId = null;

function openBalanceAdjust(acc) {
  balanceAdjId = acc.id;
  const newBal = prompt(`Ajustar saldo de "${acc.name}"\nSaldo atual: ${formatCurrency(acc.balance)}\n\nNovo saldo (R$):`);
  if (newBal === null) return;
  const val = parseAmount(newBal);
  if (isNaN(val)) { showToast('Valor inválido', 'error'); return; }
  updateAccount(acc.id, { balance: val })
    .then(() => showToast(`Saldo atualizado para ${formatCurrency(val)}`, 'success'))
    .catch(() => showToast('Erro ao atualizar saldo', 'error'));
}

function renderCards(accounts) {
  const grid = document.getElementById('accounts-grid');
  const totalEl = document.getElementById('total-balance');
  if (!grid) return;

  const total = accounts.filter(a => a.includeInTotal && a.active !== false).reduce((s, a) => s + (a.balance || 0), 0);
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (totalEl) totalEl.style.color = total >= 0 ? 'var(--text-primary)' : 'var(--danger)';

  if (!accounts.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🏦</div><h3>Nenhuma conta cadastrada</h3><p>Adicione sua conta corrente, poupança, cartão de crédito ou carteira.</p></div>`;
    return;
  }

  grid.innerHTML = accounts.map(acc => {
    const isNegative = (acc.balance || 0) < 0;
    return `
      <div class="account-card card" style="--card-color:${acc.color || 'var(--accent)'}">
        <div class="account-card-blur"></div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${acc.color}33;font-size:1.4rem">
              ${acc.icon || '🏦'}
            </div>
            <div>
              <div style="font-weight:700;font-size:1rem">${acc.name}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">${accountTypeLabel[acc.type] || acc.type}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn-icon btn-sm" onclick="window._adjustBal('${acc.id}')" title="Ajustar saldo" style="font-size:0.7rem;padding:5px 8px;border-radius:6px">
              ✏️ Saldo
            </button>
            <button class="btn-icon btn-sm" onclick="window._editAcc('${acc.id}')" title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-sm" style="color:var(--danger)" onclick="window._deleteAcc('${acc.id}','${acc.name}')" title="Excluir">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
        <div>
          <div class="card-title">Saldo Atual</div>
          <div class="card-value" style="color:${isNegative ? 'var(--danger)' : 'var(--text-primary)'}">
            ${formatCurrency(acc.balance || 0)}
          </div>
        </div>
        <div style="margin-top:14px;display:flex;align-items:center;gap:8px">
          ${acc.includeInTotal !== false ?
            `<span style="font-size:0.75rem;padding:3px 8px;background:var(--success-light);color:var(--success);border-radius:99px;font-weight:600">✓ No total</span>` :
            `<span style="font-size:0.75rem;padding:3px 8px;background:var(--bg-surface-3);color:var(--text-muted);border-radius:99px">Excluído do total</span>`}
          <div style="width:${Math.min(Math.abs((acc.balance || 0) / 10000) * 100, 100)}%;max-width:calc(100% - 120px);height:3px;background:${acc.color || 'var(--accent)'};border-radius:3px;opacity:0.5;margin-left:auto"></div>
        </div>
      </div>
    `;
  }).join('');

  window._editAcc = (id) => {
    const acc = accounts.find(a => a.id === id);
    if (acc) openAccountModal(acc);
  };
  window._deleteAcc = async (id, name) => {
    const ok = await confirmDialog('Excluir conta', `Excluir a conta "${name}"? As transações associadas não serão excluídas.`, 'Excluir', true);
    if (!ok) return;
    try {
      await deleteAccount(id);
      showToast('Conta excluída', 'info');
    } catch(e) {
      showToast('Erro ao excluir', 'error');
    }
  };
  window._adjustBal = (id) => {
    const acc = accounts.find(a => a.id === id);
    if (acc) openBalanceAdjust(acc);
  };
}
