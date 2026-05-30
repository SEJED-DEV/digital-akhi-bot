import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all bot commands and how to use them');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.sparkles} Digital Akhi Bot — Command Directory`)
    .setDescription(
      `Assalamu Alaikum! ${EMOJIS.bot} **Digital Akhi Bot** is your community companion for verified Islamic knowledge, prayer tracking, and helpful community utilities.\n\n` +
      `Here is a breakdown of all available slash commands:`
    )
    .setColor(0x1E824C)
    .addFields(
      {
        name: `${EMOJIS.mosque} Islamic Knowledge & Guidance`,
        value: 
          `• \`/hadith <query>\` — Sourced verified Hadiths with grade metadata (e.g. Sahih).\n` +
          `• \`/dua [topic]\` — Request contextual supplications or choose a category button.\n` +
          `• \`/prayer <city> [country]\` — Retrieve today's Aladhan calculated salah times with autocomplete support.`
      },
      {
        name: `${EMOJIS.premium} Premium & Account Management`,
        value: 
          `• \`/profile [user]\` — View user/server tier status, invites, and rate limit quotas.\n` +
          `• \`/setkey set <provider> <key>\` — Set personal BYOK API key (encrypted at rest).\n` +
          `• \`/setkey remove <provider>\` — Remove your registered BYOK API key.\n` +
          `• \`/branding set [nickname] [avatar-url]\` — Custom bot profile nickname and avatar (SuperPremium servers only).\n` +
          `• \`/branding clear\` — Restore the bot server profile to default.`
      },
      {
        name: `${EMOJIS.logging} Admin & Configuration`,
        value: 
          `• \`/say [message] [attachment] [channel] [embed-title] [embed-description]\` — Send customized messages/embeds as the bot.\n` +
          `• \`/dm <user> <message>\` — DM a user through the bot with log actions (Admins only).\n` +
          `• \`/config blacklist-channel <channel>\` — Configure the channel for blacklist alerts.\n` +
          `• \`/admin premium <add/remove> <user>\` — Grant/revoke Premium tier bypassing requirements.\n` +
          `• \`/admin premium-guild <add/remove> <guild-id> <tier>\` — Grant/revoke Premium tier to a server.\n` +
          `• \`/admin blacklist <add/remove> <user> <type> [reason]\` — Globally/locally blacklist a user.`
      },
      {
        name: `${EMOJIS.features} Utilities`,
        value: 
          `• \`/help\` — Open this interactive instruction directory.\n` +
          `• \`/faqs\` — Browse frequently asked questions about AI features, security, etc.\n` +
          `• \`/links\` — Access the official links (website, support, terms, github).\n` +
          `• \`/changelog\` — View bot release notes and updates.`
      },
      {
        name: `${EMOJIS.bot} Conversational AI`,
        value: `Mention the bot <@${interaction.client.user!.id}> in a message to chat! Digital Akhi understands Arabizi, English transliteration, and Arabic, responding with verified guidance. *Free tier is limited to 20 queries/6 hours.*`
      }
    );

  await interaction.reply({ embeds: [embed] });
}
