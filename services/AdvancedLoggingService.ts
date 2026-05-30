import { Message, PartialMessage, VoiceState, GuildMember, TextChannel, EmbedBuilder, AuditLogEvent } from 'discord.js';
import { Guild } from '../models/Guild.js';
import { EMOJIS } from '../utils/Emojis.js';

export class AdvancedLoggingService {
  private static async getLogChannel(guildId: string): Promise<TextChannel | null> {
    const dbGuild = await Guild.findOne({ guildId });
    if (!dbGuild || !dbGuild.logChannelId) return null;

    try {
      const channel = await (await import('../index.js')).client.channels.fetch(dbGuild.logChannelId);
      if (channel?.isTextBased()) return channel as TextChannel;
    } catch (e) {
      return null;
    }
    return null;
  }

  public static async logMessageEdit(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    if (oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const channel = await this.getLogChannel(oldMessage.guildId!);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.edit} Message Edited`)
      .setColor('#3498db')
      .setAuthor({ name: oldMessage.author?.tag || 'Unknown', iconURL: oldMessage.author?.displayAvatarURL() })
      .addFields(
        { name: 'Channel', value: `<#${oldMessage.channelId}>`, inline: true },
        { name: 'User', value: `<@${oldMessage.author?.id}>`, inline: true },
        { name: 'Before', value: oldMessage.content || '*Empty*' },
        { name: 'After', value: newMessage.content || '*Empty*' }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  public static async logMessageDelete(message: Message | PartialMessage) {
    if (message.author?.bot) return;

    const channel = await this.getLogChannel(message.guildId!);
    if (!channel) return;

    // Try to find the executor in Audit Logs
    let executor = null;
    try {
        const auditLogs = await message.guild?.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MessageDelete,
        });
        const logEntry = auditLogs?.entries.first();
        if (logEntry && logEntry.target.id === message.author?.id && Date.now() - logEntry.createdTimestamp < 5000) {
            executor = logEntry.executor;
        }
    } catch (e) {}

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.delete} Message Deleted`)
      .setColor('#e74c3c')
      .setAuthor({ name: message.author?.tag || 'Unknown', iconURL: message.author?.displayAvatarURL() })
      .addFields(
        { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
        { name: 'User', value: `<@${message.author?.id}>`, inline: true },
        { name: 'Content', value: message.content || '*Empty or Embed*' }
      )
      .setTimestamp();

    if (executor) {
        embed.addFields({ name: 'Deleted By', value: `<@${executor.id}>`, inline: true });
    }

    await channel.send({ embeds: [embed] });
  }

  public static async logVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const channel = await this.getLogChannel(newState.guild.id);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: newState.member?.user.tag || 'Unknown', iconURL: newState.member?.user.displayAvatarURL() })
      .setTimestamp();

    if (!oldState.channelId && newState.channelId) {
      embed.setTitle(`${EMOJIS.voice} Joined Voice Channel`)
           .setColor('#2ecc71')
           .setDescription(`<@${newState.member?.id}> joined <#${newState.channelId}>`);
    } else if (oldState.channelId && !newState.channelId) {
      embed.setTitle(`${EMOJIS.voice} Left Voice Channel`)
           .setColor('#e67e22')
           .setDescription(`<@${newState.member?.id}> left <#${oldState.channelId}>`);
    } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      embed.setTitle(`${EMOJIS.voice} Moved Voice Channel`)
           .setColor('#f1c40f')
           .setDescription(`<@${newState.member?.id}> moved from <#${oldState.channelId}> to <#${newState.channelId}>`);
    } else {
        return; // Mute/Deafen etc.
    }

    await channel.send({ embeds: [embed] });
  }

  public static async logMemberJoin(member: GuildMember) {
    const channel = await this.getLogChannel(member.guild.id);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.sparkles} Member Joined`)
      .setColor('#2ecc71')
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setDescription(`<@${member.id}> joined the server.`)
      .addFields({ name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }
}
