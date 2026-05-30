import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { User } from '../models/User.js';
import { encrypt } from '../services/EncryptionService.js';
import { Logger } from '../services/Logger.js';
import { EMOJIS } from '../utils/Emojis.js';

const PROVIDERS = [
    { name: 'Groq', value: 'groq' },
    { name: 'Gemini', value: 'gemini' },
    { name: 'Cerebras', value: 'cerebras' },
    { name: 'Sambanova', value: 'sambanova' },
    { name: 'Together', value: 'together' },
    { name: 'OpenRouter', value: 'openrouter' }
];

export const data = new SlashCommandBuilder()
  .setName('setkey')
  .setDescription('Manage your personal BYOK API key (DM Only)')
  .addSubcommand(sub =>
    sub
      .setName('set')
      .setDescription('Save or update your personal API key')
      .addStringOption(option =>
        option.setName('provider')
          .setDescription('AI provider')
          .setRequired(true)
          .addChoices(...PROVIDERS))
      .addStringOption(option =>
        option.setName('key')
          .setDescription('Your API key')
          .setRequired(true)
          .setMinLength(10)
          .setMaxLength(200))
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Optional profile name')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub
      .setName('remove')
      .setDescription('Remove a profile')
      .addIntegerOption(opt =>
        opt.setName('index')
          .setDescription('Profile index to remove')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub
      .setName('switch')
      .setDescription('Switch active profile')
      .addIntegerOption(opt =>
        opt.setName('index')
          .setDescription('Profile index to switch to')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub
      .setName('test')
      .setDescription('Test your current active API key'));

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.guildId) {
    return interaction.reply({
      content: `${EMOJIS.error} This command can only be used in **DMs** for security reasons.`,
      flags: MessageFlags.Ephemeral
    });
  }

  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  // --- REMOVE ---
  if (subcommand === 'remove') {
    const index = interaction.options.getInteger('index', true);
    const user = await User.findOne({ discordId: userId });
    if (!user || !user.byokProfiles || !user.byokProfiles[index]) {
      return interaction.reply({ content: `${EMOJIS.error} Invalid profile index.`, flags: MessageFlags.Ephemeral });
    }

    user.byokProfiles.splice(index, 1);
    if (user.selectedProfileIndex >= user.byokProfiles.length && user.byokProfiles.length > 0) {
      user.selectedProfileIndex = user.byokProfiles.length - 1;
    } else if (user.byokProfiles.length === 0) {
      user.selectedProfileIndex = 0;
      user.byok = undefined;
    } else if (user.selectedProfileIndex === index) {
      const newActive = user.byokProfiles[user.selectedProfileIndex];
      user.byok = { provider: newActive.provider, key: newActive.key };
    }

    await user.save();
    return interaction.reply({ content: `${EMOJIS.success} Profile removed.`, flags: MessageFlags.Ephemeral });
  }

  // --- SWITCH ---
  if (subcommand === 'switch') {
    const index = interaction.options.getInteger('index', true);
    const user = await User.findOne({ discordId: userId });
    if (!user || !user.byokProfiles || !user.byokProfiles[index]) {
      return interaction.reply({ content: `${EMOJIS.error} Invalid profile index.`, flags: MessageFlags.Ephemeral });
    }

    user.selectedProfileIndex = index;
    const profile = user.byokProfiles[index];
    user.byok = { provider: profile.provider, key: profile.key };
    await user.save();

    return interaction.reply({
      content: `${EMOJIS.success} Switched to profile **${profile.name}** (${profile.provider}).`,
      flags: MessageFlags.Ephemeral
    });
  }

  // --- TEST ---
  if (subcommand === 'test') {
    const user = await User.findOne({ discordId: userId });
    if (!user?.byok) {
      return interaction.reply({ content: `${EMOJIS.error} You don't have an active key to test.`, flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { decrypt } = await import('../services/EncryptionService.js');
      const apiKey = decrypt(user.byok.key);
      const { AIService } = await import('../services/AIService.js');
      const { KeyRingService } = await import('../services/KeyRingService.js');
      const aiService = new AIService(new KeyRingService());

      // Small test request
      await aiService.generateResponse("Hello, simple test.", 'Free', { provider: user.byok.provider, key: apiKey });

      return interaction.editReply({ content: `${EMOJIS.success} Key test successful! Your \`${user.byok.provider}\` key is working correctly.` });
    } catch (err: any) {
      return interaction.editReply({ content: `${EMOJIS.error} Key test failed: ${err.message}` });
    }
  }

  // --- SET ---
  const provider = interaction.options.getString('provider', true);
  const key = interaction.options.getString('key', true).trim();
  const profileName = interaction.options.getString('name') || `${provider} Profile ${Date.now().toString().slice(-4)}`;

  // Add provider-specific validation
  const providerPatterns: Record<string, RegExp> = {
      'groq': /^gsk_[a-zA-Z0-9]{32,}$/,
      'gemini': /^AIza[a-zA-Z0-9_-]{35}$/,
      'cerebras': /^sk-[a-zA-Z0-9]{32,}$/,
      'sambanova': /^[a-f0-9]{64}$/,
      'together': /^[a-f0-9]{64}$/,
      'openrouter': /^sk-or-v1-[a-f0-9]{64}$/
  };

  const pattern = providerPatterns[provider];
  if (pattern && !pattern.test(key)) {
      return interaction.reply({
          content: `${EMOJIS.error} Invalid ${provider} API key format. Please ensure you copied it correctly from the ${provider} dashboard.`,
          flags: MessageFlags.Ephemeral
      });
  }

  if (!/^[a-zA-Z0-9_\-.:@/]+$/.test(key)) {
    return interaction.reply({
      content: `${EMOJIS.error} Invalid API key format. Please ensure you copied it correctly.`,
      flags: MessageFlags.Ephemeral
    });
  }

  try {
    const encryptedKey = encrypt(key);
    let user = await User.findOne({ discordId: userId });
    if (!user) {
      user = new User({ discordId: userId, byokProfiles: [] });
    }

    if (user.byokProfiles.length >= 5) {
      return interaction.reply({ content: `${EMOJIS.error} You can only have up to 5 profiles.`, flags: MessageFlags.Ephemeral });
    }

    user.byokProfiles.push({ name: profileName, provider, key: encryptedKey });
    user.selectedProfileIndex = user.byokProfiles.length - 1;
    user.byok = { provider, key: encryptedKey };

    await user.save();

    Logger.info(`User ${userId} added BYOK profile for ${provider}`);
    return interaction.reply({
      content: `${EMOJIS.success} Successfully saved profile **${profileName}** for \`${provider}\`. This is now your active key.`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error: any) {
    Logger.error(`Error saving key for user ${userId}:`, error);
    return interaction.reply({
      content: `${EMOJIS.error} An error occurred while saving your key. Please try again later.`,
      flags: MessageFlags.Ephemeral
    });
  }
}
