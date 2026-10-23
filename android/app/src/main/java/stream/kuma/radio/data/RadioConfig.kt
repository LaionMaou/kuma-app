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
    const val DEFAULT_STREAM_URL = "https://stream.host-cx.net.ar/listen/konata-station-radio/tunein.mp3"


    /**
     * 📡 2. ENDPOINT BASE DE AZURACAST
     * La URL donde se encuentra instalado tu panel de AzuraCast (debe terminar en /).
     * Ejemplo: "https://radio.tudominio.com/"
     */
    const val AZURACAST_BASE_URL = "https://stream.host-cx.net.ar/"

    /**
     * 🆔 ID DE LA ESTACIÓN EN AZURACAST
     * ID de estación ("1", "2") o shortcode ("kuma_radio") para /api/nowplaying/{station_id}
     */
    const val AZURACAST_DEFAULT_STATION_ID = "3"

    /**
     * 🔐 API KEY DE AZURACAST (OPCIONAL)
     * Ya no vive en el código: se inyecta como BuildConfig.AZURACAST_API_KEY
     * desde la propiedad `AZURACAST_API_KEY` de local.properties o del entorno.
     * El endpoint público /api/nowplaying no la necesita.
     */

    /**
     * 🎧 Identidad por defecto de la cabina DJ.
     */
    const val DEFAULT_DJ_NAME = "DJ Sakura-chan 🌸"
    const val DEFAULT_DJ_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"

    /**
     * 💬 5. BACKEND DEL CHAT DE LA COMUNIDAD
     * URL del servidor Express / backend que procesa y distribuye los mensajes del chat y la cabina.
     * En desarrollo local con emulador Android se usa http://10.0.2.2:3000/ o la URL del servidor en producción.
     */
    const val CHAT_BACKEND_URL = "https://chat-backend-kuma.vercel.app/"
}
