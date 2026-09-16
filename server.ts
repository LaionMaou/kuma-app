import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface ChatMessage {
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
}

// In-memory chat storage with initial community messages
let chatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'Kuma DJ',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    text: '🌸 ¡Bienvenidos a Kuma Kuma Radio! Transmitiendo en directo los mejores beats de anime y J-Pop 🐾✨',
    time: '18:00',
    likes: 18,
    isDj: true,
    userType: 'dj',
    tag: 'Locutor Oficial',
  },
  {
    id: 'msg-2',
    sender: 'Aoi_Chan99',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    text: '¡Increíble la calidad del stream hoy! Saludos desde Santiago de Chile 💖🎧',
    time: '18:04',
    likes: 9,
    isDj: false,
    userType: 'discord',
    tag: 'Discord Fan',
  },
  {
    id: 'msg-3',
    sender: 'Ren_Otaku',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    text: '¿Pueden poner el opening de Jujutsu Kaisen o Chainsaw Man más tarde? 🙏🔥',
    time: '18:12',
    likes: 12,
    isDj: false,
    userType: 'google',
    isSongRequest: true,
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === CHAT API ENDPOINTS ===
  // 1. Get messages
  app.get('/api/chat/messages', (_req: Request, res: Response) => {
    res.json({
      success: true,
      messages: chatMessages,
      count: chatMessages.length
    });
  });

  // 2. Post a new message
  app.post('/api/chat/messages', (req: Request, res: Response) => {
    const { sender, avatar, text, userType, isDj, tag, isSongRequest } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sender: sender || 'Oyente Anónimo',
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: 1,
      isDj: Boolean(isDj),
      userType: userType || 'anonymous',
      tag,
      isSongRequest: Boolean(isSongRequest),
    };

    chatMessages.push(newMsg);

    // Keep last 150 messages in memory
    if (chatMessages.length > 150) {
      chatMessages = chatMessages.slice(-150);
    }

    res.status(201).json({
      success: true,
      message: newMsg
    });
  });

  // 3. Like a message
  app.post('/api/chat/messages/:id/like', (req: Request, res: Response) => {
    const { id } = req.params;
    const msg = chatMessages.find(m => m.id === id);
    if (msg) {
      msg.likes += 1;
      return res.json({ success: true, likes: msg.likes });
    }
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  });

  // Healthcheck endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Vite middleware for SPA and static asset handling
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Radio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
