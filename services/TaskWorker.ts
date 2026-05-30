import { Message } from 'discord.js';
import { Logger } from './Logger.js';

export class TaskWorker {
  private static messageQueue: (() => Promise<any>)[] = [];
  private static isProcessingQueue = false;
  private static readonly GLOBAL_DELAY = 1000;
  private static readonly MAX_QUEUE_SIZE = 100;

  public static async executeHeavyTask(
    message: Message,
    taskFn: () => Promise<string>
  ) {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
        return message.reply("❌ The system is currently overloaded with heavy tasks. Please try again later.");
    }

    await this.enqueueMessage(async () => {
        return message.reply("*\"Give me some minutes brother, for Allah, i'll do it don't worry\"*");
    }, async (reply: Message) => {
        try {
            const result = await taskFn();
            await this.enqueueMessage(async () => {
                return reply.edit(`✅ ${result}`);
            });
        } catch (error: any) {
            Logger.error('Heavy task failed:', error);
            await this.enqueueMessage(async () => {
                return reply.edit(`❌ I encountered an error while performing the task: ${error.message || 'Unknown error'}`);
            });
        }
    });
  }

  private static async enqueueMessage(action: () => Promise<any>, callback?: (result: any) => Promise<void>) {
      if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
          Logger.warn('Message queue full, dropping task.');
          return;
      }

      this.messageQueue.push(async () => {
          try {
            const res = await action();
            if (callback) await callback(res);
          } catch (e) {
            Logger.error('Error executing enqueued action:', e);
          }
      });

      if (!this.isProcessingQueue) {
          this.processMessageQueue();
      }
  }

  private static async processMessageQueue() {
      this.isProcessingQueue = true;
      while (this.messageQueue.length > 0) {
          const action = this.messageQueue.shift();
          if (action) {
              try {
                  await action();
              } catch (e) {
                  Logger.error('Error in message queue processing:', e);
              }
              await this.sleep(this.GLOBAL_DELAY);
          }
      }
      this.isProcessingQueue = false;
  }

  public static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public static async throttledMap<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    delayMs: number = 1000
  ): Promise<R[]> {
    const results: R[] = [];
    for (const item of items) {
      results.push(await fn(item));
      await this.sleep(delayMs);
    }
    return results;
  }
}
