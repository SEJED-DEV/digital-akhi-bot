import { Redis } from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    if (redisUrl.startsWith('http://') || redisUrl.startsWith('https://')) {
      console.warn('\x1b[33m%s\x1b[0m', `[WARN] REDIS_URL starts with http(s). ioredis requires a redis:// or rediss:// connection string.`);
      console.warn('\x1b[33m%s\x1b[0m', `       If you are using Upstash, make sure to copy the "Redis Connection String" (rediss://...) instead of the "REST API" URL.`);
    } else if (redisUrl.includes('.upstash.io') && redisUrl.startsWith('redis://')) {
      console.warn('\x1b[33m%s\x1b[0m', `[WARN] REDIS_URL uses redis:// with Upstash. Upstash requires secure SSL/TLS connections.`);
      console.warn('\x1b[33m%s\x1b[0m', `       Please change the protocol in your REDIS_URL from "redis://" to "rediss://" (with two 's's).`);
    }

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          // Stop retrying and fail gracefully
          return null;
        }
        return Math.min(times * 200, 1000);
      }
    });

    redis.on('error', (err) => {
      console.error(`[ioredis] Connection error: ${err.message}`);
    });
  }
  return redis;
}


