import React from 'react';
import { ActiveTab, ThemeMode } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  theme: ThemeMode;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  theme,
}) => {
  const isLight = theme === 'light';

  const tabs: Array<{ id: ActiveTab; label: string; icon: string }> = [
    { id: 'en-vivo', label: 'En Vivo', icon: 'radio' },
    { id: 'historial', label: 'Historial', icon: 'history' },
    { id: 'comunidad', label: 'Comunidad', icon: 'forum' },
    { id: 'ajustes', label: 'Ajustes', icon: 'tune' },
  ];

  return (
    <nav
      id="bottom-navigation"
      className={`fixed bottom-0 inset-x-0 z-50 pb-safe backdrop-blur-xl border-t transition-colors duration-300 ${
        isLight
          ? 'bg-[#fff5f8]/95 border-[#ffd5e2]/80 shadow-[0_-8px_30px_rgba(255,182,193,0.25)]'
          : 'bg-[#141025]/90 border-white/5 shadow-[0_-8px_32px_rgba(20,16,37,0.8)]'
      }`}
    >
      <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-all duration-200 cursor-pointer group ${
                isActive
                  ? isLight
                    ? 'text-[#b0284b] font-bold'
                    : 'text-[#ffb1c1] font-bold drop-shadow-[0_0_10px_rgba(255,133,162,0.6)]'
                  : isLight
                  ? 'text-[#7d6e87] hover:text-[#b0284b]'
                  : 'text-[#dbc0c4]/70 hover:text-[#ffb1c1]'
              }`}
            >
              <div
                className={`flex items-center justify-center p-1 rounded-full transition-transform ${
                  isActive
                    ? isLight
                      ? 'bg-[#ffd9e2] scale-110 shadow-sm'
                      : 'bg-[#ff85a2]/20 scale-110'
                    : 'group-hover:scale-105'
                }`}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {tab.icon}
                </span>
              </div>
              <span className="text-[11px] font-semibold tracking-wide mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
