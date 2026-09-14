package stream.kuma.radio

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import stream.kuma.radio.data.model.AuthProvider
import stream.kuma.radio.ui.navigation.BottomNavigationBar
import stream.kuma.radio.ui.navigation.Screen
import stream.kuma.radio.ui.screens.CommunityScreen
import stream.kuma.radio.ui.screens.EqualizerScreen
import stream.kuma.radio.ui.screens.HistoryScreen
import stream.kuma.radio.ui.screens.PlayerScreen
import stream.kuma.radio.ui.screens.SettingsScreen
import stream.kuma.radio.ui.theme.KumaKumaRadioTheme
import stream.kuma.radio.ui.viewmodel.RadioViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: RadioViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        handleDeepLink(intent)

        setContent {
            val isDarkTheme by viewModel.isDarkTheme.collectAsState()
            val navController = rememberNavController()

            KumaKumaRadioTheme(isDarkTheme = isDarkTheme) {
                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        BottomNavigationBar(navController = navController)
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = Screen.Player.route,
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable(Screen.Player.route) {
                            PlayerScreen(
                                viewModel = viewModel,
                                onNavigateToEqualizer = {
                                    navController.navigate(Screen.Equalizer.route)
                                }
                            )
                        }
                        composable(Screen.Equalizer.route) {
                            EqualizerScreen(
                                viewModel = viewModel,
                                onNavigateBack = {
                                    navController.popBackStack()
                                }
                            )
                        }
                        composable(Screen.History.route) {
                            HistoryScreen(viewModel = viewModel)
                        }
                        composable(Screen.Community.route) {
                            CommunityScreen(viewModel = viewModel)
                        }
                        composable(Screen.Settings.route) {
                            SettingsScreen(viewModel = viewModel)
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == "stream.kuma.radio" && uri.host == "oauth") {
            val path = uri.path ?: ""
            val fullPayload = uri.fragment ?: uri.query ?: ""
            when {
                path.contains("discord") -> {
                    viewModel.handleAuthCallback(AuthProvider.DISCORD, fullPayload)
                }
                path.contains("google") -> {
                    viewModel.handleAuthCallback(AuthProvider.GOOGLE, fullPayload)
                }
                path.contains("x") -> {
                    viewModel.handleAuthCallback(AuthProvider.X, fullPayload)
                }
            }
        }
    }
}
