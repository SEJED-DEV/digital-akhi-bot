import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Guild } from '../models/Guild.js';
import { EMOJIS } from '../utils/Emojis.js';
import { Logger } from '../services/Logger.js';

export const data = new SlashCommandBuilder()
  .setName('dm')
  .setDescription('Send a direct message to a user through the bot (Server Owners/Admins only)')
  .addUserOption(opt =>
    opt.setName('user')
      .setDescription('The user to send the DM to')
      .setRequired(true))
  .addStringOption(opt =>
    opt.setName('message')
      .setDescription('The message content to send')
      .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({
      content: `${EMOJIS.error} This command can only be executed within a Discord Server (Guild).`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 1. Permissions Check (Administrator or Manage Server required)
  const member = interaction.member;
  if (!member || typeof member === 'string' || !('permissions' in member) || typeof member.permissions === 'string' || 
      (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild))) {
    return interaction.reply({
      content: `${EMOJIS.error} Only server owners, administrators, or members with **Manage Server** permission can use the \`/dm\` command.`,
      flags: MessageFlags.Ephemeral
    });
  }

  const targetUser = interaction.options.getUser('user', true);
  const messageContent = interaction.options.getString('message', true);

  if (targetUser.bot) {
    return interaction.reply({
      content: `${EMOJIS.error} You cannot send DMs to other bot accounts.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // Defer reply since DM and log-channel creation might take a moment
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let dmMessage;
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0x1E824C)
      .setTitle(`${EMOJIS.dm} Message from ${guild.name}`)
      .setDescription(messageContent)
      .setFooter({ text: `Sent by ${interaction.user.tag}` })
      .setTimestamp();

    dmMessage = await targetUser.send({ embeds: [dmEmbed] });
  } catch (error: any) {
    Logger.error(`Failed to DM user ${targetUser.id} from guild ${guild.id}:`, error);
    return interaction.editReply({
      content: `${EMOJIS.error} Failed to send DM to ${targetUser.tag}. The user may have DMs closed or blocked the bot.`
    });
  }

  // 2. Manage/Create DM Logs Channel
  let dbGuild = await Guild.findOne({ guildId: guild.id });
  let logChannelId = dbGuild?.dmLogsChannelId;
  let logChannel = logChannelId ? guild.channels.cache.get(logChannelId) : null;

  if (!logChannel) {
    // Try to find channel by name 'dm-logs' first
    const existingChannel = guild.channels.cache.find(c => c.name === 'dm-logs' && c.isTextBased());
    if (existingChannel) {
      logChannel = existingChannel;
      logChannelId = existingChannel.id;
    } else {
      // Create a private 'dm-logs' channel
      try {
        logChannel = await guild.channels.create({
          name: 'dm-logs',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel] // Private for everyone by default
            },
            {
              id: interaction.client.user!.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }
          ]
        });
        logChannelId = logChannel.id;
      } catch (err: any) {
        Logger.error(`Failed to create dm-logs channel in guild ${guild.id}:`, err);
      }
    }

    if (logChannelId) {
      await Guild.findOneAndUpdate(
        { guildId: guild.id },
        { dmLogsChannelId: logChannelId },
        { upsert: true }
      );
    }
  }

  // 3. Log to dm-logs channel if available
  if (logChannel && logChannel.isTextBased()) {
    try {
      const logEmbed = new EmbedBuilder()
        .setColor(0x1E824C)
        .setTitle(`${EMOJIS.send} Direct Message Sent`)
        .addFields(
          { name: 'Sender', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: 'Recipient', value: `${targetUser} (${targetUser.tag})`, inline: true },
          { name: 'Message Content', value: messageContent }
        )
        .setTimestamp();

      const editButton = new ButtonBuilder()
        .setCustomId(`dm_edit:${targetUser.id}:${dmMessage.id}:${dmMessage.channelId}`)
        .setLabel('Edit Message')
        .setStyle(ButtonStyle.Primary)
        .setEmoji(EMOJIS.edit);

      const deleteButton = new ButtonBuilder()
        .setCustomId(`dm_del:${targetUser.id}:${dmMessage.id}:${dmMessage.channelId}`)
        .setLabel('Delete Message')
        .setStyle(ButtonStyle.Danger)
        .setEmoji(EMOJIS.delete);

      let row = new ActionRowBuilder<ButtonBuilder>().addComponents(editButton, deleteButton);

      try {
        await (logChannel as any).send({ embeds: [logEmbed], components: [row] });
      } catch (err: any) {
        if (err.code === 50035 || err.message?.includes('emoji')) {
          Logger.warn(`Custom button emojis failed to load in guild ${guild.id}, falling back to standard emojis.`);
          editButton.setEmoji('📝');
          deleteButton.setEmoji('🗑️');
          row = new ActionRowBuilder<ButtonBuilder>().addComponents(editButton, deleteButton);
          await (logChannel as any).send({ embeds: [logEmbed], components: [row] });
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      Logger.error(`Failed to send log entry to dm-logs in guild ${guild.id}:`, err);
    }
  }

  return interaction.editReply({
    content: `${EMOJIS.success} Successfully sent DM to ${targetUser} (${targetUser.tag}).`
  });
}
