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

  // === AZURACAST LIVE PROXY (CORS & MIXED-CONTENT BYPASS) ===
  const defaultAzuraBase = process.env.AZURACAST_BASE_URL || 'https://radio.kumakuma.fm';
  const defaultAzuraApiKey = process.env.AZURACAST_API_KEY || '';

  const fetchAzuraData = async (targetUrl: string, apiKey: string) => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'KumaKumaRadio-ServerProxy/1.0',
    };
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    const resp = await fetch(targetUrl, { headers });
    if (!resp.ok) {
      throw new Error(`AzuraCast responded with status ${resp.status}: ${resp.statusText}`);
    }
    return await resp.json();
  };

  app.get(['/api/azuracast/nowplaying', '/api/azuracast/nowplaying/:station_id'], async (req: Request, res: Response) => {
    try {
      const rawStationId = req.params.station_id || req.query.station_id as string || '';
      const customBase = (req.query.base_url as string || defaultAzuraBase).trim().replace(/\/+$/, '');
      const apiKey = (req.query.api_key as string || defaultAzuraApiKey).trim();

      // Clean base url in case user configured full endpoint
      let cleanBase = customBase;
      let detectedStationId = rawStationId;
      if (cleanBase.includes('/api/nowplaying')) {
        const parts = cleanBase.split('/api/nowplaying');
        cleanBase = parts[0];
        if (!detectedStationId && parts[1]) {
          detectedStationId = parts[1].replace(/^\/+/, '');
        }
      }

      const stationId = detectedStationId || '1';

      // 1. Intentar llamar a /api/nowplaying/{station_id}
      let rawData: any = null;
      try {
        const targetUrl = `${cleanBase}/api/nowplaying/${encodeURIComponent(stationId)}`;
        rawData = await fetchAzuraData(targetUrl, apiKey);
      } catch (err) {
        // Fallback a /api/nowplaying (lista de todas las estaciones en AzuraCast)
        try {
          const allUrl = `${cleanBase}/api/nowplaying`;
          rawData = await fetchAzuraData(allUrl, apiKey);
        } catch {
          throw err;
        }
      }

      // Si AzuraCast devolvió un Array de estaciones, buscar la correspondiente
      let stationData: any = null;
      if (Array.isArray(rawData)) {
        const searchId = String(stationId).toLowerCase();
        stationData = rawData.find((st: any) =>
          String(st.station?.id).toLowerCase() === searchId ||
          String(st.station?.shortcode).toLowerCase() === searchId
        ) || rawData[0];
      } else if (rawData && typeof rawData === 'object') {
        stationData = rawData;
      }

      if (!stationData) {
        return res.status(404).json({ error: 'Estación no encontrada en AzuraCast' });
      }

      // Si song_history está vacío en nowplaying, intentar enriquecerlo con /api/station/{id}/history
      if (!stationData.song_history || stationData.song_history.length === 0) {
        try {
          const historyUrl = `${cleanBase}/api/station/${encodeURIComponent(stationId)}/history`;
          const historyList = await fetchAzuraData(historyUrl, apiKey);
          if (Array.isArray(historyList) && historyList.length > 0) {
            stationData.song_history = historyList;
          }
        } catch {
          // Si no está disponible o requiere auth privada, continuar con lo obtenido
        }
      }

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json(stationData);
    } catch (error: any) {
      return res.status(502).json({
        error: error.message || 'Error al conectar con AzuraCast',
        details: 'Verifica la URL del servidor AzuraCast y que el streaming esté activo.'
      });
    }
  });

  app.get('/api/azuracast/history/:station_id', async (req: Request, res: Response) => {
    try {
      const stationId = req.params.station_id;
      const customBase = (req.query.base_url as string || defaultAzuraBase).trim().replace(/\/+$/, '');
      const apiKey = (req.query.api_key as string || defaultAzuraApiKey).trim();

      const historyUrl = `${customBase}/api/station/${encodeURIComponent(stationId)}/history`;
      const historyList = await fetchAzuraData(historyUrl, apiKey);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json(historyList);
    } catch (error: any) {
      return res.status(502).json({ error: error.message || 'Error al obtener historial de AzuraCast' });
    }
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
