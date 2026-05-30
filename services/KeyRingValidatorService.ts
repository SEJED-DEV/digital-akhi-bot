import { client } from '../index.js';
import { User } from '../models/User.js';
import { decrypt } from './EncryptionService.js';
import axios from 'axios';
import { EMOJIS } from '../utils/Emojis.js';
import { Logger } from './Logger.js';

export class KeyRingValidatorService {
  /**
   * Validates a specific API key profile for a user.
   * If it fails, it can automatically try to rotate to the next available profile.
   */
  public static async validateAndRotate(userId: string): Promise<{ provider: string; key: string } | null> {
    const user = await User.findOne({ discordId: userId });
    if (!user || !user.byokProfiles || user.byokProfiles.length === 0) return null;

    let attempts = 0;
    let currentIndex = user.selectedProfileIndex;

    while (attempts < user.byokProfiles.length) {
      const profile = user.byokProfiles[currentIndex];
      try {
        const decryptedKey = decrypt(profile.key);
        const isValid = await this.testKey(profile.provider, decryptedKey);

        if (isValid) {
          // If we rotated, update the user's selected profile
          if (currentIndex !== user.selectedProfileIndex) {
            user.selectedProfileIndex = currentIndex;
            await user.save();
            await this.notifyRotation(userId, profile.name);
          }
          return { provider: profile.provider, key: decryptedKey };
        } else {
          throw new Error('Key validation failed');
        }
      } catch (error) {
        Logger.warn(`Key profile "${profile.name}" for user ${userId} failed validation. Rotating...`);
        currentIndex = (currentIndex + 1) % user.byokProfiles.length;
        attempts++;
      }
    }

    return null;
  }

  private static async testKey(provider: string, key: string): Promise<boolean> {
    try {
      let url = '';
      let headers: any = { 'Content-Type': 'application/json' };

      switch (provider.toLowerCase()) {
        case 'groq':
          url = 'https://api.groq.com/openai/v1/models';
          headers['Authorization'] = `Bearer ${key}`;
          break;
        case 'gemini':
          url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
          break;
        case 'openrouter':
          url = 'https://openrouter.ai/api/v1/models';
          headers['Authorization'] = `Bearer ${key}`;
          break;
        case 'cerebras':
          url = 'https://api.cerebras.ai/v1/models';
          headers['Authorization'] = `Bearer ${key}`;
          break;
        case 'sambanova':
          url = 'https://api.sambanova.ai/v1/models';
          headers['Authorization'] = `Bearer ${key}`;
          break;
        case 'together':
          url = 'https://api.together.xyz/v1/models';
          headers['Authorization'] = `Bearer ${key}`;
          break;
        default:
          return false;
      }

      const response = await axios.get(url, { headers, timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private static async notifyRotation(userId: string, profileName: string) {
    try {
      const discordUser = await client.users.fetch(userId);
      if (discordUser) {
        await discordUser.send({
          content: `${EMOJIS.warning} **API Key Failover Alert**\nYour active API key profile failed. I have automatically switched to your backup profile: **${profileName}**.`
        }).catch(() => {}); // Ignore if DMs are closed
      }
    } catch (e) {
      // Silent fail
    }
  }
}
