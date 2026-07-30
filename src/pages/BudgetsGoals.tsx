import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  PieChart, 
  Target, 
  Plus, 
  Sparkles 
} from 'lucide-react';

export const BudgetsGoals: React.FC = () => {
  const { budgets, goals, updateBudget, addGoal, addGoalAmount } = useApp();

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('2026-12-31');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editLimitInput, setEditLimitInput] = useState('');

  const handleAddGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle || !newGoalTarget) return;

    addGoal({
      title: newGoalTitle,
      targetAmount: parseFloat(newGoalTarget),
      targetDate: newGoalDate,
      category: 'Economia',
      icon: 'Target'
    });

    setNewGoalTitle('');
    setNewGoalTarget('');
    setIsAddingGoal(false);
  };

  const handleSaveBudgetLimit = (id: string) => {
    if (editLimitInput) {
      updateBudget(id, parseFloat(editLimitInput));
    }
    setEditingBudgetId(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            Orçamentos por Categoria & Metas Financeiras
          </h2>
          <p className="text-xs text-slate-400">Controle limites mensais e acompanhe seus objetivos de longo prazo</p>
        </div>

        <button
          onClick={() => setIsAddingGoal(!isAddingGoal)}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-glow-emerald transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Meta de Economia
        </button>
      </div>

      {isAddingGoal && (
        <form onSubmit={handleAddGoalSubmit} className="p-5 glass-card border-emerald-500/30 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" /> Criar Novo Objetivo Financeiro
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Título do Objetivo</label>
              <input
                type="text"
                value={newGoalTitle}
                onChange={e => setNewGoalTitle(e.target.value)}
                placeholder="Ex: Compra do Carro, Viagem..."
                className="w-full glass-input text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Valor Alvo (R$)</label>
              <input
                type="number"
                value={newGoalTarget}
                onChange={e => setNewGoalTarget(e.target.value)}
                placeholder="50000"
                className="w-full glass-input text-xs font-bold text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Data Meta</label>
              <input
                type="date"
                value={newGoalDate}
                onChange={e => setNewGoalDate(e.target.value)}
                className="w-full glass-input text-xs text-slate-200"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingGoal(false)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-glow-emerald"
            >
              Salvar Meta
            </button>
          </div>
        </form>
      )}

      <div>
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          Metas de Economia & Aportes ({goals.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {goals.map(goal => {
            const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

            return (
              <div key={goal.id} className="p-5 glass-card-interactive border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{pct}% Atingido</span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{goal.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Prazo: {goal.targetDate}</p>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Acumulado</span>
                      <span className="font-bold text-white">
                        R$ {goal.currentAmount.toLocaleString('pt-BR')} / R$ {goal.targetAmount.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Faltam R$ {(goal.targetAmount - goal.currentAmount).toLocaleString('pt-BR')}
                  </span>
                  <button
                    onClick={() => addGoalAmount(goal.id, 1000)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs border border-emerald-500/30 transition"
                  >
                    + Aportar R$ 1.000
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 glass-card border-white/10">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-amber-400" />
          Limites de Gastos Mensais por Categoria
        </h3>

        <div className="space-y-4">
          {budgets.map(b => {
            const pct = Math.round((b.spentAmount / b.limitAmount) * 100);
            const isOver = pct > 100;
            const isWarning = pct >= 80 && pct <= 100;

            return (
              <div key={b.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }}></span>
                    <h4 className="text-sm font-bold text-white">{b.category}</h4>
                    {isOver && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">LIMITE EXCEDIDO</span>}
                    {isWarning && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">ATENÇÃO 80%</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      Gasto: <strong className="text-white">R$ {b.spentAmount.toLocaleString('pt-BR')}</strong> / Límite: <strong className="text-slate-200">R$ {b.limitAmount.toLocaleString('pt-BR')}</strong>
                    </span>

                    {editingBudgetId === b.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editLimitInput}
                          onChange={e => setEditLimitInput(e.target.value)}
                          placeholder="Novo Limite"
                          className="glass-input w-24 text-xs py-1 px-2"
                        />
                        <button
                          onClick={() => handleSaveBudgetLimit(b.id)}
                          className="px-2 py-1 bg-emerald-500 text-white font-bold text-xs rounded-lg"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingBudgetId(b.id); setEditLimitInput(String(b.limitAmount)); }}
                        className="text-xs font-semibold text-emerald-400 hover:underline"
                      >
                        Ajustar
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
