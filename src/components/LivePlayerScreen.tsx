import React, { useState, useEffect } from 'react';
import { Station, ThemeMode } from '../types';
import { audioEngine } from '../services/audioService';

interface LivePlayerScreenProps {
  station: Station;
  theme: ThemeMode;
  onOpenCastModal: () => void;
  onOpenSleepTimerModal: () => void;
  sleepTimer: string;
}

export const LivePlayerScreen: React.FC<LivePlayerScreenProps> = ({
  station,
  theme,
  onOpenCastModal,
  onOpenSleepTimerModal,
  sleepTimer,
}) => {
  const isLight = theme === 'light';

  const [isPlaying, setIsPlaying] = useState<boolean>(audioEngine.getIsPlaying());
  const [votes, setVotes] = useState<number>(station.currentTrack.votes);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [showLikeToast, setShowLikeToast] = useState<boolean>(false);
  const [showDjToast, setShowDjToast] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(2892); // 48:12

  useEffect(() => {
    const unsub = audioEngine.subscribe((playing) => {
      setIsPlaying(playing);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTogglePlay = () => {
    const nextState = audioEngine.togglePlay();
    setIsPlaying(nextState);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const handleLike = () => {
    if (!hasLiked) {
      setVotes((v) => v + 1);
      setHasLiked(true);
      setShowLikeToast(true);
      if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
      setTimeout(() => setShowLikeToast(false), 4000);
    } else {
      setVotes((v) => v - 1);
      setHasLiked(false);
      setShowLikeToast(false);
    }
  };

  const handleGreetDj = () => {
    setShowDjToast(true);
    if (navigator.vibrate) navigator.vibrate(25);
    setTimeout(() => setShowDjToast(false), 3500);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newVol = Math.round((clickX / rect.width) * 100);
    setVolume(newVol);
    audioEngine.setVolume(newVol / 100);
    if (isMuted) setIsMuted(false);
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${station.name} - ${station.currentTrack.title}`,
          text: `¡Escuchando ${station.currentTrack.title} en vivo por ${station.name}! 🌸🎶`,
          url: window.location.href,
        });
      } catch {
        // cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('🌸 ¡Enlace copiado al portapapeles!');
    }
  };

  return (
    <div className="flex flex-col relative w-full pb-24 pt-16 min-h-screen">
      {/* Ambient Pastel Glows */}
      <div
        className={`absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isLight ? 'bg-[#ffd1dc]/60' : 'bg-[#ff85a2]/15'
        }`}
      />
      <div
        className={`absolute top-72 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isLight ? 'bg-[#f2ddff]/60' : 'bg-[#cebdff]/15'
        }`}
      />

      <div className="relative w-full max-w-md mx-auto px-4 pb-6 flex flex-col gap-4 z-10 pt-2">
        {/* 1. KAWAII DJ ON-AIR CARD */}
        <section
          id="dj-on-air-card"
          className={`relative z-10 w-full rounded-2xl p-3.5 border shadow-lg overflow-hidden transition-colors duration-300 ${
            isLight
              ? 'bg-white/95 border-[#ffd5e2] shadow-[0_4px_16px_rgba(255,182,193,0.25)]'
              : 'bg-[#1d192e]/90 backdrop-blur-md border-white/10 shadow-[0_4px_24px_rgba(20,16,37,0.7)]'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff85a2] via-[#cebdff] to-[#edc157]" />

          <div className="flex items-center justify-between gap-3">
            {/* DJ Avatar with Live Beacon */}
            <div className="relative flex-shrink-0">
              <img
                src={station.dj.avatar}
                alt={station.dj.name}
                className={`w-12 h-12 rounded-full object-cover shadow-sm ring-2 ${
                  isLight ? 'ring-[#ff6584]/60' : 'ring-[#ff85a2]/70 shadow-[0_0_12px_rgba(255,133,162,0.4)]'
                }`}
              />
              <span
                className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-1 ${
                  isLight ? 'bg-white ring-[#ffd5e2]' : 'bg-[#0f0b20] ring-[#ffb1c1]/40'
                }`}
              >
                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-[#ff85a2] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff85a2]" />
              </span>
            </div>

            {/* DJ Info */}
            <div className="flex flex-col min-w-0 flex-1 pl-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[11px] font-bold tracking-wide ${
                    isLight ? 'text-[#b0284b]' : 'text-[#ffb1c1]'
                  }`}
                >
                  {station.dj.title}
                </span>
                <span className="text-[10px] opacity-50">•</span>
                <span
                  className={`text-[10px] font-semibold ${
                    isLight ? 'text-[#6b5677]' : 'text-[#cebdff]'
                  }`}
                >
                  🎧 {station.dj.listeners.toLocaleString()} oyentes
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <h2
                  className={`font-sora text-[15px] font-bold truncate leading-tight ${
                    isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                  }`}
                >
                  {station.dj.name}
                </h2>
              </div>
              <p
                className={`text-xs font-medium truncate ${
                  isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'
                }`}
              >
                {station.dj.bio}
              </p>
            </div>

            {/* Greet DJ Action */}
            <button
              onClick={handleGreetDj}
              id="btn-greet-dj"
              className={`flex-shrink-0 text-xs px-3.5 py-2 rounded-full font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer ${
                isLight
                  ? 'bg-gradient-to-r from-[#ff6584] to-[#b0284b] text-white shadow-[0_4px_14px_rgba(255,101,132,0.35)] hover:brightness-105'
                  : 'bg-gradient-to-r from-[#ff85a2] to-[#ff4d81] text-[#63082a] shadow-[0_4px_16px_rgba(255,133,162,0.4)] hover:brightness-110 font-bold'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">pets</span>
              <span>Saludar 🐾</span>
            </button>
          </div>

          {showDjToast && (
            <div
              id="dj-toast-pill"
              className={`mt-2.5 p-2 rounded-xl text-center text-xs font-bold transition-all border ${
                isLight
                  ? 'bg-[#ffeef2] border-[#ffd5e2] text-[#b0284b]'
                  : 'bg-[#ff85a2]/20 border-[#ff85a2]/40 text-[#ffb1c1]'
              }`}
            >
              {station.dj.greetingText}
            </div>
          )}
        </section>

        {/* 2. KAWAII ALBUM ART SECTION */}
        <section className="relative z-10 flex flex-col items-center w-full mt-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-bold tracking-wide px-3.5 py-1 rounded-full shadow-sm border ${
                isLight
                  ? 'bg-white text-[#b0284b] border-[#ffd5e2]'
                  : 'bg-[#2b273d]/90 text-[#cebdff] border-[#cebdff]/30'
              }`}
            >
              {station.genre}
            </span>
            <span
              className={`text-[11px] font-mono-code font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                isLight
                  ? 'bg-[#fff0f5] text-[#6b5677] border-[#ffd5e2]'
                  : 'bg-[#211d32] text-[#edc157] border-[#edc157]/30'
              }`}
            >
              📶 {station.streamStats.bitrate}
            </span>
          </div>

          {/* Center Album Art with Soft Glow */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-1 group">
            <div
              className={`absolute inset-0 rounded-3xl blur-2xl transform group-hover:scale-105 transition-transform duration-500 ${
                isLight
                  ? 'bg-gradient-to-tr from-[#ffccd9]/60 via-[#e9def6]/60 to-[#ffd9df]/50'
                  : 'bg-gradient-to-tr from-[#ff85a2]/35 via-[#cebdff]/25 to-[#edc157]/25'
              }`}
            />

            {/* Vinyl record peek */}
            <div
              className={`absolute top-0 right-0 w-60 h-60 sm:w-68 sm:h-68 rounded-full bg-[#111116] border-4 border-[#222] shadow-xl flex items-center justify-center transition-all duration-700 pointer-events-none ${
                isPlaying ? 'translate-x-6 rotate-45' : 'translate-x-0 rotate-0 opacity-0'
              }`}
            >
              <div className="w-48 h-48 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border border-white/10 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#ff85a2] flex items-center justify-center text-white text-xs font-bold">
                    🌸
                  </div>
                </div>
              </div>
            </div>

            {/* Album Cover Art Frame */}
            <div
              className={`relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border-2 transition-transform duration-500 ${
                isLight
                  ? 'border-white bg-white shadow-[0_12px_32px_rgba(176,40,75,0.18)]'
                  : 'border-[#ff85a2]/30 bg-[#211d32] shadow-[0_12px_36px_rgba(15,11,32,0.8)]'
              }`}
            >
              <img
                src={station.currentTrack.albumArt}
                alt={station.currentTrack.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div
                className={`absolute top-3 left-3 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-sm ${
                  isLight
                    ? 'bg-white/90 border-[#ffd5e2] text-[#b0284b]'
                    : 'bg-[#0f0b20]/80 border-white/10 text-[#ffb1c1]'
                }`}
              >
                <span className="text-xs">✨</span>
                <span className="text-xs font-bold tracking-tight">{station.name} • 熊本</span>
              </div>

              <div
                className={`absolute bottom-3 right-3 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border ${
                  isLight
                    ? 'bg-white/90 border-[#ffd5e2] text-[#b0284b]'
                    : 'bg-[#0f0b20]/80 border-[#ff85a2]/30 text-[#ff85a2]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] animate-pulse">
                  favorite
                </span>
                <span className="text-[11px] font-bold tracking-wide">AIR STREAM</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TRACK METADATA & HEART LIKE ACTION */}
        <section
          id="track-metadata-card"
          className={`relative z-10 flex flex-col gap-2 w-full p-4 rounded-2xl border shadow-md transition-colors duration-300 ${
            isLight
              ? 'bg-white/95 border-[#ffd5e2] shadow-[0_4px_16px_rgba(255,182,193,0.2)]'
              : 'bg-[#1d192e]/90 backdrop-blur-md border-white/10 shadow-lg'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`text-[11px] font-bold tracking-wide ${
                    isLight ? 'text-[#b0284b]' : 'text-[#ffb1c1]'
                  }`}
                >
                  AHORA SUENA
                </span>
                <span className="text-xs opacity-50">•</span>
                <span
                  className={`text-[11px] font-semibold ${
                    isLight ? 'text-[#6b5677]' : 'text-[#cebdff]'
                  }`}
                >
                  {station.currentTrack.genre}
                </span>
              </div>

              <h1
                className={`font-sora text-lg font-bold tracking-tight truncate leading-snug ${
                  isLight ? 'text-[#24112e]' : 'text-[#e6defc]'
                }`}
              >
                {station.currentTrack.title}
              </h1>

              {station.currentTrack.subtitle && (
                <p
                  className={`text-xs font-semibold tracking-tight truncate mt-0.5 ${
                    isLight ? 'text-[#b0284b]' : 'text-[#ffb1c1]'
                  }`}
                >
                  {station.currentTrack.subtitle}
                </p>
              )}

              <p
                className={`text-xs font-medium truncate mt-0.5 ${
                  isLight ? 'text-[#635b6f]' : 'text-[#dbc0c4]'
                }`}
              >
                {station.currentTrack.artist}
              </p>
            </div>

            {/* Like Vote Button */}
            <div className="flex flex-col items-center flex-shrink-0">
              <button
                onClick={handleLike}
                id="kawaii-like-btn"
                aria-label="Me gusta esta canción"
                className={`relative flex items-center justify-center w-12 h-12 rounded-full shadow-md border transition-all active:scale-110 group cursor-pointer ${
                  hasLiked
                    ? isLight
                      ? 'bg-[#ff6584] text-white border-[#ff6584]'
                      : 'bg-[#ff85a2] text-[#63082a] border-[#ff85a2] shadow-[0_0_16px_rgba(255,133,162,0.5)]'
                    : isLight
                    ? 'bg-[#fff0f4] hover:bg-[#ffd9e2] text-[#ff6584] border-[#ffd5e2]'
                    : 'bg-[#211d32] hover:bg-[#ff85a2]/20 text-[#ff85a2] border-[#ff85a2]/30'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[26px] group-hover:scale-110 transition-transform"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
              </button>
              <span
                id="kawaii-counter"
                className={`text-[11px] font-bold mt-1 ${
                  hasLiked
                    ? isLight
                      ? 'text-[#b0284b]'
                      : 'text-[#ffb1c1]'
                    : isLight
                    ? 'text-[#635b6f]'
                    : 'text-[#dbc0c4]'
                }`}
              >
                {votes} votos
              </span>
            </div>
          </div>

          {showLikeToast && (
            <div
              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold border ${
                isLight
                  ? 'bg-[#ffeef2] border-[#ffd5e2] text-[#b0284b]'
                  : 'bg-[#ff85a2]/20 border-[#ff85a2]/40 text-[#ffb1c1]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
              <span>¡Gracias por votar por esta canción! 💖</span>
            </div>
          )}
        </section>

        {/* 4. LIVE AUDIO CONTROLS & BUFFER SCRUBBER */}
        <section
          id="audio-controls-card"
          className={`relative z-10 flex flex-col gap-3.5 w-full p-4 rounded-2xl border shadow-lg transition-colors duration-300 ${
            isLight
              ? 'bg-white/95 border-[#ffd5e2] shadow-[0_4px_20px_rgba(255,182,193,0.25)]'
              : 'bg-[#1d192e]/95 backdrop-blur-lg border-white/10 shadow-xl'
          }`}
        >
          {/* Live Buffer Scrubber Bar */}
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div
                className={`flex items-center gap-1.5 ${
                  isLight ? 'text-[#635b6f]' : 'text-[#dbc0c4]'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff85a2] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff85a2]" />
                </span>
                <span
                  className={`font-bold ${isLight ? 'text-[#b0284b]' : 'text-[#ffb1c1]'}`}
                >
                  EN DIRECTO
                </span>
                <span className="opacity-40">|</span>
                <span className="text-[11px] font-mono-code">{formatElapsed(elapsedSeconds)} transcurrido</span>
              </div>
              <span
                className={`text-[11px] font-bold ${
                  isLight ? 'text-[#8b5a7a]' : 'text-[#cebdff]'
                }`}
              >
                KUMAMOTO LIVE • {station.streamStats.latency}
              </span>
            </div>

            <div
              className={`relative w-full h-3 rounded-full overflow-hidden flex items-center p-0.5 border ${
                isLight
                  ? 'bg-[#f3e7f0] border-[#ffd5e2]/60'
                  : 'bg-[#363248] border-white/5'
              }`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-full bg-white/20" />
              <div className="absolute left-0 top-0 bottom-0 w-11/12 bg-gradient-to-r from-[#cebdff] via-[#ff85a2] to-[#ff6584] rounded-full" />
              <div className="absolute right-1/12 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_#ff85a2] ring-2 ring-[#ff6584]" />
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="flex items-center justify-between px-2 pt-1">
            {/* Sleep Timer */}
            <button
              onClick={onOpenSleepTimerModal}
              id="sleep-timer-btn"
              title="Temporizador de apagado"
              className={`flex flex-col items-center justify-center w-11 h-11 rounded-full border transition-all active:scale-95 cursor-pointer ${
                sleepTimer !== 'off'
                  ? isLight
                    ? 'bg-[#ffd9e2] text-[#b0284b] border-[#ffb2bc] shadow-sm'
                    : 'bg-[#ff85a2]/20 text-[#ffb1c1] border-[#ff85a2]/50 shadow-[0_0_12px_rgba(255,133,162,0.3)]'
                  : isLight
                  ? 'bg-[#fff0f4] text-[#635b6f] hover:text-[#b0284b] border-[#ffd5e2] shadow-sm'
                  : 'bg-[#211d32] text-[#dbc0c4] hover:text-[#ffb1c1] border-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">bedtime</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter mt-0.5">
                {sleepTimer !== 'off' ? sleepTimer : 'Off'}
              </span>
            </button>

            {/* Big Central Play / Pause Button */}
            <button
              onClick={handleTogglePlay}
              id="main-play-btn"
              aria-label={isPlaying ? 'Pausar transmisión en vivo' : 'Reproducir transmisión en vivo'}
              className={`relative group w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer border-2 border-white ${
                isPlaying
                  ? 'bg-gradient-to-br from-[#ff85a2] via-[#ff6584] to-[#b0284b] text-white shadow-[0_8px_26px_rgba(255,101,132,0.45)]'
                  : 'bg-gradient-to-br from-[#b0284b] via-[#ff6584] to-[#ff85a2] text-white shadow-[0_4px_14px_rgba(255,101,132,0.3)]'
              }`}
            >
              {isPlaying && (
                <div className="animate-ping absolute -inset-1 rounded-full bg-[#ff85a2] opacity-30 pointer-events-none" />
              )}
              <span
                className="material-symbols-outlined text-[34px] relative z-10"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            {/* Share Stream Action */}
            <button
              onClick={handleShare}
              id="share-stream-btn"
              title="Compartir transmisión"
              className={`flex flex-col items-center justify-center w-11 h-11 rounded-full border transition-all active:scale-95 cursor-pointer ${
                isLight
                  ? 'bg-[#fff0f4] text-[#635b6f] hover:text-[#b0284b] border-[#ffd5e2] shadow-sm'
                  : 'bg-[#211d32] text-[#dbc0c4] hover:text-[#ffb1c1] border-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter mt-0.5">Share</span>
            </button>

            {/* Cast Audio Button */}
            <button
              onClick={onOpenCastModal}
              id="cast-stream-btn"
              title="Transmitir audio"
              className={`flex flex-col items-center justify-center w-11 h-11 rounded-full border transition-all active:scale-95 cursor-pointer ${
                isLight
                  ? 'bg-[#fff0f4] text-[#635b6f] hover:text-[#b0284b] border-[#ffd5e2] shadow-sm'
                  : 'bg-[#211d32] text-[#dbc0c4] hover:text-[#ffb1c1] border-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">cast</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter mt-0.5">Cast</span>
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-3 pt-1 px-1">
            <button
              onClick={handleToggleMute}
              id="mute-toggle-btn"
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
              className={`cursor-pointer transition-colors ${
                isLight ? 'text-[#635b6f] hover:text-[#b0284b]' : 'text-[#dbc0c4] hover:text-[#ffb1c1]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isMuted || volume === 0
                  ? 'volume_off'
                  : volume < 50
                  ? 'volume_down'
                  : 'volume_up'}
              </span>
            </button>

            <div
              onClick={handleVolumeClick}
              id="volume-track-bar"
              className={`relative flex-1 h-2 rounded-full overflow-hidden flex items-center cursor-pointer ${
                isLight ? 'bg-[#f3e7f0]' : 'bg-[#363248]'
              }`}
            >
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#cebdff] to-[#ff6584] rounded-full transition-all duration-150"
                style={{ width: `${isMuted ? 0 : volume}%` }}
              />
            </div>

            <span
              className={`text-xs font-mono-code font-bold min-w-[34px] text-right ${
                isLight ? 'text-[#635b6f]' : 'text-[#dbc0c4]'
              }`}
            >
              {isMuted ? '0%' : `${volume}%`}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
