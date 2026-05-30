import { Schema, model, Document } from 'mongoose';

export interface IBlacklist extends Document {
  targetId: string;
  type: 'Global' | 'Local';
  guildId?: string;
  reason?: string;
  adminId: string;
  timestamp: Date;
}

const blacklistSchema = new Schema<IBlacklist>({
  targetId: { type: String, required: true, index: true },
  type: { type: String, enum: ['Global', 'Local'], required: true, index: true },
  guildId: { type: String, index: true },
  reason: { type: String },
  adminId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Compound index for target lookups
blacklistSchema.index({ targetId: 1, type: 1 });

export const Blacklist = model<IBlacklist>('Blacklist', blacklistSchema);
