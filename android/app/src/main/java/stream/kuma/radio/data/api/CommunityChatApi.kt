package stream.kuma.radio.data.api

import stream.kuma.radio.BuildConfig
import stream.kuma.radio.data.RadioConfig
import stream.kuma.radio.data.model.BackendChatResponse
import stream.kuma.radio.data.model.BackendDeleteMessageResponse
import stream.kuma.radio.data.model.BackendSendMessageRequest
import stream.kuma.radio.data.model.BackendSendMessageResponse
import stream.kuma.radio.data.model.BackendSongRequestListResponse
import stream.kuma.radio.data.model.BackendSongRequestResponse
import stream.kuma.radio.data.model.BackendSongRequestUpdateResponse
import stream.kuma.radio.data.model.BackendSubmitSongRequest
import stream.kuma.radio.data.model.BackendUpdateSongRequestStatus
import stream.kuma.radio.data.model.DjLoginRequest
import stream.kuma.radio.data.model.DjLoginResponse
import stream.kuma.radio.data.model.SongCatalogResponse
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

interface CommunityChatApi {
    @GET("api/chat/messages")
    suspend fun getMessages(): BackendChatResponse

    @POST("api/chat/messages")
    suspend fun sendMessage(
        @Body request: BackendSendMessageRequest,
        @Header("X-DJ-Token") djToken: String? = null
    ): BackendSendMessageResponse

    @POST("api/chat/messages/{id}/like")
    suspend fun likeMessage(
        @Path("id") messageId: String
    ): Map<String, Boolean>

    @DELETE("api/chat/messages/{id}")
    suspend fun deleteMessage(
        @Path("id") messageId: String,
        @Header("X-DJ-Token") djToken: String
    ): BackendDeleteMessageResponse

    @POST("api/dj/login")
    suspend fun loginDj(
        @Body request: DjLoginRequest
    ): DjLoginResponse

    @GET("api/requests/catalog")
    suspend fun searchRequestableSongs(
        @Query("q") query: String
    ): SongCatalogResponse

    @POST("api/requests")
    suspend fun submitSongRequest(
        @Body request: BackendSubmitSongRequest
    ): BackendSongRequestResponse

    @GET("api/requests")
    suspend fun getSongRequests(
        @Header("X-DJ-Token") djToken: String,
        @Query("status") status: String = "active"
    ): BackendSongRequestListResponse

    @PATCH("api/requests/{id}")
    suspend fun updateSongRequestStatus(
        @Path("id") requestId: String,
        @Body request: BackendUpdateSongRequestStatus,
        @Header("X-DJ-Token") djToken: String
    ): BackendSongRequestUpdateResponse
}

object ChatApiClient {
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BASIC
                })
            }
        }
        .build()

    val chatApi: CommunityChatApi by lazy {
        val base = if (RadioConfig.CHAT_BACKEND_URL.endsWith("/")) {
            RadioConfig.CHAT_BACKEND_URL
        } else {
            "${RadioConfig.CHAT_BACKEND_URL}/"
        }

        Retrofit.Builder()
            .baseUrl(base)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(CommunityChatApi::class.java)
    }
}
