package stream.kuma.radio.data.api

import stream.kuma.radio.BuildConfig
import stream.kuma.radio.data.RadioConfig
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface AzuraCastApi {
    @GET("api/nowplaying/{station_id}")
    suspend fun getNowPlaying(
        @Path("station_id") stationId: String
    ): JsonElement

    @GET("api/nowplaying")
    suspend fun getNowPlayingAll(): JsonElement

    @GET("api/station/{station_id}/history")
    suspend fun getStationHistory(
        @Path("station_id") stationId: String
    ): JsonElement
}

object ApiClient {
    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    private val azuraCastHost: String? = runCatching {
        java.net.URI(RadioConfig.AZURACAST_BASE_URL).host
    }.getOrNull()

    private fun OkHttpClient.Builder.applyDebugLogging(): OkHttpClient.Builder = apply {
        if (BuildConfig.DEBUG) {
            addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
        }
    }

    val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val original = chain.request()
            // La credencial solo viaja al host de AzuraCast, nunca a terceros.
            val isAzuraCastHost = azuraCastHost
                ?.equals(original.url.host, ignoreCase = true) == true
            if (BuildConfig.AZURACAST_API_KEY.isNotBlank() && isAzuraCastHost) {
                chain.proceed(
                    original.newBuilder()
                        .header("X-API-Key", BuildConfig.AZURACAST_API_KEY)
                        .header("Authorization", "Bearer ${BuildConfig.AZURACAST_API_KEY}")
                        .build()
                )
            } else {
                chain.proceed(original)
            }
        }
        .applyDebugLogging()
        .build()

    // Cliente sin credenciales para imágenes y cualquier host de terceros.
    val imageOkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .applyDebugLogging()
        .build()

    val azuraCastApi: AzuraCastApi by lazy {
        val rawBase = RadioConfig.AZURACAST_BASE_URL.trim()
        val cleanBase = if (rawBase.endsWith("/")) rawBase else "$rawBase/"
        Retrofit.Builder()
            .baseUrl(cleanBase)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(AzuraCastApi::class.java)
    }
}
