import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('links')
  .setDescription('Useful resources and official links for the bot');

export async function execute(interaction: ChatInputCommandInteraction) {
  const supportInvite = process.env.NEXT_PUBLIC_SUPPORT_SERVER_INVITE || 'https://discord.gg/pun3PXXDuE';
  
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.sparkles} Official Links & Resources`)
    .setDescription(`Stay connected, get support, and read our documentation.`)
    .setColor(0x1E824C)
    .addFields(
      { name: `${EMOJIS.website} Website`, value: 'Check commands, features, and read documentation online.', inline: true },
      { name: `${EMOJIS.chat} Support Server`, value: 'Join our community for updates and instant help.', inline: true },
      { name: `${EMOJIS.github} GitHub`, value: 'Access our open-source repository.', inline: true },
      { name: `${EMOJIS.legal} Legal Policies`, value: 'Read our Terms of Service & Privacy Policy.', inline: true }
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Website')
      .setStyle(ButtonStyle.Link)
      .setURL('https://digital-akhi-bot.vercel.app/') // Or your actual domain
      .setEmoji(EMOJIS.mosque),
    new ButtonBuilder()
      .setLabel('Support Server')
      .setStyle(ButtonStyle.Link)
      .setURL(supportInvite)
      .setEmoji(EMOJIS.support),
    new ButtonBuilder()
      .setLabel('GitHub')
      .setStyle(ButtonStyle.Link)
      .setURL('https://github.com/SEJED-DEV/digital-akhi-bot')
      .setEmoji(EMOJIS.sparkles),
    new ButtonBuilder()
      .setLabel('Privacy Policy')
      .setStyle(ButtonStyle.Link)
      .setURL('https://digital-akhi-bot.vercel.app//privacy.html')
      .setEmoji(EMOJIS.bot)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}
