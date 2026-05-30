import dotenv from 'dotenv';

dotenv.config();

export class ConfigService {
  private static readonly REQUIRED_VARS = [
    'DISCORD_TOKEN',
    'CLIENT_ID',
    'MONGODB_URI',
    'REDIS_URL',
    'ENCRYPTION_KEY',
    'API_KEYS',
    'SUPPORT_SERVER_ID',
    'SECURITY_ALERT_CHANNEL_ID'
  ];

  public static validate() {
    const missing = this.REQUIRED_VARS.filter(v => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (process.env.ENCRYPTION_KEY?.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
  }

  public static get(key: string): string {
    return process.env[key] || '';
  }
}
