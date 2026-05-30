import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TierService } from '../../../services/TierService.js';

// Mock Redis
vi.mock('ioredis', () => {
  class Redis {
      zrangebyscore = vi.fn().mockResolvedValue([]);
      zadd = vi.fn().mockResolvedValue(1);
      expire = vi.fn().mockResolvedValue(1);
  }
  return { Redis };
});

// Mock client and models
vi.mock('../../../index.js', () => ({
  client: {
    guilds: {
      fetch: vi.fn().mockResolvedValue({ premiumSubscriptionCount: 0 }),
    },
  },
}));

vi.mock('../../../models/User.js', () => ({
    User: {
        findOne: vi.fn().mockResolvedValue(null),
        findOneAndUpdate: vi.fn().mockResolvedValue({}),
    }
}));

describe('TierService', () => {
  let tierService: TierService;

  beforeEach(() => {
    tierService = new TierService();
  });

  it('should return Free tier for new user', async () => {
    const status = await tierService.getTierStatus('user123');
    expect(status).toBe('Free');
  });

  it('should allow request within limits', async () => {
    const result = await tierService.checkRateLimit('user123', 'Free');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
  });
});
