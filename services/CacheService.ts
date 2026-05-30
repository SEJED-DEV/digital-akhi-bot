import { Logger } from './Logger.js';
import { getRedis } from '../utils/RedisClient.js';

export class CacheService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static fallbackCache = new Map<string, { value: any; expiry: number }>();
  private static hasLoggedOffline = false;
  private static cleanupTimer: NodeJS.Timeout | null = null;

  private static initCleanup() {
      if (this.cleanupTimer) return;
      this.cleanupTimer = setInterval(() => {
          const now = Date.now();
          for (const [key, fallback] of this.fallbackCache.entries()) {
              if (fallback.expiry < now) {
                  this.fallbackCache.delete(key);
              }
          }
      }, 60000); // Clean every minute
  }

  private static isRedisReady(): boolean {
    try {
      const redis = getRedis();
      if (redis && redis.status === 'ready') {
        this.hasLoggedOffline = false; // Reset warning flag when connection is restored
        return true;
      }
    } catch {
      // Ignore
    }
    
    if (!this.hasLoggedOffline) {
      Logger.warn('Redis is not connected or ready. Falling back to in-memory cache.');
      this.hasLoggedOffline = true;
    }
    return false;
  }

  public static async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisReady()) {
      this.initCleanup();
      const fallback = this.fallbackCache.get(key);
      if (fallback) {
        if (fallback.expiry > Date.now()) {
          return fallback.value as T;
        }
        this.fallbackCache.delete(key);
      }
      return null;
    }

    try {
      const cached = await getRedis().get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error: any) {
      if (error.message !== 'Connection is closed.') {
        Logger.error(`Cache Get Error [${key}]:`, error);
      }
      return null;
    }
  }

  public static async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (!this.isRedisReady()) {
      this.initCleanup();
      this.fallbackCache.set(key, {
        value,
        expiry: Date.now() + ttl * 1000
      });
      return;
    }

    try {
      await getRedis().setex(key, ttl, JSON.stringify(value));
    } catch (error: any) {
      if (error.message !== 'Connection is closed.') {
        Logger.error(`Cache Set Error [${key}]:`, error);
      }
    }
  }

  public static async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  public static async del(key: string): Promise<void> {
    if (!this.isRedisReady()) {
      this.fallbackCache.delete(key);
      return;
    }

    try {
      await getRedis().del(key);
    } catch (error: any) {
      if (error.message !== 'Connection is closed.') {
        Logger.error(`Cache Del Error [${key}]:`, error);
      }
    }
  }
}

