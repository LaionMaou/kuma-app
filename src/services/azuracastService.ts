import { RADIO_CONFIG } from '../config/radioConfig';
import { Track } from '../types';

export interface AzuraSongData {
  id?: string;
  text?: string;
  artist?: string;
  title?: string;
  album?: string;
  genre?: string;
  art?: string;
  lyrics?: string;
}

export interface AzuraHistoryItemData {
  sh_id?: number | string;
  played_at?: number;
  duration?: number;
  playlist?: string;
  streamer?: string;
  is_request?: boolean;
  song?: AzuraSongData;
}

export interface AzuraCastNowPlayingResponse {
  station: {
    id: number | string;
    name: string;
    shortcode?: string;
    description?: string;
    listen_url?: string;
    public_player_url?: string;
  };
  now_playing: {
    elapsed?: number;
    remaining?: number;
    duration?: number;
    playlist?: string;
    streamer?: string;
    is_request?: boolean;
    song: AzuraSongData;
  };
  live?: {
    is_live: boolean;
    streamer_name?: string;
    broadcast_start?: number;
  };
  listeners?: {
    total: number;
    unique: number;
    current: number;
  };
  song_history?: AzuraHistoryItemData[];
}

/**
 * Normaliza y extrae de forma inteligente el título y artista de AzuraCast
 * contemplando estaciones que envían solo `text` (ej. "Artista - Título")
 */
export function parseAzuraSong(rawSong?: AzuraSongData | null): {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  art: string;
} {
  if (!rawSong) {
    return {
      id: `azura-${Date.now()}`,
      title: 'Música en Vivo',
      artist: 'Kuma Radio',
      album: '',
      genre: 'Anime & J-Pop',
      art: '',
    };
  }

  let title = (rawSong.title || '').trim();
  let artist = (rawSong.artist || '').trim();
  const text = (rawSong.text || '').trim();

  // Si title o artist están vacíos pero text existe ("Artista - Canción")
  if ((!title || !artist) && text) {
    if (text.includes(' - ')) {
      const parts = text.split(' - ');
      if (!artist && parts[0]) artist = parts[0].trim();
      if (!title && parts.slice(1).join(' - ')) title = parts.slice(1).join(' - ').trim();
    } else {
      if (!title) title = text;
      if (!artist) artist = 'Kuma Radio';
    }
  }

  if (!title) title = text || 'Música en Vivo';
  if (!artist) artist = 'Kuma Radio';

  return {
    id: rawSong.id || `azura-${Date.now()}`,
    title,
    artist,
    album: (rawSong.album || '').trim(),
    genre: (rawSong.genre || '').trim() || 'Anime Live',
    art: (rawSong.art || '').trim(),
  };
}

/**
 * Resuelve URLs de carátulas que vengan como rutas relativas en AzuraCast (ej. /api/station/3/art/...)
 */
export function resolveAzuraArtUrl(art?: string, customBaseUrl?: string): string {
  if (!art || !art.trim()) {
    return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';
  }
  const cleanArt = art.trim();
  if (cleanArt.startsWith('http://') || cleanArt.startsWith('https://')) {
    return cleanArt;
  }
  const base = (customBaseUrl || RADIO_CONFIG.AZURACAST_BASE_URL || '').replace(/\/+$/, '');
  return `${base}/${cleanArt.replace(/^\/+/, '')}`;
}

class AzuraCastService {
  private timer: number | null = null;
  private listeners: Array<(data: AzuraCastNowPlayingResponse) => void> = [];
  private lastData: AzuraCastNowPlayingResponse | null = null;

  /**
   * Obtiene la URL completa del endpoint de NowPlaying directo en AzuraCast
   */
  public getEndpointUrl(stationId?: string): string {
    const rawBase = RADIO_CONFIG.AZURACAST_BASE_URL.trim().replace(/\/+$/, '');
    const id = stationId || RADIO_CONFIG.AZURACAST_DEFAULT_STATION_ID || '1';

    if (rawBase.includes('/api/nowplaying')) {
      return rawBase;
    }
    return `${rawBase}/api/nowplaying/${id}`;
  }

