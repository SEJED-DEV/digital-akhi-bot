import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import { aiService, tierService } from '../index.js';
import { Guild } from '../models/Guild.js';

export const data = new SlashCommandBuilder()
  .setName('dua')
  .setDescription('Request a contextual supplication (Dua)')
  .addStringOption(option =>
    option.setName('topic')
      .setDescription('The topic for the Dua')
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const topic = interaction.options.getString('topic');
  const userId = interaction.user.id;
  const tier = await tierService.getTierStatus(userId);

  if (!topic) {
      // Provide category buttons if no topic specified
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('dua_rizq').setLabel('Rizq (Provision)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('dua_shifa').setLabel('Shifa (Healing)').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('dua_sabr').setLabel('Sabr (Patience)').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('dua_forgiveness').setLabel('Forgiveness').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('dua_guidance').setLabel('Guidance').setStyle(ButtonStyle.Primary),
      );

      const embed = new EmbedBuilder()
        .setTitle('Select a Dua Category')
        .setDescription('Choose a category below or provide a specific topic with `/dua topic:Your Topic`.')
        .setColor(0x1E824C); // Emerald Green

      const response = await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });

      const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async (i) => {
          const selectedTopic = i.customId.replace('dua_', '');
          await i.deferReply({ flags: MessageFlags.Ephemeral });

          try {
            const aiResponse = await aiService.generateResponse(
              `Provide a Dua for the topic: ${selectedTopic}`,
              tier as 'Free' | 'Premium'
            );
            let branding = undefined;
            if (i.guildId) {
              const dbGuild = await Guild.findOne({ guildId: i.guildId }).lean();
              if (dbGuild?.customBranding) {
                branding = dbGuild.customBranding;
              }
            }
            const formattedResponse = aiService.formatResponse(aiResponse.text, aiResponse.model, aiResponse.source, branding);
            await i.editReply(formattedResponse);
          } catch (error) {
            console.error(error);
            await i.editReply({ content: 'An error occurred while fetching the Dua.' });
          }
      });
      return;
  }

  await interaction.deferReply();

  try {
    const response = await aiService.generateResponse(
      `Provide a Dua for the topic: ${topic}`,
      tier as 'Free' | 'Premium'
    );
    let branding = undefined;
    if (interaction.guildId) {
      const dbGuild = await Guild.findOne({ guildId: interaction.guildId }).lean();
      if (dbGuild?.customBranding) {
        branding = dbGuild.customBranding;
      }
    }
    const formattedResponse = aiService.formatResponse(response.text, response.model, response.source, branding);
    await interaction.editReply(formattedResponse);
  } catch (error) {
    console.error(error);
    await interaction.editReply('An error occurred while fetching the Dua.');
  }
}

