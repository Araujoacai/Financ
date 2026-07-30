import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Building2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { NotificationService } from '../services/notificationService';

interface DashboardProps {
  onOpenTransactionModal: () => void;
  onOpenBillModal: () => void;
  onOpenPluggyModal: () => void;
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onOpenTransactionModal, 
  onOpenPluggyModal,
  setActiveTab 
}) => {
  const { accounts, transactions, bills, payBill } = useApp();

  const netWorth = accounts.reduce((acc, a) => acc + a.balance, 0);
  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const overdueBills = NotificationService.getOverdueBills(bills);
  const dueTodayBills = NotificationService.getDueTodayBills(bills);
  const urgentBills = [...overdueBills, ...dueTodayBills];

  const chartData = [
    { name: 'Fev', Receitas: 14200, Despesas: 9100 },
    { name: 'Mar', Receitas: 15800, Despesas: 10400 },
    { name: 'Abr', Receitas: 16500, Despesas: 8900 },
    { name: 'Mai', Receitas: 17100, Despesas: 11200 },
    { name: 'Jun', Receitas: 19400, Despesas: 9800 },
    { name: 'Jul', Receitas: totalIncome || 22700, Despesas: totalExpense || 11600 },
  ];

  const categoriesMap: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
    });

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];
  const pieData = Object.keys(categoriesMap).map((cat, idx) => ({
    name: cat,
    value: categoriesMap[cat],
    color: COLORS[idx % COLORS.length]
  }));

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {urgentBills.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-red-500/15 to-transparent border border-amber-500/30 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-glow-gold">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Atenção: {urgentBills.length} conta(s) pendente(s) requerem pagamento!
              </h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {overdueBills.length > 0 ? `${overdueBills.length} já venceu!` : 'Vencendo hoje no sistema.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => payBill(urgentBills[0].id)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md"
            >
              Pagar Primeiro (R$ {urgentBills[0].amount.toLocaleString('pt-BR')})
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition"
            >
              Ver Todas
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 glass-card-interactive border-emerald-500/20 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Patrimônio Saldo Total</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            R$ {netWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> +12.4% vs mês anterior
          </p>
        </div>

        <div className="p-5 glass-card-interactive border-teal-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Receitas Entradas</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-2">
            {transactions.filter(t => t.type === 'income').length} lançamentos
          </p>
        </div>

        <div className="p-5 glass-card-interactive border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Despesas Saídas</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-2">
            {transactions.filter(t => t.type === 'expense').length} lançamentos
          </p>
        </div>

        <div className="p-5 glass-card-interactive border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Score de Saúde</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-white tracking-tight">92 / 100</h3>
            <span className="text-xs text-emerald-400 font-bold">Excelente</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full w-[92%]"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 glass-card border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Fluxo de Caixa (Receitas x Despesas)</h3>
              <p className="text-xs text-slate-400">Evolução dos últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Receitas
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Despesas
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDesp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff' }}
                  formatter={(val: any) => `R$ ${Number(val).toLocaleString('pt-BR')}`}
                />
                <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" />
                <Area type="monotone" dataKey="Despesas" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorDesp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 glass-card border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Distribuição de Gastos</h3>
            <p className="text-xs text-slate-400 mb-4">Por categoria de consumo</p>

            <div className="h-52 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem' }}
                    formatter={(val: any) => `R$ ${Number(val).toLocaleString('pt-BR')}`}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-sm font-black text-white">R$ {totalExpense.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
            {pieData.slice(0, 3).map(p => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                  <span className="text-slate-300 font-medium">{p.name}</span>
                </div>
                <span className="font-bold text-white">R$ {p.value.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 glass-card border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Contas & Open Banking
            </h3>
            <button 
              onClick={onOpenPluggyModal} 
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
            >
              + Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {accounts.map(acc => (
              <div 
                key={acc.id}
                className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                    style={{ backgroundColor: acc.color }}
                  >
                    {acc.bankName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[140px]">{acc.name}</h4>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      {acc.pluggyItemId && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                      {acc.type === 'credit' ? 'Cartão de Crédito' : 'Conta Corrente'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-black ${acc.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                    R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 p-6 glass-card border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Últimas Transações</h3>
              <p className="text-xs text-slate-400">Sincronizadas via Pluggy & Lançamentos manuais</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenTransactionModal}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-glow-emerald transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Transação
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {transactions.slice(0, 5).map(tx => (
              <div 
                key={tx.id}
                className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{tx.description}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{tx.category}</span>
                      <span>•</span>
                      <span>{tx.accountName}</span>
                      <span>•</span>
                      <span>{tx.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {tx.pluggyTransactionId && (
                    <span className="block text-[9px] text-emerald-400/80 font-medium">Pluggy Sync</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
