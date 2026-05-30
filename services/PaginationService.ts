import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ChatInputCommandInteraction
} from 'discord.js';

export async function paginate(
    interaction: ChatInputCommandInteraction,
    pages: EmbedBuilder[],
    timeout: number = 60000
) {
    if (pages.length === 0) return;
    if (pages.length === 1) {
        return interaction.editReply({ embeds: [pages[0]] });
    }

    let currentPage = 0;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.editReply({
        embeds: [pages[currentPage].setFooter({ text: `Page ${currentPage + 1} of ${pages.length}` })],
        components: [row]
    });

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: timeout
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'Only the command author can navigate pages.', ephemeral: true });
        }

        if (i.customId === 'prev') {
            currentPage--;
        } else if (i.customId === 'next') {
            currentPage++;
        }

        const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === pages.length - 1)
        );

        await i.update({
            embeds: [pages[currentPage].setFooter({ text: `Page ${currentPage + 1} of ${pages.length}` })],
            components: [newRow]
        });
    });

    collector.on('end', async () => {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
        );

        try {
            await interaction.editReply({ components: [disabledRow] });
        } catch (e) {
            // Message might be deleted
        }
    });
}
