import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ArrowDownCircle, ArrowUpCircle, PlusCircle } from 'lucide-react';
import type { TransactionType } from '../types';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addTransaction } = useApp();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('Alimentação');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Pix');

  if (!isOpen) return null;

  const categories = [
    'Alimentação', 'Moradia', 'Transporte', 'Lazer', 
    'Saúde', 'Salário', 'Investimentos', 'Freelance', 
    'Educação', 'Outros'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !accountId) return;

    const selectedAccount = accounts.find(a => a.id === accountId);

    addTransaction({
      description,
      amount: parseFloat(amount),
      type,
      category,
      accountId,
      accountName: selectedAccount?.name || 'Conta Padrão',
      date,
      status: 'completed',
      paymentMethod
    });

    setDescription('');
    setAmount('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-6 glass-card border-white/10 shadow-2xl rounded-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-extrabold text-white mb-4">Nova Transação</h2>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs transition border ${
              type === 'expense'
                ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-lg'
                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4 text-red-400" />
            Despesa
          </button>

          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs transition border ${
              type === 'income'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg'
                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
            Receita
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Supermercado, Salário, Pix..."
              className="w-full glass-input text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full glass-input text-sm font-bold text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full glass-input text-sm text-slate-200"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full glass-input text-sm text-slate-200 bg-[#0f172a]"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Meio de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full glass-input text-sm text-slate-200 bg-[#0f172a]"
              >
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Débito Automático">Débito Automático</option>
                <option value="Boleto">Boleto</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Conta Vinculada</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full glass-input text-sm text-slate-200 bg-[#0f172a]"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toLocaleString('pt-BR')})</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-glow-emerald transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Adicionar Transação
          </button>
        </form>
      </div>
    </div>
  );
};
