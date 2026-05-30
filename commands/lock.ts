import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel, MessageFlags } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('lock')
  .setDescription('Locks the current channel or a specific channel')
  .addChannelOption(opt => opt.setName('channel').setDescription('The channel to lock'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

  if (!channel.isTextBased()) {
      return interaction.reply({ content: `${EMOJIS.error} You can only lock text-based channels.`, flags: MessageFlags.Ephemeral });
  }

  try {
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
          SendMessages: false
      });

      await interaction.reply({ content: `${EMOJIS.shield} Channel ${channel} has been locked. ${EMOJIS.lock}` });
  } catch (error) {
      await interaction.reply({ content: `${EMOJIS.error} Failed to lock channel.`, flags: MessageFlags.Ephemeral });
  }
}
