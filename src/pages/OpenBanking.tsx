import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PLUGGY_CONNECTORS } from '../services/pluggyService';
import { 
  Building2, 
  RefreshCw, 
  ShieldCheck, 
  Key, 
  Zap, 
  CheckCircle2, 
  ExternalLink,
  Plus
} from 'lucide-react';

interface OpenBankingProps {
  onOpenPluggyModal: () => void;
}

export const OpenBanking: React.FC<OpenBankingProps> = ({ onOpenPluggyModal }) => {
  const { accounts, pluggyCreds, savePluggyConfig, syncPluggyAccounts, isSyncingPluggy } = useApp();

  const [clientId, setClientId] = useState(pluggyCreds.clientId);
  const [clientSecret, setClientSecret] = useState(pluggyCreds.clientSecret);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    savePluggyConfig(clientId, clientSecret);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const activePluggyAccounts = accounts.filter(a => a.pluggyItemId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-card border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-glow-emerald">
              <Zap className="w-3.5 h-3.5" />
              Pluggy Open Banking API SDK
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Hub Open Finance Brasil</h2>
          <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
            Conecte suas contas bancárias e cartões de crédito em segundos. Os saldos e extratos são atualizados automaticamente em conformidade com o Banco Central.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={syncPluggyAccounts}
            disabled={isSyncingPluggy}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingPluggy ? 'animate-spin' : ''}`} />
            Sincronizar Tudo
          </button>
          <button
            onClick={onOpenPluggyModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-glow-emerald transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Conexão Banco
          </button>
        </div>
      </div>

      {/* Connected Accounts Cards */}
      <div>
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          Bancos e Corretoras Conectados ({activePluggyAccounts.length})
        </h3>

        {activePluggyAccounts.length === 0 ? (
          <div className="p-8 text-center glass-card border-white/10 rounded-2xl">
            <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-white">Nenhum banco conectado via Pluggy ainda</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Clique em "Nova Conexão Banco" para escolher entre Nubank, Itaú, Bradesco, BTG e importar seus lançamentos automaticamente.
            </p>
            <button
              onClick={onOpenPluggyModal}
              className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-glow-emerald transition"
            >
              Conectar Agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePluggyAccounts.map(acc => (
              <div key={acc.id} className="p-5 glass-card-interactive border-emerald-500/20 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                      style={{ backgroundColor: acc.color }}
                    >
                      {acc.bankName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{acc.bankName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {acc.accountNumber || 'Open Banking'}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Ativo
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Saldo Atualizado</span>
                  <span className="text-sm font-black text-white">
                    R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Pluggy Connectors */}
      <div className="p-6 glass-card border-white/10">
        <h3 className="text-base font-bold text-white mb-4">Instituições Financeiras Suportadas (Pluggy Connector Catalog)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {PLUGGY_CONNECTORS.map(connector => (
            <div key={connector.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center p-0.5" style={{ backgroundColor: connector.primaryColor + '20' }}>
                <img src={connector.imageUrl} alt={connector.name} className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="truncate">
                <h5 className="text-xs font-bold text-white truncate">{connector.name}</h5>
                <span className="text-[10px] text-emerald-400 font-medium">Pronto para conectar</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pluggy API Credentials Setup */}
      <div className="p-6 glass-card border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Credenciais da API Pluggy (Sandbox & Produção)</h3>
            <p className="text-xs text-slate-400">Insira suas chaves do Dashboard Pluggy (dashboard.pluggy.ai)</p>
          </div>
        </div>

        <form onSubmit={handleSaveKeys} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">PLUGGY_CLIENT_ID</label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="Ex: 57d8e9a2-..."
                className="w-full glass-input text-xs font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">PLUGGY_CLIENT_SECRET</label>
              <input
                type="password"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full glass-input text-xs font-mono text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a 
              href="https://dashboard.pluggy.ai" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-emerald-400 transition flex items-center gap-1"
            >
              Criar conta no Pluggy Dashboard <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-glow-emerald transition flex items-center gap-2"
            >
              {savedMsg ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              {savedMsg ? 'Chaves Salvas!' : 'Salvar Chaves Pluggy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
