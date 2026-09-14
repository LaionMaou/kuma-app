package stream.kuma.radio.data

/**
 * ==============================================================================
 * 🔐 CONFIGURACIÓN DE SEGURIDAD & SSO (ANDROID STUDIO NATIVO)
 * ==============================================================================
 *
 * Configuración oficial para:
 * 1. Acceso a Cabina DJ privada (Passkey enmascarada)
 * 2. Discord Bot OAuth2
 * 3. Google Sign-In (Credential Manager)
 * 4. X (Twitter) OAuth 2.0
 */
object AuthSecurityConfig {

    /**
     * 🎧 1. CABINA DEL DJ - CLAVE DE ACCESO PRIVADA
     * La cabina NO está abierta al público general.
     * Los locutores/DJs deben ingresar esta clave para desbloquear el monitor en vivo.
     */
    const val DJ_CABIN_PASSKEY = "KUMA-DJ-2025"
    const val DEFAULT_DJ_NAME = "DJ Sakura-chan 🌸"
    const val DEFAULT_DJ_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"

    /**
     * 🤖 2. DISCORD BOT OAUTH2
     * Configura el Client ID de tu aplicación/bot creada en:
     * https://discord.com/developers/applications
     */
    const val DISCORD_CLIENT_ID = "123456789012345678"
    const val DISCORD_REDIRECT_URI = "stream.kuma.radio://oauth/discord"
    const val DISCORD_SCOPES = "identify email"

    /**
     * 🌐 3. GOOGLE SIGN-IN (CREDENTIAL MANAGER / OAUTH2)
     * Web Client ID obtenido en Google Cloud Console para Android:
     * https://console.cloud.google.com/apis/credentials
     */
    const val GOOGLE_SERVER_CLIENT_ID = "kumakuma-radio-google.apps.googleusercontent.com"
    const val GOOGLE_REDIRECT_URI = "stream.kuma.radio://oauth/google"

    /**
     * ✖️ 4. X (TWITTER) OAUTH 2.0
     * Client ID obtenido en X Developer Portal:
     * https://developer.x.com/en/portal/dashboard
     */
    const val X_CLIENT_ID = "kuma_x_oauth2_client_id"
    const val X_REDIRECT_URI = "stream.kuma.radio://oauth/x"

    fun getDiscordAuthUrl(): String {
        val encodedRedirect = java.net.URLEncoder.encode(DISCORD_REDIRECT_URI, "UTF-8")
        val encodedScopes = java.net.URLEncoder.encode(DISCORD_SCOPES, "UTF-8")
        return "https://discord.com/oauth2/authorize?client_id=$DISCORD_CLIENT_ID&response_type=token&scope=$encodedScopes&redirect_uri=$encodedRedirect"
    }

    fun getGoogleAuthUrl(): String {
        val encodedRedirect = java.net.URLEncoder.encode(GOOGLE_REDIRECT_URI, "UTF-8")
        return "https://accounts.google.com/o/oauth2/v2/auth?client_id=$GOOGLE_SERVER_CLIENT_ID&response_type=token&scope=openid%20profile%20email&redirect_uri=$encodedRedirect"
    }

    fun getXAuthUrl(): String {
        val encodedRedirect = java.net.URLEncoder.encode(X_REDIRECT_URI, "UTF-8")
        return "https://twitter.com/i/oauth2/authorize?client_id=$X_CLIENT_ID&response_type=code&scope=users.read%20tweet.read&redirect_uri=$encodedRedirect&code_challenge=challenge&code_challenge_method=plain"
    }
}
