import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Mail, Lock, LogIn, Sparkles, UserCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, loginWithGoogle, loginWithEmail, loginAsGuest } = useApp();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      console.error('Google Auth Error:', e);
      if (e.code === 'auth/unauthorized-domain') {
        setErrorMessage('Este domínio precisa ser adicionado aos "Domínios Autorizados" no Firebase Console -> Authentication -> Settings.');
      } else if (e.code === 'auth/popup-closed-by-user') {
        setErrorMessage('A janela de login do Google foi fechada antes da conclusão.');
      } else {
        setErrorMessage(e.message || 'Erro ao conectar com Google Auth.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await loginWithEmail(email, password);
    } catch (e: any) {
      console.error('Email Auth Error:', e);
      setErrorMessage(e.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-6 glass-card border-white/10 shadow-2xl rounded-2xl overflow-hidden">
        {/* Glow Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500"></div>

        <button 
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Autenticação Firebase
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-2">Acessar Aura Finance</h2>
          <p className="text-xs text-slate-400 mt-1">Sincronize seus dados financeiros na nuvem</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            <strong>Atenção:</strong> {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          {/* Google Login CTA */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition shadow-lg disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Entrar com Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#0b101c] px-2 text-slate-500 font-bold">ou com E-mail</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] rounded-xl border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="Sua senha de acesso"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] rounded-xl border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-slate-950 transition shadow-glow-emerald disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              Entrar / Cadastrar
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={loginAsGuest}
              className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1 mx-auto"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Continuar como Visitante (Demo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
