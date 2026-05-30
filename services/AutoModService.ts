import { Message, GuildMember, TextChannel, PermissionFlagsBits } from 'discord.js';
import { Guild } from '../models/Guild.js';
import { Logger } from './Logger.js';
import { EMOJIS } from '../utils/Emojis.js';
import { CacheService } from './CacheService.js';

const messageLog = new Map<string, { content: string, timestamp: number }[]>();
const joinLog = new Map<string, number[]>();

export class AutoModService {
    /**
     * Checks a message for spam and filtered words
     */
    public static async handleMessage(message: Message): Promise<boolean> {
        if (!message.guild || message.author.bot) return true;

        // Skip admins
        if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return true;

        const dbGuild = await Guild.findOne({ guildId: message.guildId });
        if (!dbGuild?.autoMod?.enabled) return true;

        // 1. Word Filter
        if (dbGuild.autoMod.wordFilter?.enabled) {
            const forbiddenWords = dbGuild.autoMod.wordFilter.words || [];
            const normalizedContent = message.content
                .toLowerCase()
                .replace(/[0o]/gi, 'o')
                .replace(/[1l]/gi, 'l')
                .replace(/[3e]/gi, 'e')
                .replace(/[4a]/gi, 'a')
                .replace(/[5s]/gi, 's')
                .replace(/[7t]/gi, 't')
                .replace(/[^a-z0-9]/gi, '');

            for (const word of forbiddenWords) {
                const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/gi, '');
                if (normalizedContent.includes(cleanWord)) {
                    await message.delete().catch(() => {});
                    const reply = await message.channel.send(`${EMOJIS.warning} <@${message.author.id}>, your message contains forbidden language.`);
                    setTimeout(() => reply.delete().catch(() => {}), 5000);
                    this.logAction(message.guildId!, `Deleted message from <@${message.author.id}> (Word Filter: "${word}")`);
                    return false;
                }
            }
        }

        // 2. Anti-Spam
        if (dbGuild.autoMod.antiSpam?.enabled) {
            const threshold = dbGuild.autoMod.antiSpam.threshold || 5;
            const userId = message.author.id;
            const now = Date.now();

            const logs = messageLog.get(userId) || [];
            const recentLogs = logs.filter(l => now - l.timestamp < 10000); // 10 second window

            recentLogs.push({ content: message.content, timestamp: now });
            messageLog.set(userId, recentLogs);

            if (recentLogs.length >= threshold) {
                // Check if they are all same content or just too fast
                const identical = recentLogs.filter(l => l.content === message.content).length;
                if (identical >= 3 || recentLogs.length >= threshold) {
                    await message.delete().catch(() => {});
                    // Timeout user for 10 minutes
                    await message.member?.timeout(10 * 60 * 1000, 'AutoMod: Anti-Spam').catch(() => {});

                    const reply = await message.channel.send(`${EMOJIS.error} <@${message.author.id}> has been timed out for spamming.`);
                    setTimeout(() => reply.delete().catch(() => {}), 10000);

                    this.logAction(message.guildId!, `Timed out <@${message.author.id}> for 10m (Anti-Spam threshold exceeded)`);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Checks for raids (mass joins)
     */
    public static async handleJoin(member: GuildMember) {
        const dbGuild = await Guild.findOne({ guildId: member.guild.id });
        if (!dbGuild?.autoMod?.enabled || !dbGuild.autoMod.antiRaid?.enabled) return;

        const threshold = dbGuild.autoMod.antiRaid.threshold || 10;
        const now = Date.now();
        const guildId = member.guild.id;

        const joins = joinLog.get(guildId) || [];
        const recentJoins = joins.filter(ts => now - ts < 30000); // 30 second window

        recentJoins.push(now);
        joinLog.set(guildId, recentJoins);

        if (recentJoins.length >= threshold) {
            // RAID DETECTED
            this.logAction(guildId, `🚨 **RAID DETECTED!** ${recentJoins.length} joins in 30s. Enabling emergency lockdown.`);

            // Auto-enable verification level if possible, or lock the guild
            // For now, we'll just alert and potentially kick the new joiner if they are part of the burst
            if (recentJoins.length > threshold + 5) {
                await member.kick('AutoMod: Anti-Raid Lockdown').catch(() => {});
            }
        }
    }

    private static async logAction(guildId: string, message: string) {
        const dbGuild = await Guild.findOne({ guildId });
        if (!dbGuild?.logChannelId) return;

        try {
            const { client } = await import('../index.js');
            const channel = await client.channels.fetch(dbGuild.logChannelId) as TextChannel;
            if (channel) {
                await channel.send(`${EMOJIS.shield} **AutoMod:** ${message}`);
            }
        } catch (e) {
            Logger.error('AutoMod logging failed:', e);
        }
    }
}
