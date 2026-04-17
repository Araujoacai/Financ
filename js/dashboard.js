// Dashboard module — KPIs, charts, upcoming bills, recent transactions
import {
  subscribeTransactions, getUpcomingBills, getOverduePendingBills, markAsPaid
} from './db.js';
import {
  formatCurrency, formatDate, formatRelativeDate, getMonthName,
  getShortMonthName, getStatusClass, getStatusLabel, getDaysUntilDue,
  isOverdue, toDate, showToast
} from './utils.js';

let chartLine = null;
let chartPie = null;
let unsub = null;
let allTransactions = [];

export function initDashboard(categories, accounts, settings) {
  const el = document.getElementById('view-dashboard');
  el.innerHTML = renderShell();

  // Subscribe to all transactions
  if (unsub) unsub();
  unsub = subscribeTransactions(txns => {
    allTransactions = txns;
    updateDashboard(categories, accounts, settings);
  });

  setupPayListeners(categories, accounts, settings);
}

export function destroyDashboard() {
  if (unsub) { unsub(); unsub = null; }
  if (chartLine) { chartLine.destroy(); chartLine = null; }
  if (chartPie) { chartPie.destroy(); chartPie = null; }
}

function renderShell() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h2 id="dash-greeting">Olá 👋</h2>
        <p id="dash-subtitle">Seu resumo financeiro</p>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid" id="kpi-grid">
      ${skeletonKPIs()}
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Evolução do Saldo (6 meses)</span>
        </div>
        <div class="chart-wrapper"><canvas id="chart-line"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Despesas por Categoria</span>
        </div>
        <div class="chart-wrapper"><canvas id="chart-pie"></canvas></div>
      </div>
    </div>

    <!-- Bottom grid -->
    <div class="dash-bottom">
      <div class="card" style="padding:20px">
        <div class="section-header">
          <span class="section-title">🔔 Próximos Vencimentos</span>
          <button class="btn btn-ghost btn-sm" onclick="window.navigateTo('bills')">Ver todos</button>
        </div>
        <div id="upcoming-list"><div class="empty-state"><div class="empty-state-icon">✅</div><p>Nenhum vencimento nos próximos dias</p></div></div>
      </div>
      <div class="card" style="padding:20px">
        <div class="section-header">
          <span class="section-title">📋 Últimas Transações</span>
          <button class="btn btn-ghost btn-sm" onclick="window.navigateTo('transactions')">Ver todas</button>
        </div>
        <div id="recent-list"><div class="empty-state"><div class="empty-state-icon">📭</div><p>Sem transações ainda</p></div></div>
      </div>
    </div>
  `;
}

function skeletonKPIs() {
  return Array(4).fill(`
    <div class="kpi-card">
      <div class="skeleton" style="height:12px;width:60%;margin-bottom:14px"></div>
      <div class="skeleton" style="height:28px;width:80%;margin-bottom:10px"></div>
      <div class="skeleton" style="height:10px;width:40%"></div>
    </div>
  `).join('');
}

function updateDashboard(categories, accounts, settings) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Current month transactions
  const monthTxns = allTransactions.filter(t => {
    const d = toDate(t.date);
    return d && d.getMonth() === month && d.getFullYear() === year;
  });

  const monthIncome = monthTxns
    .filter(t => t.type === 'income' && t.status !== 'cancelled')
    .reduce((s, t) => s + (t.amount || 0), 0);

  const monthExpense = monthTxns
    .filter(t => t.type === 'expense' && t.status !== 'cancelled')
    .reduce((s, t) => s + (t.amount || 0), 0);

  const netMonth = monthIncome - monthExpense;

  // Total balance from accounts
  const totalBalance = accounts
    .filter(a => a.includeInTotal && a.active !== false)
    .reduce((s, a) => s + (a.balance || 0), 0);

  // Pending this month
  const pendingAmt = monthTxns
    .filter(t => t.type === 'expense' && t.status === 'pending')
    .reduce((s, t) => s + (t.amount || 0), 0);

  // Update greeting
  const greetEl = document.getElementById('dash-greeting');
  const subEl = document.getElementById('dash-subtitle');
  if (greetEl) {
    const h = now.getHours();
    const greeting = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    greetEl.textContent = `${greeting} 👋`;
    if (subEl) subEl.textContent = `${getMonthName(month)} ${year} — Seu resumo financeiro`;
  }

  // Render KPIs
  renderKPIs(totalBalance, monthIncome, monthExpense, netMonth, pendingAmt);

  // Render Charts
  renderLineChart(year);
  renderPieChart(monthTxns, categories);

  // Upcoming bills
  loadUpcoming();

  // Recent transactions
  renderRecent(allTransactions.slice(0, 8), categories, accounts);
}

function renderKPIs(balance, income, expense, net, pending) {
  const grid = document.getElementById('kpi-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="kpi-card kpi-card-blue">
      <div class="kpi-icon kpi-icon-blue">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      </div>
      <div class="kpi-label">Saldo Total</div>
      <div class="kpi-value">${formatCurrency(balance)}</div>
      <div class="kpi-sub">Soma das contas ativas</div>
    </div>
    <div class="kpi-card kpi-card-green">
      <div class="kpi-icon kpi-icon-green">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <div class="kpi-label">Receitas do Mês</div>
      <div class="kpi-value" style="color:var(--success)">${formatCurrency(income)}</div>
      <div class="kpi-sub kpi-trend-up">↑ entradas registradas</div>
    </div>
    <div class="kpi-card kpi-card-red">
      <div class="kpi-icon kpi-icon-red">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <div class="kpi-label">Despesas do Mês</div>
      <div class="kpi-value" style="color:var(--danger)">${formatCurrency(expense)}</div>
      <div class="kpi-sub">
        <span style="color:var(--warning)">⏳ ${formatCurrency(pending)} pendente</span>
      </div>
    </div>
    <div class="kpi-card kpi-card-yellow">
      <div class="kpi-icon kpi-icon-yellow">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div class="kpi-label">Saldo do Mês</div>
      <div class="kpi-value" style="color:${net >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(net)}</div>
      <div class="kpi-sub ${net >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}">${net >= 0 ? '↑ Superávit' : '↓ Déficit'}</div>
    </div>
  `;
}

