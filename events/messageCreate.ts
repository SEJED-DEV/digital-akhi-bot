import { Message, ChannelType, PermissionFlagsBits } from 'discord.js';
import { aiService, tierService, client } from '../index.js';
import { AutoModService } from '../services/AutoModService.js';
import { User } from '../models/User.js';
import { Guild } from '../models/Guild.js';
import { Blacklist } from '../models/Blacklists.js';
import { KeyRingValidatorService } from '../services/KeyRingValidatorService.js';
import { TaskWorker } from '../services/TaskWorker.js';
import { SkillLearningService } from '../services/SkillLearningService.js';
import { skills } from '../skills/index.js';
import { CacheService } from '../services/CacheService.js';
import { Logger } from '../services/Logger.js';
import { EMOJIS } from '../utils/Emojis.js';
import { DiscussionLoggerService } from '../services/DiscussionLoggerService.js';

export async function messageCreate(message: Message) {
  if (message.author.bot) return;

  // Run AutoMod
  const autoModResult = await AutoModService.handleMessage(message);
  if (!autoModResult) return;

  // Check if bot was mentioned
  if (!message.mentions.has(client.user!)) return;

  const userId = message.author.id;
  const guildId = message.guildId;

  // 1. Hierarchical Blacklist Check
  const isGloballyBlacklisted = await Blacklist.findOne({ targetId: userId, type: 'Global' });
  if (isGloballyBlacklisted) return;

  if (guildId) {
    const isLocallyBlacklisted = await Blacklist.findOne({ targetId: userId, type: 'Local', guildId });
    if (isLocallyBlacklisted) return;
  }

  // 2. Access Tier & BYOK/Rate Limit
  let user = await User.findOne({ discordId: userId });
  if (!user) {
      user = await User.create({
          discordId: userId,
          firstUsedAt: new Date(),
          lastGuildId: guildId || undefined
      });
  } else {
      let modified = false;
      if (!user.firstUsedAt) {
          user.firstUsedAt = new Date();
          modified = true;
      }
      if (guildId && user.lastGuildId !== guildId) {
          user.lastGuildId = guildId;
          modified = true;
      }
      if (modified) await user.save();
  }

  const tier = await tierService.getTierStatus(userId, guildId || undefined);
  const hasBYOK = !!(user.byok && user.byok.key);
  const { allowed } = await tierService.checkRateLimit(userId, tier, hasBYOK);

  if (!allowed) {
    if (tier === 'Free') {
        const supportInvite = process.env.NEXT_PUBLIC_SUPPORT_SERVER_INVITE || 'https://discord.gg/pun3PXXDuE';
        return message.reply(`${EMOJIS.error} **Rate Limit Reached!** You've reached your free rate limit (20 requests per 6-hour window).\n\n${EMOJIS.sparkles} **Want Premium limits? (50 requests/window + higher response length)**\n• Join our support server: ${supportInvite}\n• Invite 30 friends to this server\n*Or, boost this server twice (2x Boosts) to unlock Premium for the entire server!*`);
    } else {
        return message.reply(`${EMOJIS.error} **Rate Limit Reached!** You've reached your Premium rate limit (50 requests per 6-hour window). Please wait until the next window.`);
    }
  }


  // 3. AI Interaction
  try {
    const user = await User.findOne({ discordId: userId });
    let userKey = undefined;

    // Strict DM Policy: BYOK Required (No Free Trial in DMs)
    if (!guildId) {
        if (!user?.byokProfiles || user.byokProfiles.length === 0) {
            return message.reply(`${EMOJIS.warning} **DMs require your own API key.**\n\nTo ensure sustainable operations, AI interactions in DMs are exclusively available for users who have configured their own API keys via \`/setkey\` in a server.\n\n*Please use the bot in a server or set up your key!*`);
        }
    }

    // Use KeyRingValidatorService to handle user keys and failover
    const validatedKey = await KeyRingValidatorService.validateAndRotate(userId);
    if (validatedKey) {
        userKey = validatedKey;
    }

    const onSecurityAlert = async (report: string) => {
        const supportServerId = process.env.SUPPORT_SERVER_ID;
        const alertChannelId = process.env.SECURITY_ALERT_CHANNEL_ID;

        // Rate limit security alerts (max 5 per 10 minutes per user)
        const alertKey = `alert_limit:${userId}`;
        const alertCount = await CacheService.get<number>(alertKey) || 0;
        if (alertCount >= 5) return;
        await CacheService.set(alertKey, alertCount + 1, 600);

        if (supportServerId && alertChannelId) {
            try {
                const supportGuild = await client.guilds.fetch(supportServerId);
                const alertChannel = await supportGuild.channels.fetch(alertChannelId);
                if (alertChannel?.isTextBased()) {
                    await alertChannel.send(`${EMOJIS.warning} **CRITICAL SECURITY ALERT**\n\nAttacker: <@${userId}> (ID: ${userId})\nTarget Server: ${message.guild?.name} (ID: ${guildId})\nAttack Signature:\n\`\`\`\n${report}\n\`\`\``);
                }
            } catch (e) {
                Logger.error('Failed to send security alert', e);
            }
        }
    };

    // Show typing status while waiting for the AI response
    try {
        if (message.channel && 'sendTyping' in message.channel) {
            await (message.channel as any).sendTyping();
        }
    } catch (e) {
        Logger.error('Failed to send typing indicator:', e);
    }

    const response = await aiService.generateResponse(
      message.content.replace(`<@!${client.user?.id}>`, '').replace(`<@${client.user?.id}>`, ''),
      tier as 'Free' | 'Premium' | 'SuperPremium',
      userKey,
      onSecurityAlert,
      user?.firstUsedAt,
      user?.preferredModel,
      userId
    );

    // Track usage if usage data is available
    if (response.usage && user) {
        user.tokenUsage.input = (user.tokenUsage.input || 0) + response.usage.input;
        user.tokenUsage.output = (user.tokenUsage.output || 0) + response.usage.output;
        await user.save();
    }

    if (response.missingSkill) {
        await SkillLearningService.initiateLearning(message, response.missingSkill);
        return;
    }

    if (response.isHeavy) {
        // Try to find a matching skill for the heavy task
        const skillName = response.text.match(/execute_skill:\s*\[(.*?)\]/i)?.[1];

        await TaskWorker.executeHeavyTask(message, async () => {
            if (skillName && (skills as any)[skillName]) {
                const skill = (skills as any)[skillName];
                // Check if it has an execute function and is marked as isHeavyTask
                if (skill.execute && skill.data?.isHeavyTask) {
                    // Extract potential arguments (this is a simplified implementation)
                    // In a production bot, we'd use a more sophisticated parser
                    return await skill.execute(message, userId);
                }
            }

            await TaskWorker.sleep(3000); // Simulate work for unknown heavy tasks
            return response.text.replace(/execute_skill:\s*\[.*?\]/i, '').trim() || "Task completed successfully, brother.";
        });
        return;
    }

    // Extract missing emoji request if present
    const emojiMatch = response.text.match(/\[MISSING_EMOJI:\s*(.*?)\]/i);
    if (emojiMatch) {
      const missingEmoji = emojiMatch[1];
      // Clean up response text
      response.text = response.text.replace(/\[MISSING_EMOJI:\s*(.*?)\]/gi, '').trim();

      // Report missing emoji to the support server
      const supportServerId = process.env.SUPPORT_SERVER_ID;
      const emojiChannelId = process.env.EMOJI_REQUEST_CHANNEL_ID;
      if (supportServerId) {
        (async () => {
          try {
            const supportGuild = await client.guilds.fetch(supportServerId);
            let emojiChannel = emojiChannelId ? await supportGuild.channels.fetch(emojiChannelId) : null;
            if (!emojiChannel) {
              const existingChannel = supportGuild.channels.cache.find(c => c.name === 'emoji-requests' && c.isTextBased());
              if (existingChannel) {
                emojiChannel = existingChannel;
              } else {
                emojiChannel = await supportGuild.channels.create({
                  name: 'emoji-requests',
                  type: ChannelType.GuildText,
                  permissionOverwrites: [
                    {
                      id: supportGuild.id,
                      allow: [PermissionFlagsBits.ViewChannel],
                      deny: [PermissionFlagsBits.SendMessages] // Read-only for members
                    },
                    {
                      id: client.user!.id,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                  ]
                });
              }
            }

            if (emojiChannel?.isTextBased()) {
              await (emojiChannel as any).send(`${EMOJIS.palette} **New Emoji Request**\n\nThe AI wanted to use a static emoji: **${missingEmoji}** because it wasn't found in the custom \`Emojis.ts\` file.\n\n*Requested during query from user <@${userId}> (ID: ${userId})*`);
            }
          } catch (e) {
            Logger.error('Failed to send emoji request report:', e);
          }
        })();
      }
    }

    let branding = undefined;
    if (guildId) {
      const dbGuild = await Guild.findOne({ guildId }).lean();
      if (dbGuild?.customBranding) {
        branding = dbGuild.customBranding;
      }
    }

    const formattedResponse = aiService.formatResponse(
        response.text, 
        response.model, 
        response.source, 
        branding
    );
    await message.reply(formattedResponse);

    const userPrompt = message.content.replace(`<@!${client.user?.id}>`, '').replace(`<@${client.user?.id}>`, '').trim();
    await DiscussionLoggerService.logDiscussion(
        guildId,
        userId,
        userPrompt,
        response.text,
        response.model,
        response.source
    );
  } catch (error: any) {
    console.error('AI Error:', error);
    if (error.message.includes('[BYOK_REQUIRED]')) {
        return message.reply(`${EMOJIS.warning} **Trial Expired!**\n\nYour 48-hour free trial has ended. To continue using the AI features, you must add your own API key.\n\n**How to set up BYOK:**\n1. Get a free API key from [Groq](https://console.groq.com/) or [OpenRouter](https://openrouter.ai/).\n2. Use the command \`/setkey provider:your_key\` (e.g., \`/setkey groq:gsk_...\`).\n\n*Using your own key removes all rate limits!*`);
    }
    await message.reply("Sorry, I encountered an error while processing your request.");
  }
}
