import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

export const data = {
  name: 'warn',
  description: 'Warn a user',
  isHeavyTask: false,
};

export async function execute(interaction: ChatInputCommandInteraction, targetUserId: string, reason?: string) {
  // Backend Permission Verification
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    throw new Error('You do not have permission to warn members.');
  }

  // In a real scenario, you'd save this to a database
  return `Warned <@${targetUserId}> for: ${reason || 'No reason provided'}.`;
}
