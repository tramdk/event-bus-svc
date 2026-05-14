import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { publishEvent, redis } from './redis.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Health Check API
app.get('/health', async (req, res) => {
  const redisStatus = redis.status;
  
  const healthStatus = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      server: 'OK',
      redis: redisStatus === 'ready' ? 'OK' : 'DOWN'
    },
    uptime: process.uptime()
  };

  if (redisStatus !== 'ready') {
    return res.status(503).json(healthStatus);
  }

  res.json(healthStatus);
});

// Root endpoint for quick check
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f8fafc;">
      <h1 style="color: #38bdf8;">🚀 Event Bus Service</h1>
      <p>Status: <span style="color: #4ade80;">Running</span></p>
      <p style="opacity: 0.7;">Keep-alive endpoint active at <code>/health</code></p>
      <div style="margin-top: 20px; padding: 10px 20px; border: 1px solid #334155; border-radius: 8px; background: #1e293b;">
        ${new Date().toLocaleString()}
      </div>
    </div>
  `);
});

// API to publish events (for apps that don't want to use Redis directly)
app.post('/publish', async (req, res) => {
  const { stream, event, payload } = req.body;

  if (!stream || !event) {
    return res.status(400).json({ error: 'Stream and event are required' });
  }

  try {
    await publishEvent(stream, event, payload || {});

    // Also broadcast to connected WebSockets for real-time monitoring UI
    io.emit('event_published', { stream, event, payload, timestamp: Date.now() });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time monitoring via Socket.io
io.on('connection', (socket) => {
  console.log('📱 Monitor connected:', socket.id);
  socket.on('disconnect', () => console.log('📱 Monitor disconnected'));
});

httpServer.listen(PORT, () => {
  console.log(`
  🌐 Event Bus Server is running!
  ----------------------------------
  URL: http://localhost:${PORT}
  Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}
  
  Listening for events...
  ----------------------------------
  `);
});
