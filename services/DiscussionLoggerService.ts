import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { Logger } from './Logger.js';

const gzip = promisify(zlib.gzip);

export interface DiscussionEntry {
  timestamp: string;
  userMessage: string;
  botResponse: string;
  model: string;
  source?: string;
}

export class DiscussionLoggerService {
  private static readonly LOGS_DIR = './logs/discussions';
  private static readonly ARCHIVE_DIR = './archives/discussions';

  /**
   * Logs a single discussion entry to logs/discussions/<guildId>/<userId>.jsonl
   */
  public static async logDiscussion(
    guildId: string | null,
    userId: string,
    userMessage: string,
    botResponse: string,
    model: string,
    source?: string
  ): Promise<void> {
    try {
      const folderName = guildId || 'DM';
      const targetDir = path.join(this.LOGS_DIR, folderName);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, `${userId}.jsonl`);
      
      const entry: DiscussionEntry = {
        timestamp: new Date().toISOString(),
        userMessage,
        botResponse,
        model,
        source
      };

      await fs.promises.appendFile(filePath, JSON.stringify(entry) + '\n', 'utf8');
    } catch (error) {
      Logger.error('Failed to write discussion log:', error);
    }
  }

  /**
   * Recursively reads logs and archives files that haven't been modified for over 30 days.
   */
  public static async archiveOldDiscussions(daysLimit = 30): Promise<void> {
    Logger.info('Starting old discussion logs archiving check...');
    try {
      if (!fs.existsSync(this.LOGS_DIR)) return;

      const msLimit = daysLimit * 24 * 60 * 60 * 1000;
      const now = Date.now();

      // Read guilds/DMs directories
      const guilds = await fs.promises.readdir(this.LOGS_DIR);
      for (const guild of guilds) {
        const guildPath = path.join(this.LOGS_DIR, guild);
        const stat = await fs.promises.stat(guildPath);
        if (!stat.isDirectory()) continue;

        // Read user log files inside each guild directory
        const files = await fs.promises.readdir(guildPath);
        for (const file of files) {
          if (!file.endsWith('.jsonl')) continue;

          const filePath = path.join(guildPath, file);
          const fileStat = await fs.promises.stat(filePath);

          // Check if file has been inactive for the specified days limit
          if (now - fileStat.mtimeMs > msLimit) {
            await this.archiveFile(guild, file, filePath);
          }
        }
      }
      Logger.info('Discussion logs archiving check finished.');
    } catch (error) {
      Logger.error('Error during discussion logs archiving:', error);
    }
  }

  private static async archiveFile(guild: string, fileName: string, filePath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      if (!content.trim()) {
        // Just delete empty files
        await fs.promises.unlink(filePath);
        return;
      }

      const compressed = await gzip(content);
      const targetArchiveDir = path.join(this.ARCHIVE_DIR, guild);
      
      if (!fs.existsSync(targetArchiveDir)) {
        fs.mkdirSync(targetArchiveDir, { recursive: true });
      }

      // Output filename with timestamp of archiving
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const userId = path.basename(fileName, '.jsonl');
      const archivePath = path.join(targetArchiveDir, `${userId}_${timestamp}.jsonl.gz`);

      await fs.promises.writeFile(archivePath, compressed);
      await fs.promises.unlink(filePath);
      Logger.info(`Successfully archived and purged discussion log: ${filePath} -> ${archivePath}`);
    } catch (error) {
      Logger.error(`Failed to archive discussion log file ${filePath}:`, error);
    }
  }
}
