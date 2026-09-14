package stream.kuma.radio.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = PastelNightPrimary,
    secondary = PastelNightSecondary,
    tertiary = PastelNightTertiary,
    background = PastelNightBackground,
    surface = PastelNightSurface,
    surfaceVariant = PastelNightSurfaceVariant,
    onPrimary = PastelNightBackground,
    onSecondary = PastelNightBackground,
    onBackground = PastelNightText,
    onSurface = PastelNightText,
    outline = PastelNightBorder
)

private val LightColorScheme = lightColorScheme(
    primary = SakuraDayPrimary,
    secondary = SakuraDaySecondary,
    tertiary = SakuraDayTertiary,
    background = SakuraDayBackground,
    surface = SakuraDaySurface,
    surfaceVariant = SakuraDaySurfaceVariant,
    onPrimary = SakuraDaySurface,
    onSecondary = SakuraDaySurface,
    onBackground = SakuraDayText,
    onSurface = SakuraDayText,
    outline = SakuraDayBorder
)

@Composable
fun KumaKumaRadioTheme(
    isDarkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = if (isDarkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !isDarkTheme
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !isDarkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
