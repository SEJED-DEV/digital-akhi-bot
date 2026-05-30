import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ModeratorAction } from '../../models/ModeratorAction.js';

export const data = {
  name: 'ban',
  description: 'Ban a user from the server',
  isHeavyTask: false,
};

export async function execute(interaction: ChatInputCommandInteraction, targetUserId: string, reason?: string) {
  // Backend Permission Verification
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
    throw new Error('You do not have permission to ban members.');
  }

  // Bot Permission Verification
  if (!interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      throw new Error('I do not have permission to ban members in this server.');
  }

  const member = await interaction.guild?.members.fetch(targetUserId);
  if (member) {
    await member.ban({ reason });

    await ModeratorAction.create({
        guildId: interaction.guildId,
        moderatorId: interaction.user.id,
        userId: targetUserId,
        action: 'ban',
        reason
    });

    return `Successfully banned <@${targetUserId}>.`;
  }
  return `Could not find member <@${targetUserId}>.`;
}
