import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3,
  Building2, 
  ArrowLeftRight, 
  CalendarClock, 
  PieChart, 
  TrendingUp, 
  Settings, 
  Gem, 
  Zap
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dueBillsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, dueBillsCount }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'analytics', label: 'Análise de Gastos', icon: BarChart3 },
    { id: 'pluggy', label: 'Open Banking (Pluggy)', icon: Building2, badge: 'API' },
    { id: 'transactions', label: 'Transações', icon: ArrowLeftRight },
    { 
      id: 'bills', 
      label: 'Contas & Vencimentos', 
      icon: CalendarClock, 
      alertCount: dueBillsCount 
    },
    { id: 'budgets', label: 'Orçamentos & Metas', icon: PieChart },
    { id: 'investments', label: 'Investimentos', icon: TrendingUp },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 hidden md:flex flex-col min-h-screen bg-[#0b101c]/90 border-r border-white/10 p-4 backdrop-blur-xl relative z-20">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 p-0.5 shadow-glow-emerald flex items-center justify-center">
          <div className="w-full h-full bg-[#0b101c] rounded-[10px] flex items-center justify-center">
            <Gem className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
            Aura <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PRO</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">Finanças & Open Banking</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="space-y-1.5 flex-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span>{item.label}</span>
              </div>

              {item.alertCount !== undefined && item.alertCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-slate-950 shadow-glow-gold animate-pulse">
                  {item.alertCount}
                </span>
              )}

              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Open Banking Status Card */}
      <div className="p-3.5 rounded-xl glass-card bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border-emerald-500/20 mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">Pluggy Active</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Open Banking Brasil conectado. Sincronização em tempo real ativada.
        </p>
      </div>
    </aside>
  );
};
