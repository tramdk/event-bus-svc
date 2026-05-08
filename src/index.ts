import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { publishEvent } from './redis';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

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
