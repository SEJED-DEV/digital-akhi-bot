import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('known-errors')
  .setDescription('Explains known technical limitations, workarounds, and error behaviors');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.features} Digital Akhi Bot — Known Limitations & Behaviors`)
    .setDescription(`To ensure full transparency and smooth running, here are the known Discord API behaviors and custom limitations.`)
    .setColor(0x1E824C)
    .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
    .addFields(
      {
        name: `${EMOJIS.delete} 1. Custom Emojis in DM Message Logs`,
        value: `${EMOJIS.warning} **Behavior:** When the bot logs direct messages in custom \`#dm-logs\`, custom button emojis may sometimes fall back to standard unicode emojis (\`${EMOJIS.edit}\` and \`${EMOJIS.delete}\`).\n${EMOJIS.bot} **Reason:** Discord restricts bots from using custom button emojis if the bot is not in the guild where the custom emojis were originally uploaded. The bot has a built-in silent recovery mechanism to automatically swap custom button emojis with clean unicode fallbacks so your logging channel never crashes.`
      },
      {
        name: `${EMOJIS.branding} 2. Custom Server Branding (Avatars & Nicknames)`,
        value: `${EMOJIS.warning} **Behavior:** Setting a custom bot nickname or per-server avatar using \`/branding\` might fail natively on your server profile with an error message.\n${EMOJIS.bot} **Reason:** Discord's native per-guild custom member avatar API strictly requires the server to be **Server Boosted to Level 2**.\n${EMOJIS.success} **Automatic Solution:** Regardless of native profile updates, **embed branding (custom titles, embed thumbnails, and bot bios) is 100% supported** and will always apply seamlessly to your AI interactions since it is saved directly to our secure database.`
      }
    )
    .setFooter({ text: 'UMMAH TECH • Digital Akhi Support Services' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
