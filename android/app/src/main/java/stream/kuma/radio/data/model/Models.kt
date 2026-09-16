package stream.kuma.radio.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Station(
    val id: String,
    val name: String,
    val genre: String,
    val streamUrl: String,
    val description: String,
    val bitrate: String = "192 kbps",
    val format: String = "AAC / MP3",
    val listeners: Int = 1420
)

@Serializable
data class Track(
    val id: String,
    val title: String,
    val artist: String,
    val album: String = "",
    val artUrl: String = "",
    val durationSeconds: Long = 0,
    val playedAt: String = "En Vivo",
    val isLiked: Boolean = false
)

@Serializable
data class Dj(
    val name: String,
    val handle: String,
    val status: String = "En Vivo",
    val avatarUrl: String = "",
    val currentShow: String = "Kuma Show",
    val isLiveStreamer: Boolean = false
)

data class EqualizerBand(
    val bandIndex: Short,
    val centerFreqHz: Int,
    val label: String,
    val gainDb: Float // Range typically -12f to +12f dB
)

data class EqualizerPreset(
    val name: String,
    val gains: List<Float> // 5 bands: 60Hz, 230Hz, 910Hz, 3600Hz, 14000Hz
)

enum class AuthProvider(val label: String, val icon: String) {
    GUEST("Invitado", "👤"),
    DISCORD("Discord", "🤖"),
    GOOGLE("Google", "🌐"),
    X("X (Twitter)", "𝕏"),
    DJ("DJ En Vivo", "👑")
}

data class AuthUser(
    val id: String,
    val username: String,
    val provider: AuthProvider,
    val avatarUrl: String = "",
    val isDj: Boolean = false
)

data class ChatMessage(
    val id: String,
    val username: String,
    val text: String,
    val timestamp: String,
    val badge: String = "Listener",
    val isDj: Boolean = false,
    val provider: AuthProvider = AuthProvider.GUEST,
    val avatarUrl: String = ""
)

// AzuraCast API Response Models
@Serializable
data class AzuraCastNowPlaying(
    val station: AzuraStationInfo? = null,
    val listeners: AzuraListeners? = null,
    val now_playing: AzuraCurrentPlaying? = null,
    val live: AzuraLive? = null,
    val song_history: List<AzuraHistoryItem> = emptyList()
)

@Serializable
data class AzuraLive(
    val is_live: Boolean = false,
    val streamer_name: String? = null,
    val broadcast_start: Long? = null
)

@Serializable
data class AzuraStationInfo(
    val id: Int? = null,
    val name: String? = null,
    val description: String? = null,
    val listen_url: String? = null
)

@Serializable
data class AzuraListeners(
    val total: Int = 0,
    val unique: Int = 0
)

@Serializable
data class AzuraCurrentPlaying(
    val elapsed: Long = 0,
    val remaining: Long = 0,
    val song: AzuraSong? = null
)

@Serializable
data class AzuraSong(
    val id: String? = null,
    val title: String? = null,
    val artist: String? = null,
    val album: String? = null,
    val art: String? = null
)

@Serializable
data class AzuraHistoryItem(
    val sh_id: Long? = null,
    val played_at: Long? = null,
    val song: AzuraSong? = null
)
