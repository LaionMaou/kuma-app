# Kuma Kuma Radio — Proyecto Android Nativo (Kotlin & Jetpack Compose)

Aplicación oficial nativa de radio en vivo para Android, diseñada con **Material Design 3**, **Jetpack Compose**, arquitectura moderna MVVM y servicios nativos de audio en segundo plano.

---

## 🎧 Características Principales & Servicios Nativos

1. **Servicio de Audio en Primer Plano (Foreground Service)**:
   - Implementado con **AndroidX Media3 (ExoPlayer)** (`RadioPlayerService.kt`).
   - Soporte para notificaciones interactivas de sistema, controles en pantalla de bloqueo, pausa automática al desconectar auriculares (`AUDIO_BECOMING_NOISY`) y gestión de foco de audio.

2. **Ecualizador Gráfico y Efectos DSP Nativos (`android.media.audiofx`)**:
   - **Ecualizador de 5 bandas** (`android.media.audiofx.Equalizer`) con frecuencias centrales: 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz.
   - Curva de respuesta en frecuencia renderizada en tiempo real mediante Jetpack Compose Canvas.
   - Preajustes: *Moe Pop*, *Bass Boost*, *Vocal DJ*, *Sakura Acoustic*, *Flat*.
   - **Bass Boost Nativo** (`android.media.audiofx.BassBoost`): Potenciación de frecuencias sub-graves.
   - **Virtualizer 3D** (`android.media.audiofx.Virtualizer`): Audio espacial envolvente.
   - **Loudness Enhancer** (`android.media.audiofx.LoudnessEnhancer`): Normalización de volumen para streams en vivo.

3. **Integración con AzuraCast**:
   - Cliente HTTP con **Retrofit 2** y **Kotlinx Serialization** para consultar `api/nowplaying/{station_id}` en tiempo real.
   - Recuperación automática de metadatos (título, artista, portada del álbum, oyentes conectados).

4. **Interfaz de Usuario Jetpack Compose**:
   - **Reproductor en Vivo**: Selector de estaciones, estado del DJ al aire, disco de vinilo giratorio con animación, telemetría de stream y botón flotante de reproducción.
   - **Historial de Canciones**: Búsqueda en vivo, filtrado por favoritas y compartir canciones a través de Android Share Sheet.
   - **Comunidad**: Chat en vivo y barra de reacciones emoji.
   - **Ajustes**: Modo Pastel Night (oscuro) y Sakura Day (claro), temporizador de apagado (*Sleep Timer*) y calidad de audio.

---

## 🛠️ Cómo abrir en Android Studio

1. Abre **Android Studio** (Koala, Ladybug o superior).
2. Selecciona **Open** y navega a la carpeta `/android` de este proyecto.
3. Espera a que Gradle sincronice las dependencias (`build.gradle.kts` y `libs.versions.toml`).
4. Conecta un dispositivo Android (físico con depuración USB o emulador AVD con Android 8.0+ / API 26+).
5. Presiona **Run 'app'** (`Shift + F10`).

---

## 📦 Estructura del Proyecto

```
android/
├── build.gradle.kts              # Configuración de compilación raíz
├── settings.gradle.kts           # Configuración de módulos y repositorios
├── gradle/
│   ├── libs.versions.toml        # Catálogo de versiones de dependencias
│   └── wrapper/
│       └── gradle-wrapper.properties
└── app/
    ├── build.gradle.kts          # Plugins, SDK y dependencias de la app
    └── src/main/
        ├── AndroidManifest.xml   # Permisos de red, audio, y servicios
        ├── java/stream/kuma/radio/
        │   ├── KumaApplication.kt
        │   ├── MainActivity.kt
        │   ├── data/
        │   │   ├── api/AzuraCastApi.kt
        │   │   ├── model/Models.kt
        │   │   ├── RadioConfig.kt            # Enlaces de streaming y AzuraCast
        │   │   └── AuthSecurityConfig.kt     # Credenciales SSO y Passkey Cabina DJ
        │   ├── service/
        │   │   ├── AudioEffectsManager.kt    # Librerías nativas android.media.audiofx
        │   │   └── RadioPlayerService.kt     # Media3 Foreground Service
        │   └── ui/
        │       ├── navigation/Navigation.kt
        │       ├── screens/
        │       │   ├── PlayerScreen.kt
        │       │   ├── EqualizerScreen.kt
        │       │   ├── HistoryScreen.kt
        │       │   ├── CommunityScreen.kt    # Chat SSO e interfaz de Cabina DJ protegida
        │       │   └── SettingsScreen.kt
        │       ├── theme/
        │       │   ├── Color.kt
        │       │   ├── Theme.kt
        │       │   └── Type.kt
        │       └── viewmodel/RadioViewModel.kt
        └── res/
            ├── values/strings.xml, colors.xml, themes.xml
            └── xml/backup_rules.xml, data_extraction_rules.xml
```
