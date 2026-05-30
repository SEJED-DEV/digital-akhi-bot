import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Guild } from '../models/Guild.js';
import { tierService } from '../index.js';
import { EMOJIS } from '../utils/Emojis.js';
import { Logger } from '../services/Logger.js';

export const data = new SlashCommandBuilder()
  .setName('branding')
  .setDescription('Configure custom bot identity/profile for this server (SuperPremium only)')
  .addSubcommand(sub =>
    sub
      .setName('set')
      .setDescription('Configure guild bot profile nickname and avatar')
      .addStringOption(opt =>
        opt.setName('nickname')
          .setDescription('Custom bot nickname in this server (max 32 characters)')
          .setMaxLength(32)
          .setRequired(false))
      .addStringOption(opt =>
        opt.setName('avatar-url')
          .setDescription('Image URL for the bot avatar in this server (requires Server Boost Level 2)')
          .setRequired(false))
      .addStringOption(opt =>
        opt.setName('thumbnail-url')
          .setDescription('Image URL for the custom embed thumbnail in this server')
          .setRequired(false))
      .addStringOption(opt =>
        opt.setName('bio')
          .setDescription('Custom bot biography/status message to show in embeds (max 100 characters)')
          .setMaxLength(100)
          .setRequired(false)))
  .addSubcommand(sub =>
    sub
      .setName('clear')
      .setDescription('Reset the bot profile to default in this server'));

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({
      content: `${EMOJIS.error} This command can only be executed within a Discord Server (Guild).`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 1. Check Server Tier Status (SuperPremium required)
  const tier = await tierService.getGuildTier(guild.id);
  if (tier !== 'SuperPremium') {
    return interaction.reply({
      content: `${EMOJIS.error} Custom Branding is locked to servers with the **SuperPremium** tier (50 invites or 4 boosts + support server joined, or granted by developer).`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 2. Check Member Permissions (Administrator / Manage Server required)
  const member = interaction.member;
  if (!member || typeof member === 'string' || !('permissions' in member) || typeof member.permissions === 'string' || 
      (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild))) {
    return interaction.reply({
      content: `${EMOJIS.error} Only server administrators or members with **Manage Server** permissions can configure custom branding.`,
      flags: MessageFlags.Ephemeral
    });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'clear') {
    try {
      await guild.members.me?.setNickname(null);
    } catch (e: any) {
      Logger.error(`Failed to clear nickname in guild ${guild.id}:`, e);
    }

    try {
      if (guild.members.me && 'setAvatar' in guild.members.me) {
        await (guild.members.me as any).setAvatar(null);
      }
    } catch (e: any) {
      Logger.error(`Failed to clear avatar in guild ${guild.id}:`, e);
    }

    await Guild.findOneAndUpdate(
      { guildId: guild.id },
      { $unset: { customBranding: "" } },
      { upsert: true }
    );

    return interaction.reply({
      content: `${EMOJIS.success} Successfully cleared bot custom branding in this server. Bot profile has been restored to default.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (subcommand === 'set') {
    const nickname = interaction.options.getString('nickname');
    const avatarUrl = interaction.options.getString('avatar-url');
    const thumbnailUrl = interaction.options.getString('thumbnail-url');
    const bio = interaction.options.getString('bio');

    if (!nickname && !avatarUrl && !thumbnailUrl && !bio) {
      return interaction.reply({
        content: `${EMOJIS.error} You must specify at least one option: nickname, avatar-url, thumbnail-url, or bio.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (avatarUrl && !/^https?:\/\/.+/i.test(avatarUrl)) {
      return interaction.reply({
        content: `${EMOJIS.error} Invalid avatar image URL format. Must start with http:// or https://.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (thumbnailUrl && !/^https?:\/\/.+/i.test(thumbnailUrl)) {
      return interaction.reply({
        content: `${EMOJIS.error} Invalid thumbnail image URL format. Must start with http:// or https://.`,
        flags: MessageFlags.Ephemeral
      });
    }

    let nickUpdated = false;
    let avatarUpdated = false;
    let nickError = '';
    let avatarError = '';

    // Apply native Nickname
    if (nickname) {
      try {
        await guild.members.me?.setNickname(nickname);
        nickUpdated = true;
      } catch (e: any) {
        Logger.error(`Failed to set nickname in guild ${guild.id}:`, e);
        nickError = e.message || 'Missing Permissions (e.g. Manage Nicknames)';
      }
    }

    // Apply native Avatar
    if (avatarUrl) {
      try {
        if (guild.members.me) {
          if (typeof (guild.members.me as any).setAvatar === 'function') {
            await (guild.members.me as any).setAvatar(avatarUrl);
            avatarUpdated = true;
          } else if (typeof (guild.members.me as any).edit === 'function') {
            await (guild.members.me as any).edit({ avatar: avatarUrl });
            avatarUpdated = true;
          } else {
            avatarError = 'Neither setAvatar nor edit({ avatar }) is supported on GuildMember in this discord.js version.';
          }
        }
      } catch (e: any) {
        Logger.error(`Failed to set avatar in guild ${guild.id}:`, e);
        avatarError = e.message || 'API Error or Missing Server Boost Level 2';
      }
    }

    const update: any = {};
    if (nickname) update['customBranding.nickname'] = nickname;
    if (avatarUrl) update['customBranding.avatarUrl'] = avatarUrl;
    if (thumbnailUrl) update['customBranding.thumbnailUrl'] = thumbnailUrl;
    if (bio) update['customBranding.bio'] = bio;

    if (Object.keys(update).length > 0) {
      await Guild.findOneAndUpdate(
        { guildId: guild.id },
        { $set: update },
        { upsert: true }
      );
    }

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.success} Native Guild Branding Updated`)
      .setColor(0x1E824C)
      .setDescription(`Bot identity profile customization results inside this server:`);

    if (nickname) {
      embed.addFields({ 
        name: 'Nickname Change', 
        value: nickUpdated ? `${EMOJIS.success} Set to **${nickname}**` : `${EMOJIS.error} Failed: ${nickError}`, 
        inline: false 
      });
    }

    if (avatarUrl) {
      embed.addFields({ 
        name: 'Avatar Change', 
        value: avatarUpdated ? `${EMOJIS.success} Custom avatar applied successfully.` : `${EMOJIS.error} Failed: ${avatarError}`, 
        inline: false 
      });
      if (avatarUpdated) {
        embed.setThumbnail(avatarUrl);
      }
    }

    if (thumbnailUrl) {
      embed.addFields({
        name: 'Embed Thumbnail',
        value: `${EMOJIS.success} Set to: \`${thumbnailUrl}\``,
        inline: false
      });
      if (!avatarUpdated) {
        embed.setThumbnail(thumbnailUrl);
      }
    }

    if (bio) {
      embed.addFields({
        name: 'Custom Bot Bio',
        value: `${EMOJIS.success} Set to: *"${bio}"*`,
        inline: false
      });
    }

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
}
