import React, { useState } from 'react';
import {
  FileCode,
  Folder,
  FolderOpen,
  Copy,
  Check,
  Smartphone,
  Layers,
  Cpu,
  Download,
  Terminal,
  ExternalLink
} from 'lucide-react';

interface AndroidFile {
  name: string;
  path: string;
  category: 'gradle' | 'manifest' | 'kotlin' | 'service' | 'ui';
  description: string;
  code: string;
}

const ANDROID_FILES: AndroidFile[] = [
  {
    name: 'RadioConfig.kt',
    path: 'app/src/main/java/stream/kuma/radio/data/RadioConfig.kt',
    category: 'kotlin',
    description: 'Enlace del streaming (.mp3 / .aac), Endpoint AzuraCast y autorización con API Key',
    code: `package stream.kuma.radio.data

object RadioConfig {
    /**
     * 1. PUNTO DE MONTAJE DE LA RADIO (.mp3 o .aac)
     * Coloca aquí el enlace de tu streaming Shoutcast/Icecast/AzuraCast
     */
    const val DEFAULT_STREAM_URL = "https://stream.kumakuma.fm/live.mp3"

    /**
     * 2. ENDPOINT BASE DE AZURACAST
     * URL donde está instalado tu panel AzuraCast
     */
    const val AZURACAST_BASE_URL = "https://radio.kumakuma.fm/"

    /**
     * 3. ID O SHORTCODE DE LA ESTACIÓN
     */
    const val AZURACAST_DEFAULT_STATION_ID = "1"

    /**
     * 4. API KEY DE AZURACAST (OPCIONAL)
     * Se envía automáticamente en cabecera "X-API-Key"
     */
    const val AZURACAST_API_KEY = ""
}`
  },
  {
    name: 'AuthSecurityConfig.kt',
    path: 'app/src/main/java/stream/kuma/radio/data/AuthSecurityConfig.kt',
    category: 'kotlin',
    description: 'Credenciales SSO (Discord Bot OAuth2, Google Sign-In, X Twitter) y Passkey de Cabina DJ',
    code: `package stream.kuma.radio.data

object AuthSecurityConfig {
    // 1. Clave de cabina DJ enmascarada para locutores
    const val DJ_CABIN_PASSKEY = "KUMA-DJ-2025"

    // 2. Discord Bot OAuth2
    const val DISCORD_CLIENT_ID = "123456789012345678"
    const val DISCORD_REDIRECT_URI = "stream.kuma.radio://oauth/discord"

    // 3. Google Sign-In Client ID
    const val GOOGLE_SERVER_CLIENT_ID = "kumakuma-radio-google.apps.googleusercontent.com"

    // 4. X (Twitter) OAuth 2.0
    const val X_CLIENT_ID = "kuma_x_oauth2_client_id"
}`
  },
  {
    name: 'AudioEffectsManager.kt',
    path: 'app/src/main/java/stream/kuma/radio/service/AudioEffectsManager.kt',
    category: 'service',
    description: 'Servicio nativo con android.media.audiofx.Equalizer, BassBoost, Virtualizer y LoudnessEnhancer',
    code: `package stream.kuma.radio.service

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.LoudnessEnhancer
import android.media.audiofx.Virtualizer
import android.util.Log
import stream.kuma.radio.data.model.EqualizerBand
import stream.kuma.radio.data.model.EqualizerPreset
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AudioEffectsManager {
    // 5-band frequency extraction, dB band levels (-1500 to +1500 millibels)
    // Presets: Moe Pop, Bass Boost, Vocal DJ, Sakura Acoustic, Flat
    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var virtualizer: Virtualizer? = null
    private var loudnessEnhancer: LoudnessEnhancer? = null

    fun attachAudioSession(audioSessionId: Int) {
        if (audioSessionId == 0) return
        equalizer = Equalizer(0, audioSessionId).apply {
            enabled = true
        }
        bassBoost = BassBoost(0, audioSessionId).apply {
            enabled = true
            setStrength(600.toShort())
        }
        virtualizer = Virtualizer(0, audioSessionId).apply {
            enabled = true
            setStrength(450.toShort())
        }
    }

    fun setBandLevel(bandIndex: Short, gainDb: Float) {
        val mB = (gainDb * 100).toInt().coerceIn(-1500, 1500).toShort()
        equalizer?.setBandLevel(bandIndex, mB)
    }
}`
  },
  {
    name: 'RadioPlayerService.kt',
    path: 'app/src/main/java/stream/kuma/radio/service/RadioPlayerService.kt',
    category: 'service',
    description: 'Foreground Service con AndroidX Media3 (ExoPlayer), audio focus y sesión multimedia del sistema',
    code: `package stream.kuma.radio.service

import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

class RadioPlayerService : MediaSessionService() {
    private var player: ExoPlayer? = null
    private var mediaSession: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build()
    }
}`
  },
  {
    name: 'EqualizerScreen.kt',
    path: 'app/src/main/java/stream/kuma/radio/ui/screens/EqualizerScreen.kt',
    category: 'ui',
    description: 'Pantalla Jetpack Compose con curva en Canvas y 5 deslizadores para frecuencias nativas',
    code: `@Composable
fun EqualizerScreen(viewModel: RadioViewModel) {
    val audioEffects = viewModel.audioEffects
    val isEnabled by audioEffects.isEnabled.collectAsState()
    val bands by audioEffects.bands.collectAsState()

    Column {
        // Renderizado dinámico de curva de respuesta en Canvas
        Canvas(modifier = Modifier.fillMaxWidth().height(130.dp)) {
            // Dibuja la curva Bezier con las 5 bandas activas
        }

        // 5 Deslizadores de ganancia interactiva
        bands.forEach { band ->
            Slider(
                value = band.gainDb,
                onValueChange = { audioEffects.setBandLevel(band.bandIndex, it) },
                valueRange = -12f..12f
            )
        }
    }
}`
  },
  {
    name: 'PlayerScreen.kt',
    path: 'app/src/main/java/stream/kuma/radio/ui/screens/PlayerScreen.kt',
    category: 'ui',
    description: 'Reproductor Jetpack Compose con vinilo giratorio, metadatos AzuraCast y botón flotante FAB',
    code: `@Composable
fun PlayerScreen(viewModel: RadioViewModel, onNavigateToEqualizer: () -> Unit) {
    // UI nativa de reproducción con Material 3
}`
  },
  {
    name: 'MainActivity.kt',
    path: 'app/src/main/java/stream/kuma/radio/MainActivity.kt',
    category: 'kotlin',
    description: 'Actividad principal con Edge-to-Edge, Scaffold y NavHost para las 5 pantallas',
    code: `class MainActivity : ComponentActivity() {
    private val viewModel: RadioViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            KumaKumaRadioTheme {
                // Scaffold y NavHost con Compose Navigation
            }
        }
    }
}`
  },
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    category: 'manifest',
    description: 'Permisos de reproducción FOREGROUND_SERVICE_MEDIA_PLAYBACK y declaración de servicio',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:name=".KumaApplication"
        android:theme="@style/Theme.KumaKumaRadio">
        
        <service
            android:name=".service.RadioPlayerService"
            android:foregroundServiceType="mediaPlayback" />
    </application>
</manifest>`
  },
  {
    name: 'build.gradle.kts (App)',
    path: 'app/build.gradle.kts',
    category: 'gradle',
    description: 'Gradle Kotlin DSL con plugins de Compose, Media3, Retrofit, Kotlinx Serialization y Coil',
    code: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "stream.kuma.radio"
    compileSdk = 35

    defaultConfig {
        applicationId = "stream.kuma.radio"
        minSdk = 26
        targetSdk = 35
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.session)
    implementation(libs.retrofit)
    implementation(libs.coil.compose)
}`
  },
  {
    name: 'libs.versions.toml',
    path: 'gradle/libs.versions.toml',
    category: 'gradle',
    description: 'Catálogo de versiones de dependencias para Android Studio',
    code: `[versions]
agp = "8.7.3"
kotlin = "2.0.21"
media3 = "1.5.0"
composeBom = "2024.11.00"
retrofit = "2.11.0"

[libraries]
androidx-media3-exoplayer = { group = "androidx.media3", name = "media3-exoplayer", version.ref = "media3" }
androidx-media3-session = { group = "androidx.media3", name = "media3-session", version.ref = "media3" }`
  }
];

