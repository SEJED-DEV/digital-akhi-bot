import { UserContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalActionRowComponentBuilder, ContextMenuCommandInteraction } from 'discord.js';
import { User } from '../models/User.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new UserContextMenuCommandBuilder()
  .setName('Set Prayer Reminders')
  .setType(ApplicationCommandType.User)
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);

export async function execute(interaction: ContextMenuCommandInteraction) {
  if (interaction.targetId !== interaction.user.id) {
    return interaction.reply({ content: `${EMOJIS.error} You can only set prayer reminders for yourself.`, ephemeral: true });
  }

  const user = await User.findOne({ discordId: interaction.user.id });

  const modal = new ModalBuilder()
    .setCustomId('prayer_reminders_modal')
    .setTitle('Configure Prayer Reminders');

  const tzInput = new TextInputBuilder()
    .setCustomId('timezone')
    .setLabel('Your Timezone (e.g. Europe/Paris, UTC+1)')
    .setStyle(TextInputStyle.Short)
    .setValue(user?.prayerReminders?.timezone || 'UTC')
    .setRequired(true);

  const advanceInput = new TextInputBuilder()
    .setCustomId('advance')
    .setLabel('Minutes before (0-60)')
    .setStyle(TextInputStyle.Short)
    .setValue(user?.prayerReminders?.advanceMinutes?.toString() || '0')
    .setRequired(true);

  const prayersInput = new TextInputBuilder()
    .setCustomId('prayers')
    .setLabel('Prayers (fajr,dhuhr,asr,maghrib,isha)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('List the prayers you want reminders for, separated by commas.')
    .setValue(
        [
            user?.prayerReminders?.fajr ? 'fajr' : '',
            user?.prayerReminders?.dhuhr ? 'dhuhr' : '',
            user?.prayerReminders?.asr ? 'asr' : '',
            user?.prayerReminders?.maghrib ? 'maghrib' : '',
            user?.prayerReminders?.isha ? 'isha' : ''
        ].filter(Boolean).join(',')
    )
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(tzInput),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(advanceInput),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(prayersInput)
  );

  await interaction.showModal(modal);
}
