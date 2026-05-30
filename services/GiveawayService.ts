import { Client, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { Giveaway } from '../models/Giveaway.js';
import { EMOJIS } from '../utils/Emojis.js';
import { Logger } from './Logger.js';

export class GiveawayService {
  public static async start(client: Client) {
    setInterval(() => this.checkGiveaways(client), 30 * 1000); // Check every 30 seconds
  }

  private static async checkGiveaways(client: Client) {
    const now = new Date();
    const endingGiveaways = await Giveaway.find({ endTime: { $lte: now }, ended: false });

    for (const giveaway of endingGiveaways) {
      await this.endGiveaway(client, giveaway);
    }
  }

  public static async endGiveaway(client: Client, giveaway: any) {
    giveaway.ended = true;
    await giveaway.save();

    try {
      const channel = await client.channels.fetch(giveaway.channelId);
      if (!channel?.isTextBased()) return;

      const message = await (channel as any).messages.fetch(giveaway.messageId);
      if (!message) return;

      if (giveaway.participants.length === 0) {
        await message.reply(`${EMOJIS.error} No one participated in the giveaway for **${giveaway.prize}**.`);
        return;
      }

      const winners = [];
      const participants = [...giveaway.participants];

      for (let i = 0; i < Math.min(giveaway.winnerCount, participants.length); i++) {
        const index = Math.floor(Math.random() * participants.length);
        winners.push(participants.splice(index, 1)[0]);
      }

      giveaway.winners = winners;
      await giveaway.save();

      const embed = EmbedBuilder.from(message.embeds[0]);
      embed.setTitle(`${EMOJIS.sparkles} Giveaway Ended`)
           .setDescription(`Prize: **${giveaway.prize}**\nWinners: ${winners.map(id => `<@${id}>`).join(', ')}`)
           .setColor('#000000');

      await message.edit({ embeds: [embed], components: [] });
      await message.reply(`${EMOJIS.sparkles} Congratulations ${winners.map(id => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`);
    } catch (error) {
      Logger.error(`Failed to end giveaway ${giveaway.messageId}`, error);
    }
  }
}
