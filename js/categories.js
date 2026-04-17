// Categories module — CRUD with budget progress bars
import {
  subscribeCategories, createCategory, updateCategory, deleteCategory,
  subscribeTransactions
} from './db.js';
import { formatCurrency, showToast, confirmDialog, toDate } from './utils.js';

let unsubCats = null;
let unsubTxns = null;
let allTransactions = [];

export function initCategories() {
  const el = document.getElementById('view-categories');
  el.innerHTML = renderShell();
  setupListeners();

  if (unsubCats) unsubCats();
  if (unsubTxns) unsubTxns();

  unsubTxns = subscribeTransactions(txns => {
    allTransactions = txns;
  });

  unsubCats = subscribeCategories(cats => renderGrid(cats));
}

export function destroyCategories() {
  if (unsubCats) { unsubCats(); unsubCats = null; }
  if (unsubTxns) { unsubTxns(); unsubTxns = null; }
}

function renderShell() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Categorias</h2>
        <p>Organize seus gastos e receitas com categorias personalizadas</p>
      </div>
      <button class="btn btn-primary" id="btn-new-category">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Categoria
      </button>
    </div>

    <!-- Type tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px">
      <button class="tab-btn active" id="cat-tab-all" onclick="window._setCatTab('all', this)">Todas</button>
      <button class="tab-btn" id="cat-tab-expense" onclick="window._setCatTab('expense', this)">💸 Despesas</button>
      <button class="tab-btn" id="cat-tab-income" onclick="window._setCatTab('income', this)">💰 Receitas</button>
    </div>

    <div class="categories-grid" id="categories-grid">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
  `;
}

let currentCatTab = 'all';
let allCats = [];

window._setCatTab = (tab, btn) => {
  currentCatTab = tab;
  document.querySelectorAll('#cat-tab-all, #cat-tab-expense, #cat-tab-income').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGrid(allCats);
};

function setupListeners() {
  document.getElementById('btn-new-category')?.addEventListener('click', () => openCategoryModal());
  setupModalListeners();
}

function setupModalListeners() {
  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const closeBtn = document.getElementById('category-modal-close');
  const cancelBtn = document.getElementById('category-modal-cancel');

  const closeModal = () => { modal.classList.remove('modal-open'); document.getElementById('c-id').value = ''; };
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const id = document.getElementById('c-id').value;
    const data = {
      name: document.getElementById('c-name').value.trim(),
      icon: document.getElementById('c-icon').value.trim() || '📦',
      type: document.getElementById('c-type').value,
      color: document.getElementById('c-color').value,
      budget: parseFloat(document.getElementById('c-budget').value) || 0
    };
    try {
      if (id) {
        await updateCategory(id, data);
        showToast('Categoria atualizada!', 'success');
      } else {
        await createCategory(data);
        showToast('Categoria criada!', 'success');
      }
      closeModal();
    } catch(e) {
      showToast('Erro ao salvar', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

function openCategoryModal(cat = null) {
  document.getElementById('category-modal-title').textContent = cat ? 'Editar Categoria' : 'Nova Categoria';
  document.getElementById('c-id').value = cat?.id || '';
  document.getElementById('c-name').value = cat?.name || '';
  document.getElementById('c-icon').value = cat?.icon || '';
  document.getElementById('c-type').value = cat?.type || 'expense';
  document.getElementById('c-color').value = cat?.color || '#6366F1';
  document.getElementById('c-budget').value = cat?.budget || '';
  document.getElementById('category-modal').classList.add('modal-open');
}

function getCurrentMonthSpend(categoryId) {
  const now = new Date();
  return allTransactions
    .filter(t => {
      const d = toDate(t.date);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        && t.categoryId === categoryId && t.type === 'expense' && t.status !== 'cancelled';
    })
    .reduce((s, t) => s + (t.amount || 0), 0);
}

function renderGrid(cats) {
  allCats = cats;
  const grid = document.getElementById('categories-grid');
  if (!grid) return;

  const filtered = currentCatTab === 'all' ? cats :
    cats.filter(c => c.type === currentCatTab || c.type === 'both');

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🏷️</div><h3>Nenhuma categoria</h3><p>Crie sua primeira categoria para organizar as finanças</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(cat => {
    const spent = getCurrentMonthSpend(cat.id);
    const budget = cat.budget || 0;
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const overBudget = budget > 0 && spent > budget;
    const barColor = overBudget ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : cat.color || 'var(--accent)';
    const typeLabel = { expense: '💸 Despesa', income: '💰 Receita', both: '↕ Ambos' }[cat.type] || '';

    return `
      <div class="category-card">
        <div class="category-header">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="category-icon-badge" style="background:${cat.color}22">
              <span>${cat.icon || '📦'}</span>
            </div>
            <div>
              <div style="font-weight:700;font-size:0.95rem">${cat.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${typeLabel}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn-icon btn-sm" onclick="window._editCat('${cat.id}')" title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-sm" style="color:var(--danger)" onclick="window._deleteCat('${cat.id}','${cat.name}')" title="Excluir">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>

        ${cat.type !== 'income' && budget > 0 ? `
          <div style="margin-top:10px">
            <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:6px">
              <span style="color:var(--text-muted)">Gasto este mês</span>
              <span style="font-weight:600;color:${overBudget ? 'var(--danger)' : 'var(--text-primary)'}">${formatCurrency(spent)} <span style="color:var(--text-muted)">/ ${formatCurrency(budget)}</span></span>
            </div>
            <div class="budget-bar">
              <div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            ${overBudget ? `<div style="font-size:0.72rem;color:var(--danger);margin-top:4px">⚠️ Orçamento excedido em ${formatCurrency(spent - budget)}</div>` : ''}
          </div>
        ` : cat.type === 'expense' ? `
          <div style="margin-top:10px;font-size:0.82rem;color:var(--text-muted)">
            <span>Gasto este mês: </span><span style="color:var(--text-primary);font-weight:600">${formatCurrency(spent)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  window._editCat = (id) => {
    const cat = cats.find(c => c.id === id);
    if (cat) openCategoryModal(cat);
  };
  window._deleteCat = async (id, name) => {
    const ok = await confirmDialog('Excluir categoria', `Excluir a categoria "${name}"? As transações associadas não serão excluídas.`, 'Excluir', true);
    if (!ok) return;
    try {
      await deleteCategory(id);
      showToast('Categoria excluída', 'info');
    } catch(e) {
      showToast('Erro ao excluir', 'error');
    }
  };
}
