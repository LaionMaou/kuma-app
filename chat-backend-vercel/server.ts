import 'dotenv/config';
import app from './api/index';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Chat Backend ejecutándose en http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - GET  /api/chat/messages`);
  console.log(`   - POST /api/chat/messages`);
  console.log(`   - POST /api/chat/messages/:id/like`);
});
