package stream.kuma.radio.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.annotation.OptIn
import androidx.core.app.NotificationCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import stream.kuma.radio.KumaApplication
import stream.kuma.radio.MainActivity
import stream.kuma.radio.R
import stream.kuma.radio.data.RadioConfig

class RadioPlayerService : MediaSessionService() {

    companion object {
        const val NOTIFICATION_ID = 1010
        const val ACTION_PLAY = "stream.kuma.radio.ACTION_PLAY"
        const val ACTION_PAUSE = "stream.kuma.radio.ACTION_PAUSE"
        const val ACTION_STOP = "stream.kuma.radio.ACTION_STOP"
        const val EXTRA_STREAM_URL = "extra_stream_url"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_ARTIST = "extra_artist"

        var player: ExoPlayer? = null
            private set

        var audioEffectsManager = AudioEffectsManager()
            private set

        private val _isPlayingFlow = MutableStateFlow(false)
        val isPlayingFlow = _isPlayingFlow.asStateFlow()

        private val _isBufferingFlow = MutableStateFlow(false)
        val isBufferingFlow = _isBufferingFlow.asStateFlow()

        private val _errorFlow = MutableStateFlow<String?>(null)
        val errorFlow = _errorFlow.asStateFlow()

        private val _currentTrackTitle = MutableStateFlow("Kuma Kuma Radio")
        val currentTrackTitle = _currentTrackTitle.asStateFlow()

        private val _currentTrackArtist = MutableStateFlow("En Directo")
        val currentTrackArtist = _currentTrackArtist.asStateFlow()

        fun play(context: Context, streamUrl: String = RadioConfig.DEFAULT_STREAM_URL, title: String = "Kuma Kuma Radio", artist: String = "En Directo") {
            val intent = Intent(context, RadioPlayerService::class.java).apply {
                action = ACTION_PLAY
                putExtra(EXTRA_STREAM_URL, streamUrl)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_ARTIST, artist)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun pause(context: Context) {
            val intent = Intent(context, RadioPlayerService::class.java).apply {
                action = ACTION_PAUSE
            }
            context.startService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, RadioPlayerService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    private var mediaSession: MediaSession? = null
    private var activeStreamUrl: String = RadioConfig.DEFAULT_STREAM_URL

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()

        // 1. Audio attributes for live music stream
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        // 2. HTTP Data Source with cross-protocol redirect (vital for icecast/azuracast streaming mount points)
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent("KumaRadio/2.4 (Android; ExoPlayer)")
            .setConnectTimeoutMs(20000)
            .setReadTimeoutMs(20000)
            .setAllowCrossProtocolRedirects(true)

        val mediaSourceFactory = DefaultMediaSourceFactory(this)
            .setDataSourceFactory(httpDataSourceFactory)

        // 3. Initialize ExoPlayer
        player = ExoPlayer.Builder(this)
            .setMediaSourceFactory(mediaSourceFactory)
            .setAudioAttributes(audioAttributes, true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .setHandleAudioBecomingNoisy(true)
            .build().apply {
                repeatMode = Player.REPEAT_MODE_OFF

                addListener(object : Player.Listener {
                    override fun onAudioSessionIdChanged(audioSessionId: Int) {
                        super.onAudioSessionIdChanged(audioSessionId)
                        audioEffectsManager.attachAudioSession(audioSessionId)
                    }

                    override fun onPlaybackStateChanged(playbackState: Int) {
                        super.onPlaybackStateChanged(playbackState)
                        when (playbackState) {
                            Player.STATE_BUFFERING -> {
                                _isBufferingFlow.value = true
                                _errorFlow.value = null
                            }
                            Player.STATE_READY -> {
                                _isBufferingFlow.value = false
                                _isPlayingFlow.value = playWhenReady
                                _errorFlow.value = null
                                audioEffectsManager.attachAudioSession(audioSessionId)
                                updateNotification()
                            }
                            Player.STATE_IDLE -> {
                                _isBufferingFlow.value = false
                            }
                            Player.STATE_ENDED -> {
                                _isBufferingFlow.value = false
                                _isPlayingFlow.value = false
                            }
                        }
                    }

                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        super.onIsPlayingChanged(isPlaying)
                        _isPlayingFlow.value = isPlaying
                        if (isPlaying) {
                            _isBufferingFlow.value = false
                        }
                        updateNotification()
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        super.onPlayerError(error)
                        _isBufferingFlow.value = false
                        _isPlayingFlow.value = false
                        _errorFlow.value = "Error en el punto de montaje: ${error.errorCodeName}"
                    }
                })
            }

        // 4. Open MainActivity on notification click
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // 5. Build MediaSession for system media integration
        player?.let { exo ->
            mediaSession = MediaSession.Builder(this, exo)
                .setSessionActivity(pendingIntent)
                .build()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        when (intent?.action) {
            ACTION_PLAY -> {
                val url = intent.getStringExtra(EXTRA_STREAM_URL) ?: RadioConfig.DEFAULT_STREAM_URL
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Kuma Kuma Radio"
                val artist = intent.getStringExtra(EXTRA_ARTIST) ?: "En Directo"
                _currentTrackTitle.value = title
                _currentTrackArtist.value = artist
                playStream(url, title, artist)
            }
            ACTION_PAUSE -> {
                pauseStream()
            }
            ACTION_STOP -> {
                stopStream()
            }
        }

        return START_STICKY
    }

    fun playStream(url: String, title: String, artist: String) {
        activeStreamUrl = url
        _errorFlow.value = null
        _isBufferingFlow.value = true

        startForeground(NOTIFICATION_ID, buildNotification(title, artist, isPlaying = true))

        player?.let { exo ->
            val mediaMetadata = MediaMetadata.Builder()
                .setTitle(title)
                .setArtist(artist)
                .build()

            val mediaItem = MediaItem.Builder()
                .setUri(Uri.parse(url))
                .setMediaMetadata(mediaMetadata)
                .setLiveConfiguration(
                    MediaItem.LiveConfiguration.Builder()
                        .setMaxPlaybackSpeed(1.0f)
                        .build()
                )
                .build()

            exo.setMediaItem(mediaItem)
            exo.prepare()
            exo.playWhenReady = true
        }
    }

    fun pauseStream() {
        player?.let { exo ->
            exo.playWhenReady = false
            exo.pause()
        }
        _isPlayingFlow.value = false
        _isBufferingFlow.value = false
        updateNotification()
    }

    fun stopStream() {
        player?.let { exo ->
            exo.stop()
            exo.clearMediaItems()
        }
        _isPlayingFlow.value = false
        _isBufferingFlow.value = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    fun updateMetadata(title: String, artist: String) {
        _currentTrackTitle.value = title
        _currentTrackArtist.value = artist
        player?.let { exo ->
            val current = exo.currentMediaItem
            if (current != null) {
                val updatedItem = current.buildUpon()
                    .setMediaMetadata(
                        MediaMetadata.Builder()
                            .setTitle(title)
                            .setArtist(artist)
                            .build()
                    ).build()
                exo.setMediaItem(updatedItem, false)
            }
        }
        updateNotification()
    }

    private fun updateNotification() {
        val notification = buildNotification(
            _currentTrackTitle.value,
            _currentTrackArtist.value,
            _isPlayingFlow.value
        )
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun buildNotification(title: String, artist: String, isPlaying: Boolean): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val playPauseAction = if (isPlaying) {
            val pauseIntent = Intent(this, RadioPlayerService::class.java).apply { action = ACTION_PAUSE }
            val pausePending = PendingIntent.getService(this, 1, pauseIntent, PendingIntent.FLAG_IMMUTABLE)
            NotificationCompat.Action.Builder(android.R.drawable.ic_media_pause, "Pausa", pausePending).build()
        } else {
            val playIntent = Intent(this, RadioPlayerService::class.java).apply {
                action = ACTION_PLAY
                putExtra(EXTRA_STREAM_URL, activeStreamUrl)
            }
            val playPending = PendingIntent.getService(this, 2, playIntent, PendingIntent.FLAG_IMMUTABLE)
            NotificationCompat.Action.Builder(android.R.drawable.ic_media_play, "Reproducir", playPending).build()
        }

        return NotificationCompat.Builder(this, KumaApplication.CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText("Kuma Radio Live")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .addAction(playPauseAction)
            .setOngoing(isPlaying)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onDestroy() {
        mediaSession?.run {
            player?.release()
            release()
            mediaSession = null
        }
        audioEffectsManager.release()
        super.onDestroy()
    }
}
