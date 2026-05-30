import { Interaction, MessageFlags, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';
import { Logger } from '../services/Logger.js';

export async function interactionCreate(interaction: Interaction) {
  if (interaction.isAutocomplete()) {
    const command = (interaction.client as any).commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(error);
    }
    return;
  }

  // Handle Buttons (for /dm logs)
  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('dm_edit:') || customId.startsWith('dm_del:')) {
      // 1. Permission check
      const member = interaction.member;
      if (!member || typeof member === 'string' || !('permissions' in member) || typeof member.permissions === 'string' || 
          (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild))) {
        return interaction.reply({
          content: `${EMOJIS.error} Only server owners, administrators, or members with **Manage Server** permission can perform actions on direct messages.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const parts = customId.split(':');
      const action = parts[0]; // dm_edit or dm_del
      const targetUserId = parts[1];
      const dmMessageId = parts[2];
      const dmChannelId = parts[3];

      if (action === 'dm_del') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
          const targetUser = await interaction.client.users.fetch(targetUserId);
          const dmChannel = await targetUser.createDM();
          const dmMessage = await dmChannel.messages.fetch(dmMessageId);
          await dmMessage.delete();

          // Update log embed
          const message = interaction.message;
          if (message.embeds.length > 0) {
            const originalEmbed = message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
              .setColor(0x94A3B8) // Slate grey for inactive
              .setTitle(`${EMOJIS.delete} Direct Message [Deleted]`);
            
            await message.edit({ embeds: [updatedEmbed], components: [] });
          }

          return interaction.editReply(`${EMOJIS.success} Direct message deleted successfully.`);
        } catch (err: any) {
          Logger.error('Failed to delete DM:', err);
          return interaction.editReply(`${EMOJIS.error} Failed to delete direct message. The user might have deleted it themselves or DMs are unavailable. Details: \`${err.message}\``);
        }
      }

      if (action === 'dm_edit') {
        // Show modal to edit
        const modal = new ModalBuilder()
          .setCustomId(`dm_edit_modal:${targetUserId}:${dmMessageId}:${dmChannelId}`)
          .setTitle('Edit Direct Message');

        const messageInput = new TextInputBuilder()
          .setCustomId('message_input')
          .setLabel('New Message Content')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1900);

        // Pre-fill content if possible
        const message = interaction.message;
        if (message.embeds.length > 0) {
          const originalEmbed = message.embeds[0];
          const contentField = originalEmbed.fields.find(f => f.name === 'Message Content');
          if (contentField) {
            messageInput.setValue(contentField.value);
          }
        }

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);
        modal.addComponents(row);

        return interaction.showModal(modal);
      }
    }
  }

  // Handle Buttons (for Giveaway)
  if (interaction.isButton()) {
    if (interaction.customId === 'giveaway_join') {
      const { Giveaway } = await import('../models/Giveaway.js');
      const giveaway = await Giveaway.findOne({ messageId: interaction.message.id });

      if (!giveaway || giveaway.ended) {
        return interaction.reply({ content: `${EMOJIS.error} This giveaway has already ended.`, flags: MessageFlags.Ephemeral });
      }

      if (giveaway.participants.includes(interaction.user.id)) {
        return interaction.reply({ content: `${EMOJIS.error} You have already joined this giveaway.`, flags: MessageFlags.Ephemeral });
      }

      giveaway.participants.push(interaction.user.id);
      await giveaway.save();

      return interaction.reply({ content: `${EMOJIS.success} You have successfully joined the giveaway!`, flags: MessageFlags.Ephemeral });
    }
  }

  // Handle Buttons (for RSVP)
  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('rsvp_')) {
      const parts = customId.split('_');
      const action = parts[1]; // going, maybe, no
      const eventId = parts[2];

      const { GuildEvent } = await import('../models/Event.js');
      const event = await GuildEvent.findById(eventId);
      if (!event) return interaction.reply({ content: `${EMOJIS.error} Event not found.`, flags: MessageFlags.Ephemeral });

      // Remove from all
      event.going = event.going.filter(id => id !== interaction.user.id);
      event.maybe = event.maybe.filter(id => id !== interaction.user.id);
      event.notGoing = event.notGoing.filter(id => id !== interaction.user.id);

      if (action === 'going') event.going.push(interaction.user.id);
      else if (action === 'maybe') event.maybe.push(interaction.user.id);
      else if (action === 'no') event.notGoing.push(interaction.user.id);

      await event.save();

      // Update embed
      const message = interaction.message;
      if (message.embeds.length > 0) {
        const originalEmbed = message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed);
        updatedEmbed.setFields([
          { name: originalEmbed.fields[0].name, value: originalEmbed.fields[0].value, inline: true },
          { name: 'RSVP', value: `Going: ${event.going.length} | Maybe: ${event.maybe.length} | No: ${event.notGoing.length}`, inline: true }
        ]);
        await message.edit({ embeds: [updatedEmbed] });
      }

      return interaction.reply({ content: `${EMOJIS.success} RSVP updated to **${action}**.`, flags: MessageFlags.Ephemeral });
    }
  }

  // Handle String Select Menu (for /fatwa)
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'fatwa_category_select') {
      const categories = interaction.values;
      const modal = new ModalBuilder()
        .setCustomId(`fatwa_question_modal:${categories.join(',')}`)
        .setTitle('Submit Your Question');

      const questionInput = new TextInputBuilder()
        .setCustomId('fatwa_question_input')
        .setLabel('What is your question?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(questionInput));
      return interaction.showModal(modal);
    }
  }

  // Handle Modal Submissions (for /dm edit modal)
  if (interaction.isModalSubmit()) {
    const customId = interaction.customId;

    if (customId === 'prayer_reminders_modal') {
        const timezone = interaction.fields.getTextInputValue('timezone');
        const advance = parseInt(interaction.fields.getTextInputValue('advance'));
        const prayersRaw = interaction.fields.getTextInputValue('prayers').toLowerCase();

        const prayers = prayersRaw.split(',').map(p => p.trim());

        const { User } = await import('../models/User.js');
        await User.findOneAndUpdate(
            { discordId: interaction.user.id },
            {
                prayerReminders: {
                    timezone,
                    advanceMinutes: isNaN(advance) ? 0 : advance,
                    fajr: prayers.includes('fajr'),
                    dhuhr: prayers.includes('dhuhr'),
                    asr: prayers.includes('asr'),
                    maghrib: prayers.includes('maghrib'),
                    isha: prayers.includes('isha')
                }
            },
            { upsert: true }
        );

        return interaction.reply({ content: `${EMOJIS.success} Prayer reminders configured!`, flags: MessageFlags.Ephemeral });
    }

    if (customId.startsWith('fatwa_question_modal:')) {
        const categories = customId.split(':')[1].split(',');
        const question = interaction.fields.getTextInputValue('fatwa_question_input');

        const { Fatwa } = await import('../models/Fatwa.js');
        const fatwa = new Fatwa({
            userId: interaction.user.id,
            guildId: interaction.guildId,
            categories,
            question
        });
        await fatwa.save();

        return interaction.reply({
            content: `${EMOJIS.success} Your question has been submitted to the queue. Please wait for a scholar to respond.`,
            flags: MessageFlags.Ephemeral
        });
    }
    if (customId.startsWith('dm_edit_modal:')) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      
      const parts = customId.split(':');
      const targetUserId = parts[1];
      const dmMessageId = parts[2];

      const newContent = interaction.fields.getTextInputValue('message_input');

      try {
        const targetUser = await interaction.client.users.fetch(targetUserId);
        const dmChannel = await targetUser.createDM();
        const dmMessage = await dmChannel.messages.fetch(dmMessageId);
        
        // Re-construct the DM embed with the new content
        const dmEmbed = new EmbedBuilder()
          .setColor(0x1E824C)
          .setTitle(`${EMOJIS.dm} Message from ${interaction.guild!.name}`)
          .setDescription(newContent)
          .setFooter({ text: `Sent by ${interaction.user.tag} (Edited)` })
          .setTimestamp();

        await dmMessage.edit({ embeds: [dmEmbed] });

        // Update log embed in dm-logs channel
        const message = interaction.message;
        if (message && message.embeds.length > 0) {
          const originalEmbed = message.embeds[0];
          const updatedEmbed = EmbedBuilder.from(originalEmbed);
          
          // Recreate fields to update Message Content
          updatedEmbed.setFields(
            { name: 'Sender', value: originalEmbed.fields[0].value, inline: true },
            { name: 'Recipient', value: originalEmbed.fields[1].value, inline: true },
            { name: 'Message Content', value: newContent }
          );

          await message.edit({ embeds: [updatedEmbed] });
        }

        return interaction.editReply(`${EMOJIS.success} Direct message edited successfully.`);
      } catch (err: any) {
        Logger.error('Failed to edit DM:', err);
        return interaction.editReply(`${EMOJIS.error} Failed to edit direct message. The user might have deleted it, closed DMs, or an API error occurred. Details: \`${err.message}\``);
      }
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const command = (interaction.client as any).commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
}
