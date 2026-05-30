import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';
import { Logger } from '../services/Logger.js';

export const data = new SlashCommandBuilder()
  .setName('palestine')
  .setDescription('Get the latest Palestine news exclusively from Al Jazeera')
  .addStringOption(option =>
    option.setName('language')
      .setDescription('Language of the news articles')
      .setRequired(false)
      .addChoices(
        { name: 'English 🇬🇧', value: 'en' },
        { name: 'Arabic 🇵🇸', value: 'ar' }
      ));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const lang = interaction.options.getString('language') || 'en';
  const url = lang === 'ar' 
    ? 'https://www.aljazeera.net/aljazeerarss/all.xml'
    : 'https://www.aljazeera.com/xml/rss/all.xml';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Al Jazeera RSS responded with status: ${response.status}`);
    }

    const xml = await response.text();
    const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];

    // Parse RSS XML elements
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatches) {
      const content = match[1];

      // Parse fields and unwrap CDATA
      let title = content.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
      let link = content.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      let description = content.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';
      let pubDate = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';

      // Clean CDATA wrappers
      const cleanCDATA = (str: string) => str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      title = cleanCDATA(title);
      link = cleanCDATA(link);
      description = cleanCDATA(description).replace(/<[^>]*>?/gm, ''); // Strip HTML tags
      pubDate = cleanCDATA(pubDate);

      // Decent decoding of XML entities
      const decodeEntities = (str: string) => str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      title = decodeEntities(title);
      description = decodeEntities(description);

      // Filter for Palestine related keywords
      const keywords = lang === 'ar'
        ? ['فلسطين', 'غزة', 'رفح', 'القدس', 'الضفة', 'شهيد', 'شهداء', 'الاحتلال', 'مقاومة', 'حماس', 'شمال غزة', 'جنوب غزة']
        : ['palestine', 'gaza', 'rafah', 'jerusalem', 'west bank', 'martyr', 'occupation', 'resistance', 'hamas', 'al-aqsa', 'israel', 'conflict'];
      
      const titleLower = title.toLowerCase();
      const descLower = description.toLowerCase();
      const matchesKeyword = keywords.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword));
      
      if (!matchesKeyword) continue;

      items.push({ title, link, description, pubDate });
      if (items.length >= 5) break; // Get top 5 articles
    }

    if (items.length === 0) {
      return interaction.editReply({
        content: `${EMOJIS.warning} No recent Al Jazeera articles found regarding Palestine at this moment.`
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(lang === 'ar' ? `${EMOJIS.mosque} آخر أخبار فلسطين — الجزيرة` : `${EMOJIS.mosque} Latest Palestine News — Al Jazeera`)
      .setURL(lang === 'ar' ? 'https://www.aljazeera.net' : 'https://www.aljazeera.com')
      .setDescription(lang === 'ar' ? 'تغطية مباشرة وحصرية لأخبار فلسطين من شبكة الجزيرة الإعلامية.' : 'Live updates and reports on the Palestine conflict sourced directly from Al Jazeera.')
      .setColor(0x1E824C) // Elegant Emerald Green
      .setTimestamp()
      .setFooter({ text: lang === 'ar' ? 'المصدر: الجزيرة • الأمة الإسلامية' : 'Source: Al Jazeera • Ummah Solidarity' });

    for (const item of items) {
      // Limit description length for neatness
      const shortDesc = item.description.length > 180 
        ? item.description.substring(0, 180) + '...'
        : item.description;

      embed.addFields({
        name: `${EMOJIS.sparkles} ${item.title}`,
        value: `${shortDesc}\n[${lang === 'ar' ? 'اقرأ المزيد' : 'Read Article'}](${item.link})`,
        inline: false
      });
    }

    return interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    Logger.error('Failed to retrieve Palestine news:', error);
    return interaction.editReply({
      content: `${EMOJIS.error} Failed to retrieve Al Jazeera news feed. Please try again later. Details: \`${error.message}\``
    });
  }
}
