package stream.kuma.radio.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import stream.kuma.radio.data.RadioConfig
import stream.kuma.radio.data.api.ApiClient
import stream.kuma.radio.data.api.ChatApiClient
import stream.kuma.radio.data.model.AuthProvider
import stream.kuma.radio.data.model.AuthUser
import stream.kuma.radio.data.model.BackendChatMessageDto
import stream.kuma.radio.data.model.BackendLiveStatus
import stream.kuma.radio.data.model.BackendSendMessageRequest
import stream.kuma.radio.data.model.BackendSongRequestDto
import stream.kuma.radio.data.model.BackendSubmitSongRequest
import stream.kuma.radio.data.model.BackendUpdateSongRequestStatus
import stream.kuma.radio.data.model.DjLoginRequest
import stream.kuma.radio.data.model.ChatMessage
import stream.kuma.radio.data.model.SongCatalogItem
import stream.kuma.radio.data.model.Dj
import stream.kuma.radio.data.model.EqualizerBand
import stream.kuma.radio.data.model.EqualizerPreset
import stream.kuma.radio.data.model.Station
import stream.kuma.radio.data.model.Track
import stream.kuma.radio.service.AudioEffectsManager
import stream.kuma.radio.service.RadioPlayerService
import stream.kuma.radio.data.model.AzuraCastNowPlaying
import stream.kuma.radio.data.model.AzuraHistoryItem
import stream.kuma.radio.data.model.AzuraSong
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import retrofit2.HttpException

class RadioViewModel(application: Application) : AndroidViewModel(application) {

    // User Authentication State
    private val _currentUser = MutableStateFlow<AuthUser?>(null)
    val currentUser: StateFlow<AuthUser?> = _currentUser.asStateFlow()

    // DJ Cabin Status (Masked for normal listeners)
    private val _isDjAuthenticated = MutableStateFlow(false)
    val isDjAuthenticated: StateFlow<Boolean> = _isDjAuthenticated.asStateFlow()

    private val _djErrorMessage = MutableStateFlow<String?>(null)
    val djErrorMessage: StateFlow<String?> = _djErrorMessage.asStateFlow()

    // Token de cabina emitido por el backend; nunca se deriva de una clave local.
    private var djToken: String? = null
    private var djTokenExpiresAt: Long = 0L

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

    // Avisos de una sola vez para la interfaz (snackbar).
    private val _uiEvent = MutableStateFlow<String?>(null)
    val uiEvent: StateFlow<String?> = _uiEvent.asStateFlow()

    // Ids borrados por el DJ que el polling todavía podría devolver.
    private val deletedServerIds = mutableSetOf<String>()

    // Pedidos de canciones
    private val _songCatalog = MutableStateFlow<List<SongCatalogItem>>(emptyList())
    val songCatalog: StateFlow<List<SongCatalogItem>> = _songCatalog.asStateFlow()

    private val _isSearchingSongs = MutableStateFlow(false)
    val isSearchingSongs: StateFlow<Boolean> = _isSearchingSongs.asStateFlow()

    private val _isSubmittingSongRequest = MutableStateFlow(false)
    val isSubmittingSongRequest: StateFlow<Boolean> = _isSubmittingSongRequest.asStateFlow()

    private val _songRequests = MutableStateFlow<List<BackendSongRequestDto>>(emptyList())
    val songRequests: StateFlow<List<BackendSongRequestDto>> = _songRequests.asStateFlow()

    private val _liveStatus = MutableStateFlow(BackendLiveStatus())
    val liveStatus: StateFlow<BackendLiveStatus> = _liveStatus.asStateFlow()

    private var catalogSearchJob: Job? = null

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

    fun loginAsGuest(customUsername: String = "") {
        _currentUser.value = AuthUser(
            id = "guest_${System.currentTimeMillis()}",
            username = if (customUsername.isNotBlank()) customUsername else "Oyente_${(100..999).random()}",
            provider = AuthProvider.GUEST
        )
    }

    private fun loginAsDj() {
        _currentUser.value = AuthUser(
            id = "dj_master",
            username = RadioConfig.DEFAULT_DJ_NAME,
            provider = AuthProvider.DJ,
            avatarUrl = RadioConfig.DEFAULT_DJ_AVATAR,
            isDj = true
        )
    }

