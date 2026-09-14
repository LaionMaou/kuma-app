/**
 * ==============================================================================
 * 🔐 CONFIGURACIÓN DE AUTENTICACIÓN & SSO (DISCORD BOT, GOOGLE, X, CABINA DJ)
 * ==============================================================================
 * 
 * En este archivo se centraliza la configuración de:
 * 1. Discord Bot OAuth2 (Bot y login de usuario)
 * 2. Google Sign-In (SSO OAuth2)
 * 3. X (Twitter) Sign-In (SSO OAuth2)
 * 4. Clave de acceso secreta para la Cabina del DJ
 */

export const AUTH_CONFIG = {
  // URLs de redirección OAuth oficiales para la aplicación en AI Studio
  CALLBACK_PATH: '/auth/callback',

  /**
   * 🤖 DISCORD BOT OAUTH2
   * Configura aquí el Client ID de tu aplicación/bot creada en:
   * https://discord.com/developers/applications
   */
  DISCORD: {
    CLIENT_ID: (import.meta.env.VITE_DISCORD_CLIENT_ID as string) || '123456789012345678',
    SCOPES: ['identify', 'email'],
    // URL del bot si deseas que los usuarios también lo inviten a su servidor
    BOT_INVITE_URL: 'https://discord.com/oauth2/authorize?client_id=123456789012345678&scope=bot&permissions=277025508352',
    AUTHORIZE_URL: 'https://discord.com/oauth2/authorize',
  },

  /**
   * 🌐 GOOGLE SSO (OAUTH2)
   * Client ID obtenido en Google Cloud Console (APIs & Services -> Credentials):
   * https://console.cloud.google.com/apis/credentials
   */
  GOOGLE: {
    CLIENT_ID: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || 'kumakuma-radio-google.apps.googleusercontent.com',
    SCOPES: ['openid', 'email', 'profile'],
    AUTHORIZE_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  },

  /**
   * ✖️ X (TWITTER) SSO (OAUTH2)
   * Client ID obtenido en X Developer Portal:
   * https://developer.x.com/en/portal/dashboard
   */
  X: {
    CLIENT_ID: (import.meta.env.VITE_X_CLIENT_ID as string) || 'kuma_x_oauth2_client_id',
    SCOPES: ['users.read', 'tweet.read'],
    AUTHORIZE_URL: 'https://twitter.com/i/oauth2/authorize',
  },

  /**
   * 🎧 CABINA DEL DJ - CLAVE DE ACCESO PRIVADA (MASCARILLA DE SEGURIDAD)
   * La cabina NO está abierta al público general.
   * Los locutores/DJs deben ingresar esta clave para desbloquear el monitor en vivo.
   */
  DJ: {
    ACCESS_KEY: 'KUMA-DJ-2025',
    DEFAULT_DJ_NAME: 'DJ Kuma-chan 🐻✨',
    DEFAULT_DJ_AVATAR: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
};

/**
 * Genera la URL de callback dinámica basada en el origen actual del navegador
 */
export function getOAuthCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${AUTH_CONFIG.CALLBACK_PATH}`;
  }
  return 'https://ais-dev-q73lw7ueqvnxqiqjlxovsd-62987734044.us-east1.run.app/auth/callback';
}
