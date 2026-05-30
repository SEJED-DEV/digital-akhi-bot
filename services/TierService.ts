import { User } from '../models/User.js';
import { client } from '../index.js';
import { Logger } from './Logger.js';
import { getRedis } from '../utils/RedisClient.js';

// Local fallback storage for rate limits
const localRateLimits = new Map<string, number[]>();

export class TierService {
  private readonly FREE_LIMIT = 20;
  private readonly PREMIUM_LIMIT = 50;
  private readonly WINDOW_HOURS = 6;
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Run cleanup every 5 minutes to prevent memory leaks when Redis is down
    this.cleanupTimer = setInterval(() => this.cleanupLocalRateLimits(), 300000);
  }

  public destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  public async getGuildTier(guildId: string): Promise<'Free' | 'Premium' | 'SuperPremium'> {
    try {
      const { Guild } = await import('../models/Guild.js');
      const dbGuild = await Guild.findOne({ guildId });
      return dbGuild?.tier || 'Free';
    } catch (e) {
      return 'Free';
    }
  }

  public async getTierStatus(userId: string, guildId?: string | null): Promise<'Free' | 'Premium' | 'SuperPremium'> {
    if (guildId) {
        try {
            const { Guild } = await import('../models/Guild.js');
            const dbGuild = await Guild.findOne({ guildId });
            if (dbGuild && dbGuild.tier !== 'Free') {
                return dbGuild.tier;
            }

            const discordGuild = await client.guilds.fetch(guildId);
            if (discordGuild) {
                const boostCount = discordGuild.premiumSubscriptionCount || 0;
                // Support server requirement check
                const user = await User.findOne({ discordId: userId });
                const joinedSupport = user?.joinedSupportServer || false;
                if (boostCount >= 4 && joinedSupport) {
                    return 'SuperPremium';
                }
                if (boostCount >= 2) {
                    return 'Premium';
                }
            }
        } catch (e) {
            // Ignore fetch errors
        }
    }

    const user = await User.findOne({ discordId: userId });
    
    // Support server requirement check
    const joinedSupport = user?.joinedSupportServer || false;

    if (!user) return 'Free';

    // If granted by command, trust the stored tier
    if (user.byCommand) {
        return user.tier;
    }

    // Evaluate based on invites (SuperPremium requires support server & >= 50 invites)
    if (user.invites >= 50 && joinedSupport) {
        if (user.tier !== 'SuperPremium') {
            user.tier = 'SuperPremium';
            await user.save();
            Logger.info(`User ${userId} upgraded to SuperPremium tier.`);
        }
        return 'SuperPremium';
    }

    // Premium requires support server & >= 30 invites
    if (user.invites >= 30 && joinedSupport) {
        if (user.tier !== 'Premium') {
            user.tier = 'Premium';
            await user.save();
            Logger.info(`User ${userId} upgraded to Premium tier.`);
        }
        return 'Premium';
    }

    // Downgrade if requirements are no longer met
    if (user.tier !== 'Free') {
        user.tier = 'Free';
        await user.save();
        Logger.info(`User ${userId} downgraded to Free tier.`);
    }

    return 'Free';
  }


  public async checkRateLimit(userId: string, tier: string, hasBYOK: boolean = false): Promise<{ allowed: boolean; remaining: number }> {
    // BYOK users have no rate limits
    if (hasBYOK) {
        return { allowed: true, remaining: 999999 };
    }

    const key = `ratelimit:${userId}`;
    const now = Date.now();
    const windowMs = this.WINDOW_HOURS * 60 * 60 * 1000;
    
    let limit = this.FREE_LIMIT;
    if (tier === 'SuperPremium') {
      limit = 100;
    } else if (tier === 'Premium') {
      limit = this.PREMIUM_LIMIT;
    }

    try {
        const requests = await getRedis().zrangebyscore(key, now - windowMs, now);

        if (requests.length >= limit) {
            return { allowed: false, remaining: 0 };
        }

        await getRedis().zadd(key, now, now.toString());
        await getRedis().expire(key, Math.ceil(windowMs / 1000));

        return { allowed: true, remaining: limit - requests.length - 1 };
    } catch (error) {
        Logger.error('Redis Rate Limit Error, falling back to local memory:', error);

        // Local in-memory sliding window fallback
        const userRequests = localRateLimits.get(userId) || [];
        const filteredRequests = userRequests.filter(ts => ts > now - windowMs);

        if (filteredRequests.length >= limit) {
            localRateLimits.set(userId, filteredRequests);
            return { allowed: false, remaining: 0 };
        }

        filteredRequests.push(now);
        localRateLimits.set(userId, filteredRequests);

        // Clean up old entries from the map periodically if it grows too large
        if (localRateLimits.size > 1000) {
            this.cleanupLocalRateLimits();
        }

        return { allowed: true, remaining: limit - filteredRequests.length };
    }
  }

  public cleanupLocalRateLimits() {
      const now = Date.now();
      const windowMs = this.WINDOW_HOURS * 60 * 60 * 1000;
      for (const [userId, requests] of localRateLimits.entries()) {
          const filtered = requests.filter(ts => ts > now - windowMs);
          if (filtered.length === 0) {
              localRateLimits.delete(userId);
          } else {
              localRateLimits.set(userId, filtered);
          }
      }
  }

  public async updateInviteCount(userId: string, count: number) {
      await User.findOneAndUpdate(
          { discordId: userId },
          { invites: count },
          { upsert: true }
      );
  }
}
