import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('verification')
  .setDescription('Linked roles verification setup instructions');

export async function execute(interaction: ChatInputCommandInteraction) {
  const websiteUrl = 'https://akhibot.com'; // Or your actual domain
  
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.sparkles} Discord Linked Roles Verification`)
    .setDescription(
      `Configure linked verification settings to acquire the **Developer** or **Premium** badges directly in your server role settings!\n\n` +
      `**Role Badges Available:**\n` +
      `• ${EMOJIS.byok} **Lead Dev / Dev** — Auto-verified accounts with proven contributions on our GitHub repository.\n` +
      `• ${EMOJIS.premium} **Premium Member** — Auto-verified users with active Premium subscriptions (boosts, invites, or command access).\n\n` +
      `**How to Configure Linked Roles:**\n` +
      `1. Open your Discord Server Settings.\n` +
      `2. Navigate to **Roles** and select/create a role (e.g., "Verified Dev").\n` +
      `3. Click on the **Links** tab in the role config.\n` +
      `4. Add **Digital Akhi Verification** as a requirement!\n\n` +
      `**Verification URL:**\n` +
      `🔗 [Connect Accounts & Verify](${websiteUrl}/api/auth/discord)`
    )
    .setColor(0x1E824C);

  await interaction.reply({ embeds: [embed] });
}
