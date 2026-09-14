import React from 'react';
import { Station, ThemeMode } from '../types';

interface HeaderProps {
  station: Station;
  theme: ThemeMode;
  onOpenStationSelector: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  station,
  theme,
  onOpenStationSelector,
  onOpenSettings,
}) => {
  const isLight = theme === 'light';

  return (
    <header
      id="app-header"
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 backdrop-blur-xl border-b pt-safe ${
        isLight
          ? 'bg-[#fff5f8]/90 border-[#ffd5e2]/80 shadow-[0_4px_20px_rgba(255,182,193,0.25)] text-[#24112e]'
          : 'bg-[#141025]/85 border-white/5 shadow-[0_4px_24px_rgba(20,16,37,0.7)] text-[#e6defc]'
      }`}
    >
      <div className="h-16 px-4 max-w-md mx-auto flex items-center justify-between gap-2.5">
        {/* Logo and Station Title */}
        <button
          onClick={onOpenStationSelector}
          id="header-station-btn"
          className="flex items-center gap-2.5 min-w-0 text-left group cursor-pointer"
          title="Cambiar emisora"
        >
          <div className="relative flex-shrink-0">
            <img
              src={station.logo}
              alt={`${station.name} Mascot`}
              className={`h-10 w-10 rounded-full object-cover ring-2 transition-transform group-hover:scale-105 ${
                isLight
                  ? 'ring-[#ff6584]/50 shadow-[0_0_12px_rgba(255,101,132,0.3)]'
                  : 'ring-[#ff85a2]/50 shadow-[0_0_14px_rgba(255,133,162,0.4)]'
              }`}
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#10b981] ring-2 ring-white" />
          </div>

          <div className="flex flex-col truncate">
            <span
              className={`font-sora text-[15px] font-bold tracking-tight truncate leading-tight flex items-center gap-1 ${
                isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
              }`}
            >
              {station.name}
            </span>
            <span
              className={`text-[11px] font-semibold tracking-wider uppercase opacity-90 truncate ${
                isLight ? 'text-[#b0284b]' : 'text-[#cebdff]'
              }`}
            >
              {station.subName}
            </span>
          </div>
        </button>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Live Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-wide shadow-sm select-none ${
              isLight
                ? 'bg-[#ff6584] text-white border-transparent shadow-[0_0_12px_rgba(255,101,132,0.3)]'
                : 'bg-[#ff85a2]/20 border-[#ff85a2]/40 text-[#ffb1c1] shadow-[0_0_12px_rgba(255,133,162,0.25)]'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <span>EN VIVO 🌸</span>
          </div>

          {/* Host Avatar / Settings Button */}
          <button
            onClick={onOpenSettings}
            id="header-profile-btn"
            className="relative flex items-center justify-center p-0.5 cursor-pointer group"
            title="Ir a Ajustes"
          >
            <img
              src={station.dj.avatar}
              alt={station.dj.name}
              className={`w-9 h-9 rounded-full object-cover ring-2 transition-transform group-hover:scale-105 ${
                isLight ? 'ring-[#ff85a2] shadow-sm' : 'ring-[#cebdff]/50 shadow-md'
              }`}
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ${
                isLight ? 'bg-[#ff6584] ring-[#fff5f8]' : 'bg-[#edc157] ring-[#211d32]'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
