import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NotificationService } from '../services/notificationService';
import { 
  CalendarClock, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Copy, 
  Check, 
  Trash2,
  BellRing,
  Barcode
} from 'lucide-react';

interface BillsNotificationsProps {
  onOpenBillModal: () => void;
}

export const BillsNotifications: React.FC<BillsNotificationsProps> = ({ onOpenBillModal }) => {
  const { bills, payBill, deleteBill } = useApp();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'soon' | 'paid'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notifState, setNotifState] = useState(NotificationService.getPermissionState());

  const overdue = NotificationService.getOverdueBills(bills);
  const dueToday = NotificationService.getDueTodayBills(bills);
  const dueSoon = NotificationService.getDueSoonBills(bills, 7);

  const requestNotificationPermission = async () => {
    const perm = await NotificationService.requestPermission();
    setNotifState(perm);
    if (perm === 'granted') {
      NotificationService.sendNotification('Aura Finance', {
        body: 'Notificações ativadas com sucesso! Você será avisado sobre contas a vencer.'
      });
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredBills = bills.filter(b => {
    if (filter === 'overdue') return b.status === 'pending' && b.dueDate < todayStr;
    if (filter === 'today') return b.status === 'pending' && b.dueDate === todayStr;
    if (filter === 'soon') return b.status === 'pending' && b.dueDate > todayStr;
    if (filter === 'paid') return b.status === 'paid';
    return true;
  });

  const copyBarcode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Browser Notification Permission CTA */}
      <div className="p-6 rounded-2xl glass-card border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-glow-gold">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-lg">
            <BellRing className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Contas a Pagar & Alertas de Vencimento</h2>
            <p className="text-xs text-slate-300 mt-1">
              Controle datas de vencimento, receba alertas no navegador e nunca mais pague juros por atraso.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {notifState !== 'granted' ? (
            <button
              onClick={requestNotificationPermission}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-glow-gold transition flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Ativar Notificações do Navegador
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Alertas Ativos no Navegador
            </span>
          )}

          <button
            onClick={onOpenBillModal}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Conta
          </button>
        </div>
      </div>

      {/* Status Counters Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter('overdue')}
          className={`p-4 rounded-xl border text-left transition ${
            filter === 'overdue' ? 'bg-red-500/20 border-red-500 text-white' : 'glass-card border-white/10 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-between text-red-400 mb-1">
            <span className="text-xs font-bold">VENCIDAS</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-xl font-black text-white">{overdue.length}</h3>
        </button>

        <button
          onClick={() => setFilter('today')}
          className={`p-4 rounded-xl border text-left transition ${
            filter === 'today' ? 'bg-amber-500/20 border-amber-500 text-white' : 'glass-card border-white/10 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-bold">VENCEM HOJE</span>
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="text-xl font-black text-white">{dueToday.length}</h3>
        </button>

        <button
          onClick={() => setFilter('soon')}
          className={`p-4 rounded-xl border text-left transition ${
            filter === 'soon' ? 'bg-blue-500/20 border-blue-500 text-white' : 'glass-card border-white/10 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-between text-blue-400 mb-1">
            <span className="text-xs font-bold">PRÓXIMOS DIAS</span>
            <CalendarClock className="w-4 h-4" />
          </div>
          <h3 className="text-xl font-black text-white">{dueSoon.length}</h3>
        </button>

        <button
          onClick={() => setFilter('paid')}
          className={`p-4 rounded-xl border text-left transition ${
            filter === 'paid' ? 'bg-emerald-500/20 border-emerald-500 text-white' : 'glass-card border-white/10 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-bold">PAGAS</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-xl font-black text-white">
            {bills.filter(b => b.status === 'paid').length}
          </h3>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Todas as Contas' },
          { id: 'overdue', label: 'Apenas Vencidas' },
          { id: 'today', label: 'Vencem Hoje' },
          { id: 'soon', label: 'A Vencer' },
          { id: 'paid', label: 'Pagas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filter === tab.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-glow-gold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bills Cards List */}
      <div className="space-y-3">
        {filteredBills.length === 0 ? (
          <div className="p-8 text-center glass-card border-white/10 rounded-2xl">
            <CalendarClock className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Nenhuma conta nesta categoria</h4>
            <p className="text-xs text-slate-400 mt-1">Todas as suas contas estão em dia!</p>
          </div>
        ) : (
          filteredBills.map(bill => {
            const isOverdue = bill.status === 'pending' && bill.dueDate < todayStr;
            const isDueToday = bill.status === 'pending' && bill.dueDate === todayStr;

            return (
              <div 
                key={bill.id} 
                className={`p-4 rounded-xl glass-card transition border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  bill.status === 'paid' 
                    ? 'border-emerald-500/20 opacity-70' 
                    : isOverdue 
                    ? 'border-red-500/40 bg-red-950/10' 
                    : isDueToday 
                    ? 'border-amber-500/40 bg-amber-950/10 shadow-glow-gold' 
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-xl ${
                    bill.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                    isOverdue ? 'bg-red-500/20 text-red-400' :
                    isDueToday ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-slate-300'
                  }`}>
                    {bill.status === 'paid' ? <CheckCircle2 className="w-5 h-5" /> :
                     isOverdue ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{bill.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-slate-300 border border-white/10">
                        {bill.category}
                      </span>
                      {isOverdue && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">VENCIDA</span>}
                      {isDueToday && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">VENCE HOJE</span>}
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Vencimento: <span className="font-bold text-slate-200">{bill.dueDate}</span> • Recorrência: {bill.recurring}
                    </p>

                    {bill.barcode && (
                      <button
                        onClick={() => copyBarcode(bill.id, bill.barcode!)}
                        className="mt-2 text-[11px] font-mono text-slate-300 hover:text-emerald-400 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 transition"
                      >
                        <Barcode className="w-3.5 h-3.5" />
                        {copiedId === bill.id ? 'Código Copiado!' : 'Copiar Código de Barras'}
                        {copiedId === bill.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Valor</span>
                    <span className="text-base font-black text-white">
                      R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {bill.status === 'pending' ? (
                      <button
                        onClick={() => payBill(bill.id)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-glow-emerald transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Marcar como Pago
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                      </span>
                    )}

                    <button
                      onClick={() => deleteBill(bill.id)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
