import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('fatwa')
  .setDescription('Submit a religious question to the scholar queue');

export async function execute(interaction: ChatInputCommandInteraction) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('fatwa_category_select')
    .setPlaceholder('Select relevant categories')
    .setMinValues(1)
    .setMaxValues(3)
    .addOptions([
      { label: 'Worship (Ibadah)', value: 'worship' },
      { label: 'Finance (Muamalat)', value: 'finance' },
      { label: 'Family (Usrah)', value: 'family' },
      { label: 'Social (Adab)', value: 'social' },
      { label: 'Creed (Aqidah)', value: 'aqidah' }
    ]);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.reply({
    content: `${EMOJIS.sparkles} Please select the categories for your question:`,
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}
