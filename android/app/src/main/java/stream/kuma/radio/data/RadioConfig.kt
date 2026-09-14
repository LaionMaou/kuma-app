package stream.kuma.radio.data

/**
 * ==============================================================================
 * 📻 CONFIGURACIÓN NATIVA DE RADIO Y AZURACAST (ANDROID)
 * ==============================================================================
 * 
 * Aquí se definen los enlaces del servidor de streaming y los endpoints de AzuraCast.
 */
object RadioConfig {
    /**
     * 🌐 1. ENLACE DEL PUNTO DE MONTAJE DE LA RADIO (.mp3 o .aac)
     * Coloca aquí el enlace directo al stream que reproducirá ExoPlayer.
     * Ejemplo: "https://radio.miservidor.com/listen/kuma/radio.mp3"
     */
    const val DEFAULT_STREAM_URL = "https://stream.kumakuma.fm/live.mp3"

    /**
     * 📡 2. ENDPOINT BASE DE AZURACAST
     * La URL donde se encuentra instalado tu panel de AzuraCast (debe terminar en /).
     * Ejemplo: "https://radio.tudominio.com/"
     */
    const val AZURACAST_BASE_URL = "https://radio.kumakuma.fm/"

    /**
     * 🆔 ID DE LA ESTACIÓN EN AZURACAST
     * ID de estación ("1", "2") o shortcode ("kuma_radio") para /api/nowplaying/{station_id}
     */
    const val AZURACAST_DEFAULT_STATION_ID = "1"

    /**
     * 🔐 API KEY DE AZURACAST (OPCIONAL)
     * Si tu endpoint requiere autorización, coloca tu API Key de AzuraCast aquí.
     * Se enviará automáticamente en la cabecera HTTP "X-API-Key".
     * Dejar vacío ("") si el acceso público a /api/nowplaying está habilitado.
     */
    const val AZURACAST_API_KEY = ""
}
