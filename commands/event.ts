import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { GuildEvent } from '../models/Event.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Manage guild events')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new guild event')
      .addStringOption(opt => opt.setName('name').setDescription('Event name').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Event description').setRequired(true))
      .addStringOption(opt => opt.setName('time').setDescription('Time (e.g. 2023-12-25 18:00)').setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'create') {
    const name = interaction.options.getString('name', true);
    const description = interaction.options.getString('description', true);
    const timeStr = interaction.options.getString('time', true);
    const timestamp = new Date(timeStr);

    if (isNaN(timestamp.getTime())) {
      return interaction.reply({ content: `${EMOJIS.error} Invalid date format. Please use YYYY-MM-DD HH:MM.`, flags: MessageFlags.Ephemeral });
    }

    const event = new GuildEvent({
      guildId: interaction.guildId,
      name,
      description,
      timestamp,
      creatorId: interaction.user.id
    });

    await event.save();

    const embed = new EmbedBuilder()
      .setTitle(`📅 New Event: ${name}`)
      .setDescription(description)
      .addFields(
        { name: 'Time', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
        { name: 'RSVP', value: 'Going: 0 | Maybe: 0 | No: 0', inline: true }
      )
      .setColor(0x00E5A3);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`rsvp_going_${event._id}`).setLabel('✅ Going').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`rsvp_maybe_${event._id}`).setLabel('❓ Maybe').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rsvp_no_${event._id}`).setLabel('❌ No').setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }
}
