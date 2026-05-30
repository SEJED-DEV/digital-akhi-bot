import { EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../utils/Emojis.js';

export class ResponseFormatter {
    public static format(
        text: string, 
        model: string, 
        source?: string, 
        customBranding?: { 
            title?: string; 
            nickname?: string; 
            description?: string; 
            bio?: string; 
            color?: string; 
            avatarUrl?: string; 
            thumbnailUrl?: string; 
        }
    ) {
        // Embed footers do not support custom Discord emojis (rendered as text).
        // Therefore, we append the beautifully formatted metadata with custom emojis to the description.
        const metadata = `\n\n—\n${EMOJIS.bot} *Powered by ${model}*${source ? ` • ${EMOJIS.source} *Source: ${source}*` : ''}`;
        
        const colorVal = customBranding?.color ? parseInt(customBranding.color.replace('#', ''), 16) : 0x1E824C;

        const mainBio = customBranding?.bio || customBranding?.description;
        const mainTitle = customBranding?.nickname || customBranding?.title;
        const mainThumbnail = customBranding?.thumbnailUrl || customBranding?.avatarUrl;

        const embed = new EmbedBuilder()
            .setColor(isNaN(colorVal) ? 0x1E824C : colorVal)
            .setDescription((mainBio ? `*${mainBio}*\n\n` : '') + text + metadata);
        
        if (mainTitle) {
            embed.setTitle(mainTitle);
        }

        if (mainThumbnail) {
            embed.setThumbnail(mainThumbnail);
        }
        
        return { embeds: [embed] };
    }
}

