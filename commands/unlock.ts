import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel, MessageFlags } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('unlock')
  .setDescription('Unlocks a previously locked channel')
  .addChannelOption(opt => opt.setName('channel').setDescription('The channel to unlock'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

  if (!channel.isTextBased()) {
      return interaction.reply({ content: `${EMOJIS.error} You can only unlock text-based channels.`, flags: MessageFlags.Ephemeral });
  }

  try {
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
          SendMessages: null
      });

      await interaction.reply({ content: `${EMOJIS.shield} Channel ${channel} has been unlocked. ${EMOJIS.unlock}` });
  } catch (error) {
      await interaction.reply({ content: `${EMOJIS.error} Failed to unlock channel.`, flags: MessageFlags.Ephemeral });
  }
}
