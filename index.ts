import { Client, GatewayIntentBits, Collection, Interaction, Message, GuildMember, Guild, PartialGuildMember } from 'discord.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KeyRingService } from './services/KeyRingService.js';
import { AIService } from './services/AIService.js';
import { TierService } from './services/TierService.js';
import { ConfigService } from './services/ConfigService.js';
import { Logger } from './services/Logger.js';
import { messageCreate } from './events/messageCreate.js';
import { interactionCreate } from './events/interactionCreate.js';
import { guildMemberAdd, initInviteTracker } from './events/guildMemberAdd.js';
import { guildMemberRemove } from './events/guildMemberRemove.js';
import { guildUpdate } from './events/guildUpdate.js';
import { MaintenanceService } from './services/MaintenanceService.js';
import { HealthCheckService } from './services/HealthCheckService.js';
import { InviteProcessingService } from './services/InviteProcessingService.js';
import { StatusService } from './services/StatusService.js';
import { AdvancedLoggingService } from './services/AdvancedLoggingService.js';
import { VoiceService } from './services/VoiceService.js';
import { ServerStatsService } from './services/ServerStatsService.js';
import { GiveawayService } from './services/GiveawayService.js';
import { StickyMessageService } from './services/StickyMessageService.js';

// Validate environment variables before anything else
try {
    ConfigService.validate();
} catch (error: any) {
    Logger.error('Configuration validation failed:', error);
    process.exit(1);
}

export interface ExtendedClient extends Client {
    commands: Collection<string, any>;
}

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
  ],
}) as ExtendedClient;

// Services initialization
export const keyRing = new KeyRingService();
export const aiService = new AIService(keyRing);
export const tierService = new TierService();

// Commands collection
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsPath)) {
        Logger.warn('Commands directory not found.');
        return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = await import(`file://${filePath}`);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                Logger.info(`Loaded command: ${command.data.name}`);
            }
        } catch (error) {
            Logger.error(`Failed to load command at ${filePath}:`, error);
        }
    }
}

client.on('ready', () => {
  Logger.info(`Logged in as ${client.user?.tag}!`);
  StatusService.start(client);
  MaintenanceService.init();
  initInviteTracker(client);
  InviteProcessingService.startCleanup();
  ServerStatsService.start(client);
  GiveawayService.start(client);
  HealthCheckService.start(Number(process.env.PORT) || 3000);
});

client.on('messageCreate', (message: Message) => {
    messageCreate(message);
    StickyMessageService.handleMessage(message);
});
client.on('interactionCreate', (interaction: Interaction) => interactionCreate(interaction));
client.on('guildMemberAdd', (member: GuildMember) => {
    guildMemberAdd(member);
    AdvancedLoggingService.logMemberJoin(member);
});
client.on('guildMemberRemove', (member: GuildMember | PartialGuildMember) => guildMemberRemove(member));
client.on('guildUpdate', (oldG: Guild, newG: Guild) => guildUpdate(oldG, newG));

client.on('messageUpdate', (oldMsg, newMsg) => AdvancedLoggingService.logMessageEdit(oldMsg, newMsg));
client.on('messageDelete', (msg) => AdvancedLoggingService.logMessageDelete(msg));
client.on('voiceStateUpdate', (oldState, newState) => {
    AdvancedLoggingService.logVoiceStateUpdate(oldState, newState);
    VoiceService.handleVoiceStateUpdate(oldState, newState);
});

async function main() {
    await loadCommands();

    const mongodbUri = ConfigService.get('MONGODB_URI');
    await mongoose.connect(mongodbUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000
    });
    Logger.info('Connected to MongoDB with connection pooling');

    const token = ConfigService.get('DISCORD_TOKEN');
    await client.login(token);
}

main().catch(err => {
    Logger.error('Bootstrap error:', err);
    process.exit(1);
});
