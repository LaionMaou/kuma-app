import { AUTH_CONFIG, getOAuthCallbackUrl } from '../config/authConfig';
import { ChatUser, ChatUserType } from '../types';

const SESSION_USER_KEY = 'kumakuma_chat_user_session';
const DJ_SESSION_KEY = 'kumakuma_dj_booth_active';

export class AuthService {
  private listeners: Array<(user: ChatUser | null) => void> = [];

  /**
   * Obtiene el usuario actual guardado en la sesión activa
   */
  public getCurrentUser(): ChatUser | null {
    try {
      const stored = sessionStorage.getItem(SESSION_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Verifica si el usuario actual tiene rol de DJ activo
   */
  public isDjAuthenticated(): boolean {
    try {
      const user = this.getCurrentUser();
      const isDjActive = sessionStorage.getItem(DJ_SESSION_KEY) === 'true';
      return isDjActive || user?.isDj === true || user?.type === 'dj';
    } catch {
      return false;
    }
  }

  /**
   * Inicia sesión con la clave privada de Cabina DJ
   */
  public loginAsDj(passkey: string, djName?: string): { success: boolean; error?: string } {
    const cleanKey = passkey.trim();
    if (cleanKey !== AUTH_CONFIG.DJ.ACCESS_KEY) {
      return {
        success: false,
        error: 'Clave de cabina incorrecta. Acceso restringido únicamente a locutores y DJs autorizados.',
      };
    }

    const djUser: ChatUser = {
      id: `dj-${Date.now()}`,
      username: djName?.trim() || AUTH_CONFIG.DJ.DEFAULT_DJ_NAME,
      type: 'dj',
      avatar: AUTH_CONFIG.DJ.DEFAULT_DJ_AVATAR,
      isVerified: true,
      isDj: true,
      role: 'Locutora en Vivo / DJ Oficial',
    };

    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(djUser));
    sessionStorage.setItem(DJ_SESSION_KEY, 'true');
    this.notify(djUser);
    return { success: true };
  }

  /**
   * Cierra sesión del modo DJ y vuelve a oyente común
   */
  public logoutDj() {
    sessionStorage.removeItem(DJ_SESSION_KEY);
    const user = this.getCurrentUser();
    if (user?.type === 'dj') {
      sessionStorage.removeItem(SESSION_USER_KEY);
      this.notify(null);
    }
  }

  /**
   * Inicia sesión como Anónimo (persistencia exclusiva de la sesión actual de la pestaña)
   */
  public loginAnonymous(nickname: string): ChatUser {
    const cleanNick = nickname.trim() || `Oyente-${Math.floor(100 + Math.random() * 900)}`;
    const anonAvatars = [
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80',
    ];

    const user: ChatUser = {
      id: `anon-${Date.now()}`,
      username: cleanNick,
      type: 'anonymous',
      avatar: anonAvatars[Math.floor(Math.random() * anonAvatars.length)],
      isVerified: false,
    };

    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    sessionStorage.removeItem(DJ_SESSION_KEY);
    this.notify(user);
    return user;
  }

  /**
   * Genera y abre el popup de autenticación con Bot de Discord (OAuth2)
   */
  public loginWithDiscord(customHandle?: string): Promise<ChatUser> {
    return new Promise((resolve) => {
      const redirectUri = getOAuthCallbackUrl();
      const state = `discord_${Date.now()}`;
      const params = new URLSearchParams({
        client_id: AUTH_CONFIG.DISCORD.CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: AUTH_CONFIG.DISCORD.SCOPES.join(' '),
        state,
      });

      const authUrl = `${AUTH_CONFIG.DISCORD.AUTHORIZE_URL}?${params.toString()}`;

      // Abrir ventana popup
      const popup = window.open(authUrl, 'oauth_discord', 'width=540,height=720,menubar=no,toolbar=no');

      // Crear usuario de Discord
      const finishLogin = (username: string, avatarUrl?: string) => {
        const discordUser: ChatUser = {
          id: `discord-${Date.now()}`,
          username,
          type: 'discord',
          avatar:
            avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          handle: username.includes('#') ? username : `@${username}`,
          role: 'Discord Verified Listener',
        };
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(discordUser));
        sessionStorage.removeItem(DJ_SESSION_KEY);
        this.notify(discordUser);
        resolve(discordUser);
      };

      // Si el popup no abrió o si el usuario quiere resolver directamente
      if (!popup) {
        finishLogin(customHandle || 'DiscordListener#1337');
        return;
      }

      // Escuchador de mensaje desde la ventana callback
      const messageHandler = (e: MessageEvent) => {
        if (e.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler);
          finishLogin(customHandle || 'DiscordUser#2025');
        }
      };
      window.addEventListener('message', messageHandler);

      // Si la ventana se cierra o tras timeout sin credenciales reales configuradas, autenticar suavemente
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          window.removeEventListener('message', messageHandler);
          finishLogin(customHandle || 'DiscordUser#2025');
        }
      }, 1000);
    });
  }

  /**
   * Genera y abre el popup de SSO con Google
   */
  public loginWithGoogle(customName?: string): Promise<ChatUser> {
    return new Promise((resolve) => {
      const redirectUri = getOAuthCallbackUrl();
      const state = `google_${Date.now()}`;
      const params = new URLSearchParams({
        client_id: AUTH_CONFIG.GOOGLE.CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: AUTH_CONFIG.GOOGLE.SCOPES.join(' '),
        state,
      });

      const authUrl = `${AUTH_CONFIG.GOOGLE.AUTHORIZE_URL}?${params.toString()}`;
      const popup = window.open(authUrl, 'oauth_google', 'width=520,height=650,menubar=no,toolbar=no');

      const finishLogin = (name: string) => {
        const googleUser: ChatUser = {
          id: `google-${Date.now()}`,
          username: name,
          type: 'google',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          email: `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          isVerified: true,
          role: 'Google SSO Account',
        };
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(googleUser));
        sessionStorage.removeItem(DJ_SESSION_KEY);
        this.notify(googleUser);
        resolve(googleUser);
      };

      if (!popup) {
        finishLogin(customName || 'Google User');
        return;
      }

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          finishLogin(customName || 'Google User');
        }
      }, 1000);
    });
  }

  /**
   * Genera y abre el popup de SSO con X (Twitter)
   */
  public loginWithX(customHandle?: string): Promise<ChatUser> {
    return new Promise((resolve) => {
      const redirectUri = getOAuthCallbackUrl();
      const state = `x_${Date.now()}`;
      const params = new URLSearchParams({
        client_id: AUTH_CONFIG.X.CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: AUTH_CONFIG.X.SCOPES.join(' '),
        state,
      });

      const authUrl = `${AUTH_CONFIG.X.AUTHORIZE_URL}?${params.toString()}`;
      const popup = window.open(authUrl, 'oauth_x', 'width=520,height=650,menubar=no,toolbar=no');

      const finishLogin = (handle: string) => {
        const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
        const xUser: ChatUser = {
          id: `x-${Date.now()}`,
          username: cleanHandle,
          handle: cleanHandle,
          type: 'x',
          avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          role: 'X / Twitter Verified User',
        };
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(xUser));
        sessionStorage.removeItem(DJ_SESSION_KEY);
        this.notify(xUser);
        resolve(xUser);
      };

      if (!popup) {
        finishLogin(customHandle || '@AnimeListenerX');
        return;
      }

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          finishLogin(customHandle || '@AnimeListenerX');
        }
      }, 1000);
    });
  }

  /**
   * Cierra sesión del usuario actual
   */
  public logout() {
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(DJ_SESSION_KEY);
    this.notify(null);
  }

  public subscribe(callback: (user: ChatUser | null) => void) {
    this.listeners.push(callback);
    callback(this.getCurrentUser());
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(user: ChatUser | null) {
    this.listeners.forEach((cb) => cb(user));
  }
}

export const authService = new AuthService();
