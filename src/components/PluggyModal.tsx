import React, { useState, useEffect } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';
import { useApp } from '../context/AppContext';
import { PluggyService, PLUGGY_CONNECTORS } from '../services/pluggyService';
import type { PluggyConnector } from '../services/pluggyService';
import { X, Building2, CheckCircle2, Loader2, ShieldCheck, Zap, ExternalLink, Globe } from 'lucide-react';

interface PluggyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PluggyModal: React.FC<PluggyModalProps> = ({ isOpen, onClose }) => {
  const { importPluggyData } = useApp();
  const [selectedConnector, setSelectedConnector] = useState<PluggyConnector | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultSummary, setResultSummary] = useState({ accountsCount: 0, txsCount: 0, invsCount: 0 });
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [viewMode, setViewMode] = useState<'widget' | 'grid'>('widget');

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setLoadingToken(true);
      PluggyService.getConnectToken().then(token => {
        if (isMounted) {
          setConnectToken(token);
          setLoadingToken(false);
        }
      }).catch(() => {
        if (isMounted) setLoadingToken(false);
      });
    } else {
      setConnectToken(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePluggySuccess = async (data: { item: { id: string } }) => {
    setConnecting(true);
    try {
      const itemId = data.item?.id;
      if (itemId) {
        const { accounts, transactions, investments } = await PluggyService.fetchItemAccountsAndTransactions(itemId);
        importPluggyData(accounts, transactions, investments);
        setResultSummary({ 
          accountsCount: accounts.length, 
          txsCount: transactions.length,
          invsCount: investments.length
        });
      }
      setSuccess(true);
      setTimeout(() => {
        setConnecting(false);
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (e) {
      console.error('Error fetching Pluggy item after widget success:', e);
      setConnecting(false);
      onClose();
    }
  };

  const handleConnectDirect = async (connector: PluggyConnector) => {
    setSelectedConnector(connector);
    setConnecting(true);
    setSuccess(false);

    try {
      const { accounts, transactions, investments } = await PluggyService.createItemAndFetch(connector.id, {
        user: 'user-ok',
        password: 'password-ok'
      });

      importPluggyData(accounts, transactions, investments);
      setResultSummary({ 
        accountsCount: accounts.length, 
        txsCount: transactions.length,
        invsCount: investments.length
      });

      setSuccess(true);
      setTimeout(() => {
        setConnecting(false);
        setSuccess(false);
        setSelectedConnector(null);
        onClose();
      }, 2000);
    } catch (e: any) {
      console.error('Error connecting via Pluggy API:', e);
      setConnecting(false);
      alert('Erro na conexão com Pluggy API: ' + (e.message || 'Verifique suas chaves'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl p-6 glass-card border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500"></div>

        <button 
          onClick={onClose}
          disabled={connecting}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Pluggy Open Banking BR
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Conectar Conta via Pluggy Connect</h2>
          <p className="text-xs text-slate-400 mt-1">
            Conexão oficial via Widget Pluggy Connect e API Open Finance.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setViewMode('widget')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'widget' 
                  ? 'bg-emerald-500 text-white font-bold shadow-glow-emerald' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Widget Pluggy Connect Oficial
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                viewMode === 'grid' 
                  ? 'bg-emerald-500 text-white font-bold shadow-glow-emerald' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              Conexão Direta Sandbox
            </button>
          </div>
        </div>

        {connecting ? (
          <div className="py-16 text-center space-y-4">
            {success ? (
              <div className="flex flex-col items-center animate-bounce">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2" />
                <h3 className="text-lg font-bold text-white">Sincronização Concluída!</h3>
                <p className="text-xs text-emerald-300 font-semibold mt-1">
                  Importadas {resultSummary.accountsCount} conta(s), {resultSummary.txsCount} transação(ões) e {resultSummary.invsCount} investimento(s) do Pluggy!
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-3" />
                <h3 className="text-base font-bold text-white">Buscando saldos, extratos e investimentos do Pluggy...</h3>
                <p className="text-xs text-slate-400 mt-1">Processando {selectedConnector?.name || 'conta bancária'} via Open Banking</p>
              </div>
            )}
          </div>
        ) : viewMode === 'widget' ? (
          <div className="w-full flex-1 min-h-[480px] rounded-xl overflow-hidden border border-white/10 bg-white">
            {loadingToken ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-800 p-12">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                <p className="text-xs font-semibold">Gerando Token de Acesso Seguro (connectToken)...</p>
              </div>
            ) : connectToken ? (
              <div key={connectToken} className="w-full h-full min-h-[480px]">
                <PluggyConnect
                  connectToken={connectToken}
                  includeSandbox={true}
                  onSuccess={handlePluggySuccess}
                  onError={(error: any) => {
                    console.warn('Pluggy Connect Widget status/error:', error);
                  }}
                  onClose={() => {
                    onClose();
                  }}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-slate-800">
                <p className="text-xs text-red-500 font-bold">Não foi possível obter o token de conexão do Pluggy.</p>
                <p className="text-[11px] text-slate-500 mt-1">Verifique o Client ID e Secret em Configurações.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
              <div>
                <strong>Pluggy Sandbox de Testes:</strong> Use usuário <code>user-ok</code> e senha <code>password-ok</code>.
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[10px]">
                API Conectada
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PLUGGY_CONNECTORS.map(connector => (
                <button
                  key={connector.id}
                  onClick={() => handleConnectDirect(connector)}
                  className="group relative flex flex-col items-center p-4 rounded-xl glass-card-interactive text-center border-white/5 hover:border-emerald-500/40"
                >
                  <div 
                    className="w-12 h-12 rounded-xl mb-2.5 overflow-hidden flex items-center justify-center p-0.5 border border-white/10 group-hover:scale-105 transition"
                    style={{ backgroundColor: connector.primaryColor + '20' }}
                  >
                    <img 
                      src={connector.imageUrl} 
                      alt={connector.name} 
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <Building2 className="w-6 h-6 text-white hidden" />
                  </div>
                  <span className="text-xs font-bold text-white truncate max-w-full">{connector.name}</span>
                  <span className="text-[10px] text-emerald-400 mt-0.5 font-medium">Conectar Pluggy</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Criptografia de ponta a ponta
          </span>
          <a href="https://docs.pluggy.ai" target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
            Pluggy Docs <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
