package stream.kuma.radio.data.api

import stream.kuma.radio.data.RadioConfig
import stream.kuma.radio.data.model.AzuraCastNowPlaying
import kotlinx.serialization.json.Json
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
    ): AzuraCastNowPlaying
}

object ApiClient {
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
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
        Retrofit.Builder()
            .baseUrl(RadioConfig.AZURACAST_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(AzuraCastApi::class.java)
    }
}
