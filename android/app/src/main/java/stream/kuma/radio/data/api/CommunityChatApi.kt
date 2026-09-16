package stream.kuma.radio.data.api

import stream.kuma.radio.data.RadioConfig
import stream.kuma.radio.data.model.BackendChatResponse
import stream.kuma.radio.data.model.BackendSendMessageRequest
import stream.kuma.radio.data.model.BackendSendMessageResponse
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface CommunityChatApi {
    @GET("api/chat/messages")
    suspend fun getMessages(): BackendChatResponse

    @POST("api/chat/messages")
    suspend fun sendMessage(
        @Body request: BackendSendMessageRequest
    ): BackendSendMessageResponse

    @POST("api/chat/messages/{id}/like")
    suspend fun likeMessage(
        @Path("id") messageId: String
    ): Map<String, Boolean>
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
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        })
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
