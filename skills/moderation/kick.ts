import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ModeratorAction } from '../../models/ModeratorAction.js';

export const data = {
  name: 'kick',
  description: 'Kick a user from the server',
  isHeavyTask: false,
};

export async function execute(interaction: ChatInputCommandInteraction, targetUserId: string, reason?: string) {
  // Backend Permission Verification
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
    throw new Error('You do not have permission to kick members.');
  }

  // Bot Permission Verification
  if (!interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
      throw new Error('I do not have permission to kick members in this server.');
  }

  const member = await interaction.guild?.members.fetch(targetUserId);
  if (member) {
    await member.kick(reason);

    await ModeratorAction.create({
        guildId: interaction.guildId,
        moderatorId: interaction.user.id,
        userId: targetUserId,
        action: 'kick',
        reason
    });

    return `Successfully kicked <@${targetUserId}>.`;
  }
  return `Could not find member <@${targetUserId}>.`;
}
