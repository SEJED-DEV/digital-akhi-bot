import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { aiService, tierService } from '../index.js';
import { paginate } from '../services/PaginationService.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('quran')
  .setDescription('Search for a specific verse or topic in the Holy Quran')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Verse reference (e.g., 2:255) or topic')
      .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const query = interaction.options.getString('query', true);
  const userId = interaction.user.id;
  const tier = await tierService.getTierStatus(userId);

  await interaction.deferReply();

  try {
    const response = await aiService.generateResponse(
      `Search for the following in the Quran: ${query}. Provide the Arabic text, English translation, and a brief tafsir or context if possible. If the query is a reference like 2:255, provide that specific verse.`,
      tier as 'Free' | 'Premium'
    );

    // Split into pages if response is too long
    const paragraphs = response.text.split(/\n\s*\n/);
    const pages: EmbedBuilder[] = [];


    let currentContent = '';
    for (const para of paragraphs) {
        if (currentContent.length + para.length > 1800) {
            pages.push(new EmbedBuilder()
                .setTitle(`${EMOJIS.mosque} Quran Search: ${query}`)
                .setDescription(currentContent)
                .setColor(0x1E824C));
            currentContent = para + '\n\n';
        } else {
            currentContent += para + '\n\n';
        }
    }

    if (currentContent) {
        pages.push(new EmbedBuilder()
            .setTitle(`${EMOJIS.mosque} Quran Search: ${query}`)
            .setDescription(currentContent)
            .setColor(0x1E824C));
    }

    if (pages.length > 1) {
        await paginate(interaction, pages);
    } else {
        await interaction.editReply({ embeds: [pages[0]] });
    }
  } catch (error) {
    console.error(error);
    await interaction.editReply(`${EMOJIS.error} An error occurred while searching the Quran.`);
  }
}
