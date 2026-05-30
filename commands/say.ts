import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, TextChannel, MessageFlags } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Send a message as the bot with custom links, embeds, and attachments')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption(option =>
    option.setName('message')
      .setDescription('The text message content')
      .setRequired(false))
  .addAttachmentOption(option =>
    option.setName('attachment')
      .setDescription('An attachment to send with the message')
      .setRequired(false))
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('The channel to send the message in (defaults to current channel)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('embed-title')
      .setDescription('Title for an embed')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('embed-description')
      .setDescription('Description for the embed')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('embed-url')
      .setDescription('URL for the embed title link')
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const messageContent = interaction.options.getString('message');
  const attachment = interaction.options.getAttachment('attachment');
  const targetChannel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
  const embedTitle = interaction.options.getString('embed-title');
  const embedDescription = interaction.options.getString('embed-description');
  const embedUrl = interaction.options.getString('embed-url');

  if (!messageContent && !attachment && !embedDescription) {
    return interaction.reply({
      content: `${EMOJIS.error} You must provide at least a text message, an attachment, or an embed description!`,
      flags: MessageFlags.Ephemeral
    });
  }

  // Check channel write permissions
  if (!targetChannel.isTextBased() || !('send' in targetChannel)) {
    return interaction.reply({
      content: `${EMOJIS.error} The specified channel is not a valid text-based channel.`,
      flags: MessageFlags.Ephemeral
    });
  }

  const payload: any = {};

  if (messageContent) {
    payload.content = messageContent;
  }

  if (attachment) {
    payload.files = [attachment];
  }

  if (embedTitle || embedDescription) {
    const embed = new EmbedBuilder()
      .setColor(0x1E824C); // Emerald Green

    if (embedTitle) embed.setTitle(embedTitle);
    if (embedDescription) embed.setDescription(embedDescription);
    if (embedUrl) embed.setURL(embedUrl);

    payload.embeds = [embed];
  }

  try {
    await targetChannel.send(payload);
    await interaction.reply({
      content: `${EMOJIS.success} Message successfully sent to ${targetChannel}!`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error: any) {
    console.error('Error in /say command:', error);
    await interaction.reply({
      content: `${EMOJIS.error} Failed to send message. Check that I have permission to send messages in ${targetChannel.name}. Error: ${error.message || error}`,
      flags: MessageFlags.Ephemeral
    });
  }
}
