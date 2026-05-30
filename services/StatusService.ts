import { ActivityType, Client } from 'discord.js';
import { Logger } from './Logger.js';

export class StatusService {
  private static interval: NodeJS.Timeout | null = null;
  private static currentStatusIndex = 0;

  public static start(client: Client) {
    if (this.interval) {
      clearInterval(this.interval);
    }

    // Set initial presence immediately
    this.updatePresence(client);

    // Rotate presence every 30 seconds
    this.interval = setInterval(() => {
      this.updatePresence(client);
    }, 30000);

    Logger.info('Presence rotation service started.');
  }

  public static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private static async updatePresence(client: Client) {
    try {
      let guildCount = client.guilds.cache.size;
      let userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
      let shardCount = client.shard?.count || 1;
      let shardId = client.shard?.ids[0] ?? 0;

      // If sharded, aggregate stats across all shards
      if (client.shard) {
        try {
          const guildCounts = await client.shard.fetchClientValues('guilds.cache.size') as number[];
          guildCount = guildCounts.reduce((acc, count) => acc + count, 0);

          const memberCounts = await client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)) as number[];
          userCount = memberCounts.reduce((acc, count) => acc + count, 0);
        } catch (shardError) {
          Logger.error('Failed to fetch sharded stats for presence:', shardError);
        }
      }

      const statuses = [
        {
          name: `over ${guildCount} servers | ${userCount} believers`,
          type: ActivityType.Watching
        },
        {
          name: 'Islamic Guidance | /help',
          type: ActivityType.Listening
        },
        {
          name: '/links to join the support server',
          type: ActivityType.Listening
        },
        {
          name: `Islamic Guidance | Shard ${shardId + 1}/${shardCount}`,
          type: ActivityType.Playing
        }
      ];

      const status = statuses[this.currentStatusIndex];
      client.user?.setPresence({
        activities: [{ name: status.name, type: status.type }],
        status: 'online'
      });

      // Move to the next status
      this.currentStatusIndex = (this.currentStatusIndex + 1) % statuses.length;
    } catch (error) {
      Logger.error('Failed to update bot presence:', error);
    }
  }
}
