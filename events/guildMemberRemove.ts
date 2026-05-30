import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { Invites } from '../models/Invites.js';
import { User } from '../models/User.js';
import { Guild } from '../models/Guild.js';
import { Logger } from '../services/Logger.js';

export async function guildMemberRemove(member: GuildMember | PartialGuildMember) {
  const { guild, id: userId } = member;

  // 1. Handle Invite Decrement
  // Find the invite record for this user
  const inviteRecord = await Invites.findOne({ inviteeId: userId, guildId: guild.id });

  if (inviteRecord) {
    const inviterId = inviteRecord.inviterId;
    await Invites.deleteOne({ _id: inviteRecord._id });

    // Update inviter's invite count
    const inviteCount = await Invites.countDocuments({ inviterId });
    const user = await User.findOne({ discordId: inviterId });

    if (user) {
        user.invites = inviteCount;
        // Hard Leave Degradation: If recruiter drops below 30, flip to Free
        if (user.tier === 'Premium' && user.invites < 30) {
            user.tier = 'Free';
            console.log(`User ${inviterId} downgraded to Free tier due to member leave.`);
        }
        await user.save();
    }
  }

  // 2. Handle Support Server Leave
  const supportServerId = process.env.SUPPORT_SERVER_ID;
  if (guild.id === supportServerId) {
      const user = await User.findOne({ discordId: userId });
      if (user) {
          user.joinedSupportServer = false;
          user.tier = 'Free'; // Instant downgrade if leaving support server
          await user.save();
          console.log(`User ${userId} downgraded to Free tier for leaving support server.`);
      }
  }

  // 3. Goodbye Module
  const dbGuild = await Guild.findOne({ guildId: guild.id });
  if (dbGuild?.welcomeModule?.enabled && dbGuild.welcomeModule.channelId) {
    const channel = guild.channels.cache.get(dbGuild.welcomeModule.channelId) as TextChannel;
    if (channel) {
        let msg = dbGuild.welcomeModule.goodbyeMsg || "Goodbye {user}. We are now at {count} members.";
        msg = msg.replace(/{user}/g, member.user?.username || "User")
                 .replace(/{server}/g, guild.name)
                 .replace(/{count}/g, guild.memberCount.toString());
        channel.send(msg).catch(e => Logger.error(`Failed to send goodbye message:`, e));
    }
  }
}
