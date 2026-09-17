/**
 * ==============================================================================
 * 📻 CONFIGURACIÓN CENTRAL DE LA RADIO (STREAMING & AZURACAST)
 * ==============================================================================
 * 
 * Aquí es donde debes configurar:
 * 1. El enlace de reproducción directa de la radio (.mp3 o .aac)
 * 2. El endpoint de la API de AzuraCast con tu API Key para metadatos en vivo
 */

export interface RadioStationConfig {
  id: string;
  name: string;
  /**
   * 🔗 ENLACE DE LA RADIO (.mp3 / .aac)
   * Coloca aquí el enlace directo al punto de montaje de tu servidor Icecast / Shoutcast / AzuraCast.
   * Ejemplos:
   *   - "https://radio.miservidor.com/listen/kuma/radio.mp3"
   *   - "https://stream.miservidor.com:8000/live.mp3"
   */
  streamUrl: string;

  /**
   * 📡 ID o Shortcode de la emisora en AzuraCast
   * Por ejemplo: "1" o "kuma_radio"
   */
  azuracastStationId: string;
}

export const RADIO_CONFIG = {
  /**
   * 🌐 1. ENLACE DE TRANSMISIÓN PRINCIPAL (.mp3)
   * Este es el punto de montaje que reproducirá el reproductor web y móvil.
   */
  DEFAULT_STREAM_URL: 'https://stream.kumakuma.fm/live.mp3',

  /**
   * 🔑 2. ENDPOINT BASE DE AZURACAST
   * Coloca la URL base donde está instalado tu panel de AzuraCast.
   * Ejemplo: "https://radio.tudominio.com"
   */
  AZURACAST_BASE_URL: 'https://radio.kumakuma.fm',

  /**
   * 🆔 ID DE LA ESTACIÓN EN AZURACAST
   * El ID numérico (ej. "1") o el shortcode de la emisora configurada en AzuraCast.
   */
  AZURACAST_DEFAULT_STATION_ID: '1',

  /**
   * 🔐 AZURACAST API KEY (OPCIONAL)
   * Si tu instalación de AzuraCast requiere autenticación o tienes restringido el acceso público:
   * Coloca tu clave API generada en AzuraCast (Perfil de Usuario -> Claves API).
   * Se enviará automáticamente en la cabecera HTTP "X-API-Key" y "Authorization: Bearer <KEY>".
   * 
   * Dejar en blanco ("") si tu endpoint /api/nowplaying es público (comportamiento estándar de AzuraCast).
   */
  AZURACAST_API_KEY: '',

  /**
   * ⏱️ INTERVALO DE REFREZCO DE METADATOS
   * Cada cuántos milisegundos se consultará AzuraCast para actualizar título, artista y carátula.
   * 15000 ms = 15 segundos.
   */
  METADATA_POLL_INTERVAL_MS: 15000,

  /**
   * 💬 5. BACKEND DEL CHAT DE LA COMUNIDAD (OPCIONAL)
   * Si tienes el backend del chat desplegado en Vercel u otro servidor,
   * coloca la URL base aquí o mediante la variable de entorno VITE_CHAT_BACKEND_URL.
   * Si se deja vacío (''), usará el backend interno del servidor actual.
   */
  CHAT_BACKEND_URL: (import.meta as any).env?.VITE_CHAT_BACKEND_URL || '',

  /**
   * 📻 LISTADO DE EMISORAS CONFIGURADAS
   * Puedes agregar más estaciones o modificar las existentes aquí:
   */
  STATIONS: [
    {
      id: 'kuma-kuma',
      name: 'Kuma Kuma Radio',
      streamUrl: 'https://stream.kumakuma.fm/live.mp3', // <-- Cambiar por tu URL .mp3
      azuracastStationId: '1',
    },
    {
      id: 'neoradio-fm',
      name: 'NeoRadio FM',
      streamUrl: 'https://stream.kumakuma.fm/tokyo.mp3', // <-- Cambiar por tu URL .mp3
      azuracastStationId: '2',
    },
  ] as RadioStationConfig[],
};
