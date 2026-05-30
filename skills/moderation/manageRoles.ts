import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

export const data = {
  name: 'manageRoles',
  description: 'Manage roles for a user',
  isHeavyTask: true,
};

export async function execute(interaction: ChatInputCommandInteraction, targetUserId: string, roleId: string, action: 'add' | 'remove') {
  // Backend Permission Verification
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error('You do not have permission to manage roles.');
  }

  // Bot Permission Verification
  if (!interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new Error('I do not have permission to manage roles in this server.');
  }

  const member = await interaction.guild?.members.fetch(targetUserId);
  if (member) {
    if (action === 'add') {
      await member.roles.add(roleId);
      return `Added role <@&${roleId}> to <@${targetUserId}>.`;
    } else {
      await member.roles.remove(roleId);
      return `Removed role <@&${roleId}> from <@${targetUserId}>.`;
    }
  }
  return `Could not find member <@${targetUserId}>.`;
}
