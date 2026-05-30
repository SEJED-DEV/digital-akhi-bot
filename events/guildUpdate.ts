import { Guild as DiscordGuild } from 'discord.js';
import { Guild as GuildModel } from '../models/Guild.js';

export async function guildUpdate(oldGuild: DiscordGuild, newGuild: DiscordGuild) {
    // Monitor Boosts
    const oldBoosts = oldGuild.premiumSubscriptionCount || 0;
    const newBoosts = newGuild.premiumSubscriptionCount || 0;

    if (oldBoosts >= 2 && newBoosts < 2) {
        // Boosts dropped below 2
        await GuildModel.findOneAndUpdate(
            { guildId: newGuild.id },
            { isPremium: false },
            { upsert: true }
        );
        console.log(`Guild ${newGuild.id} downgraded from Premium due to boost drop.`);
    } else if (oldBoosts < 2 && newBoosts >= 2) {
        // Boosts reached 2
        await GuildModel.findOneAndUpdate(
            { guildId: newGuild.id },
            { isPremium: true },
            { upsert: true }
        );
        console.log(`Guild ${newGuild.id} upgraded to Premium due to boosts.`);
    }
}
