import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { ModeratorAction } from '../models/ModeratorAction.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('mute')
  .setDescription('Mute a user (timeout)')
  .addUserOption(opt => opt.setName('user').setDescription('The user to mute').setRequired(true))
  .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
  .addStringOption(opt => opt.setName('reason').setDescription('The reason for the mute'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user')!;
  const duration = interaction.options.getInteger('duration')!;
  const reason = interaction.options.getString('reason') || 'No reason provided';

  const member = await interaction.guild?.members.fetch(user.id);
  if (!member) return interaction.reply({ content: `${EMOJIS.error} User not found in this server.`, ephemeral: true });

  if (member.roles.highest.position >= interaction.guild?.members.me?.roles.highest.position!) {
      return interaction.reply({ content: `${EMOJIS.error} I cannot mute this user as they have a higher or equal role to me.`, ephemeral: true });
  }

  try {
    await member.timeout(duration * 60 * 1000, reason);

    await ModeratorAction.create({
        guildId: interaction.guildId,
        moderatorId: interaction.user.id,
        userId: user.id,
        action: 'mute',
        reason
    });

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.warning} User Muted`)
      .setColor('#e67e22')
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Duration', value: `${duration} minutes`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.reply({ content: `${EMOJIS.error} Failed to mute user: ${error.message}`, ephemeral: true });
  }
}