    fun logout() {
        _currentUser.value = null
        clearDjSession()
    }

    fun authenticateDj(passkey: String) {
        val trimmed = passkey.trim()
        if (trimmed.isBlank()) {
            _djErrorMessage.value = "Ingresa la clave de cabina."
            return
        }
        _djErrorMessage.value = null
        viewModelScope.launch {
            try {
                val response = ChatApiClient.chatApi.loginDj(DjLoginRequest(trimmed))
                val token = response.token
                if (response.success && !token.isNullOrBlank()) {
                    djToken = token
                    djTokenExpiresAt = response.expiresAt ?: 0L
                    _isDjAuthenticated.value = true
                    loginAsDj()
                } else {
                    _djErrorMessage.value = "Clave de cabina incorrecta. Acceso restringido."
                }
            } catch (e: HttpException) {
                _djErrorMessage.value = when (e.code()) {
                    401 -> "Clave de cabina incorrecta. Acceso restringido."
                    503 -> "La cabina DJ no está configurada en el servidor."
                    else -> "No se pudo validar la clave (${e.code()})."
                }
            } catch (e: Exception) {
                _djErrorMessage.value = "Sin conexión con el servidor. Inténtalo de nuevo."
            }
        }
    }

    fun lockDjCabin() {
        clearDjSession()
        if (_currentUser.value?.isDj == true) {
            _currentUser.value = null
        }
    }

    private fun clearDjSession() {
        djToken = null
        djTokenExpiresAt = 0L
        _isDjAuthenticated.value = false
        _songRequests.value = emptyList()
    }

    fun consumeUiEvent() {
        _uiEvent.value = null
    }

    private fun emitEvent(message: String) {
        _uiEvent.value = message
    }

    private fun requireDjToken(notifyExpired: Boolean = true): String? {
        val token = djToken
        val valid = _isDjAuthenticated.value && !token.isNullOrBlank() &&
            (djTokenExpiresAt <= 0L || djTokenExpiresAt > System.currentTimeMillis())
        if (!valid) {
            clearDjSession()
            if (notifyExpired) emitEvent("La sesión de cabina venció. Vuelve a ingresar la clave.")
            return null
        }
        return token
    }

    fun deleteChatMessage(message: ChatMessage) {
        val token = requireDjToken() ?: return
        val serverId = message.serverId
        if (serverId.isNullOrBlank()) {
            emitEvent("Ese mensaje todavía no está sincronizado. Espera unos segundos.")
            return
        }

        val previous = _messages.value
        deletedServerIds.add(serverId)
        _messages.value = previous.filterNot { it.serverId == serverId }

        viewModelScope.launch {
            try {
                val response = ChatApiClient.chatApi.deleteMessage(serverId, token)
                if (!response.success) {
                    throw IllegalStateException(response.error ?: "El servidor no confirmó el borrado")
                }
                emitEvent("Mensaje eliminado.")
            } catch (e: HttpException) {
                deletedServerIds.remove(serverId)
                _messages.value = previous
                when (e.code()) {
                    403 -> {
                        clearDjSession()
                        emitEvent("La sesión de cabina venció. Vuelve a ingresar la clave.")
                    }
                    404 -> emitEvent("Ese mensaje ya no existía.")
                    else -> emitEvent("No se pudo eliminar el mensaje (${e.code()}).")
                }
            } catch (e: Exception) {
                deletedServerIds.remove(serverId)
                _messages.value = previous
                emitEvent("Sin conexión: no se pudo eliminar el mensaje.")
            }
        }
    }

    private fun mapBackendMessage(dto: BackendChatMessageDto): ChatMessage? {
        val text = dto.text ?: return null
        val serverId = dto.id?.takeIf { it.isNotBlank() }
        val isDj = dto.isDj == true || dto.userType == "dj"
        val provider = when (dto.userType) {
            "discord" -> AuthProvider.DISCORD
            "google" -> AuthProvider.GOOGLE
            "x" -> AuthProvider.X
            "dj" -> AuthProvider.DJ
            else -> AuthProvider.GUEST
        }
        val badge = dto.tag ?: when {
            isDj -> "👑 DJ EN VIVO"
            provider == AuthProvider.DISCORD -> "🤖 Discord"
            provider == AuthProvider.GOOGLE -> "🌐 Google"
            provider == AuthProvider.X -> "𝕏 Twitter"
            else -> "Oyente"
        }
        return ChatMessage(
            id = serverId ?: "local_${dto.hashCode()}",
            username = dto.sender ?: "Oyente",
            text = text,
            timestamp = dto.time ?: "Ahora",
            badge = badge,
            isDj = isDj,
            provider = provider,
            avatarUrl = dto.avatar ?: "",
            likes = dto.likes ?: 1,
            isSongRequest = dto.isSongRequest == true,
            serverId = serverId
        )
    }

