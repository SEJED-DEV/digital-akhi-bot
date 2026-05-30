import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Warning } from '../models/Warning.js';
import { ModeratorAction } from '../models/ModeratorAction.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Warn a user')
  .addUserOption(opt => opt.setName('user').setDescription('The user to warn').setRequired(true))
  .addStringOption(opt => opt.setName('reason').setDescription('The reason for the warning').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user')!;
  const reason = interaction.options.getString('reason')!;
  const moderator = interaction.user;

  if (user.bot) return interaction.reply({ content: `${EMOJIS.error} You cannot warn bots.`, ephemeral: true });

  await Warning.create({
    userId: user.id,
    guildId: interaction.guildId,
    reason,
    moderatorId: moderator.id
  });

  await ModeratorAction.create({
    guildId: interaction.guildId,
    moderatorId: moderator.id,
    userId: user.id,
    action: 'warn',
    reason
  });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.warning} User Warned`)
    .setColor('#f1c40f')
    .addFields(
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
      { name: 'Reason', value: reason }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Try to DM the user
  try {
    await user.send(`${EMOJIS.warning} You have been warned in **${interaction.guild?.name}** for: ${reason}`);
  } catch (e) {
    // Ignore if DMs are closed
  }
}
