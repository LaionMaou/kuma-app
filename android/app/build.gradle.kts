import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// local.properties no lo lee Gradle por sí solo; gradle.properties y el entorno sí.
val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

val azuraCastApiKey: String = (
    localProperties.getProperty("AZURACAST_API_KEY")
        ?: providers.gradleProperty("AZURACAST_API_KEY").orNull
        ?: providers.environmentVariable("AZURACAST_API_KEY").orNull
        ?: ""
    )
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")

android {
    namespace = "stream.kuma.radio"
    compileSdk = 35

    defaultConfig {
        applicationId = "stream.kuma.radio"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.0.19 rc-15"

        // La clave nunca se versiona: se inyecta desde local.properties o el entorno.
        buildConfigField("String", "AZURACAST_API_KEY", "\"$azuraCastApiKey\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    // Jetpack Compose BOM & UI
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    // Media3 (ExoPlayer & Foreground Playback Service)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.exoplayer.hls)
    implementation(libs.androidx.media3.session)
    implementation(libs.androidx.media3.ui)
    implementation(libs.androidx.media3.common)

    // Networking & AzuraCast JSON Parsing
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.kotlinx)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    // Async Image Loading (Coil for Jetpack Compose)
    implementation(libs.coil.compose)

    debugImplementation(libs.androidx.ui.tooling)
}
