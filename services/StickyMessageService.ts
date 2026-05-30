import { Message } from 'discord.js';
import { Guild } from '../models/Guild.js';

export class StickyMessageService {
  public static async handleMessage(message: Message) {
    if (message.author.bot) return;

    const dbGuild = await Guild.findOne({ guildId: message.guildId });
    if (!dbGuild || !dbGuild.stickyMessages) return;

    const sticky = dbGuild.stickyMessages.find(s => s.channelId === message.channelId);
    if (!sticky) return;

    // Delete old message
    if (sticky.lastMessageId) {
      try {
        const oldMsg = await message.channel.messages.fetch(sticky.lastMessageId);
        if (oldMsg) await oldMsg.delete();
      } catch (e) {
        // Ignore if already deleted
      }
    }

    // Send new message
    const newMsg = await message.channel.send(sticky.message);
    sticky.lastMessageId = newMsg.id;

    // Use findOneAndUpdate to ensure atomic update of the array element if needed,
    // but here we just save the document.
    await dbGuild.save();
  }
}
