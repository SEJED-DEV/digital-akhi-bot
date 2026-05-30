import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('changelog')
  .setDescription('Displays the latest updates, bug fixes, and improvements for Digital Akhi Bot');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.sparkles} Digital Akhi Bot — Changelog v1.3.0`)
    .setDescription(`Alhamdulillah, here are the latest updates, bug fixes, and features implemented recently!`)
    .setColor(0x1E824C) // Elegant Emerald Green
    .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
    .addFields(
      {
        name: `${EMOJIS.sparkles} v1.3.0 — Infrastructure Hardening & AI Discussion Logs`,
        value: `• **AI Discussion Logger**: Every AI interaction is now logged per guild and per user in structured \`.jsonl\` files under \`logs/discussions/<guildId>/<userId>.jsonl\`. Direct messages are stored under \`DM/\`.\n• **30-Day Auto Archive**: Discussion logs inactive for 30+ days are automatically compressed (gzip) and moved to \`archives/discussions/\` nightly — keeping storage clean while preserving history.\n• **Redis Resilience**: Drastically improved Redis connection handling — detects invalid \`http://\` or insecure \`redis://\` (Upstash) URLs with clear warnings, implements a finite retry strategy, and falls back to an in-memory cache if Redis is unavailable, silencing all connection log spam.\n• **AI Provider Fixes**: Corrected Gemini API endpoint (\`v1beta → v1beta\`, \`gemini-1.5-flash\`) and updated OpenRouter model from the deprecated \`google/gemini-flash-1.5-exp\` to \`google/gemini-2.5-flash\`.\n• **Palestine Command Fix**: Updated Al Jazeera English RSS to the working \`all.xml\` feed (the old \`palestine-israel-conflict.xml\` URL was removed by Al Jazeera) and added a Palestine keyword filter for English articles.\n• **Enhanced Error Logging**: AI provider errors now include the full JSON response body from the provider for faster debugging.`
      },
      {
        name: `${EMOJIS.sparkles} v1.2.0 — Enterprise Admin & Guild Customization`,
        value: `• **Native Server Profile Branding**: SuperPremium servers can now customize the bot's nickname, server profile avatar, embed thumbnail, and bio using \`/branding\`.\n• **Guild-Level Premium Tiers**: Servers can now be upgraded to Premium/SuperPremium tiers, providing elevated limits to all members in that guild.\n• **Interactive Direct Messaging**: Direct message users through the bot with \`/dm\`. Auto-creates #dm-logs with active **Edit** and **Delete** button controls to dynamically modify or recall messages.\n• **Palestine News Hub (\`/palestine\`)**: Real-time Palestine news exclusively from Al Jazeera in English & Arabic.\n• **Profile Cross-Checking (\`/profile user:[user]\`)**: View your own or another user's personal tier, invites, BYOK status, and support status.\n• **Dynamic Bot Presence Rotation**: Real-time status update service rotating through server, user, and shard count metrics.`
      },
      {
        name: `${EMOJIS.features} v1.1.0 — Admin Suite & BYOK`,
        value: `• **Admin Controls (\`/admin\`)**: Global & local blacklisting plus admin-override Premium status settings.\n• **BYOK Subcommands (\`/setkey\`)**: Redesigned as subcommands with secure AES-256 encryption at rest.\n• **Premium Profile Redesign (\`/profile\`)**: Premium profile card redesign showing rate limits, BYOK status, and invite tracker statistics.`
      }
    )
    .setFooter({ text: 'Thank you for your continuous support, brothers! • Digital Akhi Dev Team' });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}


