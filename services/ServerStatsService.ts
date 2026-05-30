import { Client } from 'discord.js';
import { Guild as GuildModel } from '../models/Guild.js';
import { Logger } from './Logger.js';

export class ServerStatsService {
  public static async start(client: Client) {
    setInterval(() => this.updateAllStats(client), 10 * 60 * 1000); // Every 10 minutes
  }

  public static async updateAllStats(client: Client) {
    const guildsWithStats = await GuildModel.find({ 'serverStats.enabled': true });
    for (const dbGuild of guildsWithStats) {
      try {
        const guild = await client.guilds.fetch(dbGuild.guildId);
        if (!guild) continue;

        if (dbGuild.serverStats?.totalChannelId) {
          const channel = await guild.channels.fetch(dbGuild.serverStats.totalChannelId);
          if (channel) await channel.setName(`Total: ${guild.memberCount}`).catch(() => {});
        }

        if (dbGuild.serverStats?.memberChannelId) {
          const channel = await guild.channels.fetch(dbGuild.serverStats.memberChannelId);
          const members = guild.members.cache.filter(m => !m.user.bot).size || (await guild.members.fetch()).filter(m => !m.user.bot).size;
          if (channel) await channel.setName(`Members: ${members}`).catch(() => {});
        }

        if (dbGuild.serverStats?.botChannelId) {
          const channel = await guild.channels.fetch(dbGuild.serverStats.botChannelId);
          const bots = guild.members.cache.filter(m => m.user.bot).size || (await guild.members.fetch()).filter(m => m.user.bot).size;
          if (channel) await channel.setName(`Bots: ${bots}`).catch(() => {});
        }
      } catch (error) {
        Logger.error(`Failed to update stats for guild ${dbGuild.guildId}`, error);
      }
    }
  }
}
