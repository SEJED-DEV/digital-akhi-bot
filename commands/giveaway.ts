import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Giveaway } from '../models/Giveaway.js';
import { EMOJIS } from '../utils/Emojis.js';
import ms from 'ms';

export const data = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Manage giveaways')
  .addSubcommand(sub =>
    sub.setName('start')
       .setDescription('Start a giveaway')
       .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 1h, 1d)').setRequired(true))
       .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true))
       .addStringOption(opt => opt.setName('prize').setDescription('The prize').setRequired(true))
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.options.getSubcommand() === 'start') {
    const durationStr = interaction.options.getString('duration')!;
    const winnerCount = interaction.options.getInteger('winners')!;
    const prize = interaction.options.getString('prize')!;

    const duration = ms(durationStr);
    if (!duration) return interaction.reply({ content: `${EMOJIS.error} Invalid duration format.`, ephemeral: true });

    const endTime = new Date(Date.now() + duration);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.sparkles} New Giveaway!`)
      .setDescription(`Prize: **${prize}**\nWinners: **${winnerCount}**\nEnds: <t:${Math.floor(endTime.getTime() / 1000)}:R>`)
      .setColor('#00e5a3')
      .setFooter({ text: `Hosted by ${interaction.user.tag}` })
      .setTimestamp(endTime);

    const button = new ButtonBuilder()
      .setCustomId('giveaway_join')
      .setLabel('Join Giveaway')
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    await Giveaway.create({
      messageId: message.id,
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      prize,
      winnerCount,
      endTime,
      hostId: interaction.user.id
    });
  }
}
