import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { aiService, tierService } from '../index.js';
import { paginate } from '../services/PaginationService.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('hadith')
  .setDescription('Request a verified Hadith')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Topic or number of the Hadith')
      .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const query = interaction.options.getString('query', true);
  const userId = interaction.user.id;
  const tier = await tierService.getTierStatus(userId);

  await interaction.deferReply();

  try {
    const response = await aiService.generateResponse(
      `Search for verified Hadiths related to: ${query}. Include source gradings. If there are multiple, separate them clearly.`,
      tier as 'Free' | 'Premium' | 'SuperPremium',
      undefined,
      undefined,
      undefined,
      undefined,
      userId
    ).catch(async (err) => {
        // Fallback Hadith search if AI fails
        const hadiths = [
            { text: "Verily, actions are by intentions...", source: "Sahih Bukhari 1", tags: ["intentions", "niyyah"] },
            { text: "None of you truly believes until he loves for his brother what he loves for himself.", source: "Sahih Bukhari 13", tags: ["love", "brotherhood"] },
            { text: "The best among you are those who have the best manners and character.", source: "Sahih Bukhari 6029", tags: ["character", "manners"] },
            { text: "A Muslim is a brother of another Muslim...", source: "Sahih Bukhari 2442", tags: ["muslim", "brotherhood"] },
            { text: "Whoever believes in Allah and the Last Day should speak good or remain silent.", source: "Sahih Bukhari 6018", tags: ["speech", "silence"] }
        ];

        const match = hadiths.find(h => h.tags.some(tag => query.toLowerCase().includes(tag)) || h.text.toLowerCase().includes(query.toLowerCase()));
        if (match) {
            return {
                text: `**${match.source}**\n\n${match.text}\n\n*(Note: This is a fallback result as the AI was unavailable)*`,
                model: 'Fallback-Regex'
            };
        }
        throw err;
    });

    // Split into pages if response is too long or contains multiple hadiths
    const paragraphs = response.text.split(/\n\s*\n/);
    const pages: EmbedBuilder[] = [];

    let currentContent = '';
    for (const para of paragraphs) {
        if (currentContent.length + para.length > 1500) {
            pages.push(new EmbedBuilder()
                .setTitle(`${EMOJIS.sparkles} Hadith Search: ${query}`)
                .setDescription(currentContent)
                .setColor(0x1E824C));
            currentContent = para + '\n\n';
        } else {
            currentContent += para + '\n\n';
        }
    }

    if (currentContent) {
        pages.push(new EmbedBuilder()
            .setTitle(`${EMOJIS.sparkles} Hadith Search: ${query}`)
            .setDescription(currentContent)
            .setColor(0x1E824C));
    }

    await paginate(interaction, pages);
  } catch (error) {
    console.error(error);
    await interaction.editReply(`${EMOJIS.error} An error occurred while searching for the Hadith.`);
  }
}

