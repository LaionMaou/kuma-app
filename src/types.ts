export type ThemeMode = 'dark' | 'light' | 'cyberwave';

export type ActiveTab = 'en-vivo' | 'historial' | 'comunidad' | 'ajustes';

export interface Station {
  id: string;
  name: string;
  subName: string;
  location: string;
  genre: string;
  logo: string;
  streamUrl: string; // <-- Enlace de la transmisión en vivo (.mp3 o .aac)
  azuracastStationId?: string;
  dj: {
    name: string;
    title: string;
    avatar: string;
    bio: string;
    listeners: number;
    greetingText: string;
    showName?: string;
    isLiveStreamer?: boolean;
  };
  currentTrack: Track;
  nextTrack: {
    title: string;
    artist: string;
    duration: string;
  };
  streamStats: {
    codec: string;
    bitrate: string;
    latency: string;
    tracksToday: number;
    azuracastVersion: string;
    pingMs: number;
  };
}

export interface Track {
  id: string;
  title: string;
  japaneseTitle?: string;
  subtitle?: string;
  artist: string;
  albumArt: string;
  genre: string;
  playedAt?: string;
  duration?: string;
  votes: number;
  hasLiked?: boolean;
}

export interface EqualizerSettings {
  band60: number;
  band230: number;
  band910: number;
  band4k: number;
  band14k: number;
  preset: 'moe' | 'bass' | 'vocal' | 'flat' | 'custom';
}

export interface AppSettings {
  theme: ThemeMode;
  restrictSchedule: boolean;
  scheduleStart: string;
  scheduleEnd: string;
  activeDays: string[];
  sleepTimer: 'off' | '15m' | '30m' | '60m';
  sleepTimerRemainingSeconds?: number;
  equalizer: EqualizerSettings;
  bassBoostDb: number;
  surround3D: boolean;
  normalizeAudio: boolean;
  notifications: {
    djLive: boolean;
    announcements: boolean;
    newTracks: boolean;
  };
}

export type ChatUserType = 'discord' | 'google' | 'x' | 'anonymous' | 'dj';

export interface ChatUser {
  id: string;
  username: string;
  discriminator?: string;
  avatar: string;
  type: ChatUserType;
  email?: string;
  handle?: string;
  isVerified?: boolean;
  isDj?: boolean;
  role?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  isDj?: boolean;
  likes?: number;
  userType?: ChatUserType;
  tag?: string;
  isSongRequest?: boolean;
}

export interface DjReactionEvent {
  id: string;
  sender: string;
  emoji: string;
  timestamp: number;
  userType?: ChatUserType;
}

