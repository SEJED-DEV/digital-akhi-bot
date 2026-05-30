import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { User } from '../models/User.js';
import { Blacklist } from '../models/Blacklists.js';
import { ModeratorAction } from '../models/ModeratorAction.js';
import { Logger } from '../services/Logger.js';
import { EMOJIS } from '../utils/Emojis.js';



export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Administrative and Developer commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup(group =>
    group
      .setName('premium')
      .setDescription('Manage user premium tiers')
      .addSubcommand(sub =>
        sub
          .setName('add')
          .setDescription('Grant Premium/SuperPremium tier to a user')
          .addUserOption(opt =>
            opt.setName('user')
              .setDescription('The user to grant premium to')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('tier')
              .setDescription('Target premium tier')
              .setRequired(true)
              .addChoices(
                { name: 'Premium', value: 'Premium' },
                { name: 'SuperPremium', value: 'SuperPremium' }
              )))
      .addSubcommand(sub =>
        sub
          .setName('remove')
          .setDescription('Revoke Premium tier from a user')
          .addUserOption(opt =>
            opt.setName('user')
              .setDescription('The user to revoke premium from')
              .setRequired(true))))
  .addSubcommandGroup(group =>
    group
      .setName('premium-guild')
      .setDescription('Manage guild premium tiers')
      .addSubcommand(sub =>
        sub
          .setName('add')
          .setDescription('Grant Premium/SuperPremium tier to a guild')
          .addStringOption(opt =>
            opt.setName('guild-id')
              .setDescription('The ID of the guild/server')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('tier')
              .setDescription('Target premium tier')
              .setRequired(true)
              .addChoices(
                { name: 'Premium', value: 'Premium' },
                { name: 'SuperPremium', value: 'SuperPremium' }
              )))
      .addSubcommand(sub =>
        sub
          .setName('remove')
          .setDescription('Revoke Premium tier from a guild')
          .addStringOption(opt =>
            opt.setName('guild-id')
              .setDescription('The ID of the guild/server')
              .setRequired(true))))
  .addSubcommandGroup(group =>
    group
      .setName('blacklist')
      .setDescription('Manage global or local blacklists')
      .addSubcommand(sub =>
        sub
          .setName('add')
          .setDescription('Add a user to the blacklist')
          .addUserOption(opt =>
            opt.setName('user')
              .setDescription('The user to blacklist')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('type')
              .setDescription('Blacklist scope')
              .setRequired(true)
              .addChoices(
                { name: 'Global (All Guilds)', value: 'Global' },
                { name: 'Local (This Guild)', value: 'Local' }
              ))
          .addStringOption(opt =>
            opt.setName('reason')
              .setDescription('Reason for the blacklist')
              .setRequired(false)))
      .addSubcommand(sub =>
        sub
          .setName('remove')
          .setDescription('Remove a user from the blacklist')
          .addUserOption(opt =>
            opt.setName('user')
              .setDescription('The user to remove')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('type')
              .setDescription('Blacklist scope')
              .setRequired(true)
              .addChoices(
                { name: 'Global (All Guilds)', value: 'Global' },
                { name: 'Local (This Guild)', value: 'Local' }
              ))))
  .addSubcommandGroup(group =>
    group
      .setName('dev')
      .setDescription('Developer-only bot operations')
      .addSubcommand(sub =>
        sub
          .setName('announcement')
          .setDescription('Post an announcement in a specific guild')
          .addStringOption(opt =>
            opt.setName('guild-id')
              .setDescription('The target Guild ID')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('message')
              .setDescription('The announcement content')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('channel-id')
              .setDescription('Optional specific channel ID to post in')
              .setRequired(false)))
      .addSubcommand(sub =>
        sub
          .setName('leave')
          .setDescription('Force the bot to leave a specific guild')
          .addStringOption(opt =>
            opt.setName('guild-id')
              .setDescription('The Guild ID to leave')
              .setRequired(true))));

