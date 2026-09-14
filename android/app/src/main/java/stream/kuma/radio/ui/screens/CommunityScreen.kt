package stream.kuma.radio.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import stream.kuma.radio.data.AuthSecurityConfig
import stream.kuma.radio.data.model.AuthProvider
import stream.kuma.radio.ui.theme.DjPurple
import stream.kuma.radio.ui.viewmodel.RadioViewModel

@Composable
fun CommunityScreen(viewModel: RadioViewModel) {
    val context = LocalContext.current
    val messages by viewModel.messages.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val isDjAuthenticated by viewModel.isDjAuthenticated.collectAsState()
    val djErrorMessage by viewModel.djErrorMessage.collectAsState()

    var inputMessage by remember { mutableStateOf("") }
    var showAuthDialog by remember { mutableStateOf(false) }
    var showDjDialog by remember { mutableStateOf(false) }
    var djPasskeyInput by remember { mutableStateOf("") }

    val reactionEmojis = listOf("🌸", "🍙", "✨", "🎧", "💖", "🐻", "🔥", "🎌")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // Encabezado
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Comunidad en Vivo",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = "Chat de oyentes y cabina de locución",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }

            // Botón de Acceso a Cabina DJ (Enmascarado con icono sutil)
            if (!isDjAuthenticated) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f))
                        .clickable { showDjDialog = true }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Acceso DJ",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Acceso DJ",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            } else {
                // DJ Activo - Botón para bloquear cabina
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(DjPurple.copy(alpha = 0.2f))
                        .border(1.dp, DjPurple, RoundedCornerShape(20.dp))
                        .clickable { viewModel.lockDjCabin() }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "👑 DJ LIVE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = DjPurple)
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.Default.LockOpen,
                            contentDescription = "Bloquear Cabina",
                            tint = DjPurple,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Barra de estado del usuario (SSO / Anónimo / DJ)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isDjAuthenticated) DjPurple.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = when {
                            isDjAuthenticated -> "👑"
                            currentUser?.provider == AuthProvider.DISCORD -> "🤖"
                            currentUser?.provider == AuthProvider.GOOGLE -> "🌐"
                            currentUser?.provider == AuthProvider.X -> "𝕏"
                            else -> "👤"
                        },
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = currentUser?.username ?: "Modo Oyente Anónimo",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isDjAuthenticated) DjPurple else MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = if (isDjAuthenticated) "Cabina de Control Desbloqueada" else "Toca para identificarte con Discord, Google o X",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }

                if (currentUser != null || isDjAuthenticated) {
                    TextButton(onClick = { viewModel.logout() }) {
                        Text("Cerrar", fontSize = 11.sp, color = MaterialTheme.colorScheme.error)
                    }
                } else {
                    OutlinedButton(
                        onClick = { showAuthDialog = true },
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("Ingresar", fontSize = 11.sp)
                    }
                }
            }
        }

        // Panel de Cabina DJ (SOLO VISIBLE CUANDO EL DJ ESTÁ AUTENTICADO)
        if (isDjAuthenticated) {
            Spacer(modifier = Modifier.height(10.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = DjPurple.copy(alpha = 0.18f))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "🎛️ Monitor de Cabina DJ en Vivo",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = DjPurple
                        )
                        Text(
                            text = "● AL AIRE",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = Color(0xFFE91E63)
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { viewModel.sendChatMessage("¡Saludos especiales a todos los oyentes de Kuma Kuma Radio! 🌸✨") },
                            colors = ButtonDefaults.buttonColors(containerColor = DjPurple),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Text("Saludar en Vivo", fontSize = 11.sp)
                        }

                        Button(
                            onClick = { viewModel.sendChatMessage("¡Abran paso al drop! Suban ese bass boost 🔥🔊") },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF673AB7)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Text("Activar Hype", fontSize = 11.sp)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Barra de Reacciones Rápidas
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(reactionEmojis) { emoji ->
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), CircleShape)
                        .clickable { viewModel.sendChatMessage(emoji) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(emoji, fontSize = 20.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Lista de Mensajes del Chat
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(messages) { msg ->
                val isDj = msg.isDj
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(
                            if (isDj) DjPurple.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surface
                        )
                        .border(
                            1.dp,
                            if (isDj) DjPurple.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
                            RoundedCornerShape(14.dp)
                        )
                        .padding(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = when (msg.provider) {
                                    AuthProvider.DISCORD -> "🤖 "
                                    AuthProvider.GOOGLE -> "🌐 "
                                    AuthProvider.X -> "𝕏 "
                                    AuthProvider.DJ -> "👑 "
                                    else -> ""
                                },
                                fontSize = 12.sp
                            )
                            Text(
                                text = msg.username,
                                fontWeight = FontWeight.Bold,
                                color = if (isDj) DjPurple else MaterialTheme.colorScheme.primary,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (isDj) DjPurple else MaterialTheme.colorScheme.surfaceVariant
                                    )
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = msg.badge,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isDj) Color.White else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }

                        Text(
                            text = msg.timestamp,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = msg.text,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Fila de Entrada de Mensaje
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = inputMessage,
                onValueChange = { inputMessage = it },
                modifier = Modifier.weight(1f),
                placeholder = {
                    Text(
                        if (isDjAuthenticated) "Escribe como DJ Oficial..." else "Escribe un mensaje en el chat..."
                    )
                },
                shape = RoundedCornerShape(24.dp),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedIndicatorColor = if (isDjAuthenticated) DjPurple else MaterialTheme.colorScheme.primary,
                    unfocusedIndicatorColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.width(8.dp))

            IconButton(
                onClick = {
                    if (inputMessage.isNotBlank()) {
                        viewModel.sendChatMessage(inputMessage)
                        inputMessage = ""
                    }
                },
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(if (isDjAuthenticated) DjPurple else MaterialTheme.colorScheme.primary)
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = "Enviar",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }

    // Modal: Autenticación SSO para Oyentes (Discord, Google, X)
    if (showAuthDialog) {
        AlertDialog(
            onDismissRequest = { showAuthDialog = false },
            title = {
                Text("Identifícate en Kuma Radio", fontWeight = FontWeight.Bold)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Elige tu cuenta para participar en el chat con tu insignia oficial:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )

                    // Opción Discord (Abre flujo de autorización real en navegador)
                    Button(
                        onClick = {
                            try {
                                val url = AuthSecurityConfig.getDiscordAuthUrl()
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                context.startActivity(intent)
                                Toast.makeText(context, "Abriendo autorización en Discord...", Toast.LENGTH_SHORT).show()
                                showAuthDialog = false
                            } catch (e: Exception) {
                                Toast.makeText(context, "No se pudo abrir el navegador: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5865F2)),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("🤖 Conectar con Discord")
                    }

                    // Opción Google (Abre SSO oficial)
                    Button(
                        onClick = {
                            try {
                                val url = AuthSecurityConfig.getGoogleAuthUrl()
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                context.startActivity(intent)
                                Toast.makeText(context, "Abriendo autorización de Google...", Toast.LENGTH_SHORT).show()
                                showAuthDialog = false
                            } catch (e: Exception) {
                                Toast.makeText(context, "No se pudo abrir el navegador: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F9D58)),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("🌐 Iniciar sesión con Google")
                    }

                    // Opción X (Twitter)
                    Button(
                        onClick = {
                            try {
                                val url = AuthSecurityConfig.getXAuthUrl()
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                context.startActivity(intent)
                                Toast.makeText(context, "Abriendo autorización en X...", Toast.LENGTH_SHORT).show()
                                showAuthDialog = false
                            } catch (e: Exception) {
                                Toast.makeText(context, "No se pudo abrir el navegador: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF14171A)),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("𝕏 Conectar con X (Twitter)")
                    }

                    // Modo Anónimo
                    OutlinedButton(
                        onClick = {
                            viewModel.loginWithProvider(AuthProvider.GUEST)
                            showAuthDialog = false
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("👤 Continuar como Invitado")
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showAuthDialog = false }) {
                    Text("Cerrar")
                }
            }
        )
    }

    // Modal: Acceso Seguro a Cabina DJ
    if (showDjDialog) {
        AlertDialog(
            onDismissRequest = {
                showDjDialog = false
                djPasskeyInput = ""
            },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Lock, contentDescription = null, tint = DjPurple)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Acceso a Cabina DJ", fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Esta sección está restringida exclusivamente a los locutores de la radio. Ingresa la clave de acceso de cabina:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )

                    OutlinedTextField(
                        value = djPasskeyInput,
                        onValueChange = { djPasskeyInput = it },
                        label = { Text("Clave de Seguridad DJ") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    if (djErrorMessage != null) {
                        Text(
                            text = djErrorMessage ?: "",
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 11.sp
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val success = viewModel.authenticateDj(djPasskeyInput)
                        if (success) {
                            showDjDialog = false
                            djPasskeyInput = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DjPurple)
                ) {
                    Text("Desbloquear")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showDjDialog = false
                        djPasskeyInput = ""
                    }
                ) {
                    Text("Cancelar")
                }
            }
        )
    }
}
