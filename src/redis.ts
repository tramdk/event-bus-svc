import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);

redis.on('connect', () => console.log('🚀 Connected to Redis'));
redis.on('error', (err) => console.error('❌ Redis Error:', err));

/**
 * Publish an event to a Redis Stream
 */
export async function publishEvent(stream: string, eventType: string, payload: any) {
  try {
    const message = {
      event: eventType,
      payload: payload,
      timestamp: Date.now().toString()
    };
    
    // XADD stream * key value ...
    const result = await redis.xadd(stream, '*', 'data', JSON.stringify(message));
    console.log(`[EventBus] Published ${eventType} to ${stream} (ID: ${result})`);
    return result;
  } catch (err) {
    console.error('[EventBus] Publish error:', err);
    throw err;
  }
}
