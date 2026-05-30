import { EMOJIS } from '../utils/Emojis.js';
import { EmbedBuilder } from 'discord.js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export class Logger {
  private static formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private static async sendToDiscord(level: LogLevel, message: string, detail?: string) {
    const channelId = process.env.SECURITY_ALERT_CHANNEL_ID;
    if (!channelId) return;

    // Rate limit Discord logs (max 5 alerts per 10 minutes)
    try {
      const { CacheService } = await import('./CacheService.js');
      const limitKey = `discord_log_limit:${level}`;
      const count = await CacheService.get<number>(limitKey) || 0;
      if (count >= 5) return;
      await CacheService.set(limitKey, count + 1, 600);
    } catch (e) {
      // If cache fails, we still try to send the log but don't rate limit
      console.error('Rate limiting check failed in Logger:', e);
    }

    try {
      // Lazy load client to avoid circular dependencies
      const { client: discordClient } = await import('../index.js');
      if (!discordClient || !discordClient.isReady()) return;

      const channel = await discordClient.channels.fetch(channelId).catch(() => null);
      if (!channel || !('send' in channel) || typeof (channel as any).send !== 'function') return;

      let color = 0x3498db; // blue for info
      let emoji = EMOJIS.logging;
      if (level === 'warn') {
        color = 0xf1c40f; // yellow
        emoji = EMOJIS.warning;
      } else if (level === 'error') {
        color = 0xe74c3c; // red
        emoji = EMOJIS.alert;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${emoji} System Log [${level.toUpperCase()}]`)
        .setDescription(message.slice(0, 2048))
        .setColor(color)
        .setTimestamp();

      if (detail) {
        embed.addFields({ name: 'Details', value: `\`\`\`json\n${detail.slice(0, 1000)}\n\`\`\`` });
      }

      await (channel as any).send({ embeds: [embed] });

    } catch (err) {
      // Avoid infinite loop if logging itself fails
      console.error('Failed to forward log to Discord:', err);
    }
  }

  public static info(message: string, ...args: any[]) {
    const formatted = this.formatMessage('info', message);
    console.log(formatted, ...args);
    this.sendToDiscord('info', message, args.length ? JSON.stringify(args, null, 2) : undefined)
        .catch(err => console.error('Failed to send log to Discord:', err));
  }

  public static warn(message: string, ...args: any[]) {
    const formatted = this.formatMessage('warn', message);
    console.warn(formatted, ...args);
    this.sendToDiscord('warn', message, args.length ? JSON.stringify(args, null, 2) : undefined)
        .catch(err => console.error('Failed to send log to Discord:', err));
  }

  public static error(message: string, error?: any) {
    console.error(this.formatMessage('error', message));
    let details = '';
    if (error) {
        const sanitizedError = this.sanitizeError(error);
        details = JSON.stringify(sanitizedError, null, 2);
        console.error(details);
    }
    this.sendToDiscord('error', message, details || undefined)
        .catch(err => console.error('Failed to send log to Discord:', err));
  }

  private static sanitizeError(error: any): any {
      if (!error) return error;

      const sanitized: any = {
          message: error.message,
          name: error.name,
          code: error.code,
          status: error.response?.status
      };

      if (process.env.NODE_ENV === 'development' && error.stack) {
          sanitized.stack = error.stack;
      }

      return sanitized;
  }

  public static debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }
}

