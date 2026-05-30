import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { Logger } from '../services/Logger.js';
import { CacheService } from '../services/CacheService.js';
import { EMOJIS } from '../utils/Emojis.js';

const locs = [
  'Saudi Arabia', 'Egypt',
  'United Arab Emirates', 'Qatar',
  'Kuwait', 'Oman', 'Jordan', 'Lebanon',
  'Syria', 'Iraq', 'Palestine', 'Yemen',
  'Turkey', 'Iran', 'Indonesia', 'Malaysia',
  'Pakistan', 'Bangladesh', 'Maldives',
  'Algeria', 'Morocco', 'Tunisia',
  'Libya', 'Sudan',
  'Somalia', 'Djibouti', 'Mauritania',
  'United Kingdom', 'France', 'Germany', 'Belgium',
  'Netherlands', 'United States', 'Canada',
  'Australia', 'New Zealand', 'South Africa',
  'Kenya', 'Nigeria', 'Senegal', 'India'
];

export const data = new SlashCommandBuilder()
  .setName('prayer')
  .setDescription('Displays local prayer times')
  .addStringOption(option =>
    option.setName('location')
      .setDescription('City or location')
      .setRequired(true)
      .setAutocomplete(true)
      .setMinLength(2)
      .setMaxLength(100));

export async function autocomplete(interaction: AutocompleteInteraction) {
  const query = interaction.options.getFocused();
  const matchedLocs = locs.filter(choice => choice.toLowerCase().includes(query.toLowerCase())).slice(0, 25);
  await interaction.respond(
    matchedLocs.map(choice => ({ name: choice, value: choice })),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const location = interaction.options.getString('location', true).trim();

  await interaction.deferReply();

  try {
    // Sanitize location for API call: Allow letters, spaces, commas, periods, hyphens
    const sanitizedLocation = location.replace(/[^a-zA-Z\s,.\-]/g, '').trim();

    if (sanitizedLocation.length < 2 || sanitizedLocation.length > 50) {
        return interaction.editReply('Please provide a valid location name (2-50 characters).');
    }

    // Using Aladhan API for prayer times with caching
    const cacheKey = `prayer:${sanitizedLocation.toLowerCase().replace(/\s+/g, '_')}`;
    const cachedData = await CacheService.get<{ timings: any, date: string }>(cacheKey);

    let timings, date;

    if (cachedData) {
        timings = cachedData.timings;
        date = cachedData.date;
    } else {
        const response = await axios.get(`https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(sanitizedLocation)}`, {
            timeout: 10000
        });

        if (!response.data?.data?.timings || !response.data?.data?.date?.readable) {
            throw new Error('Invalid response from Aladhan API: Missing timings or date');
        }

        timings = response.data.data.timings;
        date = response.data.data.date.readable;

        // Cache for 12 hours
        await CacheService.set(cacheKey, { timings, date }, 12 * 3600);
    }

    const embed = new EmbedBuilder()
    .setTitle(`Prayer Times`)
    .setDescription(`Location: ${sanitizedLocation}\nDate: ${date}`)
    .setColor(0x1E824C) // Elegant Emerald Green
    .setFooter({ text: `Source: Aladhan API`, iconURL: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=32&h=32' });
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (const prayer of prayers) {
    embed.addFields({
        name: `${EMOJIS.sparkles} ${prayer}`,
        value: timings[prayer],
        inline: true
    });
    }
    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    Logger.error(`Error fetching prayer times for ${location}:`, error);
    await interaction.editReply(`${EMOJIS.error} An error occurred while fetching prayer times. Please ensure the location is correct and try again later.`);
  }
}

