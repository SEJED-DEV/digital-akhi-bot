import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Warning } from '../models/Warning.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('warnings')
  .setDescription('View warnings for a user')
  .addUserOption(opt => opt.setName('user').setDescription('The user to view warnings for').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user')!;
  const warnings = await Warning.find({ userId: user.id, guildId: interaction.guildId }).sort({ timestamp: -1 });

  if (warnings.length === 0) {
    return interaction.reply({ content: `${EMOJIS.sparkles} <@${user.id}> has no warnings.`, ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.warning} Warnings for ${user.tag}`)
    .setColor('#f1c40f')
    .setDescription(warnings.map((w, i) => `**${i + 1}.** ${w.reason} (by <@${w.moderatorId}>) - <t:${Math.floor(w.timestamp.getTime() / 1000)}:R>`).join('\n'))
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
