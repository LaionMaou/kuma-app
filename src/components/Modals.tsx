import React, { useState } from 'react';
import { Station, ThemeMode } from '../types';
import { STATIONS } from '../data/mockData';

interface StationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStation: Station;
  onSelectStation: (station: Station) => void;
  theme: ThemeMode;
}

export const StationSelectorModal: React.FC<StationSelectorModalProps> = ({
  isOpen,
  onClose,
  currentStation,
  onSelectStation,
  theme,
}) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl flex flex-col gap-4 ${
          isLight ? 'bg-white border-[#ffd5e2] text-[#24112e]' : 'bg-[#1d192e] border-white/10 text-[#e6defc]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ff6584]">radio</span>
            <h3 className="font-sora text-base font-bold">Seleccionar Emisora</h3>
          </div>
          <button onClick={onClose} className="text-xl opacity-60 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>

        <p className="text-xs opacity-75">
          Elige la sintonía en vivo que deseas escuchar:
        </p>

        <div className="flex flex-col gap-2.5">
          {STATIONS.map((st) => {
            const isSelected = st.id === currentStation.id;
            return (
              <button
                key={st.id}
                onClick={() => {
                  onSelectStation(st);
                  onClose();
                }}
                className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-[#fff0f5] border-2 border-[#b0284b] shadow-sm'
                      : 'bg-[#2b273d] border-2 border-[#ff85a2] shadow-[0_0_14px_rgba(255,133,162,0.3)]'
                    : isLight
                    ? 'bg-[#fff5f8] border-[#ffd5e2] hover:bg-[#ffeef2]'
                    : 'bg-[#141025] border-white/5 hover:bg-[#211d32]'
                }`}
              >
                <img
                  src={st.logo}
                  alt={st.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-[#ff6584]/40"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-sora text-sm font-bold truncate">{st.name}</span>
                  <span className="text-[11px] opacity-75 truncate">{st.subName}</span>
                  <span className="text-[10px] text-[#ff6584] font-semibold mt-0.5">{st.genre}</span>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-[#ff6584] text-xl">
                    check_circle
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface CastModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
}

export const CastModal: React.FC<CastModalProps> = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const devices = [
    { id: '1', name: 'Google Nest Hub (Sala de estar)', type: 'cast' },
    { id: '2', name: 'Smart TV Kumamoto (Apple AirPlay)', type: 'tv' },
    { id: '3', name: 'Bocinas Bluetooth Kuma Hi-Fi', type: 'speaker' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl flex flex-col gap-4 ${
          isLight ? 'bg-white border-[#ffd5e2] text-[#24112e]' : 'bg-[#1d192e] border-white/10 text-[#e6defc]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ff6584]">cast</span>
            <h3 className="font-sora text-base font-bold">Transmitir Audio (Cast)</h3>
          </div>
          <button onClick={onClose} className="text-xl opacity-60 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>

        <p className="text-xs opacity-75">
          Selecciona un dispositivo para reproducir la radio en alta fidelidad:
        </p>

        <div className="flex flex-col gap-2">
          {devices.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDevice(d.id)}
              className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                selectedDevice === d.id
                  ? isLight
                    ? 'bg-[#fff0f5] border-2 border-[#b0284b]'
                    : 'bg-[#2b273d] border-2 border-[#ff85a2]'
                  : isLight
                  ? 'bg-[#fff5f8] border-[#ffd5e2]'
                  : 'bg-[#141025] border-white/5'
              }`}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 text-[#ff6584]">
                <span className="material-symbols-outlined text-lg">speaker_group</span>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-bold truncate">{d.name}</span>
                <span className="text-[10px] opacity-60">Listo para conectar</span>
              </div>
              {selectedDevice === d.id && (
                <span className="material-symbols-outlined text-[#ff6584] text-lg">
                  check_circle
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className={`w-full py-2.5 rounded-full font-sora text-xs font-bold transition-all cursor-pointer ${
            isLight ? 'bg-[#b0284b] text-white' : 'bg-[#ff85a2] text-[#63082a]'
          }`}
        >
          {selectedDevice ? 'Conectar Dispositivo' : 'Cerrar'}
        </button>
      </div>
    </div>
  );
};

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  theme: ThemeMode;
  children: React.ReactNode;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  title,
  theme,
  children,
}) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto ${
          isLight ? 'bg-white border-[#ffd5e2] text-[#24112e]' : 'bg-[#1d192e] border-white/10 text-[#e6defc]'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-sora text-base font-bold">{title}</h3>
          <button onClick={onClose} className="text-xl opacity-60 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>

        <div className="text-xs leading-relaxed opacity-85 flex flex-col gap-2.5">
          {children}
        </div>

        <button
          onClick={onClose}
          className={`w-full py-2.5 rounded-full font-sora text-xs font-bold transition-all cursor-pointer mt-2 ${
            isLight ? 'bg-[#b0284b] text-white' : 'bg-[#ff85a2] text-[#63082a]'
          }`}
        >
          Entendido
        </button>
      </div>
    </div>
  );
};
