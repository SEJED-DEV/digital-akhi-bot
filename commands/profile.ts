import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { User } from '../models/User.js';
import { tierService } from '../index.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Tracks current tier status, active invite count, and 6-hour rate limits')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user whose profile to view')
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userId = targetUser.id;
  const guildId = interaction.guildId;
  const guildTier = guildId ? await tierService.getGuildTier(guildId) : null;
  const user = await User.findOne({ discordId: userId });
  const tier = await tierService.getTierStatus(userId, guildId);

  // Let's look at how we can design the profile embed.
  let tierEmoji = EMOJIS.bot;
  let tierColor = 0x1E824C; // elegant Emerald Green for Free
  if (tier === 'SuperPremium') {
    tierEmoji = EMOJIS.superpremium;
    tierColor = 0x9B59B6; // Amethyst/Purple for SuperPremium
  } else if (tier === 'Premium') {
    tierEmoji = EMOJIS.premium;
    tierColor = 0xFFD700; // Gold for Premium
  }

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s Profile`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor(tierColor)
    .setDescription(targetUser.id === interaction.user.id 
      ? `Welcome to your profile, brother. Here is your current status and usage.` 
      : `Viewing profile of ${targetUser.username}, brother.`)
    .addFields(
      { name: `${tierEmoji} Personal Tier`, value: `**${tier}**`, inline: true }
    );

  if (guildId && guildTier) {
    let guildEmoji = EMOJIS.bot;
    if (guildTier === 'SuperPremium') guildEmoji = EMOJIS.superpremium;
    else if (guildTier === 'Premium') guildEmoji = EMOJIS.premium;
    embed.addFields({ name: `${guildEmoji} Server Tier`, value: `**${guildTier}**`, inline: true });
  }

  if (user?.byCommand) {
    embed.addFields({ name: `${EMOJIS.invites} Invites`, value: 'Granted by Admin', inline: true });
  } else {
    const inviteTarget = tier === 'SuperPremium' ? 50 : 30;
    embed.addFields({ name: `${EMOJIS.invites} Invites`, value: `\`${user?.invites || 0}/${inviteTarget}\``, inline: true });
  }

  embed.addFields(
    { name: `${EMOJIS.support} Support Server`, value: user?.joinedSupportServer ? `${EMOJIS.success} Joined` : `${EMOJIS.error} Not Joined`, inline: true },
    { name: `${EMOJIS.byok} BYOK Status`, value: user?.byok?.provider ? `${EMOJIS.success} Active (\`${user.byok.provider}\`)` : `${EMOJIS.error} None`, inline: true }
  );

  if (user?.tokenUsage) {
    const input = user.tokenUsage.input || 0;
    const output = user.tokenUsage.output || 0;
    const total = input + output;
    const cost = (total / 1000) * 0.002;
    embed.addFields({
      name: `${EMOJIS.logging} BYOK Usage & Est. Cost`,
      value: `Input: \`${input}\` | Output: \`${output}\`\nTotal: \`${total}\` tokens\nEst. Cost: \`$${cost.toFixed(4)}\` (@ $0.002/1k)`,
      inline: false
    });
  }

  if (user?.byokProfiles && user.byokProfiles.length > 0) {
    const profiles = user.byokProfiles.map((p, i) => `${i === user.selectedProfileIndex ? '▶' : '•'} **${p.name}** (${p.provider})`).join('\n');
    embed.addFields({ name: `${EMOJIS.byok} Key Profiles`, value: profiles, inline: false });
  }

  if (guildId) {
    const { Guild } = await import('../models/Guild.js');
    const dbGuild = await Guild.findOne({ guildId });
    if (guildTier === 'SuperPremium') {
      const brandingStatus = dbGuild?.customBranding?.nickname || dbGuild?.customBranding?.avatarUrl
        ? `${EMOJIS.success} Configured`
        : `${EMOJIS.error} Not Configured (Use \`/branding\`)`;
      embed.addFields({ name: `${EMOJIS.branding} Server Branding`, value: brandingStatus, inline: true });
    }
  }

  // Rate Limit information
  let limit = 20;
  if (tier === 'SuperPremium') {
    limit = 100;
  } else if (tier === 'Premium') {
    limit = 50;
  }

  embed.addFields({
    name: `${EMOJIS.ratelimit} Rate Limit (6-Hour Window)`,
    value: `Limit: \`${limit} requests\`\n*To view exact remaining requests, use commands normally. If you hit the limit, you will be notified.*`,
    inline: false
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}


