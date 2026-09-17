import express, { Request, Response } from 'express';
import cors from 'cors';

export interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  isDj: boolean;
  userType: 'discord' | 'google' | 'x' | 'dj' | 'anonymous';
  tag?: string;
  isSongRequest?: boolean;
  createdAt: number;
}

const app = express();

// Habilitar CORS para permitir solicitudes desde la app de Android y la web
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json());

// Mensajes iniciales en memoria
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-seed-1',
    sender: 'Kuma DJ',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    text: '🌸 ¡Bienvenidos a la comunidad de la radio! Deja tus saludos y peticiones de canciones aquí 🐾✨',
    time: '12:00',
    likes: 12,
    isDj: true,
    userType: 'dj',
    tag: 'Locutora Oficial',
    createdAt: Date.now() - 3600000
  },
  {
    id: 'msg-seed-2',
    sender: 'Aoi_Chan99',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    text: '¡Excelente música en vivo! Saludos a toda la comunidad 💖🎧',
    time: '12:05',
    likes: 5,
    isDj: false,
    userType: 'discord',
    tag: 'Discord Listener',
    createdAt: Date.now() - 1800000
  }
];

let inMemoryMessages: ChatMessage[] = [...INITIAL_MESSAGES];

// Helper para persistencia con Upstash Redis (opcional en Vercel)
async function getStoredMessages(): Promise<ChatMessage[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const res = await fetch(`${url}/get/radio_chat_messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          const parsed = JSON.parse(data.result);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // Fallback a memoria si la red falla
    }
  }

  return inMemoryMessages;
}

async function saveStoredMessages(messages: ChatMessage[]): Promise<void> {
  inMemoryMessages = messages;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      await fetch(`${url}/set/radio_chat_messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(JSON.stringify(messages.slice(-150)))
      });
    } catch {
      // Fallback silencioso
    }
  }
}

// ---------------------------------------------------------------------------
// ENDPOINTS
// ---------------------------------------------------------------------------

// 1. Estado / Healthcheck
const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'radio-community-chat-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
};

app.get('/', healthHandler);
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// 2. Obtener lista de mensajes
const getMessagesHandler = async (_req: Request, res: Response) => {
  try {
    const messages = await getStoredMessages();
    res.json({
      success: true,
      messages: messages,
      count: messages.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al obtener mensajes' });
  }
};

app.get('/api/chat/messages', getMessagesHandler);
app.get('/messages', getMessagesHandler);

// 3. Enviar un nuevo mensaje
const postMessageHandler = async (req: Request, res: Response) => {
  try {
    const { sender, avatar, text, userType, isDj, tag, isSongRequest } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, error: 'El texto del mensaje no puede estar vacío.' });
    }

    const cleanText = text.trim().substring(0, 500); // Límite de 500 caracteres
    const cleanSender = (sender && typeof sender === 'string' && sender.trim()) 
      ? sender.trim().substring(0, 40) 
      : 'Oyente';

    const cleanAvatar = (avatar && typeof avatar === 'string' && avatar.trim())
      ? avatar.trim()
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: cleanSender,
      avatar: cleanAvatar,
      text: cleanText,
      time: timeFormatted,
      likes: 1,
      isDj: Boolean(isDj),
      userType: userType || 'anonymous',
      tag: tag || undefined,
      isSongRequest: Boolean(isSongRequest),
      createdAt: Date.now()
    };

    const currentMessages = await getStoredMessages();
    const updatedMessages = [...currentMessages, newMsg].slice(-150); // Guardar los últimos 150 mensajes
    await saveStoredMessages(updatedMessages);

    res.status(201).json({
      success: true,
      message: newMsg
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al guardar mensaje' });
  }
};

app.post('/api/chat/messages', postMessageHandler);
app.post('/messages', postMessageHandler);

// 4. Dar like a un mensaje
const likeMessageHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentMessages = await getStoredMessages();
    const msg = currentMessages.find(m => m.id === id);

    if (!msg) {
      return res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
    }

    msg.likes = (msg.likes || 0) + 1;
    await saveStoredMessages(currentMessages);

    res.json({
      success: true,
      id: msg.id,
      likes: msg.likes
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al procesar like' });
  }
};

app.post('/api/chat/messages/:id/like', likeMessageHandler);
app.post('/messages/:id/like', likeMessageHandler);

// 5. Borrar un mensaje (Moderación / DJ)
const deleteMessageHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const key = process.env.DJ_MODERATION_KEY || 'KUMA-DJ-2025';

    if (authHeader !== `Bearer ${key}` && req.headers['x-dj-key'] !== key) {
      return res.status(403).json({ success: false, error: 'Acceso denegado. Se requiere clave de moderación.' });
    }

    const currentMessages = await getStoredMessages();
    const filtered = currentMessages.filter(m => m.id !== id);
    await saveStoredMessages(filtered);

    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al eliminar mensaje' });
  }
};

app.delete('/api/chat/messages/:id', deleteMessageHandler);
app.delete('/messages/:id', deleteMessageHandler);

export default app;
