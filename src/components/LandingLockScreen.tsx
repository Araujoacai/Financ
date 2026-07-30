import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Gem, 
  ShieldCheck, 
  Building2, 
  TrendingUp, 
  LogIn, 
  ArrowRight,
  Sparkles,
  Mail
} from 'lucide-react';

export const LandingLockScreen: React.FC = () => {
  const { setIsAuthModalOpen, loginWithGoogle, loginAsGuest } = useApp();

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background Animated Gradient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-t from-indigo-500/10 to-transparent blur-3xl pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="h-20 max-w-7xl w-full mx-auto px-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 p-0.5 shadow-glow-emerald flex items-center justify-center">
            <div className="w-full h-full bg-[#0b101c] rounded-[10px] flex items-center justify-center">
              <Gem className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Aura <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PRO</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Controle Financeiro & Open Banking</p>
          </div>
        </div>

        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-glow-emerald transition active:scale-95"
        >
          <LogIn className="w-4 h-4" />
          Entrar / Cadastrar
        </button>
      </header>

      {/* Main Hero Body */}
      <main className="max-w-6xl w-full mx-auto px-6 py-12 flex flex-col items-center text-center relative z-10 my-auto">
        <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6 flex items-center gap-1.5 shadow-lg animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Acesso Restrito · Faça Login para Visualizar Suas Finanças
        </span>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight max-w-3xl leading-tight">
          Gestão Patrimonial Inteligente com <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">Open Banking</span>
        </h1>

        <p className="text-sm md:text-base text-slate-400 max-w-2xl mt-4 leading-relaxed">
          Conecte suas contas bancárias via Pluggy Open Finance Brasil, sincronize seus extratos na nuvem do Firebase e analise seus gastos com gráficos dinâmicos.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full max-w-md">
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm transition shadow-xl active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Entrar com Google
          </button>

          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition border border-white/10 active:scale-95"
          >
            <Mail className="w-4 h-4" />
            Entrar com E-mail
          </button>
        </div>

        {/* Guest Preview CTA */}
        <button
          onClick={loginAsGuest}
          className="mt-4 text-xs text-slate-400 hover:text-emerald-400 transition flex items-center gap-1 font-medium"
        >
          Experimentar no Modo Visitante (Demo) <ArrowRight className="w-3 h-3" />
        </button>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="p-6 rounded-2xl glass-card border-white/10 hover:border-emerald-500/30 transition group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20 group-hover:scale-110 transition">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Open Banking Brasil</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Integração nativa via API Pluggy com Itaú, Bradesco, Banco do Brasil, Nubank e Santander.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card border-white/10 hover:border-emerald-500/30 transition group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20 group-hover:scale-110 transition">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Sincronização Firebase</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seus dados financeiros são encriptados e salvos no Firestore Cloud de forma 100% privada.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card border-white/10 hover:border-emerald-500/30 transition group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20 group-hover:scale-110 transition">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Análise de Gastos</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gráficos interativos por categoria, meio de pagamento e ranking das maiores despesas.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 text-center text-xs text-slate-500 relative z-10">
        Aura Finance PRO © 2026 · Conexão Criptografada de Ponta a Ponta
      </footer>
    </div>
  );
};
