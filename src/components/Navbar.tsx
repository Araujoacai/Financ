import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ThemeMode } from '../types';
import { 
  Palette, 
  RefreshCw, 
  Bell, 
  LogIn, 
  LogOut, 
  Menu, 
  Building2, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { NotificationService } from '../services/notificationService';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPluggyModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenPluggyModal }) => {
  const { 
    user, 
    theme, 
    setTheme, 
    bills, 
    syncPluggyAccounts, 
    isSyncingPluggy, 
    setIsAuthModalOpen, 
    logout 
  } = useApp();

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const overdue = NotificationService.getOverdueBills(bills);
  const dueToday = NotificationService.getDueTodayBills(bills);
  const totalAlerts = overdue.length + dueToday.length;

  const themes: { id: ThemeMode; label: string; color: string }[] = [
    { id: 'luxury', label: 'Luxury Dark', color: '#10b981' },
    { id: 'emerald', label: 'Emerald Wealth', color: '#34d399' },
    { id: 'cyber', label: 'Cyber Obsidian', color: '#a855f7' },
    { id: 'gold', label: 'Midnight Gold', color: '#f59e0b' },
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Painel Financeiro General';
      case 'analytics': return 'Análise & Decomposição de Gastos';
      case 'pluggy': return 'Conexões Open Banking (Pluggy)';
      case 'transactions': return 'Extrato de Transações';
      case 'bills': return 'Contas a Pagar & Vencimentos';
      case 'budgets': return 'Orçamentos & Metas de Economia';
      case 'investments': return 'Carteira de Investimentos';
      case 'settings': return 'Configurações do Sistema';
      default: return 'Aura Finance';
    }
  };

  return (
    <header className="h-20 bg-[#090d16]/80 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {getPageTitle()}
          </h2>
          <p className="text-xs text-slate-400 hidden md:block">
            Gerenciamento patrimonial em tempo real
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 md:gap-4">
        <button
          onClick={syncPluggyAccounts}
          disabled={isSyncingPluggy}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition active:scale-95 disabled:opacity-50"
          title="Sincronizar contas do Pluggy"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPluggy ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sincronizar Open Banking</span>
        </button>

        <button
          onClick={onOpenPluggyModal}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-glow-emerald hover:opacity-95 transition active:scale-95"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Conectar Banco</span>
        </button>

        <button
          onClick={() => setActiveTab('bills')}
          className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
          title="Alertas de Vencimentos"
        >
          <Bell className="w-4 h-4" />
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center border-2 border-[#090d16]">
              {totalAlerts}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition flex items-center gap-1.5"
            title="Alterar Tema"
          >
            <Palette className="w-4 h-4 text-emerald-400" />
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 py-2 glass-card border-white/10 shadow-2xl z-50 rounded-xl">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Temas Premium
              </div>
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setIsThemeMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-200 hover:bg-white/10 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                    <span>{t.label}</span>
                  </div>
                  {theme === t.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/30" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-white truncate max-w-[120px]">{user.name}</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <Sparkles className="w-2.5 h-2.5" />
                {user.provider === 'google' ? 'Google Logged' : 'Logado'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 transition rounded-lg hover:bg-white/5"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            Entrar
          </button>
        )}
      </div>
    </header>
  );
};