function renderLineChart(currentYear) {
  const canvas = document.getElementById('chart-line');
  if (!canvas || typeof Chart === 'undefined') return;
  if (chartLine) chartLine.destroy();

  const labels = [];
  const balances = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(getShortMonthName(d.getMonth()));

    const income = allTransactions
      .filter(t => {
        const td = toDate(t.date);
        return td && td.getMonth() <= d.getMonth() && td.getFullYear() <= d.getFullYear()
          && t.type === 'income' && t.status !== 'cancelled';
      }).reduce((s, t) => s + (t.amount || 0), 0);

    const expense = allTransactions
      .filter(t => {
        const td = toDate(t.date);
        return td && td.getMonth() <= d.getMonth() && td.getFullYear() <= d.getFullYear()
          && t.type === 'expense' && t.status !== 'cancelled';
      }).reduce((s, t) => s + (t.amount || 0), 0);

    balances.push(income - expense);
  }

  chartLine = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Saldo Acumulado',
        data: balances,
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366F1',
        pointRadius: 4,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748B', font: { size: 12 } } },
        y: {
          grid: { color: 'rgba(148,163,184,0.08)' },
          ticks: { color: '#64748B', font: { size: 11 }, callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' }
        }
      }
    }
  });
}

function renderPieChart(monthTxns, categories) {
  const canvas = document.getElementById('chart-pie');
  if (!canvas || typeof Chart === 'undefined') return;
  if (chartPie) chartPie.destroy();

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  const byCategory = {};
  monthTxns.filter(t => t.type === 'expense' && t.status !== 'cancelled').forEach(t => {
    const key = t.categoryId || '__other';
    byCategory[key] = (byCategory[key] || 0) + (t.amount || 0);
  });

  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (!entries.length) {
    canvas.closest('.chart-card').querySelector('.chart-wrapper').innerHTML =
      '<div class="empty-state" style="height:220px"><div class="empty-state-icon">📊</div><p>Sem despesas no mês</p></div>';
    return;
  }

  const labels = entries.map(([id]) => catMap[id]?.name || 'Outros');
  const data = entries.map(([, v]) => v);
  const colors = entries.map(([id]) => catMap[id]?.color || '#6B7280');

  chartPie = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#0F1421' }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94A3B8', font: { size: 11 }, boxWidth: 12, padding: 10 }
        },
        tooltip: {
          callbacks: { label: ctx => ` ${formatCurrency(ctx.parsed)}` }
        }
      }
    }
  });
}

