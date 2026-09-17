package stream.kuma.radio.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import stream.kuma.radio.data.AuthSecurityConfig
import stream.kuma.radio.data.RadioConfig
import stream.kuma.radio.data.api.ApiClient
import stream.kuma.radio.data.api.ChatApiClient
import stream.kuma.radio.data.model.AuthProvider
import stream.kuma.radio.data.model.AuthUser
import stream.kuma.radio.data.model.BackendChatMessageDto
import stream.kuma.radio.data.model.BackendSendMessageRequest
import stream.kuma.radio.data.model.ChatMessage
import stream.kuma.radio.data.model.Dj
import stream.kuma.radio.data.model.EqualizerBand
import stream.kuma.radio.data.model.EqualizerPreset
import stream.kuma.radio.data.model.Station
import stream.kuma.radio.data.model.Track
import stream.kuma.radio.service.AudioEffectsManager
import stream.kuma.radio.service.RadioPlayerService
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class RadioViewModel(application: Application) : AndroidViewModel(application) {

    // User Authentication State
    private val _currentUser = MutableStateFlow<AuthUser?>(null)
    val currentUser: StateFlow<AuthUser?> = _currentUser.asStateFlow()

    // DJ Cabin Status (Masked for normal listeners)
    private val _isDjAuthenticated = MutableStateFlow(false)
    val isDjAuthenticated: StateFlow<Boolean> = _isDjAuthenticated.asStateFlow()

    private val _djErrorMessage = MutableStateFlow<String?>(null)
    val djErrorMessage: StateFlow<String?> = _djErrorMessage.asStateFlow()

    // Single Station & Mount Point (Fixed Bitrate)
    private val _currentStation = MutableStateFlow(
        Station(
            id = RadioConfig.AZURACAST_DEFAULT_STATION_ID,
            name = "Kuma Kuma Radio",
            genre = "Anime & J-Music",
            streamUrl = RadioConfig.DEFAULT_STREAM_URL,
            description = "Transmisión oficial en vivo de Kuma Kuma Radio",
            bitrate = "Directo",
            format = "Live Stream",
            listeners = 1240
        )
    )
    val currentStation: StateFlow<Station> = _currentStation.asStateFlow()

    // Real ExoPlayer Live Playback State from RadioPlayerService
    val isPlaying: StateFlow<Boolean> = RadioPlayerService.isPlayingFlow
    val isBuffering: StateFlow<Boolean> = RadioPlayerService.isBufferingFlow
    val isMuted: StateFlow<Boolean> = RadioPlayerService.isMutedFlow
    val playbackError: StateFlow<String?> = RadioPlayerService.errorFlow

    private val _volume = MutableStateFlow(0.85f)
    val volume: StateFlow<Float> = _volume.asStateFlow()

    // Current Track & DJ
    private val _currentTrack = MutableStateFlow(
        Track(
            id = "tr_001",
            title = "Idol (アイドル)",
            artist = "YOASOBI",
            album = "Oshi no Ko Original Soundtrack",
            artUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
            durationSeconds = 213,
            playedAt = "En Vivo",
            isLiked = false
        )
    )
    val currentTrack: StateFlow<Track> = _currentTrack.asStateFlow()

    private val _currentDj = MutableStateFlow(
        Dj(
            name = "Kuma DJ",
            handle = "@kuma_dj",
            status = "Al Aire",
            avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
            currentShow = "Kuma Show",
            isLiveStreamer = false
        )
    )
    val currentDj: StateFlow<Dj> = _currentDj.asStateFlow()

    // History
    private val _history = MutableStateFlow(
        listOf(
            Track("h1", "Kick Back", "Kenshi Yonezu", "Chainsaw Man OST", "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80", 195, "Hace 3m", true),
            Track("h2", "Specialz", "King Gnu", "Jujutsu Kaisen Season 2", "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80", 238, "Hace 7m", false),
            Track("h3", "Bling-Bang-Bang-Born", "Creepy Nuts", "Mashle Season 2", "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80", 172, "Hace 12m", true),
            Track("h4", "Gurenge (紅蓮華)", "LiSA", "Demon Slayer", "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80", 236, "Hace 16m", false),
            Track("h5", "Renai Circulation", "Kana Hanazawa", "Bakemonogatari", "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&auto=format&fit=crop&q=80", 254, "Hace 21m", true)
        )
    )
    val history: StateFlow<List<Track>> = _history.asStateFlow()

    // Community Chat
    private val _messages = MutableStateFlow(
        listOf(
            ChatMessage("m1", "Kaito_99", "¡Saludos desde Santiago! Sonando increíble este set 🔥", "22:14", "Listener"),
            ChatMessage("m2", "DJ Sakura-chan", "¡Arigato Kaito! En 5 minutos estrenamos el nuevo remix de Ado ✨", "22:15", "DJ", isDj = true),
            ChatMessage("m3", "MikuLover", "El ecualizador en Moe Pop realza muchísimo la voz 💕", "22:17", "VIP"),
            ChatMessage("m4", "NekoSenpai", "Suban el bass boost que esta rola se presta 🐻🎧", "22:18", "Listener")
        )
    )
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    // Audio Effects Manager Reference
    val audioEffects: AudioEffectsManager = RadioPlayerService.audioEffectsManager

    // Sleep Timer
    private val _sleepTimerMinutes = MutableStateFlow<Int?>(null)
    val sleepTimerMinutes: StateFlow<Int?> = _sleepTimerMinutes.asStateFlow()
    private var sleepTimerJob: Job? = null

    // Theme Mode: Dark (Pastel Night) vs Light (Sakura Day)
    private val _isDarkTheme = MutableStateFlow(true)
    val isDarkTheme: StateFlow<Boolean> = _isDarkTheme.asStateFlow()

    init {
        startAzuraCastPolling()
        startChatPolling()
    }

    fun togglePlayPause() {
        val context = getApplication<Application>()
        if (RadioPlayerService.isPlayingFlow.value) {
            RadioPlayerService.pause(context)
        } else {
            val station = _currentStation.value
            val track = _currentTrack.value
            RadioPlayerService.play(
                context = context,
                streamUrl = station.streamUrl,
                title = track.title,
                artist = track.artist
            )
        }
    }

    fun updateStreamUrl(newUrl: String) {
        val trimmed = newUrl.trim()
        if (trimmed.isNotBlank()) {
            _currentStation.value = _currentStation.value.copy(streamUrl = trimmed)
            if (RadioPlayerService.isPlayingFlow.value) {
                RadioPlayerService.play(
                    context = getApplication(),
                    streamUrl = trimmed,
                    title = _currentTrack.value.title,
                    artist = _currentTrack.value.artist
                )
            }
        }
    }

    fun handleAuthCallback(provider: AuthProvider, uriData: String) {
        when (provider) {
            AuthProvider.DISCORD -> {
                var extractedUser = "DiscordListener"
                if (uriData.contains("access_token=")) {
                    val token = uriData.substringAfter("access_token=").substringBefore("&")
                    extractedUser = "Discord_${token.take(4)}"
                }
                val user = AuthUser(
                    id = "discord_${System.currentTimeMillis()}",
                    username = extractedUser,
                    provider = AuthProvider.DISCORD,
                    avatarUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
                )
                _currentUser.value = user
                sendChatMessage("✨ ¡Me he autenticado con mi cuenta de Discord!", usernameOverride = user.username)
            }
            AuthProvider.GOOGLE -> {
                val user = AuthUser(
                    id = "google_${System.currentTimeMillis()}",
                    username = "Oyente Google",
                    provider = AuthProvider.GOOGLE,
                    avatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                )
                _currentUser.value = user
                sendChatMessage("🌐 ¡Conectado exitosamente con Google!", usernameOverride = user.username)
            }
            AuthProvider.X -> {
                val user = AuthUser(
                    id = "x_${System.currentTimeMillis()}",
                    username = "@KumaFan",
                    provider = AuthProvider.X,
                    avatarUrl = "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80"
                )
                _currentUser.value = user
                sendChatMessage("✖️ ¡Conectado con X (Twitter)!", usernameOverride = user.username)
            }
            else -> {}
        }
    }

    fun toggleLikeCurrentTrack() {
        val current = _currentTrack.value
        _currentTrack.value = current.copy(isLiked = !current.isLiked)
    }

    fun toggleMute() {
        RadioPlayerService.toggleMute()
    }

    fun setVolume(vol: Float) {
        _volume.value = vol.coerceIn(0f, 1f)
    }

    fun setSleepTimer(minutes: Int?) {
        _sleepTimerMinutes.value = minutes
        sleepTimerJob?.cancel()
        if (minutes != null && minutes > 0) {
            sleepTimerJob = viewModelScope.launch {
                var remainingSec = minutes * 60
                while (remainingSec > 0 && isActive) {
                    delay(1000)
                    remainingSec--
                }
                if (isActive) {
                    RadioPlayerService.pause(getApplication())
                    _sleepTimerMinutes.value = null
                }
            }
        }
    }

    fun toggleTheme() {
        _isDarkTheme.value = !_isDarkTheme.value
    }

    fun loginWithProvider(provider: AuthProvider, customUsername: String = "") {
        val user = when (provider) {
            AuthProvider.DISCORD -> AuthUser(
                id = "discord_${System.currentTimeMillis()}",
                username = if (customUsername.isNotBlank()) customUsername else "KumaDiscordFan#4200",
                provider = AuthProvider.DISCORD,
                avatarUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
            )
            AuthProvider.GOOGLE -> AuthUser(
                id = "google_${System.currentTimeMillis()}",
                username = if (customUsername.isNotBlank()) customUsername else "Oyente Google",
                provider = AuthProvider.GOOGLE,
                avatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
            )
            AuthProvider.X -> AuthUser(
                id = "x_${System.currentTimeMillis()}",
                username = if (customUsername.isNotBlank()) "@$customUsername" else "@KumaOtaku",
                provider = AuthProvider.X,
                avatarUrl = "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80"
            )
            AuthProvider.GUEST -> AuthUser(
                id = "guest_${System.currentTimeMillis()}",
                username = if (customUsername.isNotBlank()) customUsername else "Oyente_${(100..999).random()}",
                provider = AuthProvider.GUEST
            )
            AuthProvider.DJ -> AuthUser(
                id = "dj_master",
                username = AuthSecurityConfig.DEFAULT_DJ_NAME,
                provider = AuthProvider.DJ,
                avatarUrl = AuthSecurityConfig.DEFAULT_DJ_AVATAR,
                isDj = true
            )
        }
        _currentUser.value = user
    }

    fun logout() {
        _currentUser.value = null
        if (_isDjAuthenticated.value) {
            _isDjAuthenticated.value = false
        }
    }

    fun authenticateDj(passkey: String): Boolean {
        if (passkey.trim() == AuthSecurityConfig.DJ_CABIN_PASSKEY) {
            _isDjAuthenticated.value = true
            _djErrorMessage.value = null
            loginWithProvider(AuthProvider.DJ)
            return true
        } else {
            _djErrorMessage.value = "Clave de cabina incorrecta. Acceso restringido."
            return false
        }
    }

    fun lockDjCabin() {
        _isDjAuthenticated.value = false
        if (_currentUser.value?.isDj == true) {
            _currentUser.value = null
        }
    }

    fun sendChatMessage(text: String, usernameOverride: String? = null) {
        if (text.isBlank()) return
        val user = _currentUser.value
        val name = usernameOverride ?: user?.username ?: "Oyente Anónimo"
        val isDjMessage = user?.isDj == true || _isDjAuthenticated.value
        val badge = when {
            isDjMessage -> "👑 DJ EN VIVO"
            user?.provider == AuthProvider.DISCORD -> "🤖 Discord"
            user?.provider == AuthProvider.GOOGLE -> "🌐 Google"
            user?.provider == AuthProvider.X -> "𝕏 Twitter"
            else -> "Oyente"
        }

        val localId = "msg_${System.currentTimeMillis()}"
        val userTypeStr = when (user?.provider) {
            AuthProvider.DISCORD -> "discord"
            AuthProvider.GOOGLE -> "google"
            AuthProvider.X -> "x"
            AuthProvider.DJ -> "dj"
            else -> if (isDjMessage) "dj" else "anonymous"
        }

        val newMsg = ChatMessage(
            id = localId,
            username = name,
            text = text.trim(),
            timestamp = "Ahora",
            badge = badge,
            isDj = isDjMessage,
            provider = user?.provider ?: AuthProvider.GUEST,
            avatarUrl = user?.avatarUrl ?: ""
        )
        _messages.value = _messages.value + newMsg

        // Sincronizar en segundo plano con el backend REST de Chat
        viewModelScope.launch {
            try {
                val req = BackendSendMessageRequest(
                    sender = name,
                    avatar = user?.avatarUrl ?: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                    text = text.trim(),
                    userType = userTypeStr,
                    isDj = isDjMessage,
                    tag = badge,
                    isSongRequest = text.startsWith("🎵") || text.contains("peticion", ignoreCase = true)
                )
                ChatApiClient.chatApi.sendMessage(req)
            } catch (e: Exception) {
                // Si el backend no responde, el mensaje permanece en la interfaz localmente
            }
        }
    }

    private fun startChatPolling() {
        viewModelScope.launch {
            while (isActive) {
                try {
                    val response = ChatApiClient.chatApi.getMessages()
                    if (response.success && response.messages.isNotEmpty()) {
                        val mapped = response.messages.mapNotNull { dto ->
                            dto.text?.let { msgText ->
                                val isDj = dto.isDj == true || dto.userType == "dj"
                                val prov = when (dto.userType) {
                                    "discord" -> AuthProvider.DISCORD
                                    "google" -> AuthProvider.GOOGLE
                                    "x" -> AuthProvider.X
                                    "dj" -> AuthProvider.DJ
                                    else -> AuthProvider.GUEST
                                }
                                val badge = dto.tag ?: when {
                                    isDj -> "👑 DJ EN VIVO"
                                    prov == AuthProvider.DISCORD -> "🤖 Discord"
                                    prov == AuthProvider.GOOGLE -> "🌐 Google"
                                    prov == AuthProvider.X -> "𝕏 Twitter"
                                    else -> "Oyente"
                                }
                                ChatMessage(
                                    id = dto.id ?: "msg_${dto.hashCode()}",
                                    username = dto.sender ?: "Oyente",
                                    text = msgText,
                                    timestamp = dto.time ?: "Ahora",
                                    badge = badge,
                                    isDj = isDj,
                                    provider = prov,
                                    avatarUrl = dto.avatar ?: "",
                                    likes = dto.likes ?: 1,
                                    isSongRequest = dto.isSongRequest == true
                                )
                            }
                        }
                        if (mapped.isNotEmpty()) {
                            _messages.value = mapped
                        }
                    }
                } catch (e: Exception) {
                    // Ignora errores temporales de conexión o servidor
                }
                delay(4000) // Sincronización cada 4 segundos
            }
        }
    }

    private fun startAzuraCastPolling() {
        viewModelScope.launch {
            while (isActive) {
                try {
                    // Polls the live stream metadata
                    val response = ApiClient.azuraCastApi.getNowPlaying(_currentStation.value.id)

                    // Update live listen URL if provided by AzuraCast mountpoint
                    response.station?.listen_url?.let { azuraListenUrl ->
                        if (azuraListenUrl.isNotBlank() && azuraListenUrl != _currentStation.value.streamUrl) {
                            _currentStation.value = _currentStation.value.copy(streamUrl = azuraListenUrl)
                        }
                    }

                    // Update listeners count
                    response.listeners?.let { l ->
                        _currentStation.value = _currentStation.value.copy(listeners = l.total)
                    }

                    // Update DJ banner: "Kuma Show con Kuma DJ" when no one live, or "{show} con {streamer}" when live
                    val isLive = response.live?.is_live == true
                    val streamer = response.live?.streamer_name?.takeIf { it.isNotBlank() }
                    if (isLive && streamer != null) {
                        val showName = response.station?.name ?: "Programa en Vivo"
                        _currentDj.value = _currentDj.value.copy(
                            name = streamer,
                            handle = "@$streamer",
                            status = "Al Aire",
                            currentShow = showName,
                            isLiveStreamer = true
                        )
                    } else {
                        _currentDj.value = _currentDj.value.copy(
                            name = "Kuma DJ",
                            handle = "@kuma_dj",
                            status = "Al Aire",
                            currentShow = "Kuma Show",
                            isLiveStreamer = false
                        )
                    }

                    // Update current song from now_playing.song
                    response.now_playing?.song?.let { azuraSong ->
                        val songTitle = azuraSong.title?.takeIf { it.isNotBlank() }
                            ?: azuraSong.text?.takeIf { it.isNotBlank() }
                            ?: "En Vivo"

                        val songArtist = azuraSong.artist?.takeIf { it.isNotBlank() }
                            ?: "Kuma Radio"

                        // Extract and resolve now_playing.song.art
                        val rawArt = azuraSong.art?.trim()?.takeIf { it.isNotBlank() }
                        val resolvedArt = when {
                            rawArt == null -> _currentTrack.value.artUrl
                            rawArt.startsWith("http://") || rawArt.startsWith("https://") -> rawArt
                            else -> RadioConfig.AZURACAST_BASE_URL.trimEnd('/') + "/" + rawArt.trimStart('/')
                        }

                        val duration = response.now_playing.duration.takeIf { it > 0 } ?: 270L

                        val updatedTrack = Track(
                            id = azuraSong.id ?: "live",
                            title = songTitle,
                            artist = songArtist,
                            album = azuraSong.album ?: "",
                            artUrl = resolvedArt,
                            durationSeconds = duration,
                            playedAt = "En Vivo",
                            isLiked = _currentTrack.value.let { prev ->
                                if (prev.title == songTitle && prev.artist == songArtist) prev.isLiked else false
                            }
                        )
                        _currentTrack.value = updatedTrack
                    }

                    // Update song history with real data from AzuraCast
                    if (response.song_history.isNotEmpty()) {
                        val realHistory = response.song_history.mapNotNull { item ->
                            val s = item.song ?: return@mapNotNull null
                            val historyArt = s.art?.trim()?.takeIf { it.isNotBlank() }?.let { raw ->
                                if (raw.startsWith("http://") || raw.startsWith("https://")) raw
                                else RadioConfig.AZURACAST_BASE_URL.trimEnd('/') + "/" + raw.trimStart('/')
                            } ?: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80"

                            Track(
                                id = "sh_${item.sh_id ?: System.currentTimeMillis()}",
                                title = s.title ?: s.text ?: "Tema Transmitido",
                                artist = s.artist ?: "Artista",
                                album = s.album ?: "",
                                artUrl = historyArt,
                                durationSeconds = item.duration.takeIf { it > 0 } ?: 180,
                                playedAt = "Reciente",
                                isLiked = false
                            )
                        }
                        if (realHistory.isNotEmpty()) {
                            _history.value = realHistory
                        }
                    }
                } catch (e: Exception) {
                    // Safe offline fallback: Keep the curated track rotation
                }
                delay(15000) // 15 seconds polling interval
            }
        }
    }
}