export async function execute(interaction: ChatInputCommandInteraction) {
  const group = interaction.options.getSubcommandGroup();
  const subcommand = interaction.options.getSubcommand();
  const targetUser = interaction.options.getUser('user', false);
  const adminId = interaction.user.id;

  // Resolve bot developer/owner status
  await interaction.client.application?.fetch();
  const applicationOwnerId = interaction.client.application?.owner?.id;
  
  // Also support configured admins in the environment (comma-separated list of Discord IDs)
  const configuredAdmins = (process.env.BOT_ADMINS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  const isBotAdmin = adminId === applicationOwnerId || configuredAdmins.includes(adminId);

  if (group === 'premium-guild') {
    if (!isBotAdmin) {
      return interaction.reply({
        content: `${EMOJIS.error} Only Bot Admins/Developers can manage Guild Premium subscriptions.`,
        ephemeral: true
      });
    }

    const { Guild } = await import('../models/Guild.js');
    const targetGuildId = interaction.options.getString('guild-id', true);

    if (subcommand === 'add') {
      const chosenTier = interaction.options.getString('tier', true) as 'Premium' | 'SuperPremium';
      await Guild.findOneAndUpdate(
        { guildId: targetGuildId },
        { tier: chosenTier, isPremium: true },
        { upsert: true }
      );
      Logger.info(`Admin ${adminId} granted ${chosenTier} to guild ${targetGuildId}`);

      // DM Guild Owner
      try {
        const guild = await interaction.client.guilds.fetch(targetGuildId);
        if (guild) {
          const owner = await guild.fetchOwner();
          const embed = new EmbedBuilder()
            .setTitle(`${EMOJIS.mosque} Server Premium Activated!`)
            .setDescription(`Salam Alaykum brother! We are excited to inform you that your server **${guild.name}** has been upgraded to the **${chosenTier}** tier! All members inside your server now enjoy premium benefits when interacting with Digital Akhi Bot!`)
            .setColor(chosenTier === 'SuperPremium' ? 0x9B59B6 : 0xFFD700)
            .setFooter({ text: 'Stay blessed! • Digital Akhi Dev Team' })
            .setTimestamp();
          await owner.send({ embeds: [embed] });
        }
      } catch (dmErr) {
        Logger.error(`Failed to DM guild owner about premium upgrade:`, dmErr);
      }

      return interaction.reply({
        content: `${EMOJIS.success} Successfully granted ${chosenTier === 'SuperPremium' ? EMOJIS.superpremium : EMOJIS.premium} **${chosenTier}** tier to guild ID \`${targetGuildId}\`.`,
        ephemeral: true
      });
    }

    if (subcommand === 'remove') {
      await Guild.findOneAndUpdate(
        { guildId: targetGuildId },
        { tier: 'Free', isPremium: false },
        { upsert: true }
      );
      Logger.info(`Admin ${adminId} demoted guild ${targetGuildId} to Free`);

      // DM Guild Owner
      try {
        const guild = await interaction.client.guilds.fetch(targetGuildId);
        if (guild) {
          const owner = await guild.fetchOwner();
          const embed = new EmbedBuilder()
            .setTitle(`${EMOJIS.warning} Server Premium Deactivated`)
            .setDescription(`Salam Alaykum brother. Your server **${guild.name}** has been returned to the **Free** tier.`)
            .setColor(0xE74C3C)
            .setTimestamp();
          await owner.send({ embeds: [embed] });
        }
      } catch (dmErr) {
        Logger.error(`Failed to DM guild owner about premium downgrade:`, dmErr);
      }

      return interaction.reply({
        content: `${EMOJIS.success} Successfully demoted guild ID \`${targetGuildId}\` to **Free** tier.`,
        ephemeral: true
      });
    }
  }

  if (group === 'premium') {
    if (!targetUser) {
      return interaction.reply({
        content: `${EMOJIS.error} You must specify a target user.`,
        ephemeral: true
      });
    }
    if (!isBotAdmin) {
      return interaction.reply({
        content: `${EMOJIS.error} Only Bot Admins/Developers can manage Premium subscriptions.`,
        ephemeral: true
      });
    }

    if (subcommand === 'add') {
      const chosenTier = interaction.options.getString('tier', true) as 'Premium' | 'SuperPremium';
      await User.findOneAndUpdate(
        { discordId: targetUser.id },
        { tier: chosenTier, byCommand: true },
        { upsert: true }
      );
      Logger.info(`Admin ${adminId} granted ${chosenTier} to ${targetUser.id}`);

      // DM Target User
      try {
        const embed = new EmbedBuilder()
          .setTitle(`${EMOJIS.sparkles} Premium Status Granted!`)
          .setDescription(`Salam Alaykum brother! An administrator has granted you the **${chosenTier}** tier on Digital Akhi Bot. You now have access to higher limits and super-premium features!`)
          .setColor(chosenTier === 'SuperPremium' ? 0x9B59B6 : 0xFFD700)
          .setFooter({ text: 'Thank you for your continuous support, brother! • Digital Akhi Dev Team' })
          .setTimestamp();
        await targetUser.send({ embeds: [embed] });
      } catch (dmErr) {
        Logger.error(`Failed to DM user ${targetUser.id} about premium upgrade:`, dmErr);
      }

      return interaction.reply({
        content: `${EMOJIS.success} Successfully granted ${chosenTier === 'SuperPremium' ? EMOJIS.superpremium : EMOJIS.premium} **${chosenTier}** tier to ${targetUser} (${targetUser.tag}).`,
        ephemeral: true
      });
    }

    if (subcommand === 'remove') {
      await User.findOneAndUpdate(
        { discordId: targetUser.id },
        { tier: 'Free', byCommand: false },
        { upsert: true }
      );
      Logger.info(`Admin ${adminId} demoted ${targetUser.id} to Free`);

      // DM Target User
      try {
        const embed = new EmbedBuilder()
          .setTitle(`${EMOJIS.warning} Premium Status Revoked`)
          .setDescription(`Salam Alaykum brother. We want to let you know that your Premium/SuperPremium tier has been removed. You have been placed back on the **Free** tier.`)
          .setColor(0xE74C3C)
          .setFooter({ text: 'If you believe this was an error, please contact support.' })
          .setTimestamp();
        await targetUser.send({ embeds: [embed] });
      } catch (dmErr) {
        Logger.error(`Failed to DM user ${targetUser.id} about premium downgrade:`, dmErr);
      }

      return interaction.reply({
        content: `${EMOJIS.success} Successfully demoted ${targetUser} (${targetUser.tag}) to **Free** tier.`,
        ephemeral: true
      });
    }
  }

  if (group === 'blacklist') {
    if (!targetUser) {
      return interaction.reply({
        content: `${EMOJIS.error} You must specify a target user.`,
        ephemeral: true
      });
    }
    const type = interaction.options.getString('type', true) as 'Global' | 'Local';
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildId = interaction.guildId;

    if (type === 'Global' && !isBotAdmin) {
      return interaction.reply({
        content: `${EMOJIS.error} Only Bot Admins/Developers can apply or remove Global blacklists.`,
        ephemeral: true
      });
    }

    if (type === 'Local' && !guildId) {
      return interaction.reply({
        content: `${EMOJIS.error} Local blacklist operations can only be executed within a Discord Server (Guild).`,
        ephemeral: true
      });
    }

    // Server Administrator check for Local blacklists
    if (type === 'Local' && !isBotAdmin) {
      const member = interaction.member;
      if (!member || typeof member === 'string' || !('permissions' in member) || typeof member.permissions === 'string' || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: `${EMOJIS.error} You must be a Server Administrator to configure Local blacklists.`,
          ephemeral: true
        });
      }
    }

    if (subcommand === 'add') {
      const query = type === 'Local' 
        ? { targetId: targetUser.id, type, guildId }
        : { targetId: targetUser.id, type };

      await Blacklist.findOneAndUpdate(
        query,
        {
          targetId: targetUser.id,
          type,
          guildId: type === 'Local' ? guildId : undefined,
          reason,
          adminId,
          timestamp: new Date()
        },
        { upsert: true }
      );

      Logger.info(`Admin ${adminId} blacklisted ${targetUser.id} (${type})`);
      return interaction.reply({
        content: `${EMOJIS.success} Successfully blacklisted ${targetUser} (${targetUser.tag}) **${type}ly**.\n**Reason:** ${reason}`,
        ephemeral: true
      });
    }

    if (subcommand === 'remove') {
      const query = type === 'Local'
        ? { targetId: targetUser.id, type, guildId }
        : { targetId: targetUser.id, type };

      const result = await Blacklist.findOneAndDelete(query);

      if (!result) {
        return interaction.reply({
          content: `${EMOJIS.error} ${targetUser} (${targetUser.tag}) is not currently blacklisted under scope: **${type}**.`,
          ephemeral: true
        });
      }

      Logger.info(`Admin ${adminId} removed ${targetUser.id} from ${type} blacklist`);
      return interaction.reply({
        content: `${EMOJIS.success} Successfully removed ${targetUser} (${targetUser.tag}) from the **${type}** blacklist.`,
        ephemeral: true
      });
    }
  }

  if (group === 'dev') {
    if (!isBotAdmin) {
      return interaction.reply({
        content: `${EMOJIS.error} Only Bot Admins/Developers can use developer command operations.`,
        ephemeral: true
      });
    }

    const targetGuildId = interaction.options.getString('guild-id', true);

    if (subcommand === 'leave') {
      try {
        const targetGuild = await interaction.client.guilds.fetch(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({
            content: `${EMOJIS.error} Guild with ID \`${targetGuildId}\` not found in cache.`,
            ephemeral: true
          });
        }
        await targetGuild.leave();
        return interaction.reply({
          content: `${EMOJIS.success} Successfully left guild **${targetGuild.name}** (ID: \`${targetGuildId}\`).`,
          ephemeral: true
        });
      } catch (err: any) {
        return interaction.reply({
          content: `${EMOJIS.error} Failed to leave guild: \`${err.message}\``,
          ephemeral: true
        });
      }
    }

    if (subcommand === 'announcement') {
      const messageContent = interaction.options.getString('message', true);
      const targetChannelId = interaction.options.getString('channel-id');

      try {
        const targetGuild = await interaction.client.guilds.fetch(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({
            content: `${EMOJIS.error} Guild with ID \`${targetGuildId}\` not found.`,
            ephemeral: true
          });
        }

        let channel;
        if (targetChannelId) {
          channel = await targetGuild.channels.fetch(targetChannelId);
        } else {
          // Find first text channel where bot has SendMessages permission
          channel = targetGuild.channels.cache.find(c => 
            c.isTextBased() && 
            targetGuild.members.me?.permissionsIn(c).has(PermissionFlagsBits.SendMessages)
          );
        }

        if (!channel || !channel.isTextBased()) {
          return interaction.reply({
            content: `${EMOJIS.error} Could not find a suitable text channel to post the announcement.`,
            ephemeral: true
          });
        }

        await (channel as any).send(messageContent);
        return interaction.reply({
          content: `${EMOJIS.success} Successfully posted announcement to server **${targetGuild.name}** in channel **#${(channel as any).name}**.`,
          ephemeral: true
        });
      } catch (err: any) {
        return interaction.reply({
          content: `${EMOJIS.error} Failed to post announcement: \`${err.message}\``,
          ephemeral: true
        });
      }
    }
  }
}
