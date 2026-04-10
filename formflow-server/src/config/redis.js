import Redis from 'ioredis';

let redis;

export async function connectRedis() {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    // Do NOT use lazyConnect: true — it disables automatic reconnection on drops.
    // Let ioredis manage the connection lifecycle automatically.
  });

  try {
    await redis.ping(); // verify connection is live before proceeding
    console.log('Redis connected');
  } catch (err) {
    console.error('Redis connection failed:', err.message);
    process.exit(1);
  }

  redis.on('error', (err) => console.error('Redis error:', err.message));
  redis.on('reconnecting', () => console.log('Redis reconnecting...'));
}

export function getRedis() {
  if (!redis) throw new Error('Redis not initialized');
  return redis;
}
