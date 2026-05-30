import { GuildMember, Collection, TextChannel } from 'discord.js';
import { AutoModService } from '../services/AutoModService.js';
import { Invites } from '../models/Invites.js';
import { User } from '../models/User.js';
import { Guild } from '../models/Guild.js';
import { Logger } from '../services/Logger.js';
import { InviteProcessingService } from '../services/InviteProcessingService.js';

const guildInvites = new Collection<string, Collection<string, number>>();

export async function guildMemberAdd(member: GuildMember) {
  // Run AutoMod join check
  await AutoModService.handleJoin(member);

  if (!(await InviteProcessingService.tryStartProcessing(member.id))) {
      return;
  }

  try {
    const { guild } = member;

    // To track who invited, we compare cached invites with current ones
    const oldInvites = guildInvites.get(guild.id);
    let newInvites;

    try {
        newInvites = await guild.invites.fetch();
    } catch (e) {
        Logger.error(`Failed to fetch invites for guild ${guild.id}:`, e);
        return;
    }

    const invite = newInvites.find(i => (oldInvites?.get(i.code) || 0) < (i.uses || 0));

    if (invite && invite.inviter) {
        // Record the invite
        try {
            await Invites.create({
              inviterId: invite.inviter.id,
              inviteeId: member.id,
              guildId: guild.id,
            });
        } catch (e: any) {
            if (e.code === 11000) {
                Logger.warn(`Duplicate invite record for member ${member.id}`);
            } else {
                Logger.error(`Error recording invite for member ${member.id}:`, e);
            }
            return;
        }

        // Update inviter's invite count
        const inviteCount = await Invites.countDocuments({ inviterId: invite.inviter.id });
        const user = await User.findOne({ discordId: invite.inviter.id });
        if (user) {
            user.invites = inviteCount;
            // Check for upgrade
            if (user.joinedSupportServer) {
                if (user.invites >= 50) {
                    user.tier = 'SuperPremium';
                    Logger.info(`User ${invite.inviter.id} upgraded to SuperPremium tier via invites.`);
                } else if (user.invites >= 30 && user.tier === 'Free') {
                    user.tier = 'Premium';
                    Logger.info(`User ${invite.inviter.id} upgraded to Premium tier via invites.`);
                }
            }
            await user.save();
        }
    }

    // Update cache
    const counts = new Collection<string, number>();
    newInvites.forEach((i: any) => counts.set(i.code, i.uses || 0));
    guildInvites.set(guild.id, counts);

    // Welcome Module
    const dbGuild = await Guild.findOne({ guildId: guild.id });
    if (dbGuild?.welcomeModule?.enabled && dbGuild.welcomeModule.channelId) {
        const channel = guild.channels.cache.get(dbGuild.welcomeModule.channelId) as TextChannel;
        if (channel) {
            let msg = dbGuild.welcomeModule.welcomeMsg || "Assalamu Alaikum {user}, welcome to **{server}**! You are our {count}th member.";
            msg = msg.replace(/{user}/g, member.toString())
                     .replace(/{server}/g, guild.name)
                     .replace(/{count}/g, guild.memberCount.toString());
            channel.send(msg).catch(e => Logger.error(`Failed to send welcome message:`, e));
        }
    }
  } finally {
    InviteProcessingService.unmarkAsProcessing(member.id);
  }
}

export async function initInviteTracker(client: any) {
    for (const guild of client.guilds.cache.values()) {
        try {
            const invites = await guild.invites.fetch();
            const counts = new Collection<string, number>();
            invites.forEach((i: any) => counts.set(i.code, i.uses || 0));
            guildInvites.set(guild.id, counts);
        } catch (e) {
            Logger.error(`Could not fetch invites for guild ${guild.id}`);
        }
    }
}
