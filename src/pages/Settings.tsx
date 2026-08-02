import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ThemeMode } from '../types';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  Settings as SettingsIcon, 
  Palette, 
  ShieldCheck, 
  Key, 
  Database, 
  CheckCircle2, 
  Trash2,
  Lock,
  MessageSquare,
  Smartphone
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    user,
    theme, 
    setTheme, 
    pluggyCreds, 
    savePluggyConfig, 
    firebaseCreds, 
    saveFirebaseConfig 
  } = useApp();

  const [pluggyClient, setPluggyClient] = useState(pluggyCreds.clientId);
  const [pluggySecret, setPluggySecret] = useState(pluggyCreds.clientSecret);
  const [pluggySaved, setPluggySaved] = useState(false);

  const [fbApiKey, setFbApiKey] = useState(firebaseCreds.apiKey);
  const [fbAuthDomain, setFbAuthDomain] = useState(firebaseCreds.authDomain);
  const [fbProjectId, setFbProjectId] = useState(firebaseCreds.projectId);
  const [fbSaved, setFbSaved] = useState(false);

  // WhatsApp Bot linking
  const [linkCode, setLinkCode] = useState('');
  const [linkStatus, setLinkStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [linkMessage, setLinkMessage] = useState('');

  const handleWhatsAppLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCode.trim() || !user?.uid) return;
    setLinkStatus('loading');
    try {
      const db = getFirestore();
      const codeRef = doc(db, 'linkCodes', linkCode.trim());
      const snap = await getDoc(codeRef);
      if (!snap.exists()) {
        setLinkStatus('error');
        setLinkMessage('Código inválido ou expirado. Gere um novo código no bot.');
        return;
      }
      const data = snap.data();
      if (new Date(data.expiresAt) < new Date()) {
        setLinkStatus('error');
        setLinkMessage('Código expirado. Digite "conectar" no bot para gerar um novo.');
        return;
      }
      // Save phone → userId link in Firestore
      const phone = data.phone as string;
      const phoneRef = doc(db, 'phoneLinks', phone);
      await updateDoc(phoneRef, { userId: user.uid }).catch(() =>
        import('firebase/firestore').then(({ setDoc }) =>
          setDoc(phoneRef, { userId: user.uid, phoneNumber: phone, linkedAt: new Date().toISOString() })
        )
      );
      setLinkStatus('success');
      setLinkMessage(`✅ WhatsApp vinculado com sucesso!`);
      setLinkCode('');
    } catch (err) {
      setLinkStatus('error');
      setLinkMessage('Erro ao vincular. Tente novamente.');
    }
  };

  const themes: { id: ThemeMode; label: string; desc: string; color: string }[] = [
    { id: 'luxury', label: 'Luxury Dark', desc: 'Design escuro com detalhes em esmeralda e vidro', color: '#10b981' },
    { id: 'emerald', label: 'Emerald Wealth', desc: 'Tema focado na cor verde riqueza e finanças', color: '#34d399' },
    { id: 'cyber', label: 'Cyber Obsidian', desc: 'Aparência futurista em tons roxo e neon', color: '#a855f7' },
    { id: 'gold', label: 'Midnight Gold', desc: 'Estilo dourado corporativo premium', color: '#f59e0b' },
  ];

  const handleSavePluggy = (e: React.FormEvent) => {
    e.preventDefault();
    savePluggyConfig(pluggyClient, pluggySecret);
    setPluggySaved(true);
    setTimeout(() => setPluggySaved(false), 2000);
  };

  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig({
      apiKey: fbApiKey,
      authDomain: fbAuthDomain,
      projectId: fbProjectId
    });
    setFbSaved(true);
    setTimeout(() => setFbSaved(false), 2000);
  };

  const handleClearData = () => {
    if (window.confirm('Deseja restaurar as configurações padrão e limpar o cache local?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-emerald-400" />
          Configurações da Aplicação
        </h2>
        <p className="text-xs text-slate-400">Personalize a interface, credenciais de APIs e segurança</p>
      </div>

      <div className="p-6 glass-card border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-400" />
          Tema & Aparência da Interface
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-4 rounded-xl border text-left transition flex items-start justify-between ${
                theme === t.id
                  ? 'bg-white/10 border-emerald-500 shadow-glow-emerald'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                  <h4 className="text-xs font-bold text-white">{t.label}</h4>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{t.desc}</p>
              </div>
              {theme === t.id && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 glass-card border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Chaves do Pluggy (Open Banking API)</h3>
        </div>

        <form onSubmit={handleSavePluggy} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">PLUGGY_CLIENT_ID</label>
              <input
                type="text"
                value={pluggyClient}
                onChange={e => setPluggyClient(e.target.value)}
                placeholder="Insira o Client ID do Pluggy"
                className="w-full glass-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">PLUGGY_CLIENT_SECRET</label>
              <input
                type="password"
                value={pluggySecret}
                onChange={e => setPluggySecret(e.target.value)}
                placeholder="Insira o Client Secret"
                className="w-full glass-input text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-glow-emerald transition flex items-center gap-2"
          >
            {pluggySaved ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {pluggySaved ? 'Salvo!' : 'Salvar Chaves Pluggy'}
          </button>
        </form>
      </div>

      <div className="p-6 glass-card border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <h3 className="text-base font-bold text-white">Credenciais do Firebase Project</h3>
        </div>

        <form onSubmit={handleSaveFirebase} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">API Key</label>
              <input
                type="text"
                value={fbApiKey}
                onChange={e => setFbApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full glass-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Auth Domain</label>
              <input
                type="text"
                value={fbAuthDomain}
                onChange={e => setFbAuthDomain(e.target.value)}
                placeholder="meu-app.firebaseapp.com"
                className="w-full glass-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Project ID</label>
              <input
                type="text"
                value={fbProjectId}
                onChange={e => setFbProjectId(e.target.value)}
                placeholder="meu-app-id"
                className="w-full glass-input text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition flex items-center gap-2"
          >
            {fbSaved ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {fbSaved ? 'Salvo!' : 'Salvar Configuração Firebase'}
          </button>
        </form>
      </div>

      {/* WhatsApp Bot Section */}
      <div className="p-6 glass-card border-green-500/20 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-green-400" />
          <h3 className="text-base font-bold text-white">WhatsApp Bot</h3>
          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/30">NOVO</span>
        </div>
        <p className="text-xs text-slate-400">
          Vincule seu WhatsApp para registrar gastos, consultar saldo e resumos diretamente pelo app de mensagens.
        </p>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-green-400" />
            Como vincular:
          </p>
          <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
            <li>Inicie o bot no PC (<code className="text-green-400">npm run dev</code>)</li>
            <li>Escaneie o QR Code com seu WhatsApp</li>
            <li>Envie <code className="bg-white/10 px-1.5 py-0.5 rounded text-green-300">conectar</code> para o bot</li>
            <li>Cole o código de 6 dígitos abaixo</li>
          </ol>
        </div>

        <form onSubmit={handleWhatsAppLink} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Código de Vinculação (6 dígitos)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={linkCode}
                onChange={e => setLinkCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="glass-input text-sm font-mono tracking-widest w-36 text-center"
              />
              <button
                type="submit"
                disabled={linkCode.length !== 6 || linkStatus === 'loading' || !user}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-2"
              >
                {linkStatus === 'loading' ? '...' : linkStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                {linkStatus === 'loading' ? 'Vinculando...' : linkStatus === 'success' ? 'Vinculado!' : 'Vincular'}
              </button>
            </div>
          </div>
          {linkMessage && (
            <p className={`text-xs font-medium ${linkStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {linkMessage}
            </p>
          )}
        </form>
      </div>

      <div className="p-6 glass-card border-red-500/20 space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2 text-red-400">
          <Database className="w-4 h-4" />
          Gerenciamento de Dados Locais
        </h3>
        <p className="text-xs text-slate-400">
          Limpar dados em cache e resetar a aplicação para o estado de fábrica.
        </p>

        <button
          onClick={handleClearData}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Limpar Cache Local e Resetar
        </button>
      </div>
    </div>
  );
};
