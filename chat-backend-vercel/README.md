# 💬 Radio Community Chat Backend (Vercel Ready)

Backend Serverless para el Chat de la Comunidad y Cabina de DJ de la Radio, diseñado para desplegarse fácilmente en **Vercel** y conectarse tanto con la aplicación **Android (Retrofit)** como con el cliente **Web (React)**.

---

## 🚀 Características
- ✅ **CORS Habilitado**: Acepta peticiones de la app móvil Android, navegadores web y emuladores.
- ✅ **Serverless Ready**: Compatible con la arquitectura de funciones sin servidor de Vercel (`api/index.ts` + `vercel.json`).
- ✅ **Persistencia Opcional (Upstash Redis)**: Funciona en memoria por defecto sin necesidad de claves, o con persistencia permanente gratuita usando la integración de Upstash Redis en Vercel.
- ✅ **Moderación de Mensajes**: Endpoint protegido para que los DJs o moderadores puedan eliminar mensajes.
- ✅ **Healthcheck**: Endpoint de monitoreo `/api/health`.

---

## 📡 Endpoints de la API

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/chat/messages` | Obtiene la lista de los últimos 150 mensajes |
| `POST` | `/api/chat/messages` | Envía un nuevo mensaje o petición musical |
| `POST` | `/api/chat/messages/:id/like` | Suma un voto/like a un mensaje existente |
| `DELETE`| `/api/chat/messages/:id` | Elimina un mensaje (requiere `Authorization: Bearer <DJ_KEY>`) |
| `GET` | `/api/health` | Verificación de estado del servicio |

---

## 📦 Cómo subir este backend a tu propio repositorio de GitHub y Vercel

### Paso 1: Copiar los archivos a una carpeta separada
Puedes descargar o copiar el contenido de la carpeta `chat-backend-vercel/` en una carpeta local de tu computadora.

### Paso 2: Inicializar el repositorio Git
Abre tu terminal en la carpeta del backend y ejecuta:

```bash
git init
git add .
git commit -m "Initial commit: radio chat backend for Vercel"
```

### Paso 3: Crear el repositorio en GitHub y subir el código
1. Entra a [GitHub.com](https://github.com) y crea un nuevo repositorio (por ejemplo: `radio-chat-backend`).
2. Sube el código ejecutando los comandos que te indica GitHub:
```bash
git branch -M main
git remote add origin https://github.com/TU_USUARIO/radio-chat-backend.git
git push -u origin main
```

---

## ⚡ Despliegue en Vercel (Paso a Paso)

1. Inicia sesión en [vercel.com](https://vercel.com).
2. Haz clic en **"Add New..."** -> **"Project"**.
3. Selecciona tu repositorio de GitHub `radio-chat-backend` y haz clic en **"Import"**.
4. En la configuración de despliegue:
   - **Framework Preset**: Deja en *Other*.
   - **Root Directory**: `./` (o la raíz del proyecto).
   - **Environment Variables** (Opcional):
     - `DJ_MODERATION_KEY`: Tu clave secreta para la cabina o moderación (por defecto: `KUMA-DJ-2025`).
5. Haz clic en **"Deploy"**.
6. ¡Listo! Vercel te dará una URL pública como:
   `https://radio-chat-backend-xxxx.vercel.app`

---

## 🔗 Cómo conectar la URL de Vercel en la App

### 1. En la aplicación Android:
Abre el archivo `android/app/src/main/java/stream/kuma/radio/data/RadioConfig.kt` y actualiza la URL:

```kotlin
object RadioConfig {
    // ...
    const val CHAT_BACKEND_URL = "https://tu-proyecto.vercel.app/"
}
```

### 2. En la aplicación Web:
Abre el archivo `.env` o configura la variable de entorno:

```env
VITE_CHAT_BACKEND_URL=https://tu-proyecto.vercel.app
```

---

## 💾 Persistencia Permanente Gratuita (Opcional)

Si deseas que los mensajes se conserven para siempre en Vercel (incluso si las funciones serverless se reinician tras inactividad):
1. En el panel de tu proyecto en Vercel, ve a la pestaña **Storage**.
2. Selecciona **Upstash Redis** (plan gratuito).
3. Vercel inyectará automáticamente las variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
4. El backend detectará estas variables automáticamente y guardará los mensajes en Redis sin cambiar ni una sola línea de código.
