import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, 
  CreditCard, 
  TrendingDown, 
  Calendar, 
  PieChart as PieIcon, 
  Lightbulb, 
  Filter,
  DollarSign
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export const ExpenseAnalytics: React.FC = () => {
  const { transactions } = useApp();

  const [periodFilter, setPeriodFilter] = useState<'thisMonth' | 'lastMonth' | 'all'>('thisMonth');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  // Filter expenses
  const expenses = transactions.filter(t => t.type === 'expense');

  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7); // YYYY-MM

  const lastMonthDate = new Date();
  lastMonthDate.setMonth(today.getMonth() - 1);
  const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

  const filteredExpenses = expenses.filter(t => {
    const txMonth = t.date.slice(0, 7);
    const matchesPeriod = 
      periodFilter === 'thisMonth' ? txMonth === currentMonthStr :
      periodFilter === 'lastMonth' ? txMonth === lastMonthStr : true;

    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesPayment = selectedPaymentMethod === 'all' || (t.paymentMethod || 'Outros') === selectedPaymentMethod;

    return matchesPeriod && matchesCategory && matchesPayment;
  });

  // Key Analytics Calculations
  const totalExpenseAmount = filteredExpenses.reduce((acc, t) => acc + t.amount, 0);

  // Group by Category
  const categoryMap: Record<string, number> = {};
  filteredExpenses.forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];
  
  const categoryChartData = Object.keys(categoryMap)
    .map((cat, idx) => ({
      name: cat,
      value: categoryMap[cat],
      percentage: totalExpenseAmount > 0 ? Number(((categoryMap[cat] / totalExpenseAmount) * 100).toFixed(1)) : 0,
      color: COLORS[idx % COLORS.length]
    }))
    .sort((a, b) => b.value - a.value);

  const topCategory = categoryChartData[0] || { name: 'Nenhuma', value: 0, percentage: 0 };

  // Group by Payment Method
  const paymentMap: Record<string, number> = {};
  filteredExpenses.forEach(t => {
    const method = t.paymentMethod || 'Pix';
    paymentMap[method] = (paymentMap[method] || 0) + t.amount;
  });

  const paymentChartData = Object.keys(paymentMap).map(method => ({
    method,
    amount: paymentMap[method]
  }));

  // Top Single Expense
  const sortedByAmount = [...filteredExpenses].sort((a, b) => b.amount - a.amount);
  const highestSingleExpense = sortedByAmount[0];

  // Daily Average
  const daysInPeriod = periodFilter === 'thisMonth' ? today.getDate() : 30;
  const dailyAverage = totalExpenseAmount > 0 ? (totalExpenseAmount / daysInPeriod) : 0;

  const categories = Array.from(new Set(expenses.map(t => t.category)));
  const paymentMethods = Array.from(new Set(expenses.map(t => t.paymentMethod || 'Pix')));

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-card border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Painel de Decomposição Financeira
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Análise Detalhada de Gastos
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Descubra para onde vai cada centavo do seu orçamento por categoria, meio de pagamento e frequência.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setPeriodFilter('thisMonth')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                periodFilter === 'thisMonth' ? 'bg-emerald-500 text-white font-bold shadow-glow-emerald' : 'text-slate-400 hover:text-white'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPeriodFilter('lastMonth')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                periodFilter === 'lastMonth' ? 'bg-emerald-500 text-white font-bold shadow-glow-emerald' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mês Passado
            </button>
            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                periodFilter === 'all' ? 'bg-emerald-500 text-white font-bold shadow-glow-emerald' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todo o Histórico
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Gastos no Período */}
        <div className="p-5 glass-card-interactive border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Total de Saídas</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            R$ {totalExpenseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-2">
            {filteredExpenses.length} saídas registradas
          </p>
        </div>

        {/* Card 2: Maior Categoria */}
        <div className="p-5 glass-card-interactive border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Maior Categoria</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <PieIcon className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight truncate">
            {topCategory.name}
          </h3>
          <p className="text-[11px] text-amber-400 mt-2 font-bold">
            R$ {topCategory.value.toLocaleString('pt-BR')} ({topCategory.percentage}% do total)
          </p>
        </div>

        {/* Card 3: Média Diária de Gasto */}
        <div className="p-5 glass-card-interactive border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Média Diária de Saída</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            R$ {dailyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-2">
            Média calculada para {daysInPeriod} dias
          </p>
        </div>

        {/* Card 4: Maior Despesa Única */}
        <div className="p-5 glass-card-interactive border-violet-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Maior Gasto Único</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight truncate">
            {highestSingleExpense ? highestSingleExpense.description : 'Sem dados'}
          </h3>
          <p className="text-[11px] text-violet-300 mt-2 font-bold">
            {highestSingleExpense ? `R$ ${highestSingleExpense.amount.toLocaleString('pt-BR')} (${highestSingleExpense.date})` : '-'}
          </p>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="p-4 glass-card border-white/10 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filtrar Visão:</span>
        </div>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="glass-input text-xs bg-[#0f172a] sm:w-48"
        >
          <option value="all">Todas as Categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={selectedPaymentMethod}
          onChange={e => setSelectedPaymentMethod(e.target.value)}
          className="glass-input text-xs bg-[#0f172a] sm:w-48"
        >
          <option value="all">Todos os Meios de Pagamento</option>
          {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Main Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut Chart */}
        <div className="p-6 glass-card border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Gastos por Categoria (Distribuição %)
            </h3>
            <p className="text-xs text-slate-400 mb-4">Proporção relativa de cada centro de custo</p>

            <div className="h-64 w-full relative flex items-center justify-center">
              {categoryChartData.length === 0 ? (
                <div className="text-center text-slate-500 text-xs">Nenhum gasto registrado no período</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem' }}
                      formatter={(val: any) => `R$ ${Number(val).toLocaleString('pt-BR')}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
            {categoryChartData.slice(0, 6).map(c => (
              <div key={c.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }}></span>
                  <span className="text-slate-300 font-medium truncate">{c.name}</span>
                </div>
                <span className="font-bold text-white pl-2">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Bar Chart */}
        <div className="p-6 glass-card border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              Gastos por Meio de Pagamento
            </h3>
            <p className="text-xs text-slate-400 mb-4">Volume financeiro acumulado por forma de pagamento</p>

            <div className="h-64 w-full">
              {paymentChartData.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-20">Sem lançamentos</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="method" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem' }}
                      formatter={(val: any) => `R$ ${Number(val).toLocaleString('pt-BR')}`}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 mt-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Dica Financeira:</strong> Concentrar compras no Cartão de Crédito com cashback ou programa de pontos pode gerar retorno financeiro adicional.
            </span>
          </div>
        </div>
      </div>

      {/* Top Expense Decomposition Table */}
      <div className="glass-card border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Ranking das Maiores Despesas do Período</h3>
          <span className="text-xs text-slate-400">Ordenado pelo maior valor individual</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">#</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Conta Origem</th>
                <th className="p-4">Meio de Pagamento</th>
                <th className="p-4">Data</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-right">% do Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-200">
              {sortedByAmount.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhum gasto registrado no período selecionado.
                  </td>
                </tr>
              ) : (
                sortedByAmount.slice(0, 10).map((tx, idx) => {
                  const pctOfTotal = totalExpenseAmount > 0 ? ((tx.amount / totalExpenseAmount) * 100).toFixed(1) : '0';

                  return (
                    <tr key={tx.id} className="hover:bg-white/5 transition">
                      <td className="p-4 font-bold text-slate-400">#{idx + 1}</td>
                      <td className="p-4 font-bold text-white">{tx.description}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-300">{tx.accountName}</td>
                      <td className="p-4 text-slate-400">{tx.paymentMethod || 'Pix'}</td>
                      <td className="p-4 text-slate-400">{tx.date}</td>
                      <td className="p-4 text-right font-black text-red-400">
                        - R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-300">
                        {pctOfTotal}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
