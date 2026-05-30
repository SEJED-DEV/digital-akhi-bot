import { VoiceState, ChannelType, PermissionFlagsBits } from 'discord.js';
import { Guild } from '../models/Guild.js';

export class VoiceService {
  private static activeVoiceChannels = new Map<string, string>(); // userID: channelID

  public static async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const dbGuild = await Guild.findOne({ guildId: newState.guild.id });
    if (!dbGuild || !dbGuild.joinToCreateChannelId) return;

    // Joining the "Join to Create" channel
    if (newState.channelId === dbGuild.joinToCreateChannelId) {
      const member = newState.member;
      if (!member) return;

      const category = newState.channel?.parentId;

      const newChannel = await newState.guild.channels.create({
        name: `🔊 ${member.user.username}'s Room`,
        type: ChannelType.GuildVoice,
        parent: category || null,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers]
          }
        ]
      });

      await member.voice.setChannel(newChannel);
      this.activeVoiceChannels.set(member.id, newChannel.id);
    }

    // Leaving a dynamic channel
    if (oldState.channelId && oldState.channelId !== dbGuild.joinToCreateChannelId) {
      const channel = oldState.channel;
      if (channel && channel.name.startsWith('🔊 ') && channel.members.size === 0) {
        // Double check it's one of ours by checking its properties if needed,
        // but checking name and member count is a common pattern.
        await channel.delete().catch(() => {});
      }
    }
  }
}
