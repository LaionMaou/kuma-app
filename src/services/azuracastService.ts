import { RADIO_CONFIG } from '../config/radioConfig';
import { Track } from '../types';

export interface AzuraCastNowPlayingResponse {
  station: {
    id: number | string;
    name: string;
    shortcode?: string;
    description?: string;
  };
  now_playing: {
    elapsed: number;
    remaining: number;
    duration: number;
    song: {
      id: string;
      title: string;
      artist: string;
      album: string;
      genre: string;
      art: string;
      lyrics?: string;
    };
    is_request: boolean;
  };
  live?: {
    is_live: boolean;
    streamer_name: string;
  };
  listeners: {
    total: number;
    unique: number;
    current: number;
  };
  song_history?: Array<{
    sh_id: number;
    played_at: number;
    song: {
      title: string;
      artist: string;
      album: string;
      art: string;
    };
  }>;
}

class AzuraCastService {
  private timer: number | null = null;
  private listeners: Array<(data: AzuraCastNowPlayingResponse) => void> = [];
  private lastData: AzuraCastNowPlayingResponse | null = null;

  /**
   * Obtiene la URL completa del endpoint de NowPlaying
   */
  public getEndpointUrl(stationId?: string): string {
    const base = RADIO_CONFIG.AZURACAST_BASE_URL.replace(/\/+$/, '');
    const id = stationId || RADIO_CONFIG.AZURACAST_DEFAULT_STATION_ID;
    return `${base}/api/nowplaying/${id}`;
  }

  /**
   * Realiza una petición directa a AzuraCast incluyendo la API Key si está configurada
   */
  public async fetchNowPlaying(stationId?: string): Promise<AzuraCastNowPlayingResponse> {
    const url = this.getEndpointUrl(stationId);
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (RADIO_CONFIG.AZURACAST_API_KEY && RADIO_CONFIG.AZURACAST_API_KEY.trim() !== '') {
      headers['X-API-Key'] = RADIO_CONFIG.AZURACAST_API_KEY.trim();
      headers['Authorization'] = `Bearer ${RADIO_CONFIG.AZURACAST_API_KEY.trim()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Error en AzuraCast (${response.status}): ${response.statusText}`);
    }

    const data: AzuraCastNowPlayingResponse = await response.json();
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
    const interval = intervalMs || RADIO_CONFIG.METADATA_POLL_INTERVAL_MS;

    // Ejecuta una consulta inicial
    this.fetchNowPlaying(stationId).catch((err) => {
      // Si la URL es la de ejemplo o no está en línea, no romper la ejecución
      console.warn('No se pudo conectar con el endpoint de AzuraCast configurado:', err.message);
    });

    this.timer = window.setInterval(() => {
      this.fetchNowPlaying(stationId).catch(() => {
        // Silencioso para no ensuciar consola si el servidor no está en línea aún
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
    const song = azuraData.now_playing.song;
    let artUrl = song.art;
    if (artUrl && !artUrl.startsWith('http://') && !artUrl.startsWith('https://')) {
      const base = RADIO_CONFIG.AZURACAST_BASE_URL.replace(/\/+$/, '');
      artUrl = `${base}/${artUrl.replace(/^\/+/, '')}`;
    }

    return {
      id: song.id || `azura-${Date.now()}`,
      title: song.title || (song as any).text || 'Música en Vivo',
      japaneseTitle: song.title || (song as any).text,
      artist: song.artist || 'Emisión en Directo',
      subtitle: song.album || undefined,
      albumArt: artUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      genre: song.genre || 'Radio Live',
      votes: 120,
      hasLiked: false,
    };
  }
}

export const azuracastService = new AzuraCastService();
