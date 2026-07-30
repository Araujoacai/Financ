import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Trash2, 
  Building2,
  Calendar
} from 'lucide-react';

interface TransactionsProps {
  onOpenTransactionModal: () => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ onOpenTransactionModal }) => {
  const { transactions, deleteTransaction, accounts } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const categories = Array.from(new Set(transactions.map(t => t.category)));

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
    const matchesAccount = accountFilter === 'all' || tx.accountId === accountFilter;

    return matchesSearch && matchesType && matchesCategory && matchesAccount;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Extrato Geral de Movimentações
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {filteredTransactions.length} lançamentos encontrados
          </p>
        </div>

        <button
          onClick={onOpenTransactionModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-glow-emerald hover:opacity-95 transition"
        >
          <Plus className="w-4 h-4" />
          Nova Transação
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 glass-card border-white/10 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, estabelecimento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0f172a] rounded-xl border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="glass-input text-xs bg-[#0f172a] py-2 px-3 rounded-xl border border-white/10 text-slate-300"
          >
            <option value="all">Todos os Tipos</option>
            <option value="income">Receitas (+)</option>
            <option value="expense">Despesas (-)</option>
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="glass-input text-xs bg-[#0f172a] py-2 px-3 rounded-xl border border-white/10 text-slate-300 max-w-[160px]"
          >
            <option value="all">Todas Categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="glass-input text-xs bg-[#0f172a] py-2 px-3 rounded-xl border border-white/10 text-slate-300 max-w-[160px]"
          >
            <option value="all">Todas as Contas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Clean Transactions Table (Pluggy Style) */}
      <div className="glass-card border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Tipo / Descrição</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Conta</th>
                <th className="p-4">Data</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhuma transação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-white/5 transition group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl flex-shrink-0 ${
                          tx.type === 'income' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-white tracking-tight">{tx.description}</p>
                          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            {tx.accountName} · <span className="text-slate-300 font-semibold">{tx.category}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
                        {tx.category}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-300">{tx.accountName}</td>
                    <td className="p-4 text-slate-400 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {tx.date}
                    </td>
                    <td className={`p-4 text-right font-extrabold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => deleteTransaction(tx.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