    fun searchRequestableSongs(query: String) {
        val trimmed = query.trim()
        if (trimmed.length < 2) {
            _songCatalog.value = emptyList()
            return
        }

        catalogSearchJob?.cancel()
        catalogSearchJob = viewModelScope.launch {
            delay(350)
            _isSearchingSongs.value = true
            try {
                val response = ChatApiClient.chatApi.searchRequestableSongs(trimmed)
                _songCatalog.value = response.results
            } catch (e: Exception) {
                _songCatalog.value = emptyList()
                emitEvent("No se pudo buscar en el catálogo. Revisa la conexión.")
            } finally {
                _isSearchingSongs.value = false
            }
        }
    }

    fun clearSongCatalog() {
        catalogSearchJob?.cancel()
        _songCatalog.value = emptyList()
        _isSearchingSongs.value = false
    }

    fun submitSongRequest(query: String, song: SongCatalogItem?, message: String?) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) {
            emitEvent("Elegí una canción para pedir.")
            return
        }
        if (_isSubmittingSongRequest.value) return

        _isSubmittingSongRequest.value = true
        viewModelScope.launch {
            try {
                val response = ChatApiClient.chatApi.submitSongRequest(
                    BackendSubmitSongRequest(
                        query = trimmed,
                        requestedBy = _currentUser.value?.username ?: "Oyente",
                        requestId = song?.requestId?.takeIf { it.isNotBlank() },
                        message = message?.trim()?.takeIf { it.isNotBlank() }
                    )
                )
                response.live?.let { _liveStatus.value = it }
                val label = song?.let { "${it.artist} - ${it.title}".trim(' ', '-') } ?: trimmed
                if (response.status == "queued") {
                    emitEvent("🎵 Pedido en cola: $label")
                } else {
                    emitEvent("Pedido recibido: el DJ lo revisará.")
                }
            } catch (e: HttpException) {
                emitEvent(
                    when (e.code()) {
                        409 -> "Ese pedido ya está en la lista. Esperá a que el DJ lo ponga."
                        429 -> "Demasiados pedidos seguidos. Probá en unos minutos."
                        400 -> "El pedido está incompleto."
                        else -> "No se pudo enviar el pedido (${e.code()})."
                    }
                )
            } catch (e: Exception) {
                emitEvent("Sin conexión: no se pudo enviar el pedido.")
            } finally {
                _isSubmittingSongRequest.value = false
            }
        }
    }

    fun loadSongRequests() {
        val token = requireDjToken(notifyExpired = false) ?: return
        viewModelScope.launch {
            try {
                val response = ChatApiClient.chatApi.getSongRequests(token)
                if (response.success) {
                    _songRequests.value = response.requests
                    response.live?.let { _liveStatus.value = it }
                }
            } catch (e: HttpException) {
                if (e.code() == 403) {
                    clearDjSession()
                    emitEvent("La sesión de cabina venció. Vuelve a ingresar la clave.")
                }
            } catch (_: Exception) {
                // Un refresco fallido no debe vaciar la lista que ya se ve.
            }
        }
    }

    fun updateSongRequestStatus(requestId: String, status: String) {
        val token = requireDjToken() ?: return
        viewModelScope.launch {
            try {
                val response = ChatApiClient.chatApi.updateSongRequestStatus(
                    requestId = requestId,
                    request = BackendUpdateSongRequestStatus(status),
                    djToken = token
                )
                val updated = response.request
                if (response.success && updated != null) {
                    _songRequests.value = _songRequests.value
                        .map { if (it.id == requestId) updated else it }
                        .filter { it.status == "pending" || it.status == "queued" }
                } else {
                    emitEvent("No se pudo actualizar el pedido.")
                }
            } catch (e: HttpException) {
                when (e.code()) {
                    403 -> {
                        clearDjSession()
                        emitEvent("La sesión de cabina venció. Vuelve a ingresar la clave.")
                    }
                    404 -> emitEvent("Ese pedido ya no existe.")
                    else -> emitEvent("No se pudo actualizar el pedido (${e.code()}).")
                }
            } catch (e: Exception) {
                emitEvent("Sin conexión: no se pudo actualizar el pedido.")
            }
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
                val validDjToken = if (isDjMessage) requireDjToken(notifyExpired = false) else null
                val response = ChatApiClient.chatApi.sendMessage(req, validDjToken)
                val serverId = response.message?.id
                if (response.success && !serverId.isNullOrBlank()) {
                    // El mensaje optimista adopta el id real para poder moderarlo.
                    _messages.value = _messages.value.map {
                        if (it.id == localId) it.copy(serverId = serverId) else it
                    }
                }
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
                        val serverIds = response.messages.mapNotNull { it.id?.takeIf { id -> id.isNotBlank() } }

                        // Un mensaje borrado por el DJ no puede reaparecer en el siguiente poll.
                        deletedServerIds.removeAll { it !in serverIds }

                        val mapped = response.messages
                            .mapNotNull { mapBackendMessage(it) }
                            .filterNot { message ->
                                val id = message.serverId
                                id != null && id in deletedServerIds
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

    private fun parseAzuraSong(azuraSong: AzuraSong?): Pair<String, String> {
        if (azuraSong == null) return "Música en Vivo" to "Kuma Radio"
        var title = azuraSong.title?.trim().orEmpty()
        var artist = azuraSong.artist?.trim().orEmpty()
        val text = azuraSong.text?.trim().orEmpty()

        // Si title o artist están vacíos pero text contiene "Artista - Canción"
        if ((title.isEmpty() || artist.isEmpty()) && text.isNotEmpty()) {
            if (text.contains(" - ")) {
                val parts = text.split(" - ", limit = 2)
                if (artist.isEmpty()) artist = parts[0].trim()
                if (title.isEmpty() && parts.size > 1) title = parts[1].trim()
            } else {
                if (title.isEmpty()) title = text
                if (artist.isEmpty()) artist = "Kuma Radio"
            }
        }

        if (title.isEmpty()) title = if (text.isNotEmpty()) text else "Música en Vivo"
        if (artist.isEmpty()) artist = "Kuma Radio"

        return title to artist
    }

    private fun resolveAzuraArtUrl(art: String?): String {
        val clean = art?.trim().orEmpty()
        return when {
            clean.isEmpty() -> "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80"
            clean.startsWith("http://") || clean.startsWith("https://") -> clean
            else -> RadioConfig.AZURACAST_BASE_URL.trimEnd('/') + "/" + clean.trimStart('/')
        }
    }

    private fun startAzuraCastPolling() {
        viewModelScope.launch {
            while (isActive) {
                try {
                    val stationId = _currentStation.value.id.ifBlank { RadioConfig.AZURACAST_DEFAULT_STATION_ID }

                    // 1. Obtener NowPlaying (intenta por estación o fallback a todas las estaciones)
                    val rawElement: JsonElement = try {
                        ApiClient.azuraCastApi.getNowPlaying(stationId)
                    } catch (e: Exception) {
                        try {
                            ApiClient.azuraCastApi.getNowPlayingAll()
                        } catch (allEx: Exception) {
                            throw e
                        }
                    }

                    val nowPlayingData: AzuraCastNowPlaying? = when (rawElement) {
                        is JsonObject -> {
                            ApiClient.json.decodeFromJsonElement<AzuraCastNowPlaying>(rawElement)
                        }
                        is JsonArray -> {
                            // Si AzuraCast devolvió una lista con todas las estaciones, buscar la coincidente o la primera
                            val matchingObj = rawElement.filterIsInstance<JsonObject>().firstOrNull { obj ->
                                val st = obj["station"]?.jsonObject
                                val id = st?.get("id")?.jsonPrimitive?.contentOrNull
                                val shortcode = st?.get("shortcode")?.jsonPrimitive?.contentOrNull
                                id.equals(stationId, ignoreCase = true) || shortcode.equals(stationId, ignoreCase = true)
                            } ?: rawElement.filterIsInstance<JsonObject>().firstOrNull()

                            matchingObj?.let { ApiClient.json.decodeFromJsonElement<AzuraCastNowPlaying>(it) }
                        }
                        else -> null
                    }

                    if (nowPlayingData != null) {
                        // Actualiza enlace de escucha en vivo si el mountpoint lo provee
                        nowPlayingData.station?.listen_url?.let { azuraListenUrl ->
                            if (azuraListenUrl.isNotBlank() && azuraListenUrl != _currentStation.value.streamUrl) {
                                _currentStation.value = _currentStation.value.copy(streamUrl = azuraListenUrl)
                            }
                        }

                        // Actualiza conteo de oyentes
                        nowPlayingData.listeners?.let { l ->
                            val totalListeners = if (l.total > 0) l.total else l.current
                            if (totalListeners > 0) {
                                _currentStation.value = _currentStation.value.copy(listeners = totalListeners)
                            }
                        }

                        // Actualiza banner de DJ
                        val isLive = nowPlayingData.live?.is_live == true
                        val streamer = nowPlayingData.live?.streamer_name?.takeIf { it.isNotBlank() }
                        if (isLive && streamer != null) {
                            val showName = nowPlayingData.station?.name ?: "Programa en Vivo"
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

                        // Actualiza canción en reproducción desde now_playing.song (evaluando título y texto)
                        nowPlayingData.now_playing?.song?.let { azuraSong ->
                            val (songTitle, songArtist) = parseAzuraSong(azuraSong)
                            val resolvedArt = resolveAzuraArtUrl(azuraSong.art)
                            val duration = nowPlayingData.now_playing.duration.toLong().takeIf { it > 0 } ?: 210L

                            val updatedTrack = Track(
                                id = azuraSong.id ?: "live_${System.currentTimeMillis()}",
                                title = songTitle,
                                artist = songArtist,
                                album = azuraSong.album.orEmpty(),
                                artUrl = resolvedArt,
                                durationSeconds = duration,
                                playedAt = "En Vivo",
                                isLiked = _currentTrack.value.let { prev ->
                                    if (prev.title == songTitle && prev.artist == songArtist) prev.isLiked else false
                                }
                            )
                            _currentTrack.value = updatedTrack
                        }

                        // Actualiza historial de canciones
                        var historyItems = nowPlayingData.song_history

                        // Si song_history vino vacío en el objeto nowplaying, intentar /api/station/{id}/history
                        if (historyItems.isEmpty()) {
                            try {
                                val historyElement = ApiClient.azuraCastApi.getStationHistory(stationId)
                                if (historyElement is JsonArray) {
                                    historyItems = historyElement.mapNotNull { itemJson ->
                                        try {
                                            ApiClient.json.decodeFromJsonElement<AzuraHistoryItem>(itemJson)
                                        } catch (_: Exception) {
                                            null
                                        }
                                    }
                                }
                            } catch (_: Exception) {}
                        }

                        if (historyItems.isNotEmpty()) {
                            val realHistory = historyItems.mapNotNull { item ->
                                val s = item.song ?: return@mapNotNull null
                                val (hTitle, hArtist) = parseAzuraSong(s)
                                val historyArt = resolveAzuraArtUrl(s.art)

                                val playedTimeStr = item.played_at?.let { ts ->
                                    val date = java.util.Date(ts * 1000)
                                    val sdf = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
                                    "Emitido a las ${sdf.format(date)}"
                                } ?: "Reciente"

                                Track(
                                    id = "sh_${item.sh_id ?: System.currentTimeMillis()}",
                                    title = hTitle,
                                    artist = hArtist,
                                    album = s.album.orEmpty(),
                                    artUrl = historyArt,
                                    durationSeconds = item.duration.toLong().takeIf { it > 0 } ?: 180L,
                                    playedAt = playedTimeStr,
                                    isLiked = false
                                )
                            }
                            if (realHistory.isNotEmpty()) {
                                _history.value = realHistory
                            }
                        }
                    }
                } catch (e: Exception) {
                    // Safe offline fallback: Mantiene rotación anterior sin interrumpir audio
                }
                delay(15000) // Sincronización cada 15 segundos
            }
        }
    }
}
