import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  discordId: string;
  tier: 'Free' | 'Premium' | 'SuperPremium';
  invites: number;
  lastRequestTimestamps: Date[];
  byok?: {
    provider: string;
    key: string;
  };
  byokProfiles: {
    name: string;
    provider: string;
    key: string;
  }[];
  selectedProfileIndex: number;
  tokenUsage: {
    input: number;
    output: number;
  };
  preferredModel?: string;
  firstUsedAt?: Date;
  joinedSupportServer: boolean;
  byCommand?: boolean;
  customBranding?: {
    title?: string;
    description?: string;
    color?: string; // hex color
    avatarUrl?: string;
  };
  prayerReminders?: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    advanceMinutes: number;
    timezone: string;
    lastNotified?: Map<string, string>; // prayer:date
  };
}

const userSchema = new Schema<IUser>({
  discordId: { type: String, required: true, unique: true, index: true },
  tier: { type: String, enum: ['Free', 'Premium', 'SuperPremium'], default: 'Free', index: true },
  invites: { type: Number, default: 0, index: true },
  lastRequestTimestamps: [{ type: Date }],
  byok: {
    provider: String,
    key: String,
  },
  byokProfiles: [{
    name: String,
    provider: String,
    key: String,
  }],
  selectedProfileIndex: { type: Number, default: 0 },
  tokenUsage: {
    input: { type: Number, default: 0 },
    output: { type: Number, default: 0 }
  },
  preferredModel: String,
  firstUsedAt: { type: Date },
  joinedSupportServer: { type: Boolean, default: false },
  byCommand: { type: Boolean, default: false },
  customBranding: {
    title: String,
    description: String,
    color: String,
    avatarUrl: String
  },
  prayerReminders: {
    fajr: { type: Boolean, default: false },
    dhuhr: { type: Boolean, default: false },
    asr: { type: Boolean, default: false },
    maghrib: { type: Boolean, default: false },
    isha: { type: Boolean, default: false },
    advanceMinutes: { type: Number, default: 0 },
    timezone: { type: String, default: 'UTC' },
    lastNotified: { type: Map, of: String, default: {} }
  }
});


export const User = model<IUser>('User', userSchema);
