import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { ThemeMode, BotConnectionInfo } from '../types';
import { FirebaseService } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
  Smartphone,
  Send,
  Copy,
  RefreshCw,
  Unlink
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    user,
    theme, 
    setTheme, 
    pluggyCreds, 
    savePluggyConfig, 
    firebaseCreds, 
    saveFirebaseConfig,
    setIsAuthModalOpen
  } = useApp();

  const [pluggyClient, setPluggyClient] = useState(pluggyCreds.clientId);
  const [pluggySecret, setPluggySecret] = useState(pluggyCreds.clientSecret);
  const [pluggySaved, setPluggySaved] = useState(false);

  const [fbApiKey, setFbApiKey] = useState(firebaseCreds.apiKey);
  const [fbAuthDomain, setFbAuthDomain] = useState(firebaseCreds.authDomain);
  const [fbProjectId, setFbProjectId] = useState(firebaseCreds.projectId);
  const [fbSaved, setFbSaved] = useState(false);

  // WhatsApp & Telegram Bot linking
  const [botInfo, setBotInfo] = useState<BotConnectionInfo>({});
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [linkCode, setLinkCode] = useState('');
  const [linkStatus, setLinkStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [linkMessage, setLinkMessage] = useState('');

  // Subscribe to user's bot info in real time
  useEffect(() => {
    if (!user?.uid || user.uid === 'guest-demo') return;
    const unsub = FirebaseService.subscribeToBotInfo(user.uid, (info) => {
      setBotInfo(info);
      if (info.pairingCode) {
        setGeneratedCode(info.pairingCode);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [user?.uid]);

  const handleGenerateCode = async () => {
    if (!user || user.uid === 'guest-demo') {
      setPinFeedback({
        type: 'warning',
        text: 'Você precisa entrar com uma conta (Google ou E-mail) para vincular ao WhatsApp/Telegram.'
      });
      setIsAuthModalOpen(true);
      return;
    }

    setIsGeneratingCode(true);
    setPinFeedback(null);
    try {
      const code = await FirebaseService.generatePairingCode(user.uid);
      setGeneratedCode(code);
      setPinFeedback({
        type: 'success',
        text: `PIN ${code} gerado com sucesso! Envie "conectar ${code}" para o bot.`
      });
    } catch (e: any) {
      console.error('Error generating code:', e);
      setPinFeedback({
        type: 'error',
        text: `Erro ao gerar PIN: ${e?.message || 'Verifique sua conexão com o Firebase'}`
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };


  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleUnlink = async (channel: 'whatsapp' | 'telegram') => {
    if (!user?.uid) return;
    if (window.confirm(`Deseja desvincular o ${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}?`)) {
      await FirebaseService.unlinkBotChannel(user.uid, channel);
    }
  };

  const handleWhatsAppLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCode.trim() || !user?.uid) return;
    setLinkStatus('loading');
    try {
      const db = FirebaseService.getFirestoreInstance();
      if (!db) throw new Error('DB not initialized');
      const codeRef = doc(db, 'bot_links', linkCode.trim());
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
      // Link channel
      if (data.phone) {
        const phone = data.phone as string;
        const phoneRef = doc(db, 'phoneLinks', phone);
        await updateDoc(phoneRef, { userId: user.uid }).catch(() =>
          import('firebase/firestore').then(({ setDoc }) =>
            setDoc(phoneRef, { userId: user.uid, phoneNumber: phone, linkedAt: new Date().toISOString() })
          )
        );
        await updateDoc(doc(db, 'users', user.uid), { phoneNumber: phone });
      } else if (data.telegramChatId) {
        const chatId = String(data.telegramChatId);
        const tgRef = doc(db, 'telegramLinks', chatId);
        await updateDoc(tgRef, { userId: user.uid }).catch(() =>
          import('firebase/firestore').then(({ setDoc }) =>
            setDoc(tgRef, { userId: user.uid, telegramChatId: chatId, telegramUsername: data.telegramUsername || null, linkedAt: new Date().toISOString() })
          )
        );
        await updateDoc(doc(db, 'users', user.uid), { telegramChatId: chatId, telegramUsername: data.telegramUsername || null });
      }
      setLinkStatus('success');
      setLinkMessage(`✅ Vinculado com sucesso!`);
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

      {/* WhatsApp & Telegram Assistant Section */}
      <div className="p-6 glass-card border-emerald-500/30 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Assistente Financeiro (WhatsApp & Telegram)</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
              NOVO
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Registre gastos em linguagem natural (<span className="text-emerald-300 italic">"Almoço 45 no débito"</span>, <span className="text-emerald-300 italic">"Recebi 3500"</span>) e consulte relatórios por data (<span className="text-emerald-300 italic">"quanto gastei hoje?"</span>, <span className="text-emerald-300 italic">"gastos deste mês"</span>) diretamente pelo WhatsApp (Evolution API) ou Telegram.
        </p>

        {/* Status of Connected Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* WhatsApp Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  WhatsApp (Evolution API)
                  {botInfo.linkedWhatsApp ? (
                    <span className="px-1.5 py-0.2 bg-green-500/20 text-green-400 text-[10px] rounded font-semibold">Conectado</span>
                  ) : (
                    <span className="px-1.5 py-0.2 bg-slate-500/20 text-slate-400 text-[10px] rounded">Desconectado</span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {botInfo.linkedWhatsApp ? `Tel: ${botInfo.linkedWhatsApp}` : 'Envie "conectar" para vincular'}
                </p>
              </div>
            </div>
            {botInfo.linkedWhatsApp && (
              <button
                onClick={() => handleUnlink('whatsapp')}
                className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition"
                title="Desvincular WhatsApp"
              >
                <Unlink className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Telegram Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Telegram Bot
                  {botInfo.linkedTelegram ? (
                    <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-400 text-[10px] rounded font-semibold">Conectado</span>
                  ) : (
                    <span className="px-1.5 py-0.2 bg-slate-500/20 text-slate-400 text-[10px] rounded">Desconectado</span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {botInfo.linkedTelegram ? `Usuário: ${botInfo.linkedTelegram}` : 'Inicie com /start <código>'}
                </p>
              </div>
            </div>
            {botInfo.linkedTelegram && (
              <button
                onClick={() => handleUnlink('telegram')}
                className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition"
                title="Desvincular Telegram"
              >
                <Unlink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Pairing Generator & Instructions */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                Gerar PIN de Conexão Rápida
              </p>
              <p className="text-[11px] text-slate-400">
                Gere um código de 6 dígitos e envie para o bot no WhatsApp ou Telegram para vincular sua conta.
              </p>
            </div>
            <button
              onClick={handleGenerateCode}
              disabled={isGeneratingCode}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-glow-emerald transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingCode ? 'animate-spin' : ''}`} />
              {isGeneratingCode ? 'Gerando...' : generatedCode ? 'Gerar Novo PIN' : 'Gerar PIN'}
            </button>
          </div>

          {pinFeedback && (
            <div className={`p-3 rounded-xl text-xs font-medium border ${
              pinFeedback.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : pinFeedback.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {pinFeedback.text}
            </div>
          )}

          {generatedCode && (
            <div className="p-3 bg-black/40 rounded-xl border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Seu PIN de Vinculação:</span>
                <span className="text-xl font-mono font-bold tracking-widest text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-500/30">
                  {generatedCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(`conectar ${generatedCode}`, 'cmd')}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-xs font-mono rounded text-slate-200 transition flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copiedText === 'cmd' ? 'Copiado!' : `conectar ${generatedCode}`}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 pt-2 border-t border-white/10">
            <div className="space-y-1">
              <p className="font-semibold text-green-400 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> No WhatsApp:
              </p>
              <p className="text-[11px] text-slate-400">
                1. Abra a conversa com o bot no WhatsApp.<br />
                2. Envie o comando: <code className="text-green-300 bg-black/30 px-1 rounded">conectar {generatedCode || '123456'}</code><br />
                3. Pronto! O bot confirmará o vínculo.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sky-400 flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> No Telegram:
              </p>
              <p className="text-[11px] text-slate-400">
                1. Abra o bot do Telegram.<br />
                2. Digite <code className="text-sky-300 bg-black/30 px-1 rounded">/start {generatedCode || '123456'}</code> ou envie <code className="text-sky-300 bg-black/30 px-1 rounded">conectar {generatedCode || '123456'}</code>.<br />
                3. Sua conta será vinculada imediatamente!
              </p>
            </div>
          </div>
        </div>

        {/* Manual PIN Input fallback */}
        <div className="pt-2">
          <p className="text-xs font-semibold text-slate-300 mb-2">
            Ou digite um PIN gerado pelo bot:
          </p>
          <form onSubmit={handleWhatsAppLink} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={linkCode}
              onChange={e => setLinkCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="glass-input text-sm font-mono tracking-widest w-32 text-center"
            />
            <button
              type="submit"
              disabled={linkCode.length !== 6 || linkStatus === 'loading' || !user}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-2"
            >
              {linkStatus === 'loading' ? '...' : linkStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              {linkStatus === 'loading' ? 'Vinculando...' : linkStatus === 'success' ? 'Vinculado!' : 'Confirmar PIN'}
            </button>
          </form>
          {linkMessage && (
            <p className={`text-xs font-medium mt-2 ${linkStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {linkMessage}
            </p>
          )}
        </div>
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
