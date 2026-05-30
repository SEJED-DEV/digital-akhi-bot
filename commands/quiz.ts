import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

interface Question {
    text: string;
    options: string[];
    answer: number;
    explanation: string;
}

const QUESTIONS: Question[] = [
    {
        text: "In which month was the Quran first revealed to Prophet Muhammad (PBUH)?",
        options: ["Dhul-Hijjah", "Muharram", "Ramadan", "Rajab"],
        answer: 2,
        explanation: "The Quran was first revealed to Prophet Muhammad (PBUH) in the cave of Hira during the month of Ramadan (Laylat al-Qadr)."
    },
    {
        text: "Who was the first woman to embrace Islam?",
        options: ["Aisha (RA)", "Fatima (RA)", "Khadija (RA)", "Zaynab (RA)"],
        answer: 2,
        explanation: "Khadija bint Khuwaylid (RA), the first wife of Prophet Muhammad (PBUH), was the first person to embrace Islam."
    },
    {
        text: "How many chapters (Surahs) are in the Holy Quran?",
        options: ["110", "114", "120", "99"],
        answer: 1,
        explanation: "The Holy Quran consists of 114 Surahs (chapters) of varying lengths."
    }
];

export const data = new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Start an interactive Islamic knowledge quiz');

export async function execute(interaction: ChatInputCommandInteraction) {
    const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.sparkles} Islamic Quiz`)
        .setDescription(question.text)
        .setColor(0x00E5A3)
        .setFooter({ text: 'Select the correct answer below!' });

    const buttons = question.options.map((opt, i) =>
        new ButtonBuilder()
            .setCustomId(`quiz_${i}`)
            .setLabel(opt)
            .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    const response = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true
    });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
    });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'Start your own quiz to participate!', ephemeral: true });
        }

        const selectedIndex = parseInt(i.customId.split('_')[1]);
        const isCorrect = selectedIndex === question.answer;

        const resultEmbed = new EmbedBuilder()
            .setTitle(isCorrect ? `${EMOJIS.success} Correct!` : `${EMOJIS.error} Incorrect`)
            .setDescription(`${question.text}\n\n**Your Answer:** ${question.options[selectedIndex]}\n**Correct Answer:** ${question.options[question.answer]}\n\n*${question.explanation}*`)
            .setColor(isCorrect ? 0x27AE60 : 0xE74C3C);

        // Disable all buttons after choice
        const disabledButtons = question.options.map((opt, idx) =>
            new ButtonBuilder()
                .setCustomId(`quiz_${idx}_disabled`)
                .setLabel(opt)
                .setStyle(idx === question.answer ? ButtonStyle.Success : (idx === selectedIndex ? ButtonStyle.Danger : ButtonStyle.Secondary))
                .setDisabled(true)
        );
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButtons);

        await i.update({
            embeds: [resultEmbed],
            components: [disabledRow]
        });
        collector.stop();
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            const timeoutRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                question.options.map((opt, i) =>
                    new ButtonBuilder()
                        .setCustomId(`quiz_timeout_${i}`)
                        .setLabel(opt)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                )
            );
            await interaction.editReply({
                content: 'Quiz timed out!',
                components: [timeoutRow]
            });
        }
    });
}
