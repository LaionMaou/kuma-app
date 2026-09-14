package stream.kuma.radio.service

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

    companion object {
        private const val TAG = "AudioEffectsManager"

        val DEFAULT_PRESETS = listOf(
            EqualizerPreset("Moe Pop", listOf(4.5f, 2.0f, -1.0f, 3.5f, 5.0f)),
            EqualizerPreset("Bass Boost", listOf(7.0f, 4.5f, 1.0f, -0.5f, -1.0f)),
            EqualizerPreset("Vocal DJ", listOf(-2.0f, 1.5f, 5.0f, 3.0f, 1.0f)),
            EqualizerPreset("Sakura Acoustic", listOf(3.0f, 1.0f, 0.5f, 4.0f, 4.5f)),
            EqualizerPreset("Flat", listOf(0.0f, 0.0f, 0.0f, 0.0f, 0.0f))
        )
    }

    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var virtualizer: Virtualizer? = null
    private var loudnessEnhancer: LoudnessEnhancer? = null

    private var currentSessionId: Int = 0

    // Reactive states for Compose UI
    private val _isEnabled = MutableStateFlow(true)
    val isEnabled: StateFlow<Boolean> = _isEnabled.asStateFlow()

    private val _currentPreset = MutableStateFlow("Moe Pop")
    val currentPreset: StateFlow<String> = _currentPreset.asStateFlow()

    private val _bands = MutableStateFlow<List<EqualizerBand>>(emptyList())
    val bands: StateFlow<List<EqualizerBand>> = _bands.asStateFlow()

    private val _bassBoostStrength = MutableStateFlow(600) // 0 to 1000
    val bassBoostStrength: StateFlow<Int> = _bassBoostStrength.asStateFlow()

    private val _virtualizerStrength = MutableStateFlow(450) // 0 to 1000
    val virtualizerStrength: StateFlow<Int> = _virtualizerStrength.asStateFlow()

    private val _isLoudnessEnabled = MutableStateFlow(true)
    val isLoudnessEnabled: StateFlow<Boolean> = _isLoudnessEnabled.asStateFlow()

    init {
        // Initialize default bands state
        val initialBains = listOf(
            EqualizerBand(0, 60000, "60 Hz", 4.5f),
            EqualizerBand(1, 230000, "230 Hz", 2.0f),
            EqualizerBand(2, 910000, "910 Hz", -1.0f),
            EqualizerBand(3, 3600000, "3.6 kHz", 3.5f),
            EqualizerBand(4, 14000000, "14 kHz", 5.0f)
        )
        _bands.value = initialBains
    }

    fun attachAudioSession(audioSessionId: Int) {
        if (audioSessionId == 0 || audioSessionId == currentSessionId) return
        release()
        currentSessionId = audioSessionId

        try {
            // 1. Android Native Equalizer
            equalizer = Equalizer(0, audioSessionId).apply {
                enabled = _isEnabled.value
            }

            val numBands = equalizer?.numberOfBands?.toInt() ?: 0
            Log.d(TAG, "Native Equalizer attached. Number of bands: $numBands")

            if (numBands > 0) {
                val bandList = mutableListOf<EqualizerBand>()
                val presetGains = DEFAULT_PRESETS.firstOrNull { it.name == _currentPreset.value }?.gains
                    ?: listOf(0f, 0f, 0f, 0f, 0f)

                for (i in 0 until numBands) {
                    val bandIndex = i.toShort()
                    val centerFreq = equalizer?.getCenterFreq(bandIndex) ?: 1000
                    val freqLabel = formatFreq(centerFreq)
                    val defaultGain = presetGains.getOrElse(i) { 0f }

                    // Convert dB to millibels (1 dB = 100 mB)
                    val mB = (defaultGain * 100).toInt().coerceIn(-1500, 1500).toShort()
                    try {
                        equalizer?.setBandLevel(bandIndex, mB)
                    } catch (e: Exception) {
                        Log.w(TAG, "Error setting band level: ${e.message}")
                    }

                    bandList.add(EqualizerBand(bandIndex, centerFreq, freqLabel, defaultGain))
                }
                _bands.value = bandList
            }

            // 2. Android Native BassBoost
            bassBoost = BassBoost(0, audioSessionId).apply {
                enabled = _isEnabled.value
                if (strengthSupported) {
                    setStrength(_bassBoostStrength.value.toShort())
                }
            }

            // 3. Android Native Virtualizer (3D Sound)
            virtualizer = Virtualizer(0, audioSessionId).apply {
                enabled = _isEnabled.value
                if (strengthSupported) {
                    setStrength(_virtualizerStrength.value.toShort())
                }
            }

            // 4. Android Native LoudnessEnhancer (Audio Normalization)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
                loudnessEnhancer = LoudnessEnhancer(audioSessionId).apply {
                    enabled = _isLoudnessEnabled.value
                    setTargetGain(300) // +3.0 dB boost for punchy live radio
                }
            }

        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach Android AudioFx: ${e.message}", e)
        }
    }

    fun setEnabled(enabled: Boolean) {
        _isEnabled.value = enabled
        try {
            equalizer?.enabled = enabled
            bassBoost?.enabled = enabled
            virtualizer?.enabled = enabled
        } catch (e: Exception) {
            Log.w(TAG, "Error setting effects enabled state: ${e.message}")
        }
    }

    fun setBandLevel(bandIndex: Short, gainDb: Float) {
        val updated = _bands.value.toMutableList()
        val index = updated.indexOfFirst { it.bandIndex == bandIndex }
        if (index != -1) {
            updated[index] = updated[index].copy(gainDb = gainDb)
            _bands.value = updated
            _currentPreset.value = "Personalizado"

            try {
                val mB = (gainDb * 100).toInt().coerceIn(-1500, 1500).toShort()
                equalizer?.setBandLevel(bandIndex, mB)
            } catch (e: Exception) {
                Log.w(TAG, "Error setting band $bandIndex to ${gainDb}dB: ${e.message}")
            }
        }
    }

    fun applyPreset(preset: EqualizerPreset) {
        _currentPreset.value = preset.name
        val currentList = _bands.value
        val updated = currentList.mapIndexed { idx, band ->
            val gain = preset.gains.getOrElse(idx) { 0f }
            try {
                val mB = (gain * 100).toInt().coerceIn(-1500, 1500).toShort()
                equalizer?.setBandLevel(band.bandIndex, mB)
            } catch (e: Exception) {
                Log.w(TAG, "Error applying preset band $idx: ${e.message}")
            }
            band.copy(gainDb = gain)
        }
        _bands.value = updated
    }

    fun setBassBoost(strength: Int) {
        _bassBoostStrength.value = strength.coerceIn(0, 1000)
        try {
            if (bassBoost?.strengthSupported == true) {
                bassBoost?.setStrength(_bassBoostStrength.value.toShort())
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error setting bass boost: ${e.message}")
        }
    }

    fun setVirtualizer(strength: Int) {
        _virtualizerStrength.value = strength.coerceIn(0, 1000)
        try {
            if (virtualizer?.strengthSupported == true) {
                virtualizer?.setStrength(_virtualizerStrength.value.toShort())
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error setting virtualizer: ${e.message}")
        }
    }

    fun setLoudnessEnhancer(enabled: Boolean) {
        _isLoudnessEnabled.value = enabled
        try {
            loudnessEnhancer?.enabled = enabled
        } catch (e: Exception) {
            Log.w(TAG, "Error setting loudness enhancer: ${e.message}")
        }
    }

    fun release() {
        try {
            equalizer?.release()
            bassBoost?.release()
            virtualizer?.release()
            loudnessEnhancer?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing audio effects: ${e.message}")
        } finally {
            equalizer = null
            bassBoost = null
            virtualizer = null
            loudnessEnhancer = null
            currentSessionId = 0
        }
    }

    private fun formatFreq(milliHz: Int): String {
        val hz = milliHz / 1000
        return if (hz >= 1000) "${hz / 1000} kHz" else "$hz Hz"
    }
}
