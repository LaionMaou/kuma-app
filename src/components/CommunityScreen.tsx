import React, { useState, useEffect } from 'react';
import { ThemeMode, ChatMessage, Station, ChatUser, ChatUserType } from '../types';
import { INITIAL_CHAT_MESSAGES } from '../data/mockData';
import { authService } from '../services/authService';
import { AUTH_CONFIG } from '../config/authConfig';
import {
  MessageSquare,
  Headphones,
  Flame,
  Radio,
  Send,
  User,
  LogOut,
  Sparkles,
  Music,
  CheckCircle2,
  Mic,
  Activity,
  Lock,
  Unlock,
  ShieldCheck,
  Globe,
  AtSign,
  AlertCircle
} from 'lucide-react';

interface CommunityScreenProps {
  theme: ThemeMode;
  station: Station;
}

interface FloatingReaction {
  id: number;
  emoji: string;
  left: number;
}

interface DjReactionItem {
  id: string;
  sender: string;
  userType: ChatUserType;
  emoji: string;
  timestamp: string;
}

export const CommunityScreen: React.FC<CommunityScreenProps> = ({ theme, station }) => {
  const isLight = theme === 'light';

  // Usuario autenticado en la sesión activa
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(() => authService.getCurrentUser());
  const isDj = currentUser?.isDj === true || currentUser?.type === 'dj';

  // Sub-vista activa: los usuarios normales SOLO ven 'chat'.
  // Los DJs pueden alternar entre 'chat' y 'dj-booth'.
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'dj-booth'>('chat');

  // Modales de autenticación
  const [isUserLoginModalOpen, setIsUserLoginModalOpen] = useState(false);
  const [isDjLoginModalOpen, setIsDjLoginModalOpen] = useState(false);

  // Formulario de login de usuarios (Discord Bot, Google SSO, X SSO, Anónimo)
  const [selectedProvider, setSelectedProvider] = useState<'discord' | 'google' | 'x' | 'anonymous'>('discord');
  const [discordTag, setDiscordTag] = useState('KumaListener#1337');
  const [googleName, setGoogleName] = useState('Oyente Kumamoto');
  const [xHandle, setXHandle] = useState('@anime_fan_kuma');
  const [anonNickname, setAnonNickname] = useState(() => `Oyente-${Math.floor(100 + Math.random() * 900)}`);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Formulario de login privado de Cabina DJ
  const [djPasskey, setDjPasskey] = useState('');
  const [djCustomName, setDjCustomName] = useState(AUTH_CONFIG.DJ.DEFAULT_DJ_NAME);
  const [djLoginError, setDjLoginError] = useState<string | null>(null);

  // Mensajes y Reacciones
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isSongRequest, setIsSongRequest] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Sincronizar mensajes desde el backend de chat
  useEffect(() => {
    const fetchChatMessages = async () => {
      try {
        const res = await fetch('/api/chat/messages');
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages);
          }
        }
      } catch {
        // Fallback local
      }
    };

    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 4000);
    return () => clearInterval(interval);
  }, []);

  // Estado del monitor de Cabina DJ (solo para DJs)
  const [djReactionsFeed, setDjReactionsFeed] = useState<DjReactionItem[]>([
    { id: 'dj-r-1', sender: 'Yuki_Moe#4092', userType: 'discord', emoji: '🔥', timestamp: 'Hace 4s' },
    { id: 'dj-r-2', sender: 'Carlos Gomez', userType: 'google', emoji: '🌸', timestamp: 'Hace 11s' },
    { id: 'dj-r-3', sender: '@OtakuBeats_JP', userType: 'x', emoji: '💖', timestamp: 'Hace 23s' },
    { id: 'dj-r-4', sender: 'Oyente-883', userType: 'anonymous', emoji: '🐾', timestamp: 'Hace 38s' },
  ]);

  const [reactionStats, setReactionStats] = useState({
    '🐾': 54,
    '🌸': 98,
    '💖': 82,
    '🐻': 41,
    '🔥': 126,
    '🎧': 70,
  });

  const [crowdHype, setCrowdHype] = useState(95);
  const [djBroadcastNotice, setDjBroadcastNotice] = useState<string | null>(null);

  // Suscripción al servicio de autenticación
  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
      if (!user || (!user.isDj && user.type !== 'dj')) {
        setActiveSubTab('chat');
      }
    });
    return unsubscribe;
  }, []);

  // Handlers de Login de Usuario
  const handleDiscordLogin = async () => {
    setIsAuthenticating(true);
    try {
      await authService.loginWithDiscord(discordTag);
      setIsUserLoginModalOpen(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    try {
      await authService.loginWithGoogle(googleName);
      setIsUserLoginModalOpen(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleXLogin = async () => {
    setIsAuthenticating(true);
    try {
      await authService.loginWithX(xHandle);
      setIsUserLoginModalOpen(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAnonLogin = () => {
    authService.loginAnonymous(anonNickname);
    setIsUserLoginModalOpen(false);
  };

  const handleLogoutUser = () => {
    authService.logout();
    setActiveSubTab('chat');
  };

  // Handler de Login de Cabina DJ
  const handleDjLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDjLoginError(null);

    const result = authService.loginAsDj(djPasskey, djCustomName);
    if (result.success) {
      setIsDjLoginModalOpen(false);
      setDjPasskey('');
      setActiveSubTab('dj-booth'); // Abrir inmediatamente la cabina del DJ desbloqueada
    } else {
      setDjLoginError(result.error || 'Clave de cabina inválida.');
    }
  };

  const handleLockDjBooth = () => {
    authService.logoutDj();
    setActiveSubTab('chat');
  };

  // Enviar mensaje en el chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!currentUser) {
      setIsUserLoginModalOpen(true);
      return;
    }

    const payload = {
      sender: currentUser.username,
      avatar: currentUser.avatar,
      text: inputText.trim(),
      userType: currentUser.type,
      isDj: currentUser.isDj || currentUser.type === 'dj',
      tag: currentUser.handle || (currentUser.type === 'discord' ? 'Discord Bot' : currentUser.type === 'google' ? 'Google SSO' : undefined),
      isSongRequest: isSongRequest,
    };

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: payload.sender,
      avatar: payload.avatar,
      text: payload.text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: 1,
      isDj: payload.isDj,
      userType: currentUser.type,
      tag: payload.tag,
      isSongRequest: isSongRequest,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    const requested = isSongRequest;
    setIsSongRequest(false);

    // Enviar al backend
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Offline fallback
    }

    // Respuesta automática de cortesía del DJ si es petición
    if (requested && !isDj) {
      setTimeout(() => {
        const djReply: ChatMessage = {
          id: `dj-req-reply-${Date.now()}`,
          sender: station.dj.name,
          avatar: station.dj.avatar,
          text: `🎵 ¡Petición recibida en cabina, ${currentUser.username}! La agregamos a la lista de reproducción 🐾✨`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isDj: true,
          userType: 'dj',
          likes: 6,
        };
        setMessages((prev) => [...prev, djReply]);
      }, 2000);
    }
  };

  // Enviar reacción hacia la cabina del DJ
  const handleSendReaction = (emoji: string) => {
    const senderName = currentUser ? currentUser.username : 'Oyente Anónimo';
    const userType: ChatUserType = currentUser ? currentUser.type : 'anonymous';

    // 1. Animación visual flotante
    const reaction: FloatingReaction = {
      id: Date.now() + Math.random(),
      emoji,
      left: Math.random() * 80 + 10,
    };
    setFloatingReactions((prev) => [...prev, reaction]);
    if (navigator.vibrate) navigator.vibrate(20);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2000);

    // 2. Incrementar contadores
    setReactionStats((prev) => ({
      ...prev,
      [emoji as keyof typeof prev]: (prev[emoji as keyof typeof prev] || 0) + 1,
    }));

    setCrowdHype((prev) => Math.min(100, prev + 1));

    // 3. Registrar en feed de cabina
    const newDjItem: DjReactionItem = {
      id: `dj-event-${Date.now()}-${Math.random()}`,
      sender: senderName,
      userType,
      emoji,
      timestamp: 'Justo ahora',
    };

    setDjReactionsFeed((prev) => [newDjItem, ...prev.slice(0, 19)]);
  };

  // Emisión oficial de mensaje desde la cabina (solo DJ)
  const handleDjBroadcast = () => {
    const shoutouts = [
      '🎙️ [CABINA EN VIVO] ¡Un saludo caluroso a toda la comunidad en sintonía! ¡El hype está en su punto máximo! 🌸🔥',
      '🎙️ [CABINA EN VIVO] ¡Gracias a todos los que nos acompañan desde Discord, Google y X! ¡Seguimos con puro temazo anime! 🐻🎶',
      '🎙️ [CABINA EN VIVO] ¡Recibidas todas las patitas y corazones en los monitores de cabina! ¡Arigato Kumamoto FM! 🐾💖',
    ];
    const text = shoutouts[Math.floor(Math.random() * shoutouts.length)];
    const msg: ChatMessage = {
      id: `dj-broadcast-${Date.now()}`,
      sender: currentUser?.username || station.dj.name,
      avatar: currentUser?.avatar || station.dj.avatar,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isDj: true,
      userType: 'dj',
      likes: 32,
    };
    setMessages((prev) => [...prev, msg]);
    setDjBroadcastNotice('¡Mensaje emitido a toda la audiencia desde la cabina!');
    setTimeout(() => setDjBroadcastNotice(null), 3000);
  };

  return (
    <div className="flex flex-col relative w-full pt-16 pb-28 min-h-screen">
      {/* Floating Reaction Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-24 text-3xl animate-float-up pointer-events-none"
            style={{ left: `${r.left}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div className="flex flex-col w-full max-w-md mx-auto px-4 gap-4">
        {/* Header Principal */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isLight ? 'bg-[#ffd9e2] text-[#b0284b]' : 'bg-[#cebdff]/20 text-[#cebdff]'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1
                  className={`font-sora text-lg font-bold ${
                    isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                  }`}
                >
                  Comunidad Kuma Kuma
                </h1>
                <p className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}>
                  {station.dj.listeners.toLocaleString()} oyentes activos en vivo
                </p>
              </div>
            </div>

            {/* Botón discreto de acceso a Cabina DJ (Enmascarado con login para protegerlo del público) */}
            {!isDj ? (
              <button
                onClick={() => {
                  setDjLoginError(null);
                  setIsDjLoginModalOpen(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                  isLight
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
                title="Acceso exclusivo para locutores y DJs en directo"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Acceso DJ</span>
              </button>
            ) : (
              <button
                onClick={handleLockDjBooth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold hover:bg-red-500/30 transition-all"
                title="Cerrar y bloquear cabina de DJ"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Bloquear Cabina</span>
              </button>
            )}
          </div>

          {/* Banner de Estado para el DJ (Visible SOLAMENTE si está autenticado como DJ) */}
          {isDj && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sora font-bold text-xs text-amber-300">
                      CABINA DJ AUTORIZADA
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Transmitiendo como: <strong className="text-white">{currentUser?.username}</strong>
                  </p>
                </div>
              </div>

              {/* Conmutador de vista para el DJ: Monitor de Cabina VS Chat */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setActiveSubTab('chat')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    activeSubTab === 'chat'
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveSubTab('dj-booth')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                    activeSubTab === 'dj-booth'
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Headphones className="w-3 h-3" />
                  <span>Cabina</span>
                </button>
              </div>
            </div>
          )}

          {/* Barra de Estado del Usuario */}
          <div
            className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
              isLight ? 'bg-white/80 border-[#ffd5e2]' : 'bg-[#1e1a30]/80 border-white/10'
            }`}
          >
            {currentUser ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-pink-500/50"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold truncate text-xs">{currentUser.username}</span>

                      {/* Insignias oficiales según el proveedor SSO */}
                      {currentUser.type === 'discord' && (
                        <span className="bg-[#5865F2] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Discord Bot
                        </span>
                      )}

                      {currentUser.type === 'google' && (
                        <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5">
                          <Globe className="w-2.5 h-2.5" />
                          Google SSO
                        </span>
                      )}

                      {currentUser.type === 'x' && (
                        <span className="bg-black border border-white/20 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5">
                          <AtSign className="w-2.5 h-2.5" />
                          X SSO
                        </span>
                      )}

                      {currentUser.type === 'anonymous' && (
                        <span className="bg-slate-700 text-slate-300 text-[9px] px-1.5 py-0.2 rounded-full font-medium">
                          Anónimo (Sesión)
                        </span>
                      )}

                      {isDj && (
                        <span className="bg-gradient-to-r from-amber-500 to-pink-500 text-black text-[9px] px-1.5 py-0.2 rounded-full font-extrabold">
                          👑 DJ EN VIVO
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogoutUser}
                  className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-slate-400 min-w-0">
                  <User className="w-4 h-4 text-pink-400 flex-shrink-0" />
                  <span className="truncate">Ingresa con Discord, Google, X o Anónimo</span>
                </div>
                <button
                  onClick={() => setIsUserLoginModalOpen(true)}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-xs px-3 py-1.5 rounded-xl shadow-sm hover:brightness-110 active:scale-95 transition-all flex-shrink-0"
                >
                  Iniciar sesión
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: CABINA DEL DJ EN VIVO (SOLO VISIBLE CUANDO isDj === true) */}
        {/* ------------------------------------------------------------- */}
        {isDj && activeSubTab === 'dj-booth' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Cabina Status Monitor Card */}
            <div
              className={`p-4 rounded-2xl border relative overflow-hidden ${
                isLight
                  ? 'bg-gradient-to-br from-[#fff0f5] to-white border-[#ffd5e2]'
                  : 'bg-gradient-to-br from-[#1a1533] to-[#251d45] border-indigo-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-sora font-bold text-sm">Monitor de Cabina en Directo</h3>
                    <p className="text-[11px] text-slate-400">
                      Receptor de reacciones y peticiones para {currentUser?.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <Activity className="w-3 h-3 animate-spin" />
                  <span>RECIBIENDO</span>
                </div>
              </div>

              {/* Hype Meter */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Flame className="w-3.5 h-3.5" /> Clima del Público (Hype)
                  </span>
                  <span className="font-mono text-emerald-400">{crowdHype}% ¡En llamas!</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${crowdHype}%` }}
                  />
                </div>
              </div>

              {/* DJ Broadcast Action */}
              <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={handleDjBroadcast}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg active:scale-98 transition-all"
                >
                  <Mic className="w-4 h-4 text-amber-300" />
                  <span>Emitir Saludo Oficial a la Audiencia</span>
                </button>
                {djBroadcastNotice && (
                  <p className="text-[11px] text-center text-emerald-400 font-medium animate-pulse">
                    {djBroadcastNotice}
                  </p>
                )}
              </div>
            </div>

            {/* Reaction Counters Grid */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 px-1">
                Lluvia de Reacciones Acumuladas
              </span>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(reactionStats).map(([emoji, count]) => (
                  <div
                    key={emoji}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      isLight
                        ? 'bg-white border-[#ffd5e2]'
                        : 'bg-[#1e1a30] border-white/10'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-pink-400">{count}</div>
                      <div className="text-[9px] text-slate-400 uppercase">enviadas</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Reaction Stream */}
            <div
              className={`p-3.5 rounded-2xl border space-y-3 ${
                isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#181428] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-sora font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Reacciones Recientes que Llegan a la Cabina
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Tiempo Real</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {djReactionsFeed.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isLight
                        ? 'bg-[#fff5f8] border-[#ffe0e8]'
                        : 'bg-[#221c38] border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl animate-bounce">{item.emoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs">{item.sender}</span>
                          {item.userType === 'discord' && (
                            <span className="bg-[#5865F2] text-[8px] text-white px-1 rounded font-bold">
                              Discord
                            </span>
                          )}
                          {item.userType === 'google' && (
                            <span className="bg-emerald-600 text-[8px] text-white px-1 rounded font-bold">
                              Google
                            </span>
                          )}
                          {item.userType === 'x' && (
                            <span className="bg-black text-[8px] text-white px-1 rounded font-bold">
                              X
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">Reaccionó en vivo al DJ</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{item.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: CHAT DE LA COMUNIDAD (VISTA ESTÁNDAR PARA TODOS LOS USUARIOS) */}
        {/* ------------------------------------------------------------- */}
        {(!isDj || activeSubTab === 'chat') && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Pinned DJ Message Card */}
            <div
              className={`p-3.5 rounded-2xl border shadow-sm flex items-start gap-3 ${
                isLight
                  ? 'bg-[#fff0f5] border-[#ffccd9]'
                  : 'bg-[#2b273d] border-[#ff85a2]/30'
              }`}
            >
              <div className="relative flex-shrink-0 mt-0.5">
                <img
                  src={station.dj.avatar}
                  alt={station.dj.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#ff6584]"
                />
                <span className="absolute -bottom-1 -right-1 text-xs">👑</span>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-sora text-xs font-bold text-[#ff6584]">
                    {station.dj.name}
                  </span>
                  <span className="text-[10px] bg-[#ff6584] text-white px-1.5 py-0.2 rounded font-bold">
                    LOCUTORA EN VIVO
                  </span>
                </div>
                <p
                  className={`text-xs font-medium leading-relaxed ${
                    isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                  }`}
                >
                  🌸 ¡Konnichiwa! Bienvenidos al chat en vivo de Kumamoto FM. Envíen sus saludos y reacciones a cabina. 🐻🎶
                </p>
              </div>
            </div>

            {/* Quick Live Reaction Bar (Sends directly to the live stream) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <span
                  className={`text-[10px] font-mono-code uppercase font-bold tracking-wider ${
                    isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'
                  }`}
                >
                  Reaccionar en vivo a la transmisión
                </span>
                <span className="text-[10px] text-pink-400 font-mono">¡Llega a la locutora!</span>
              </div>
              <div className="flex justify-between gap-1 p-2 rounded-2xl border bg-black/20 border-white/5">
                {['🐾', '🌸', '💖', '🐻', '🔥', '🎧'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="w-11 h-11 rounded-xl text-xl flex items-center justify-center hover:scale-125 active:scale-95 transition-transform cursor-pointer bg-white/5 hover:bg-white/15"
                    title={`Enviar ${emoji} a cabina`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl border shadow-sm flex items-start gap-2.5 ${
                    msg.isDj
                      ? isLight
                        ? 'bg-[#ffeef2] border-[#ffccd9]'
                        : 'bg-[#261f38] border-pink-500/40'
                      : isLight
                      ? 'bg-white border-[#ffd5e2]'
                      : 'bg-[#1d192e] border-white/5'
                  }`}
                >
                  <img
                    src={msg.avatar}
                    alt={msg.sender}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-white/20"
                  />

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`font-sora text-xs font-bold truncate ${
                            msg.isDj
                              ? 'text-[#ff6584]'
                              : isLight
                              ? 'text-[#2e1a38]'
                              : 'text-[#e6defc]'
                          }`}
                        >
                          {msg.sender}
                        </span>

                        {msg.isDj && (
                          <span className="text-[9px] bg-gradient-to-r from-amber-500 to-pink-500 text-black px-1.5 py-0.2 rounded-full font-bold">
                            👑 DJ
                          </span>
                        )}

                        {msg.userType === 'discord' && !msg.isDj && (
                          <span className="bg-[#5865F2] text-white text-[8px] px-1.5 py-0.2 rounded-full font-bold">
                            Discord
                          </span>
                        )}

                        {msg.userType === 'google' && !msg.isDj && (
                          <span className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.2 rounded-full font-bold">
                            Google
                          </span>
                        )}

                        {msg.userType === 'x' && !msg.isDj && (
                          <span className="bg-black text-white border border-white/20 text-[8px] px-1.5 py-0.2 rounded-full font-bold">
                            𝕏
                          </span>
                        )}

                        {msg.userType === 'anonymous' && !msg.isDj && (
                          <span className="bg-slate-700 text-slate-300 text-[8px] px-1.5 py-0.2 rounded-full font-medium">
                            Anónimo
                          </span>
                        )}

                        {msg.isSongRequest && (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] px-1.5 py-0.2 rounded font-bold">
                            🎵 Petición
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-mono-code flex-shrink-0 ${
                          isLight ? 'text-[#8c7073]' : 'text-[#dbc0c4]/60'
                        }`}
                      >
                        {msg.time}
                      </span>
                    </div>

                    <p
                      className={`text-xs leading-relaxed ${
                        isLight ? 'text-[#3e2e46]' : 'text-[#dbc0c4]'
                      }`}
                    >
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Song Request Toggle & Input Form */}
            <form onSubmit={handleSendMessage} className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setIsSongRequest(!isSongRequest)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
                    isSongRequest
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 bg-white/5'
                  }`}
                >
                  <Music className="w-3 h-3" />
                  <span>{isSongRequest ? '✓ Modo Petición de Canción' : 'Marcar como petición musical'}</span>
                </button>

                {!currentUser && (
                  <span
                    className="text-[11px] text-pink-400 cursor-pointer hover:underline"
                    onClick={() => setIsUserLoginModalOpen(true)}
                  >
                    Iniciar sesión para comentar
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    currentUser
                      ? isSongRequest
                        ? 'Escribe el nombre de la canción y artista para el DJ...'
                        : 'Escribe un saludo o comentario para la radio...'
                      : 'Haz clic para identificarte con Discord, Google, X o Anónimo...'
                  }
                  value={inputText}
                  onFocus={() => {
                    if (!currentUser) setIsUserLoginModalOpen(true);
                  }}
                  onChange={(e) => setInputText(e.target.value)}
                  className={`flex-1 px-3.5 py-2.5 rounded-full border text-xs focus:outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-[#ffd5e2] text-[#2e1a38] placeholder-[#a38b8e]'
                      : 'bg-[#211d32] border-white/10 text-[#e6defc] placeholder-[#dbc0c4]/50'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    inputText.trim()
                      ? isLight
                        ? 'bg-[#b0284b] text-white shadow-sm'
                        : 'bg-[#ff85a2] text-[#63082a] shadow-md'
                      : 'bg-neutral-500/20 opacity-40 cursor-not-allowed text-neutral-400'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: ACCESO ENMASCARADO A CABINA DJ (LOGIN PRIVADO)       */}
      {/* ============================================================= */}
      {isDjLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-4 ${
              isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#181428] border-white/10'
            }`}
          >
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-pink-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-sora font-bold text-lg">Acceso a Cabina DJ</h3>
              <p className="text-xs text-slate-400">
                Esta área está enmascarada y restringida únicamente para locutores y DJs en directo.
              </p>
            </div>

            <form onSubmit={handleDjLoginSubmit} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
                  <span>Clave de Acceso de Cabina</span>
                  <span className="text-[10px] text-pink-400 font-mono">Privada</span>
                </label>
                <input
                  type="password"
                  value={djPasskey}
                  onChange={(e) => setDjPasskey(e.target.value)}
                  placeholder="Introduce la clave de DJ..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400">
                  Pista de prueba: <code className="text-amber-300 font-mono font-bold">{AUTH_CONFIG.DJ.ACCESS_KEY}</code>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-400">
                  Nombre o Alias de Locutor(a)
                </label>
                <input
                  type="text"
                  value={djCustomName}
                  onChange={(e) => setDjCustomName(e.target.value)}
                  placeholder="Ej: DJ Kuma-chan 🐻✨"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {djLoginError && (
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{djLoginError}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-rose-600 text-white font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear y Entrar a Cabina</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDjLoginModalOpen(false)}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: LOGIN DE USUARIOS (DISCORD BOT, GOOGLE SSO, X SSO)   */}
      {/* ============================================================= */}
      {isUserLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 ${
              isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#181428] border-white/10'
            }`}
          >
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center mx-auto shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-sora font-bold text-lg">Identificación de Oyente</h3>
              <p className="text-xs text-slate-400">
                Participa en el chat y pide canciones con tu cuenta favorita.
              </p>
            </div>

            {/* Provider Tabs */}
            <div className="grid grid-cols-4 p-1 rounded-2xl bg-black/40 border border-white/10 text-xs gap-1">
              <button
                type="button"
                onClick={() => setSelectedProvider('discord')}
                className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedProvider === 'discord'
                    ? 'bg-[#5865F2] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🤖</span>
                <span className="text-[10px]">Discord</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProvider('google')}
                className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedProvider === 'google'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🌐</span>
                <span className="text-[10px]">Google</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProvider('x')}
                className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedProvider === 'x'
                    ? 'bg-neutral-800 text-white shadow-sm border border-white/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>𝕏</span>
                <span className="text-[10px]">X (Twitter)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProvider('anonymous')}
                className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedProvider === 'anonymous'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👤</span>
                <span className="text-[10px]">Anónimo</span>
              </button>
            </div>

            {/* Provider Form 1: Discord Bot (OAuth2) */}
            {selectedProvider === 'discord' && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div className="p-3 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#5865F2] font-bold text-xs">
                    <span>🤖</span>
                    <span>Bot de Discord (OAuth2)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Inicia sesión a través del flujo OAuth2 con el Bot oficial de Kuma Kuma Radio. Tus peticiones musicales y reacciones llevarán la insignia verificada de Discord.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-400">
                    Nombre / Tag de Discord
                  </label>
                  <input
                    type="text"
                    value={discordTag}
                    onChange={(e) => setDiscordTag(e.target.value)}
                    placeholder="Ej. KumaFan#1337 o @kumafan"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDiscordLogin}
                  disabled={isAuthenticating}
                  className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>{isAuthenticating ? 'Conectando con Discord...' : 'Iniciar sesión con Discord (OAuth2)'}</span>
                </button>
              </div>
            )}

            {/* Provider Form 2: Google SSO */}
            {selectedProvider === 'google' && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Google Single Sign-On (SSO)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Acceso directo y seguro mediante Google Identity Services (OAuth2). Tu avatar y nombre se asociarán de forma inmediata a la sesión.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-400">
                    Nombre para mostrar
                  </label>
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="Ej. Kenji Tanaka"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isAuthenticating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>{isAuthenticating ? 'Conectando con Google...' : 'Continuar con Google SSO'}</span>
                </button>
              </div>
            )}

            {/* Provider Form 3: X (Twitter) SSO */}
            {selectedProvider === 'x' && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div className="p-3 rounded-xl bg-neutral-800/60 border border-white/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                    <AtSign className="w-3.5 h-3.5" />
                    <span>X (Twitter) OAuth 2.0</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Conecta tu perfil de X para que la locutora y el chat vean tu <span className="font-mono text-pink-400">@usuario</span> oficial en vivo.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-400">
                    Handle de X (@usuario)
                  </label>
                  <input
                    type="text"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    placeholder="Ej. @NeoTokyoDrift"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleXLogin}
                  disabled={isAuthenticating}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-black border border-white/20 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>{isAuthenticating ? 'Conectando con X...' : 'Continuar con X (OAuth2)'}</span>
                </button>
              </div>
            )}

            {/* Provider Form 4: Anónimo (Sesión) */}
            {selectedProvider === 'anonymous' && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-400">
                    Apodo de Invitado
                  </label>
                  <input
                    type="text"
                    value={anonNickname}
                    onChange={(e) => setAnonNickname(e.target.value)}
                    placeholder="Ej. Oyente_402"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    🔒 <strong>Persistencia temporal de sesión:</strong> Tu sesión de invitado solo vivirá mientras esta pestaña de la radio permanezca abierta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAnonLogin}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs shadow-md transition-all"
                >
                  Entrar como Invitado Anónimo
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsUserLoginModalOpen(false)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
