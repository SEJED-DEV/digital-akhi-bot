import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';
import { aiService, tierService } from '../index.js';

export const data = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Comprehensive search across Quran, Hadith, and Duas')
  .addStringOption(opt => opt.setName('query').setDescription('Search query').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const query = interaction.options.getString('query', true);
  const tier = await tierService.getTierStatus(interaction.user.id);

  await interaction.deferReply();

  try {
    const response = await aiService.generateResponse(
      `Search Islamic sources (Quran, Hadith, Duas) for: ${query}. Rank results by relevance. Provide clear citations.`,
      tier as any,
      undefined,
      undefined,
      undefined,
      undefined,
      interaction.user.id
    );

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Search Results: ${query}`)
      .setDescription(response.text.length > 4000 ? response.text.slice(0, 3997) + '...' : response.text)
      .setColor(0x00E5A3)
      .setFooter({ text: `Model: ${response.model}` });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply(`${EMOJIS.error} Search failed. Please try again later.`);
  }
}
