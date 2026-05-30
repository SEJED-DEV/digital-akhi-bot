import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Guild } from '../models/Guild.js';
import { EMOJIS } from '../utils/Emojis.js';

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configuration commands for server admins')
  .addSubcommand(subcommand =>
    subcommand
      .setName('blacklist-channel')
      .setDescription('Configures the admin-only alert space for server admins')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('The channel for blacklist alerts')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub
      .setName('model')
      .setDescription('Select your preferred AI model')
      .addStringOption(opt =>
        opt.setName('model')
          .setDescription('The model to use')
          .setRequired(true)
          .addChoices(
            { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
            { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
            { name: 'Llama 3.1 8B', value: 'llama3-8b-8192' },
            { name: 'Llama 3.1 70B', value: 'llama3-70b-8192' }
          )))
  .addSubcommand(sub =>
    sub
      .setName('welcome')
      .setDescription('Configure the welcome module')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/Disable').setRequired(true))
      .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').setRequired(true))
      .addStringOption(opt => opt.setName('welcome-msg').setDescription('Welcome message ({user}, {server}, {count})'))
      .addStringOption(opt => opt.setName('goodbye-msg').setDescription('Goodbye message ({user}, {server}, {count})')))
  .addSubcommand(sub =>
    sub
      .setName('shared-key')
      .setDescription('Set a shared BYOK key for the entire server')
      .addStringOption(opt => opt.setName('provider').setDescription('Provider').setRequired(true).addChoices(
        { name: 'Groq', value: 'groq' },
        { name: 'Gemini', value: 'gemini' },
        { name: 'OpenRouter', value: 'openrouter' }
      ))
      .addStringOption(opt => opt.setName('key').setDescription('API Key').setRequired(true)))
  .addSubcommand(sub =>
    sub
      .setName('byok-limit')
      .setDescription('Set custom rate limit for shared BYOK')
      .addIntegerOption(opt => opt.setName('limit').setDescription('Requests per 6 hours').setRequired(true)))
  .addSubcommand(sub =>
    sub
      .setName('automod')
      .setDescription('Configure AutoMod settings')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/Disable AutoMod').setRequired(true))
      .addBooleanOption(opt => opt.setName('anti-spam').setDescription('Enable Anti-Spam'))
      .addIntegerOption(opt => opt.setName('spam-threshold').setDescription('Spam threshold (default 5)'))
      .addBooleanOption(opt => opt.setName('anti-raid').setDescription('Enable Anti-Raid'))
      .addIntegerOption(opt => opt.setName('raid-threshold').setDescription('Raid threshold (default 10)'))
      .addStringOption(opt => opt.setName('filter-words').setDescription('Forbidden words (comma separated)')))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'welcome') {
    const enabled = interaction.options.getBoolean('enabled', true);
    const channel = interaction.options.getChannel('channel', true);
    const welcomeMsg = interaction.options.getString('welcome-msg');
    const goodbyeMsg = interaction.options.getString('goodbye-msg');

    await Guild.findOneAndUpdate(
      { guildId: interaction.guildId! },
      {
        welcomeModule: {
          enabled,
          channelId: channel.id,
          welcomeMsg: welcomeMsg || undefined,
          goodbyeMsg: goodbyeMsg || undefined
        }
      },
      { upsert: true }
    );
    return interaction.reply({ content: `${EMOJIS.success} Welcome module configured.`, flags: MessageFlags.Ephemeral });
  }

  if (subcommand === 'shared-key') {
    const provider = interaction.options.getString('provider', true);
    const key = interaction.options.getString('key', true);
    const { encrypt } = await import('../services/EncryptionService.js');

    await Guild.findOneAndUpdate(
      { guildId: interaction.guildId! },
      { sharedByok: { provider, key: encrypt(key) } },
      { upsert: true }
    );
    return interaction.reply({ content: `${EMOJIS.success} Shared BYOK key set for the server.`, flags: MessageFlags.Ephemeral });
  }

  if (subcommand === 'byok-limit') {
    const limit = interaction.options.getInteger('limit', true);
    await Guild.findOneAndUpdate(
      { guildId: interaction.guildId! },
      { customByokRateLimit: limit },
      { upsert: true }
    );
    return interaction.reply({ content: `${EMOJIS.success} Custom BYOK rate limit set to \`${limit}\`.`, flags: MessageFlags.Ephemeral });
  }

  if (subcommand === 'model') {
    const model = interaction.options.getString('model', true);
    const { User } = await import('../models/User.js');
    await User.findOneAndUpdate(
      { discordId: interaction.user.id },
      { preferredModel: model },
      { upsert: true }
    );
    return interaction.reply({ content: `${EMOJIS.success} Preferred model set to \`${model}\`.`, flags: MessageFlags.Ephemeral });
  }

  if (subcommand === 'automod') {
    const enabled = interaction.options.getBoolean('enabled', true);
    const antiSpam = interaction.options.getBoolean('anti-spam');
    const spamThreshold = interaction.options.getInteger('spam-threshold');
    const antiRaid = interaction.options.getBoolean('anti-raid');
    const raidThreshold = interaction.options.getInteger('raid-threshold');
    const filterWords = interaction.options.getString('filter-words');

    const update: any = { 'autoMod.enabled': enabled };
    if (antiSpam !== null) update['autoMod.antiSpam.enabled'] = antiSpam;
    if (spamThreshold !== null) update['autoMod.antiSpam.threshold'] = spamThreshold;
    if (antiRaid !== null) update['autoMod.antiRaid.enabled'] = antiRaid;
    if (raidThreshold !== null) update['autoMod.antiRaid.threshold'] = raidThreshold;
    if (filterWords !== null) update['autoMod.wordFilter.words'] = filterWords.split(',').map(w => w.trim()).filter(w => w.length > 0);
    if (filterWords !== null) update['autoMod.wordFilter.enabled'] = true;

    await Guild.findOneAndUpdate(
      { guildId: interaction.guildId! },
      { $set: update },
      { upsert: true }
    );

    return interaction.reply({ content: `${EMOJIS.success} AutoMod settings updated.`, flags: MessageFlags.Ephemeral });
  }

  if (subcommand === 'blacklist-channel') {
    const channel = interaction.options.getChannel('channel', true);

    await Guild.findOneAndUpdate(
        { guildId: interaction.guildId! },
        { blacklistChannelId: channel.id },
        { upsert: true }
    );

    await interaction.reply({ content: `${EMOJIS.success} Blacklist alert channel successfully set to ${channel}.`, flags: MessageFlags.Ephemeral });
  }
}

