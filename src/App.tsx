import React, { useState, useEffect } from 'react';
import { ActiveTab, AppSettings, Station, ThemeMode } from './types';
import { STATIONS, EQ_PRESETS } from './data/mockData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LivePlayerScreen } from './components/LivePlayerScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { CommunityScreen } from './components/CommunityScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { StationSelectorModal, CastModal, InfoModal } from './components/Modals';
import { AndroidCodeExplorer } from './components/AndroidCodeExplorer';
import { Smartphone, Code2 } from 'lucide-react';
import { azuracastService } from './services/azuracastService';

export default function App() {
  const [station, setStation] = useState<Station>(STATIONS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('en-vivo');
  const [viewMode, setViewMode] = useState<'simulator' | 'code'>('simulator');
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Sincronizar automáticamente con AzuraCast NowPlaying en tiempo real
  useEffect(() => {
    azuracastService.startPolling(station.azuracastStationId, 15000);

    const unsubscribe = azuracastService.subscribe((data) => {
      setStation((prev) => {
        const isLive = data.live?.is_live === true;
        const streamer = data.live?.streamer_name;
        const hasValidSong = Boolean(
          data.now_playing?.song?.title?.trim() ||
          data.now_playing?.song?.text?.trim()
        );
        const updatedTrack = hasValidSong
          ? azuracastService.toTrackModel(data)
          : prev.currentTrack;

        return {
          ...prev,
          currentTrack: {
            ...updatedTrack,
            votes: prev.currentTrack.votes,
            hasLiked: prev.currentTrack.hasLiked,
          },
          dj: {
            ...prev.dj,
            name: isLive && streamer ? streamer : 'Kuma DJ',
            title: isLive && streamer ? `🔴 ${data.station?.name || 'Programa'} con ${streamer}` : '🌸 Kuma Show con Kuma DJ',
            showName: data.station?.name || 'Kuma Show',
            isLiveStreamer: isLive && Boolean(streamer),
            listeners: data.listeners?.total ?? prev.dj.listeners,
          },
          streamStats: {
            ...prev.streamStats,
            tracksToday: data.song_history ? data.song_history.length : prev.streamStats.tracksToday,
          },
        };
      });
    });

    return () => {
      unsubscribe();
      azuracastService.stopPolling();
    };
  }, [station.azuracastStationId]);

  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark', // 'dark' = Pastel Night, 'light' = Sakura Day
    restrictSchedule: true,
    scheduleStart: '08:00',
    scheduleEnd: '22:00',
    activeDays: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    sleepTimer: 'off',
    equalizer: EQ_PRESETS.moe,
    bassBoostDb: 6,
    surround3D: true,
    normalizeAudio: true,
    notifications: {
      djLive: true,
      announcements: true,
      newTracks: false,
    },
  });

  const updateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }));
  };

  const theme = settings.theme;
  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen w-full relative transition-colors duration-300 select-none ${
        isLight
          ? 'bg-[#fff5f8] text-[#24112e]'
          : 'bg-[#141025] text-[#e6defc]'
      }`}
    >
      {/* View Mode Switcher Banner */}
      <div className="w-full bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-emerald-400 font-mono font-semibold">Android Nativo (Kotlin / Media3)</span>
          <span className="text-slate-400 hidden sm:inline">• Sin Capacitor</span>
        </div>

        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setViewMode('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              viewMode === 'simulator'
                ? 'bg-pink-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Simulador Android</span>
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              viewMode === 'code'
                ? 'bg-emerald-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Código Nativo (/android)</span>
          </button>
        </div>
      </div>

      {viewMode === 'code' ? (
        <div className="py-6">
          <AndroidCodeExplorer />
        </div>
      ) : (
        <>
          {/* Fixed Top Header */}
          <Header
            station={station}
            theme={theme}
            onOpenStationSelector={() => setIsStationModalOpen(true)}
            onOpenSettings={() => setActiveTab('ajustes')}
          />

          {/* Main View Router */}
          <main className="w-full">
            {activeTab === 'en-vivo' && (
              <LivePlayerScreen
                station={station}
                theme={theme}
                onOpenCastModal={() => setIsCastModalOpen(true)}
                onOpenSleepTimerModal={() => setActiveTab('ajustes')}
                sleepTimer={settings.sleepTimer}
              />
            )}

            {activeTab === 'historial' && (
              <HistoryScreen
                theme={theme}
                station={station}
                onSelectTrack={(t) => {
                  setStation((prev) => ({ ...prev, currentTrack: t }));
                  setActiveTab('en-vivo');
                }}
              />
            )}

            {activeTab === 'comunidad' && (
              <CommunityScreen theme={theme} station={station} />
            )}

            {activeTab === 'ajustes' && (
              <SettingsScreen
                settings={settings}
                updateSettings={updateSettings}
                onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
                onOpenContactModal={() => setIsContactModalOpen(true)}
              />
            )}
          </main>

          {/* Fixed Bottom Navigation */}
          <BottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            theme={theme}
          />
        </>
      )}

      {/* Station Selector Modal */}
      <StationSelectorModal
        isOpen={isStationModalOpen}
        onClose={() => setIsStationModalOpen(false)}
        currentStation={station}
        onSelectStation={(st) => setStation(st)}
        theme={theme}
      />

      {/* Cast Modal */}
      <CastModal
        isOpen={isCastModalOpen}
        onClose={() => setIsCastModalOpen(false)}
        theme={theme}
      />

      {/* Privacy Policy Modal */}
      <InfoModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="Políticas de Privacidad y Uso de Datos"
        theme={theme}
      >
        <p>
          En <strong>Kuma Kuma Radio</strong> nos comprometemos a garantizar la protección y privacidad de todos nuestros oyentes en Japón y el mundo.
        </p>
        <p>
          <strong>Transmisión de Audio:</strong> La señal en vivo se transmite a través del protocolo HTTP Live Streaming (HLS) y feeds AzuraCast con compresión AAC 320 kbps. No recopilamos datos personales sensibles ni identificadores biométricos.
        </p>
        <p>
          <strong>Configuraciones Locales:</strong> Tus preferencias de ecualización, volumen y temporizador se almacenan exclusivamente en tu dispositivo de forma segura.
        </p>
      </InfoModal>

      {/* Contact Team Kuma Modal */}
      <InfoModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="🌸 Contactar al Equipo Kuma"
        theme={theme}
      >
        <p>
          ¿Tienes sugerencias musicales, saludos para DJ Kuma-chan o deseas reportar alguna interrupción de la señal?
        </p>
        <div className="p-3 rounded-2xl bg-neutral-500/10 flex flex-col gap-1 text-xs">
          <span>📧 <strong>Email de cabina:</strong> radio@kumakuma.fm</span>
          <span>📍 <strong>Estudios:</strong> Kumamoto-shi, Chuo-ku, Japón</span>
          <span>💬 <strong>Discord Oficial:</strong> #musica-kumamoto</span>
        </div>
        <p className="mt-1">
          ¡Agradecemos tu sintonía y apoyo a nuestra estación independiente de anime & J-Pop! 🐻✨
        </p>
      </InfoModal>
    </div>
  );
}
