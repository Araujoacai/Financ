import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, CalendarClock, BellRing } from 'lucide-react';

interface NewBillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewBillModal: React.FC<NewBillModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addBill } = useApp();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Moradia');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [recurring, setRecurring] = useState<'monthly' | 'yearly' | 'none'>('monthly');
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(3);
  const [barcode, setBarcode] = useState('');

  if (!isOpen) return null;

  const categories = ['Moradia', 'Cartão de Crédito', 'Saúde', 'Transporte', 'Lazer', 'Educação', 'Serviços'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !dueDate) return;

    addBill({
      title,
      amount: parseFloat(amount),
      dueDate,
      category,
      accountId,
      recurring,
      notifyDaysBefore: Number(notifyDaysBefore),
      barcode: barcode || undefined
    });

    setTitle('');
    setAmount('');
    setBarcode('');
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

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-glow-gold">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Cadastrar Conta / Vencimento</h2>
            <p className="text-xs text-slate-400">Notificações automáticas ativadas</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Título da Conta</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Fatura Cartão, Conta de Luz, Aluguel..."
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Data de Vencimento</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Recorrência</label>
              <select
                value={recurring}
                onChange={e => setRecurring(e.target.value as any)}
                className="w-full glass-input text-sm text-slate-200 bg-[#0f172a]"
              >
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
                <option value="none">Única</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Conta para Débito</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full glass-input text-sm text-slate-200 bg-[#0f172a]"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Notificar (Dias antes)</label>
              <select
                value={notifyDaysBefore}
                onChange={e => setNotifyDaysBefore(Number(e.target.value))}
                className="w-full glass-input text-sm text-slate-200 bg-[#0f172a]"
              >
                <option value={1}>1 dia antes</option>
                <option value={3}>3 dias antes</option>
                <option value={5}>5 dias antes</option>
                <option value={7}>7 dias antes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Código de Barras / Linha Digitável (Opcional)</label>
            <input
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              placeholder="34191.79001 01043..."
              className="w-full glass-input text-xs font-mono text-slate-300"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 mt-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-glow-gold transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <BellRing className="w-4 h-4" />
            Cadastrar & Ativar Alerta
          </button>
        </form>
      </div>
    </div>
  );
};