  /**
   * Consulta AzuraCast:
   * 1º Prioridad: A través del proxy interno /api/azuracast/nowplaying (sin problemas de CORS ni Mixed Content)
   * 2º Prioridad: Petición directa a la URL configurada en RADIO_CONFIG.AZURACAST_BASE_URL
   */
  public async fetchNowPlaying(stationId?: string): Promise<AzuraCastNowPlayingResponse> {
    const id = stationId || RADIO_CONFIG.AZURACAST_DEFAULT_STATION_ID || '1';
    let rawJson: any = null;

    // Intento 1: Proxy interno del backend (resuelve CORS y HTTP/HTTPS)
    try {
      const proxyUrl = `/api/azuracast/nowplaying/${encodeURIComponent(id)}?base_url=${encodeURIComponent(RADIO_CONFIG.AZURACAST_BASE_URL)}&api_key=${encodeURIComponent(RADIO_CONFIG.AZURACAST_API_KEY || '')}`;
      const proxyRes = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });
      if (proxyRes.ok) {
        rawJson = await proxyRes.json();
      }
    } catch {
      // Fallback silencioso a petición directa
    }

    // Intento 2: Petición directa al servidor de AzuraCast
    if (!rawJson) {
      const directUrl = this.getEndpointUrl(id);
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (RADIO_CONFIG.AZURACAST_API_KEY && RADIO_CONFIG.AZURACAST_API_KEY.trim() !== '') {
        headers['X-API-Key'] = RADIO_CONFIG.AZURACAST_API_KEY.trim();
        headers['Authorization'] = `Bearer ${RADIO_CONFIG.AZURACAST_API_KEY.trim()}`;
      }

      const response = await fetch(directUrl, { method: 'GET', headers });
      if (!response.ok) {
        throw new Error(`Error en AzuraCast (${response.status}): ${response.statusText}`);
      }
      rawJson = await response.json();
    }

    // Normalización: AzuraCast puede devolver un Array con todas las estaciones o un Objeto único
    let matchedStation: any = null;
    if (Array.isArray(rawJson)) {
      const searchTarget = String(id).toLowerCase();
      matchedStation = rawJson.find((item: any) =>
        String(item.station?.id).toLowerCase() === searchTarget ||
        String(item.station?.shortcode).toLowerCase() === searchTarget
      ) || rawJson[0];
    } else if (rawJson && typeof rawJson === 'object') {
      matchedStation = rawJson;
    }

    if (!matchedStation || !matchedStation.station) {
      throw new Error('Respuesta inválida de AzuraCast: falta estructura de estación');
    }

    // Asegurar estructura de now_playing y song
    if (!matchedStation.now_playing) {
      matchedStation.now_playing = { song: {} };
    }
    if (!matchedStation.now_playing.song) {
      matchedStation.now_playing.song = {};
    }

    // Asegurar estructura de song_history
    if (!Array.isArray(matchedStation.song_history)) {
      matchedStation.song_history = [];
    }

    const data: AzuraCastNowPlayingResponse = matchedStation;
    this.lastData = data;
    this.notifyAll(data);
    return data;
  }

  /**
   * Suscribe un listener a las actualizaciones periódicas
   */
  public subscribe(callback: (data: AzuraCastNowPlayingResponse) => void) {
    this.listeners.push(callback);
    if (this.lastData) {
      callback(this.lastData);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyAll(data: AzuraCastNowPlayingResponse) {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Error al notificar listener de AzuraCast', err);
      }
    });
  }

  /**
   * Inicia el sondeo periódico de metadatos
   */
  public startPolling(stationId?: string, intervalMs?: number) {
    this.stopPolling();
    const interval = intervalMs || RADIO_CONFIG.METADATA_POLL_INTERVAL_MS || 15000;

    // Ejecuta una consulta inicial
    this.fetchNowPlaying(stationId).catch((err) => {
      console.warn('Sondeo AzuraCast inicial:', err.message);
    });

    this.timer = window.setInterval(() => {
      this.fetchNowPlaying(stationId).catch(() => {
        // Silencioso para no saturar consola
      });
    }, interval);
  }

  /**
   * Detiene el sondeo
   */
  public stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Convierte la respuesta de AzuraCast a nuestro formato Track interno
   */
  public toTrackModel(azuraData: AzuraCastNowPlayingResponse): Track {
    const rawSong = azuraData.now_playing.song;
    const parsed = parseAzuraSong(rawSong);
    const resolvedArt = resolveAzuraArtUrl(parsed.art);

    return {
      id: parsed.id,
      title: parsed.title,
      japaneseTitle: parsed.title,
      artist: parsed.artist,
      subtitle: parsed.album || undefined,
      albumArt: resolvedArt,
      genre: parsed.genre || 'Radio Live',
      votes: 120,
      hasLiked: false,
    };
  }
}

export const azuracastService = new AzuraCastService();
