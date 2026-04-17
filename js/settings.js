// Settings module
import {
  getSettings, subscribeSettings, seedDefaultData
} from './db.js';
import { showToast, confirmDialog } from './utils.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { db } from './config.js';

let unsubSettings = null;

export function initSettings() {
  const el = document.getElementById('view-settings');
  el.innerHTML = renderShell();
  setupListeners();

  if (unsubSettings) unsubSettings();
  unsubSettings = subscribeSettings(settings => fillForm(settings));
}

export function destroySettings() {
  if (unsubSettings) { unsubSettings(); unsubSettings = null; }
}

function renderShell() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Configurações</h2>
        <p>Personalize seu app de controle financeiro</p>
      </div>
    </div>

    <div style="max-width:640px">

      <!-- Alerts -->
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h3 style="margin-bottom:20px;display:flex;align-items:center;gap:8px"><span>🔔</span> Alertas e Notificações</h3>

        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Alertar vencimentos com quantos dias de antecedência?</label>
          <div style="display:flex;align-items:center;gap:12px">
            <input type="range" id="alert-days" min="1" max="30" value="3" style="flex:1;accent-color:var(--accent)">
            <span id="alert-days-val" style="font-weight:700;min-width:40px;text-align:center;font-size:1.1rem">3d</span>
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">Contas que vencem em até <strong id="alert-days-text">3 dias</strong> serão destacadas.</div>
        </div>

        <button class="btn btn-primary btn-sm" id="btn-save-alerts">Salvar Configurações</button>
      </div>

      <!-- Budget -->
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h3 style="margin-bottom:20px;display:flex;align-items:center;gap:8px"><span>💰</span> Orçamento Mensal Global</h3>
        <div class="form-group">
          <label class="form-label">Limite mensal de gastos (R$)</label>
          <input type="number" class="form-input" id="monthly-budget" placeholder="0 = sem limite" min="0" step="100" style="max-width:280px">
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">Será usado para calcular o progresso do orçamento no dashboard.</div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:16px" id="btn-save-budget">Salvar</button>
      </div>

      <!-- Seed data -->
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h3 style="margin-bottom:8px;display:flex;align-items:center;gap:8px"><span>🌱</span> Dados Iniciais</h3>
        <p style="font-size:0.875rem;margin-bottom:16px">Crie categorias e contas padrão para começar rapidamente. <strong>Use apenas uma vez</strong> — não duplica se você já criou manualmente.</p>
        <button class="btn btn-ghost" id="btn-seed">Criar Categorias e Contas Padrão</button>
      </div>

      <!-- Firebase info -->
      <div class="card" style="padding:24px;background:var(--accent-light);border-color:rgba(99,102,241,0.3)">
        <h3 style="margin-bottom:12px;display:flex;align-items:center;gap:8px;color:var(--accent-hover)"><span>🔐</span> Sobre o Acesso</h3>
        <div style="font-size:0.875rem;color:var(--text-secondary);line-height:1.7">
          <div>📌 <strong>Projeto Firebase:</strong> financie-bf62f</div>
          <div>👥 <strong>Acesso:</strong> Qualquer usuário logado tem acesso completo (leitura e escrita)</div>
          <div>🌐 <strong>Hospedagem:</strong> GitHub Pages (estático)</div>
          <div style="margin-top:12px;padding:12px;background:var(--bg-surface);border-radius:var(--radius);font-family:monospace;font-size:0.8rem;color:var(--text-secondary)">
            Regras do Firestore:<br>
            allow read, write: if request.auth != null;
          </div>
        </div>
      </div>
    </div>
  `;
}

function fillForm(settings) {
  const daysEl = document.getElementById('alert-days');
  const budgetEl = document.getElementById('monthly-budget');
  if (daysEl) {
    daysEl.value = settings.alertDaysBefore || 3;
    updateDaysLabel(settings.alertDaysBefore || 3);
  }
  if (budgetEl) budgetEl.value = settings.monthlyBudget || '';
}

function updateDaysLabel(val) {
  const v = document.getElementById('alert-days-val');
  const t = document.getElementById('alert-days-text');
  if (v) v.textContent = `${val}d`;
  if (t) t.textContent = `${val} dia${val > 1 ? 's' : ''}`;
}

function setupListeners() {
  document.getElementById('alert-days')?.addEventListener('input', e => {
    updateDaysLabel(e.target.value);
  });

  document.getElementById('btn-save-alerts')?.addEventListener('click', async () => {
    const days = parseInt(document.getElementById('alert-days').value) || 3;
    try {
      await setDoc(doc(db, 'settings', 'global'), { alertDaysBefore: days }, { merge: true });
      showToast('Configurações salvas!', 'success');
    } catch(e) {
      showToast('Erro ao salvar', 'error');
    }
  });

  document.getElementById('btn-save-budget')?.addEventListener('click', async () => {
    const budget = parseFloat(document.getElementById('monthly-budget').value) || 0;
    try {
      await setDoc(doc(db, 'settings', 'global'), { monthlyBudget: budget }, { merge: true });
      showToast('Orçamento salvo!', 'success');
    } catch(e) {
      showToast('Erro ao salvar', 'error');
    }
  });

  document.getElementById('btn-seed')?.addEventListener('click', async () => {
    const ok = await confirmDialog(
      'Criar dados iniciais',
      'Serão criadas 12 categorias e 4 contas padrão (Corrente, Poupança, Cartão, Dinheiro). Confirmar?',
      'Criar',
      false
    );
    if (!ok) return;
    const btn = document.getElementById('btn-seed');
    btn.disabled = true;
    btn.textContent = 'Criando...';
    try {
      await seedDefaultData();
      showToast('Dados iniciais criados com sucesso!', 'success');
    } catch(e) {
      showToast('Erro ao criar dados. Eles podem já existir.', 'warning');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Criar Categorias e Contas Padrão';
    }
  });
}