export const AndroidCodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<AndroidFile>(ANDROID_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-2">
              <Smartphone className="w-4 h-4" />
              <span>Proyecto Android Nativo (Kotlin & Jetpack Compose)</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Estructura Oficial para Android Studio
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Este proyecto ha sido completamente refactorizado a Android nativo sin Capacitor.
              Utiliza <span className="text-emerald-300 font-semibold">android.media.audiofx</span> para el ecualizador y DSP,
              y <span className="text-cyan-300 font-semibold">AndroidX Media3 (ExoPlayer)</span> para el Foreground Service.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl px-4 py-2 text-emerald-300 text-xs font-mono">
              <span className="font-bold">Ubicación:</span> /android
            </div>
          </div>
        </div>
      </div>

      {/* Code Viewer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Sidebar: File Navigator */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>Archivos del Proyecto</span>
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {ANDROID_FILES.map((file) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-white font-medium'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <FileCode className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <div className="min-w-0">
                    <div className="truncate font-mono font-medium">{file.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{file.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 px-2 leading-relaxed">
            💡 Puedes abrir la carpeta <code className="text-emerald-400">/android</code> directamente en <strong>Android Studio</strong> para compilar el APK.
          </div>
        </div>

        {/* Right Code Display */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs font-mono text-emerald-400 font-semibold truncate">
                {selectedFile.path}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {selectedFile.description}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar código'}</span>
            </button>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed bg-[#0d1117]">
            <code>{selectedFile.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
