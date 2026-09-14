import React, { useState } from 'react';
import { AppSettings, ThemeMode, EqualizerSettings } from '../types';
import { EQ_PRESETS } from '../data/mockData';
import { audioEngine } from '../services/audioService';
import { RADIO_CONFIG } from '../config/radioConfig';
import { azuracastService } from '../services/azuracastService';
import { AUTH_CONFIG, getOAuthCallbackUrl } from '../config/authConfig';

interface SettingsScreenProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenPrivacyModal: () => void;
  onOpenContactModal: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  updateSettings,
  onOpenPrivacyModal,
  onOpenContactModal,
}) => {
  const isLight = settings.theme === 'light';

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedAuth, setCopiedAuth] = useState<string | null>(null);

  const handleTestAzuraCast = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    try {
      const data = await azuracastService.fetchNowPlaying();
      setConnectionResult({
        success: true,
        message: `¡Conexión Exitosa! Estación: ${data.station.name} | Canción: ${data.now_playing.song.title} - ${data.now_playing.song.artist} (${data.listeners.current} oyentes)`,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setConnectionResult({
        success: false,
        message: `No se pudo conectar a ${azuracastService.getEndpointUrl()}: ${errorMsg}. Verifica tu URL o CORS en el servidor AzuraCast.`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedFile(path);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const handleThemeChange = (theme: ThemeMode) => {
    updateSettings({ theme });
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const handleEqualizerChange = (band: keyof EqualizerSettings, val: number) => {
    const updatedEq = {
      ...settings.equalizer,
      [band]: val,
      preset: 'custom' as const,
    };
    updateSettings({ equalizer: updatedEq });
    audioEngine.updateEqualizer(updatedEq);
  };

  const handleApplyPreset = (presetKey: keyof typeof EQ_PRESETS) => {
    const preset = EQ_PRESETS[presetKey];
    if (preset) {
      updateSettings({ equalizer: preset });
      audioEngine.updateEqualizer(preset);
      if (navigator.vibrate) navigator.vibrate(15);
    }
  };

  const handleBassBoostChange = (val: number) => {
    updateSettings({ bassBoostDb: val });
    audioEngine.setBassBoost(val);
  };

  const handleSleepTimerChange = (val: 'off' | '15m' | '30m' | '60m') => {
    updateSettings({ sleepTimer: val });
    if (navigator.vibrate) navigator.vibrate(15);
  };

  // Generate SVG curve points dynamically based on the 5 bands
  // Bands range from -10 to +10 dB. Center is y=30, -10 is y=52, +10 is y=8
  const eq = settings.equalizer;
  const calcY = (db: number) => 30 - db * 2.2;
  const y60 = calcY(eq.band60);
  const y230 = calcY(eq.band230);
  const y910 = calcY(eq.band910);
  const y4k = calcY(eq.band4k);
  const y14k = calcY(eq.band14k);

  const curvePath = `M 10 ${y60} Q 50 ${y230}, 80 ${y230} T 150 ${y910} T 220 ${y4k} T 290 ${y14k}`;
  const fillPath = `${curvePath} L 290 60 L 10 60 Z`;

  return (
    <div className="flex flex-col relative w-full pt-16 pb-28 min-h-screen">
      <div className="flex flex-col w-full max-w-md mx-auto px-4 pb-8 gap-5">
        {/* ENCABEZADO DE AJUSTES */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                  isLight
                    ? 'bg-[#ffd9e2] border border-[#ffb2bc] text-[#b0284b] shadow-[0_4px_16px_rgba(255,101,132,0.25)]'
                    : 'bg-[#ff85a2]/20 border border-[#ff85a2]/30 text-[#ffb1c1] shadow-[0_0_20px_rgba(255,177,193,0.35)]'
                }`}
              >
                <span className="material-symbols-outlined text-[28px]">settings</span>
              </div>

              <div>
                <h1
                  className={`font-sora text-xl font-bold tracking-tight flex items-center gap-1.5 ${
                    isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                  }`}
                >
                  Ajustes <span className="text-sm">✨</span>
                </h1>
                <p
                  className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${
                    isLight ? 'text-[#6b5677]' : 'text-[#cebdff]'
                  }`}
                >
                  <span>Kuma Kuma Radio</span>
                  <span className="text-[8px] opacity-60">•</span>
                  <span>Kumamoto FM 🌸</span>
                </p>
              </div>
            </div>

            <div
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border ${
                isLight
                  ? 'bg-white border-[#ffd5e2] text-[#b0284b]'
                  : 'bg-[#2b273d] border-white/5 text-[#ffb1c1]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#ff6584] animate-pulse" />
              <span className="text-[10px] font-mono-code font-bold tracking-wider">ONLINE</span>
            </div>
          </div>

          {/* SELECTOR DE APARIENCIA / TEMA */}
          <div
            id="theme-selector-card"
            className={`p-4 rounded-2xl border shadow-md flex flex-col gap-3 transition-colors duration-300 ${
              isLight
                ? 'bg-white border-[#ffd5e2]'
                : 'bg-[#211d32] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff6584] text-lg">palette</span>
                <span
                  className={`font-sora text-sm font-bold ${
                    isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                  }`}
                >
                  Apariencia y Tema
                </span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'
                }`}
              >
                2 Temas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Modo Oscuro Card (Pastel Night) */}
              <button
                onClick={() => handleThemeChange('dark')}
                id="theme-dark-btn"
                className={`relative flex flex-col items-center p-3 rounded-xl transition-all transform active:scale-95 text-left cursor-pointer border ${
                  !isLight
                    ? 'bg-[#363248] border-[#ff85a2] shadow-[0_0_16px_rgba(255,133,162,0.25)]'
                    : 'bg-[#fff0f5] border-transparent text-[#6b5677] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <span
                    className={`material-symbols-outlined ${
                      !isLight ? 'text-[#cebdff]' : 'text-[#6b5677]'
                    }`}
                  >
                    dark_mode
                  </span>
                  <span
                    className={`material-symbols-outlined text-base ${
                      !isLight ? 'text-[#ffb1c1]' : 'text-[#a38b8e] opacity-30'
                    }`}
                  >
                    {!isLight ? 'check_circle' : 'circle'}
                  </span>
                </div>
                <span
                  className={`font-sora text-sm font-bold w-full ${
                    !isLight ? 'text-[#e6defc]' : 'text-[#2e1a38]'
                  }`}
                >
                  Pastel Night
                </span>
                <span
                  className={`text-xs w-full mt-0.5 ${
                    !isLight ? 'text-[#dbc0c4]' : 'text-[#6b5677]'
                  }`}
                >
                  Modo Oscuro
                </span>
                <div className="w-full flex gap-1 mt-2">
                  <div className="h-1.5 w-5 rounded-full bg-[#141025]" />
                  <div className="h-1.5 w-3 rounded-full bg-[#ff85a2]" />
                  <div className="h-1.5 w-2 rounded-full bg-[#cebdff]" />
                </div>
              </button>

              {/* Modo Claro Card (Sakura Day) */}
              <button
                onClick={() => handleThemeChange('light')}
                id="theme-light-btn"
                className={`relative flex flex-col items-center p-3 rounded-xl transition-all transform active:scale-95 text-left cursor-pointer border ${
                  isLight
                    ? 'bg-[#fff0f5] border-2 border-[#b0284b] text-[#b0284b] shadow-[0_0_16px_rgba(255,101,132,0.25)]'
                    : 'bg-[#1d192e] border-transparent text-[#dbc0c4] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <span
                    className={`material-symbols-outlined ${
                      isLight ? 'text-[#b0284b]' : 'text-[#dbc0c4]'
                    }`}
                  >
                    light_mode
                  </span>
                  <span
                    className={`material-symbols-outlined text-base ${
                      isLight ? 'text-[#b0284b] font-bold' : 'text-[#dbc0c4] opacity-20'
                    }`}
                  >
                    {isLight ? 'check_circle' : 'circle'}
                  </span>
                </div>
                <span
                  className={`font-sora text-sm font-bold w-full ${
                    isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                  }`}
                >
                  Sakura Day
                </span>
                <span
                  className={`text-xs font-semibold w-full mt-0.5 ${
                    isLight ? 'text-[#b0284b]' : 'text-[#dbc0c4]'
                  }`}
                >
                  Modo Claro
                </span>
                <div className="w-full flex gap-1 mt-2">
                  <div className="h-1.5 w-5 rounded-full bg-[#b0284b]" />
                  <div className="h-1.5 w-3 rounded-full bg-[#ff85a2]" />
                  <div className="h-1.5 w-2 rounded-full bg-[#ffd5e2]" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* SUBMENÚ 1: GENERAL */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[#ff6584] text-xl">tune</span>
            <h2
              className={`font-sora text-base font-bold ${
                isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
              }`}
            >
              General
            </h2>
            <span className="text-xs">🐾</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Restricción horaria */}
            <div
              className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-2.5 ${
                isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#211d32] border-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 pr-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isLight ? 'bg-[#fff0f5] text-[#b0284b] border border-[#ffd5e2]' : 'bg-[#4c3c7c]/40 text-[#cebdff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">schedule</span>
                  </div>
                  <div>
                    <p
                      className={`font-sora text-sm font-bold ${
                        isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                      }`}
                    >
                      Restringir horarios
                    </p>
                    <p
                      className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
                    >
                      Pausa la radio fuera del rango
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.restrictSchedule}
                    onChange={(e) => updateSettings({ restrictSchedule: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div
                    className={`w-12 h-7 rounded-full transition-all peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      isLight
                        ? 'bg-[#eedbff] peer-checked:bg-[#b0284b]'
                        : 'bg-[#363248] peer-checked:bg-[#ff85a2]'
                    }`}
                  />
                </label>
              </div>

              {/* Time Pickers Box */}
              {settings.restrictSchedule && (
                <div className="pt-2 flex flex-col gap-2 transition-all">
                  <div
                    className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border ${
                      isLight ? 'bg-[#fff0f5] border-[#ffd5e2]' : 'bg-[#1d192e] border-white/5'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-[10px] font-mono-code font-bold ${
                          isLight ? 'text-[#b0284b]' : 'text-[#cebdff]'
                        }`}
                      >
                        INICIO
                      </span>
                      <div
                        className={`flex items-center gap-1.5 font-bold text-sm ${
                          isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base text-[#ff6584]">
                          sunny
                        </span>
                        <input
                          type="time"
                          value={settings.scheduleStart}
                          onChange={(e) => updateSettings({ scheduleStart: e.target.value })}
                          className="bg-transparent font-sora text-sm font-bold focus:outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-[10px] font-mono-code font-bold ${
                          isLight ? 'text-[#6b5677]' : 'text-[#cebdff]'
                        }`}
                      >
                        FIN
                      </span>
                      <div
                        className={`flex items-center gap-1.5 font-bold text-sm ${
                          isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base text-[#cebdff]">
                          bedtime
                        </span>
                        <input
                          type="time"
                          value={settings.scheduleEnd}
                          onChange={(e) => updateSettings({ scheduleEnd: e.target.value })}
                          className="bg-transparent font-sora text-sm font-bold focus:outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Days Pills */}
                  <div className="flex items-center justify-between pt-1 px-1">
                    <span
                      className={`text-[10px] font-mono-code font-bold tracking-wider ${
                        isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'
                      }`}
                    >
                      DÍAS ACTIVOS
                    </span>
                    <div className="flex gap-1">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                        <span
                          key={i}
                          className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                            i < 5
                              ? isLight
                                ? 'bg-[#b0284b] text-white'
                                : 'bg-[#ff85a2] text-[#63082a]'
                              : isLight
                              ? 'bg-[#ffd5e2] text-[#b0284b]'
                              : 'bg-[#cebdff] text-[#200d4e]'
                          }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Temporizador de Apagado */}
            <div
              className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-2.5 ${
                isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#211d32] border-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isLight
                        ? 'bg-[#fff0f5] border border-[#ffd5e2] text-[#ea7591]'
                        : 'bg-[#cfa53f]/30 text-[#edc157]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">timer</span>
                  </div>
                  <div>
                    <p
                      className={`font-sora text-sm font-bold ${
                        isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                      }`}
                    >
                      Temporizador de apagado
                    </p>
                    <p
                      className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
                    >
                      Detiene la música al dormir
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    settings.sleepTimer !== 'off'
                      ? isLight
                        ? 'bg-[#ffd9e2] text-[#b0284b] border-[#ffb2bc]'
                        : 'bg-[#edc157]/15 text-[#edc157] border-[#edc157]/30'
                      : isLight
                      ? 'bg-[#fff0f5] text-[#6b5677] border-[#ffd5e2]'
                      : 'bg-[#2b273d] text-[#dbc0c4] border-white/5'
                  }`}
                >
                  {settings.sleepTimer !== 'off'
                    ? `Apaga en ${settings.sleepTimer}`
                    : 'Desactivado'}
                </span>
              </div>

              {/* Quick Timer Pills */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {(['15m', '30m', '60m', 'off'] as const).map((duration) => {
                  const isActive = settings.sleepTimer === duration;
                  return (
                    <button
                      key={duration}
                      onClick={() => handleSleepTimerChange(duration)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 text-center cursor-pointer border ${
                        isActive
                          ? isLight
                            ? 'bg-[#b0284b] text-white border-transparent shadow-[0_2px_8px_rgba(176,40,75,0.3)]'
                            : 'bg-[#ff85a2] text-[#63082a] border-transparent shadow-[0_0_12px_rgba(255,133,162,0.4)]'
                          : isLight
                          ? 'bg-[#fff0f5] text-[#2e1a38] border-[#ffd5e2] hover:bg-[#ffd9e2]'
                          : 'bg-[#2b273d] text-[#e6defc] border-white/5 hover:bg-[#3b364d]'
                      }`}
                    >
                      {duration === 'off' ? 'Off' : duration}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SUBMENÚ 2: REPRODUCCIÓN (AUDIO & ECUALIZADOR) */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[#ff6584] text-xl">equalizer</span>
            <h2
              className={`font-sora text-base font-bold ${
                isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
              }`}
            >
              Reproducción & Audio
            </h2>
            <span className="text-xs">🎶</span>
          </div>

          {/* ECUALIZADOR GRÁFICO 5 BANDAS */}
          <div
            id="equalizer-container"
            className={`p-4 rounded-2xl border shadow-md flex flex-col gap-3.5 ${
              isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#211d32] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`font-sora text-sm font-bold ${
                    isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                  }`}
                >
                  Ecualizador Gráfico
                </p>
                <p
                  className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#cebdff]'}`}
                >
                  Ajuste de 5 bandas en tiempo real
                </p>
              </div>

              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm ${
                  isLight
                    ? 'bg-[#fff0f5] border-[#ffd5e2] text-[#b0284b]'
                    : 'bg-[#ff85a2]/15 border-[#ff85a2]/30 text-[#ffb1c1]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">graphic_eq</span>
                <span className="text-[10px] font-mono-code font-bold">DSP Hi-Fi</span>
              </div>
            </div>

            {/* Curva de Ecualización SVG Reactiva en Tiempo Real */}
            <div
              className={`w-full h-14 rounded-xl p-2 flex items-center justify-center relative overflow-hidden border ${
                isLight
                  ? 'bg-[#fff0f5] border-[#ffd5e2]'
                  : 'bg-[#0f0b20] border-white/5'
              }`}
            >
              <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 300 60">
                <defs>
                  <linearGradient id="eq-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={isLight ? '#ff6584' : '#ff85a2'} />
                    <stop offset="100%" stopColor={isLight ? '#fff5f8' : '#141025'} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={fillPath} fill="url(#eq-grad)" opacity={isLight ? 0.25 : 0.3} />
                <path
                  d={curvePath}
                  fill="none"
                  stroke={isLight ? '#b0284b' : '#ff85a2'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 6px rgba(255,133,162,0.6))"
                />
              </svg>
            </div>

            {/* 5 Deslizadores de Banda */}
            <div className="grid grid-cols-5 gap-1 pt-1 pb-1">
              {[
                { band: 'band60' as const, label: '60Hz', value: eq.band60 },
                { band: 'band230' as const, label: '230Hz', value: eq.band230 },
                { band: 'band910' as const, label: '910Hz', value: eq.band910 },
                { band: 'band4k' as const, label: '4kHz', value: eq.band4k },
                { band: 'band14k' as const, label: '14kHz', value: eq.band14k },
              ].map((item) => (
                <div key={item.band} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`font-mono-code text-[11px] font-bold ${
                      item.value > 0
                        ? isLight
                          ? 'text-[#b0284b]'
                          : 'text-[#ffb1c1]'
                        : item.value < 0
                        ? isLight
                          ? 'text-[#6b5677]'
                          : 'text-[#dbc0c4]'
                        : isLight
                        ? 'text-[#6b5677]'
                        : 'text-[#cebdff]'
                    }`}
                  >
                    {item.value > 0 ? `+${item.value}` : item.value}dB
                  </span>

                  {/* Vertical Slider Track Container */}
                  <div
                    className={`relative h-28 w-8 flex items-center justify-center rounded-full py-2 border ${
                      isLight ? 'bg-[#fff0f5] border-[#ffd5e2]' : 'bg-[#1d192e] border-white/5'
                    }`}
                  >
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      value={item.value}
                      onChange={(e) => handleEqualizerChange(item.band, Number(e.target.value))}
                      className="w-24 h-4 appearance-none bg-transparent -rotate-90 cursor-pointer accent-[#ff6584]"
                    />
                  </div>

                  <span
                    className={`text-[10px] font-mono-code font-semibold ${
                      isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Presets Kawaii */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span
                className={`text-[10px] font-mono-code uppercase tracking-wider font-bold ${
                  isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'
                }`}
              >
                Presets Kawaii
              </span>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'moe' as const, label: '🌸 Moe Pop' },
                  { id: 'bass' as const, label: '🔊 Bass Boost' },
                  { id: 'vocal' as const, label: '🎤 Vocal DJ' },
                  { id: 'flat' as const, label: '⚖️ Plano' },
                ].map((preset) => {
                  const isActive = eq.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer border ${
                        isActive
                          ? isLight
                            ? 'bg-[#b0284b] text-white border-transparent shadow-sm'
                            : 'bg-[#ff85a2] text-[#63082a] border-transparent shadow-[0_0_12px_rgba(255,133,162,0.4)]'
                          : isLight
                          ? 'bg-[#fff0f5] text-[#2e1a38] border-[#ffd5e2] hover:bg-[#ffd9e2]'
                          : 'bg-[#2b273d] text-[#e6defc] border-white/5 hover:bg-[#3b364d]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ajustes Complementarios de Sonido */}
          <div
            className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3.5 ${
              isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#211d32] border-white/5'
            }`}
          >
            {/* Bass Boost */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isLight
                        ? 'bg-[#fff0f5] border border-[#ffd5e2] text-[#b0284b]'
                        : 'bg-[#ff85a2]/20 text-[#ffb1c1]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">speaker</span>
                  </div>
                  <div>
                    <p
                      className={`font-sora text-sm font-bold ${
                        isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                      }`}
                    >
                      Aumentar los graves
                    </p>
                    <p
                      className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
                    >
                      Refuerzo dinámico Kumamoto Sub
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-mono-code font-bold ${
                    isLight ? 'text-[#b0284b]' : 'text-[#ffb1c1]'
                  }`}
                >
                  +{settings.bassBoostDb} dB
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="12"
                value={settings.bassBoostDb}
                onChange={(e) => handleBassBoostChange(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#ff6584] bg-neutral-700/20"
              />
            </div>

            <div
              className={`h-px w-full opacity-60 ${
                isLight ? 'bg-[#ffd5e2]' : 'bg-[#363248]'
              }`}
            />

            {/* Surround 3D */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 pr-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isLight
                      ? 'bg-[#fff0f5] border border-[#ffd5e2] text-[#6b5677]'
                      : 'bg-[#4c3c7c]/40 text-[#cebdff]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">spatial_audio</span>
                </div>
                <div>
                  <p
                    className={`font-sora text-sm font-bold ${
                      isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                    }`}
                  >
                    Sonido Envolvente (Surround 3D)
                  </p>
                  <p
                    className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
                  >
                    Acústica binaural de estudio
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.surround3D}
                  onChange={(e) => updateSettings({ surround3D: e.target.checked })}
                  className="sr-only peer"
                />
                <div
                  className={`w-12 h-7 rounded-full transition-all peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    isLight
                      ? 'bg-[#eedbff] peer-checked:bg-[#b0284b]'
                      : 'bg-[#363248] peer-checked:bg-[#ff85a2]'
                  }`}
                />
              </label>
            </div>

            <div
              className={`h-px w-full opacity-60 ${
                isLight ? 'bg-[#ffd5e2]' : 'bg-[#363248]'
              }`}
            />

            {/* Normalizar Audio */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 pr-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isLight
                      ? 'bg-[#fff0f5] border border-[#ffd5e2] text-[#6b5677]'
                      : 'bg-[#2b273d] text-[#dbc0c4]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">volume_up</span>
                </div>
                <div>
                  <p
                    className={`font-sora text-sm font-bold ${
                      isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                    }`}
                  >
                    Normalizar Audio
                  </p>
                  <p
                    className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
                  >
                    Mantiene un volumen homogéneo
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.normalizeAudio}
                  onChange={(e) => updateSettings({ normalizeAudio: e.target.checked })}
                  className="sr-only peer"
                />
                <div
                  className={`w-12 h-7 rounded-full transition-all peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    isLight
                      ? 'bg-[#eedbff] peer-checked:bg-[#b0284b]'
                      : 'bg-[#363248] peer-checked:bg-[#ff85a2]'
                  }`}
                />
              </label>
            </div>
          </div>
        </section>

        {/* SUBMENÚ 3: NOTIFICACIONES */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[#ff6584] text-xl">notifications</span>
            <h2
              className={`font-sora text-base font-bold ${
                isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
              }`}
            >
              Notificaciones
            </h2>
            <span className="text-xs">🔔</span>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3.5 ${
              isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#211d32] border-white/5'
            }`}
          >
            {/* Locutores en vivo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 pr-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isLight
                      ? 'bg-[#fff0f5] border border-[#ffd5e2] text-[#b0284b]'
                      : 'bg-[#ff85a2]/20 text-[#ffb1c1]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">record_voice_over</span>
                </div>
                <div>
                  <p
                    className={`font-sora text-sm font-bold ${
                      isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                    }`}
                  >
                    Locutores en vivo (DJ On-Air)
                  </p>
                  <p
                    className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
                  >
                    Alerta al iniciar transmisión con DJ Kuma-chan
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.notifications.djLive}
                  onChange={(e) =>
                    updateSettings({
                      notifications: { ...settings.notifications, djLive: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div
                  className={`w-12 h-7 rounded-full transition-all peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    isLight
                      ? 'bg-[#eedbff] peer-checked:bg-[#b0284b]'
                      : 'bg-[#363248] peer-checked:bg-[#ff85a2]'
                  }`}
                />
              </label>
            </div>

            <div
              className={`h-px w-full opacity-60 ${
                isLight ? 'bg-[#ffd5e2]' : 'bg-[#363248]'
              }`}
            />

            {/* Anuncios y Eventos */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 pr-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isLight
                      ? 'bg-[#fff0f5] border border-[#ffd5e2] text-[#ea7591]'
                      : 'bg-[#cfa53f]/30 text-[#edc157]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">campaign</span>
                </div>
                <div>
                  <p
                    className={`font-sora text-sm font-bold ${
                      isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                    }`}
                  >
                    Anuncios y Eventos
                  </p>
                  <p
                    className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
                  >
                    Integración OneSignal SDK & Firebase Cloud Messaging
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.notifications.announcements}
                  onChange={(e) =>
                    updateSettings({
                      notifications: {
                        ...settings.notifications,
                        announcements: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div
                  className={`w-12 h-7 rounded-full transition-all peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    isLight
                      ? 'bg-[#eedbff] peer-checked:bg-[#b0284b]'
                      : 'bg-[#363248] peer-checked:bg-[#ff85a2]'
                  }`}
                />
              </label>
            </div>

            <div
              className={`h-px w-full opacity-60 ${
                isLight ? 'bg-[#ffd5e2]' : 'bg-[#363248]'
              }`}
            />

            {/* Nuevas canciones agregadas */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 pr-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isLight
                      ? 'bg-[#fff0f5] border border-[#ffd5e2] text-[#6b5677]'
                      : 'bg-[#4c3c7c]/40 text-[#cebdff]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">queue_music</span>
                </div>
                <div>
                  <p
                    className={`font-sora text-sm font-bold ${
                      isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                    }`}
                  >
                    Nuevas canciones agregadas
                  </p>
                  <p
                    className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
                  >
                    Avisar estrenos en rotación anime & j-pop
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.notifications.newTracks}
                  onChange={(e) =>
                    updateSettings({
                      notifications: { ...settings.notifications, newTracks: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div
                  className={`w-12 h-7 rounded-full transition-all peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    isLight
                      ? 'bg-[#eedbff] peer-checked:bg-[#b0284b]'
                      : 'bg-[#363248] peer-checked:bg-[#ff85a2]'
                  }`}
                />
              </label>
            </div>
          </div>
        </section>

        {/* SUBMENÚ 4: PRIVACIDAD Y DATOS */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[#cebdff] text-xl">shield</span>
            <h2
              className={`font-sora text-base font-bold ${
                isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
              }`}
            >
              Privacidad & Datos
            </h2>
          </div>

          <button
            onClick={onOpenPrivacyModal}
            id="btn-privacy-policy"
            className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between transition-all active:scale-[0.98] text-left cursor-pointer ${
              isLight
                ? 'bg-white border-[#ffd5e2] hover:bg-[#fff0f5]'
                : 'bg-[#211d32] border-white/5 hover:bg-[#2b273d]'
            }`}
          >
            <div className="flex items-start gap-3 pr-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 ${
                  isLight
                    ? 'bg-[#fff0f5] border border-[#ffd5e2] text-[#b0284b]'
                    : 'bg-[#363248] text-[#cebdff]'
                }`}
              >
                <span className="material-symbols-outlined text-xl">lock_open</span>
              </div>

              <div>
                <p
                  className={`font-sora text-sm font-bold flex items-center gap-1 ${
                    isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                  }`}
                >
                  Políticas de Privacidad y Uso de Datos
                </p>
                <p
                  className={`text-xs mt-0.5 ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
                >
                  Consulta en línea qué datos técnicos se utilizan para optimizar la transmisión y cómo protegemos tu privacidad.
                </p>
              </div>
            </div>

            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${
                isLight
                  ? 'bg-[#fff0f5] border-[#ffd5e2] text-[#b0284b]'
                  : 'bg-[#2b273d] border-white/5 text-[#ff85a2]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">open_in_new</span>
            </div>
          </button>
        </section>

        {/* SUBMENÚ: TRANSMISIÓN & AZURACAST API CONFIGURATION */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[#ff6584] text-xl">sensors</span>
            <h2
              className={`font-sora text-base font-bold ${
                isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
              }`}
            >
              Transmisión & AzuraCast API
            </h2>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3.5 ${
              isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#211d32] border-white/10'
            }`}
          >
            <p className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}>
              Configuración centralizada del punto de montaje (.mp3) y los metadatos de AzuraCast para Web y Android Nativo:
            </p>

            {/* Archivos de configuración con botón de copiar */}
            <div className="space-y-2">
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  isLight ? 'bg-[#fff5f8] border-[#ffd5e2]' : 'bg-[#1a162b] border-white/5'
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono text-pink-500 font-bold block uppercase">
                    Configuración Web
                  </span>
                  <code className="text-[11px] font-mono font-bold">src/config/radioConfig.ts</code>
                </div>
                <button
                  onClick={() => copyPath('src/config/radioConfig.ts')}
                  className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 text-[11px] font-semibold transition-all"
                >
                  {copiedFile === 'src/config/radioConfig.ts' ? '¡Copiado!' : 'Copiar Ruta'}
                </button>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  isLight ? 'bg-[#fff5f8] border-[#ffd5e2]' : 'bg-[#1a162b] border-white/5'
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block uppercase">
                    Configuración Android Nativo
                  </span>
                  <code className="text-[11px] font-mono font-bold">app/.../RadioConfig.kt</code>
                </div>
                <button
                  onClick={() => copyPath('android/app/src/main/java/stream/kuma/radio/data/RadioConfig.kt')}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[11px] font-semibold transition-all"
                >
                  {copiedFile === 'android/app/src/main/java/stream/kuma/radio/data/RadioConfig.kt' ? '¡Copiado!' : 'Copiar Ruta'}
                </button>
              </div>
            </div>

            {/* Valores Actuales */}
            <div className="space-y-1.5 pt-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono uppercase text-slate-400">Stream (.mp3 mount):</span>
                <span className="text-xs font-mono font-bold text-pink-400 break-all p-1.5 rounded-lg bg-black/20">
                  {RADIO_CONFIG.DEFAULT_STREAM_URL}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono uppercase text-slate-400">Endpoint AzuraCast NowPlaying:</span>
                <span className="text-xs font-mono font-bold text-indigo-300 break-all p-1.5 rounded-lg bg-black/20">
                  {azuracastService.getEndpointUrl()}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs">Autorización API Key:</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    RADIO_CONFIG.AZURACAST_API_KEY
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {RADIO_CONFIG.AZURACAST_API_KEY ? '✓ Configurada' : 'Pública (Sin Key)'}
                </span>
              </div>
            </div>

            {/* Botón de Test de AzuraCast */}
            <button
              onClick={handleTestAzuraCast}
              disabled={isTestingConnection}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                {isTestingConnection ? 'sync' : 'network_check'}
              </span>
              <span>{isTestingConnection ? 'Conectando a AzuraCast...' : 'Probar Conexión AzuraCast en Vivo'}</span>
            </button>

            {connectionResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border animate-in fade-in ${
                  connectionResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {connectionResult.message}
              </div>
            )}
          </div>
        </section>

        {/* SUBMENÚ: AUTENTICACIÓN & SSO (DISCORD BOT, GOOGLE, X, CABINA DJ) */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[#ff6584] text-xl">admin_panel_settings</span>
            <h2
              className={`font-sora text-base font-bold ${
                isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
              }`}
            >
              Autenticación & SSO (Discord, Google, X, DJ)
            </h2>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3.5 ${
              isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#211d32] border-white/10'
            }`}
          >
            <p className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}>
              Endpoints OAuth2 para el Bot de Discord, proveedores SSO y clave de seguridad enmascarada para la Cabina del DJ:
            </p>

            {/* Archivo de configuración authConfig.ts */}
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                isLight ? 'bg-[#fff5f8] border-[#ffd5e2]' : 'bg-[#1a162b] border-white/5'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono text-pink-500 font-bold block uppercase">
                  Archivo Central de Credenciales
                </span>
                <code className="text-[11px] font-mono font-bold">src/config/authConfig.ts</code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('src/config/authConfig.ts');
                  setCopiedAuth('auth-path');
                  setTimeout(() => setCopiedAuth(null), 2500);
                }}
                className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 text-[11px] font-semibold transition-all"
              >
                {copiedAuth === 'auth-path' ? '¡Copiado!' : 'Copiar Ruta'}
              </button>
            </div>

            {/* OAuth Callback URL Oficial */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  Redirect URI Oficial (OAuth2 Callback):
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getOAuthCallbackUrl());
                    setCopiedAuth('callback-url');
                    setTimeout(() => setCopiedAuth(null), 2500);
                  }}
                  className="text-[10px] font-mono text-indigo-400 hover:underline"
                >
                  {copiedAuth === 'callback-url' ? '¡Copiado al portapapeles!' : 'Copiar URL'}
                </button>
              </div>
              <div className="p-2 rounded-lg bg-black/30 border border-white/5 text-xs font-mono text-indigo-300 break-all select-all">
                {getOAuthCallbackUrl()}
              </div>
              <p className="text-[10px] text-slate-400">
                Pega esta URI en la consola de Discord Developer Portal, Google Cloud Console y X Developer Portal.
              </p>
            </div>

            {/* Proveedores Configurados */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              {/* Discord Bot OAuth2 */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5865F2] flex items-center gap-1.5">
                    <span>🤖</span>
                    <span>Discord Bot OAuth2</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] font-bold">
                    identify email
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Client ID:</span>
                  <code className="font-mono text-slate-300 font-bold">{AUTH_CONFIG.DISCORD.CLIENT_ID}</code>
                </div>
              </div>

              {/* Google SSO */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>🌐</span>
                    <span>Google Identity SSO</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    openid profile email
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Client ID:</span>
                  <code className="font-mono text-slate-300 font-bold truncate max-w-[200px]">
                    {AUTH_CONFIG.GOOGLE.CLIENT_ID}
                  </code>
                </div>
              </div>

              {/* X (Twitter) SSO */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>𝕏</span>
                    <span>X (Twitter) OAuth 2.0</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-bold">
                    users.read tweet.read
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Client ID:</span>
                  <code className="font-mono text-slate-300 font-bold">{AUTH_CONFIG.X.CLIENT_ID}</code>
                </div>
              </div>

              {/* Cabina DJ (Enmascarada) */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>Clave Secreta de Cabina DJ</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Protegida
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Passkey de Acceso:</span>
                  <code className="font-mono text-amber-300 font-bold">{AUTH_CONFIG.DJ.ACCESS_KEY}</code>
                </div>
                <p className="text-[10px] text-slate-400">
                  La cabina está enmascarada para los oyentes comunes y requiere esta clave para activarse.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SUBMENÚ 5: ACERCA DE */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[#cebdff] text-xl">info</span>
            <h2
              className={`font-sora text-base font-bold ${
                isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
              }`}
            >
              Acerca de
            </h2>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3.5 ${
              isLight ? 'bg-white border-[#ffd5e2]' : 'bg-[#211d32] border-white/5'
            }`}
          >
            {/* Identidad App */}
            <div className="flex items-center gap-3.5">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden flex-shrink-0 border ${
                  isLight
                    ? 'bg-[#fff0f5] border-[#ffd5e2]'
                    : 'bg-[#0f0b20] border-white/5'
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-tr ${
                    isLight
                      ? 'from-[#ffd9e2] via-transparent to-[#e9def6]'
                      : 'from-[#ff85a2]/20 via-transparent to-[#cebdff]/20'
                  }`}
                />
                <span className="text-3xl relative z-10">🐻🎧</span>
              </div>

              <div className="flex flex-col">
                <span
                  className={`font-sora text-base font-bold ${
                    isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                  }`}
                >
                  Kuma Kuma Radio
                </span>
                <span
                  className={`text-xs font-mono-code font-bold ${
                    isLight ? 'text-[#b0284b]' : 'text-[#cebdff]'
                  }`}
                >
                  v2.4.1 (Build 142)
                </span>
                <span
                  className={`text-xs font-semibold mt-0.5 ${
                    isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'
                  }`}
                >
                  Hecho con amor en Kumamoto, Japón 🌸
                </span>
              </div>
            </div>

            <div
              className={`h-px w-full opacity-60 ${
                isLight ? 'bg-[#ffd5e2]' : 'bg-[#363248]'
              }`}
            />

            {/* Secondary Links */}
            <div className="flex flex-col gap-1">
              <button
                onClick={onOpenPrivacyModal}
                className={`flex items-center justify-between py-2 px-1 rounded-lg transition-colors cursor-pointer text-left ${
                  isLight
                    ? 'hover:bg-[#fff0f5] text-[#2e1a38]'
                    : 'hover:bg-[#2b273d] text-[#e6defc]'
                }`}
              >
                <span className="text-xs font-bold">Términos y Condiciones del Servicio</span>
                <span className="material-symbols-outlined text-base opacity-60">chevron_right</span>
              </button>

              <button
                onClick={onOpenPrivacyModal}
                className={`flex items-center justify-between py-2 px-1 rounded-lg transition-colors cursor-pointer text-left ${
                  isLight
                    ? 'hover:bg-[#fff0f5] text-[#2e1a38]'
                    : 'hover:bg-[#2b273d] text-[#e6defc]'
                }`}
              >
                <span className="text-xs font-bold">Créditos de Desarrollo y Licencias FLOSS</span>
                <span className="material-symbols-outlined text-base opacity-60">chevron_right</span>
              </button>
            </div>

            {/* Support Action */}
            <button
              onClick={onOpenContactModal}
              id="btn-contact-kuma"
              className={`w-full py-3 rounded-full font-sora text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer border ${
                isLight
                  ? 'bg-[#fff0f5] border-2 border-[#ffb2bc] text-[#b0284b] hover:bg-[#ffd9e2]'
                  : 'bg-[#2b273d] hover:bg-[#3b364d] text-[#ffb1c1] border-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">volunteer_activism</span>
              <span>Contactar al Equipo Kuma</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
