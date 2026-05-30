import cron from 'node-cron';
import zlib from 'zlib';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { Logs } from '../models/Logs.js';
import { Logger } from './Logger.js';
import { DiscussionLoggerService } from './DiscussionLoggerService.js';

const gzip = promisify(zlib.gzip);

export class MaintenanceService {
  private static readonly ARCHIVE_DIR = './archives';

  public static init() {
    // Ensure archive directory exists
    if (!fs.existsSync(this.ARCHIVE_DIR)) {
        fs.mkdirSync(this.ARCHIVE_DIR);
    }

    // Run nightly at midnight
    cron.schedule('0 0 * * *', async () => {
      Logger.info('Running nightly data purge with archiving...');
      await this.purgeOldLogs();
      await DiscussionLoggerService.archiveOldDiscussions(30);
    });
  }

  private static async purgeOldLogs() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // Use cursor to avoid loading all logs into memory
      const cursor = Logs.find({ timestamp: { $lt: thirtyDaysAgo } }).cursor();
      let batch: any[] = [];
      const BATCH_SIZE = 1000;

      for (let log = await cursor.next(); log != null; log = await cursor.next()) {
        batch.push(log);

        if (batch.length >= BATCH_SIZE) {
          await this.processBatch(batch);
          batch = [];
        }
      }

      if (batch.length > 0) {
        await this.processBatch(batch);
      }

      Logger.info('Nightly maintenance complete.');
    } catch (error) {
      Logger.error('Error during data purge/archive:', error);
    }
  }

  private static async processBatch(batch: any[]) {
      Logger.info(`Processing batch of ${batch.length} logs.`);

      try {
          const payload = JSON.stringify(batch);
          const compressed = await gzip(payload);

          const fileName = `logs_${Date.now()}.json.gz`;
          const uploadSuccess = await this.uploadToColdStorage(compressed, fileName);

          if (uploadSuccess) {
            const ids = batch.map(b => b._id);
            await Logs.deleteMany({ _id: { $in: ids } });
            Logger.info(`Successfully archived and deleted ${batch.length} logs.`);
          } else {
            throw new Error('Failed to upload logs to cold storage.');
          }
      } catch (error) {
          Logger.error('Batch processing failed:', error);
          throw error;
      }
  }

  private static async uploadToColdStorage(data: Buffer, fileName: string): Promise<boolean> {
    try {
        // Implement local file storage as a better placeholder for S3
        const filePath = path.join(this.ARCHIVE_DIR, fileName);
        await fs.promises.writeFile(filePath, data);
        Logger.info(`Stored archive locally at ${filePath}`);

        // In a real production app, you'd upload to S3/GCS here
        // const s3Result = await s3.upload({ ... }).promise();

        return true;
    } catch (error) {
        Logger.error('Error saving archive to local storage:', error);
        return false;
    }
  }
}
