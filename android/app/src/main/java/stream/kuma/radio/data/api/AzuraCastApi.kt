package stream.kuma.radio.data.api

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

    val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val original = chain.request()
            val requestBuilder = original.newBuilder()
            // Adjunta API Key de AzuraCast si está configurada
            if (RadioConfig.AZURACAST_API_KEY.isNotBlank()) {
                requestBuilder.header("X-API-Key", RadioConfig.AZURACAST_API_KEY)
                requestBuilder.header("Authorization", "Bearer ${RadioConfig.AZURACAST_API_KEY}")
            }
            chain.proceed(requestBuilder.build())
        }
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        })
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
