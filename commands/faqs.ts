import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('faqs')
  .setDescription('Frequently Asked Questions about Digital Akhi Bot');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.sparkles} Frequently Asked Questions (FAQs)`)
    .setDescription(`Clear and precise answers to common questions about the bot.`)
    .setColor(0x1E824C)
    .addFields(
      {
        name: `${EMOJIS.support} Is the bot free to use?`,
        value: `Yes! The bot is 100% free to use. To cover API costs, the Free tier has a 20 requests per 6-hour rate limit. You can unlock Premium for free by inviting 30 friends to the support server, boosting the server twice, or registering your own AI API keys via \`/setkey\`.`
      },
      {
        name: `${EMOJIS.key} What is BYOK (Bring Your Own Key)?`,
        value: `BYOK allows you to bypass the bot's default rate limits entirely by providing your own API key (from Groq, Gemini, OpenRouter, etc.). This gives you direct access to AI responses under your own key's quotas.`
      },
      {
        name: `${EMOJIS.logging} How secure is the BYOK key storage?`,
        value: `Extremely secure. Your keys are encrypted at rest using industry-standard **AES-256-CBC** before being stored. The symmetric key is kept on our hosting environment, making it impossible to read keys even with database access.`
      },
      {
        name: `${EMOJIS.ratelimit} Why is the bot returning rate limit errors?`,
        value: `To prevent abuse and manage API costs, Free users get 20 requests per 6 hours, while Premium users get 50. Use \`/profile\` to check your usage.`
      },
      {
        name: `${EMOJIS.branding} Can I customize the bot's nickname/avatar?`,
        value: `Yes! For servers running the **SuperPremium** tier, administrators can natively customize the bot's nickname and server profile avatar using the \`/branding\` command.`
      },
      {
        name: `${EMOJIS.premium} How does Guild-level Premium work?`,
        value: `Guild-level premium upgrades the entire server! If a guild has Premium or SuperPremium granted (via server boosts or manual administrative grant), all members inside that server enjoy premium rate limits when interacting with the bot in that guild.`
      },
      {
        name: `${EMOJIS.bot} Can the bot perform moderation?`,
        value: `Yes, the bot's conversational AI can trigger moderation actions (kick, ban, warn) if requested by users with appropriate admin privileges. The bot will *always* double-check the sender's Discord permissions before taking action.`
      }
    );

  await interaction.reply({ embeds: [embed] });
}
