import { Schema, model, Document } from 'mongoose';

export interface IGuild extends Document {
  guildId: string;
  blacklistChannelId?: string;
  isPremium: boolean;
  tier: 'Free' | 'Premium' | 'SuperPremium';
  dmLogsChannelId?: string;
  sharedByok?: {
    provider: string;
    key: string;
  };
  customByokRateLimit?: number;
  welcomeModule?: {
    enabled: boolean;
    channelId: string;
    welcomeMsg: string;
    goodbyeMsg: string;
  };
  customBranding?: {
    nickname?: string;
    avatarUrl?: string;
    thumbnailUrl?: string;
    bio?: string;
  };
  logChannelId?: string;
  joinToCreateChannelId?: string;
  serverStats?: {
    enabled: boolean;
    totalChannelId?: string;
    memberChannelId?: string;
    botChannelId?: string;
  };
  stickyMessages?: {
    channelId: string;
    message: string;
    lastMessageId?: string;
  }[];
  autoMod?: {
    enabled: boolean;
    antiSpam?: {
      enabled: boolean;
      threshold: number;
    };
    antiRaid?: {
      enabled: boolean;
      threshold: number;
    };
    wordFilter?: {
      enabled: boolean;
      words: string[];
    };
  };
}

const guildSchema = new Schema<IGuild>({
  guildId: { type: String, required: true, unique: true, index: true },
  blacklistChannelId: { type: String },
  isPremium: { type: Boolean, default: false, index: true },
  tier: { type: String, enum: ['Free', 'Premium', 'SuperPremium'], default: 'Free', index: true },
  dmLogsChannelId: { type: String },
  sharedByok: {
    provider: String,
    key: String,
  },
  customByokRateLimit: { type: Number },
  welcomeModule: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    welcomeMsg: String,
    goodbyeMsg: String
  },
  customBranding: {
    nickname: String,
    avatarUrl: String,
    thumbnailUrl: String,
    bio: String
  },
  logChannelId: String,
  joinToCreateChannelId: String,
  serverStats: {
    enabled: { type: Boolean, default: false },
    totalChannelId: String,
    memberChannelId: String,
    botChannelId: String
  },
  stickyMessages: [{
    channelId: String,
    message: String,
    lastMessageId: String
  }],
  autoMod: {
    enabled: { type: Boolean, default: false },
    antiSpam: {
      enabled: { type: Boolean, default: false },
      threshold: { type: Number, default: 5 }
    },
    antiRaid: {
      enabled: { type: Boolean, default: false },
      threshold: { type: Number, default: 10 }
    },
    wordFilter: {
      enabled: { type: Boolean, default: false },
      words: [String]
    }
  }
});

export const Guild = model<IGuild>('Guild', guildSchema);
