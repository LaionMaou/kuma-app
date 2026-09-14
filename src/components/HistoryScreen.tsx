import React, { useState } from 'react';
import { Track, ThemeMode } from '../types';
import { TRACK_HISTORY } from '../data/mockData';

interface HistoryScreenProps {
  theme: ThemeMode;
  onSelectTrack?: (track: Track) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ theme }) => {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todos');
  const [tracks, setTracks] = useState<Track[]>(TRACK_HISTORY);

  const filters = ['Todos', 'Anime OST', 'Future Funk', 'Kawaii Bass', 'Lo-Fi Chill'];

  const filteredTracks = tracks.filter((track) => {
    const matchesSearch =
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedFilter === 'Todos' || track.genre.toLowerCase().includes(selectedFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const handleToggleLike = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextLiked = !t.hasLiked;
          return {
            ...t,
            hasLiked: nextLiked,
            votes: nextLiked ? t.votes + 1 : t.votes - 1,
          };
        }
        return t;
      })
    );
  };

  return (
    <div className="flex flex-col relative w-full pt-16 pb-28 min-h-screen">
      <div className="flex flex-col w-full max-w-md mx-auto px-4 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isLight ? 'bg-[#ffd9e2] text-[#b0284b]' : 'bg-[#ff85a2]/20 text-[#ffb1c1]'
              }`}
            >
              <span className="material-symbols-outlined text-xl">history</span>
            </div>
            <div>
              <h1
                className={`font-sora text-lg font-bold ${
                  isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                }`}
              >
                Historial de Emisión
              </h1>
              <p
                className={`text-xs ${isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'}`}
              >
                Últimas canciones transmitidas
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-mono-code font-bold px-2.5 py-1 rounded-full border ${
              isLight
                ? 'bg-white border-[#ffd5e2] text-[#b0284b]'
                : 'bg-[#211d32] border-white/5 text-[#cebdff]'
            }`}
          >
            {tracks.length} temas
          </span>
        </div>

        {/* Search Bar */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
            isLight
              ? 'bg-white border-[#ffd5e2] text-[#2e1a38]'
              : 'bg-[#211d32] border-white/10 text-[#e6defc]'
          }`}
        >
          <span className="material-symbols-outlined text-base opacity-50">search</span>
          <input
            type="text"
            placeholder="Buscar canción o artista..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs opacity-60">
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedFilter === f
                  ? isLight
                    ? 'bg-[#b0284b] text-white border-transparent shadow-sm'
                    : 'bg-[#ff85a2] text-[#63082a] border-transparent'
                  : isLight
                  ? 'bg-white text-[#6b5677] border-[#ffd5e2]'
                  : 'bg-[#211d32] text-[#dbc0c4] border-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Track List */}
        <div className="flex flex-col gap-2.5">
          {filteredTracks.map((track, idx) => (
            <div
              key={track.id}
              className={`p-3 rounded-2xl border shadow-sm flex items-center justify-between gap-3 transition-colors ${
                idx === 0
                  ? isLight
                    ? 'bg-[#fff0f5] border-[#ffb2bc]'
                    : 'bg-[#2b273d] border-[#ff85a2]/30'
                  : isLight
                  ? 'bg-white border-[#ffd5e2]'
                  : 'bg-[#1d192e] border-white/5'
              }`}
            >
              {/* Cover & Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-white/10">
                  <img
                    src={track.albumArt}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-[#ff6584] text-white text-[9px] font-bold text-center py-0.5">
                      LIVE
                    </span>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isLight
                          ? 'bg-[#ffd9e2] text-[#b0284b]'
                          : 'bg-[#ff85a2]/20 text-[#ffb1c1]'
                      }`}
                    >
                      {track.genre}
                    </span>
                    <span
                      className={`text-[10px] font-mono-code ${
                        isLight ? 'text-[#8b5a7a]' : 'text-[#dbc0c4]/70'
                      }`}
                    >
                      {track.playedAt}
                    </span>
                  </div>

                  <h3
                    className={`font-sora text-sm font-bold truncate leading-snug ${
                      isLight ? 'text-[#2e1a38]' : 'text-[#e6defc]'
                    }`}
                  >
                    {track.title}
                  </h3>

                  <p
                    className={`text-xs truncate ${
                      isLight ? 'text-[#6b5677]' : 'text-[#dbc0c4]'
                    }`}
                  >
                    {track.artist}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleLike(track.id)}
                  className={`flex flex-col items-center justify-center w-9 h-9 rounded-full transition-transform active:scale-110 cursor-pointer ${
                    track.hasLiked
                      ? isLight
                        ? 'text-[#b0284b]'
                        : 'text-[#ff85a2]'
                      : isLight
                      ? 'text-[#a38b8e] hover:text-[#b0284b]'
                      : 'text-[#dbc0c4]/60 hover:text-[#ff85a2]'
                  }`}
                  title="Votar"
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    style={track.hasLiked ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    favorite
                  </span>
                  <span className="text-[9px] font-bold mt-0.5 font-mono-code">
                    {track.votes}
                  </span>
                </button>
              </div>
            </div>
          ))}

          {filteredTracks.length === 0 && (
            <div className="text-center py-10 opacity-60 text-xs">
              No se encontraron canciones para tu búsqueda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
