import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { ModeratorAction } from '../models/ModeratorAction.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('modstats')
  .setDescription('Shows moderation statistics')
  .addUserOption(opt => opt.setName('moderator').setDescription('The moderator to check stats for'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('moderator');
  const guildId = interaction.guildId!;

  if (targetUser) {
    const actions = await ModeratorAction.find({ guildId, moderatorId: targetUser.id });

    const stats = {
        warn: actions.filter(a => a.action === 'warn').length,
        mute: actions.filter(a => a.action === 'mute').length,
        kick: actions.filter(a => a.action === 'kick').length,
        ban: actions.filter(a => a.action === 'ban').length,
    };

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.shield} Moderator Stats: ${targetUser.tag}`)
        .setColor(0x00E5A3)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
            { name: 'Warnings', value: stats.warn.toString(), inline: true },
            { name: 'Mutes', value: stats.mute.toString(), inline: true },
            { name: 'Kicks', value: stats.kick.toString(), inline: true },
            { name: 'Bans', value: stats.ban.toString(), inline: true },
            { name: 'Total Actions', value: actions.length.toString(), inline: false }
        );

    return interaction.reply({ embeds: [embed] });
  } else {
    // Leaderboard
    const allActions = await ModeratorAction.find({ guildId });
    const moderatorCounts: Record<string, number> = {};

    allActions.forEach(action => {
        moderatorCounts[action.moderatorId] = (moderatorCounts[action.moderatorId] || 0) + 1;
    });

    const sortedModerators = Object.entries(moderatorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    if (sortedModerators.length === 0) {
        return interaction.reply({ content: `${EMOJIS.warning} No moderation actions recorded yet.`, flags: MessageFlags.Ephemeral });
    }

    const leaderboard = await Promise.all(sortedModerators.map(async ([modId, count], index) => {
        const user = await interaction.client.users.fetch(modId).catch(() => null);
        return `**${index + 1}.** ${user ? user.tag : `Unknown (${modId})`}: \`${count}\` actions`;
    }));

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.shield} Moderator Leaderboard`)
        .setColor(0x00E5A3)
        .setDescription(leaderboard.join('\n'))
        .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
}
