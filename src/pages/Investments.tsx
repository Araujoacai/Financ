import React from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, Landmark } from 'lucide-react';

export const Investments: React.FC = () => {
  const { investments } = useApp();

  const totalInvested = investments.reduce((acc, i) => acc + i.amountInvested, 0);
  const totalCurrentValue = investments.reduce((acc, i) => acc + i.currentValue, 0);
  const totalProfit = totalCurrentValue - totalInvested;
  const totalYieldPct = ((totalProfit / totalInvested) * 100).toFixed(2);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="p-6 rounded-2xl glass-card border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-slate-900 to-indigo-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">
            Carteira & Rendimentos
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">Patrimônio Investido</h2>
          <p className="text-xs text-slate-300 mt-1">Renda Fixa, Ações, FIIs e Criptoativos</p>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="text-xs text-slate-400 block">Total Aplicado</span>
            <span className="text-lg font-bold text-white">
              R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="border-l border-white/10 pl-6">
            <span className="text-xs text-slate-400 block">Lucro Consolidado</span>
            <span className="text-xl font-black text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              + R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({totalYieldPct}%)
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-violet-400" />
            Ativos da Carteira
          </h3>
          <span className="text-xs text-slate-400">{investments.length} ativos cadastrados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Ativo / Tipo</th>
                <th className="p-4">Instituição</th>
                <th className="p-4 text-right">Valor Aplicado</th>
                <th className="p-4 text-right">Valor Atual</th>
                <th className="p-4 text-right">Rentabilidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-200">
              {investments.map(inv => {
                const profit = inv.currentValue - inv.amountInvested;

                return (
                  <tr key={inv.id} className="hover:bg-white/5 transition">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-white">{inv.name}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          {inv.type}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-300">{inv.institution}</td>
                    <td className="p-4 text-right text-slate-400 font-mono">
                      R$ {inv.amountInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-black text-white font-mono">
                      R$ {inv.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +{inv.yieldPercentage}% (+R$ {profit.toLocaleString('pt-BR')})
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