async function loadUpcoming() {
  const settings_days = 7;
  const list = document.getElementById('upcoming-list');
  if (!list) return;

  try {
    const [upcoming, overdue] = await Promise.all([
      getUpcomingBills(settings_days),
      getOverduePendingBills()
    ]);

    // Update alert banner
    updateAlertBanner(overdue, upcoming);

    const all = [...overdue.filter(b => !upcoming.find(u => u.id === b.id)), ...upcoming];

    if (!all.length) {
      list.innerHTML = `<div class="empty-state" style="padding:32px"><div class="empty-state-icon">✅</div><p>Nenhum vencimento próximo</p></div>`;
      return;
    }

    list.innerHTML = all.map(bill => {
      const days = getDaysUntilDue(bill.dueDate);
      const overdueClass = days < 0 ? 'overdue' : days <= 3 ? 'due-soon' : '';
      return `
        <div class="bill-item ${overdueClass}">
          <div class="bill-info">
            <div class="bill-name">${bill.description}</div>
            <div class="bill-date">${formatRelativeDate(bill.dueDate)}</div>
          </div>
          <span class="bill-amount" style="color:var(--danger)">${formatCurrency(bill.amount)}</span>
          <button class="bill-pay-btn" data-id="${bill.id}">Pagar ✓</button>
        </div>
      `;
    }).join('');

    // Pay buttons
    list.querySelectorAll('.bill-pay-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await markAsPaid(id);
          showToast('Conta marcada como paga!', 'success');
        } catch (e) {
          showToast('Erro ao marcar como pago', 'error');
          btn.disabled = false;
          btn.textContent = 'Pagar ✓';
        }
      });
    });
  } catch (e) {
    console.error('loadUpcoming:', e);
  }
}

function updateAlertBanner(overdue, upcoming) {
  const banner = document.getElementById('alert-banner');
  const text = document.getElementById('alert-banner-text');
  if (!banner || !text) return;

  if (overdue.length > 0) {
    text.textContent = `⚠️ Você tem ${overdue.length} conta${overdue.length > 1 ? 's' : ''} em atraso! Clique para ver.`;
    banner.classList.add('visible', 'danger');
    banner.style.cursor = 'pointer';
    banner.onclick = () => window.navigateTo('bills');
  } else if (upcoming.length > 0) {
    const count = upcoming.length;
    text.textContent = `🔔 ${count} conta${count > 1 ? 's vencem' : ' vence'} nos próximos 7 dias.`;
    banner.classList.add('visible');
    banner.classList.remove('danger');
    banner.onclick = null;
  } else {
    banner.classList.remove('visible', 'danger');
  }
}

function renderRecent(txns, categories, accounts) {
  const list = document.getElementById('recent-list');
  if (!list) return;

  if (!txns.length) {
    list.innerHTML = `<div class="empty-state" style="padding:32px"><div class="empty-state-icon">📭</div><p>Nenhuma transação ainda</p></div>`;
    return;
  }

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });
  const accMap = {};
  accounts.forEach(a => { accMap[a.id] = a; });

  list.innerHTML = `<div class="transaction-list">` + txns.map(t => {
    const cat = catMap[t.categoryId];
    const acc = accMap[t.accountId];
    const isIncome = t.type === 'income';
    return `
      <div class="transaction-item" data-id="${t.id}">
        <div class="transaction-icon" style="background:${cat?.color ? cat.color + '22' : 'var(--bg-surface-3)'}">
          <span>${cat?.icon || (isIncome ? '💰' : '💸')}</span>
        </div>
        <div class="transaction-info">
          <div class="transaction-desc">${t.description}</div>
          <div class="transaction-meta">
            ${cat ? `<span>${cat.name}</span><span>·</span>` : ''}
            <span>${formatDate(t.date)}</span>
            ${acc ? `<span>·</span><span>${acc.name}</span>` : ''}
            <span class="badge ${getStatusClass(t.status)}" style="padding:1px 6px;font-size:0.68rem">${getStatusLabel(t.status)}</span>
          </div>
        </div>
        <span class="transaction-amount ${t.type}">
          ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
        </span>
      </div>
    `;
  }).join('') + `</div>`;
}

function setupPayListeners(categories, accounts, settings) {
  // Nothing extra needed — upcoming bills load after subscribe
}
