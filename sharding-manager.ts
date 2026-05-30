import { ShardingManager } from 'discord.js';
import { ConfigService } from './services/ConfigService.js';
import { Logger } from './services/Logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    ConfigService.validate();
} catch (error: any) {
    console.error('Initial validation failed:', error);
    process.exit(1);
}

const manager = new ShardingManager(path.join(__dirname, 'index.js'), {
    token: ConfigService.get('DISCORD_TOKEN'),
    totalShards: 'auto',
});

manager.on('shardCreate', shard => {
    Logger.info(`Launched shard ${shard.id}`);
});

manager.spawn().catch(err => {
    Logger.error('Failed to spawn shards:', err);
});
