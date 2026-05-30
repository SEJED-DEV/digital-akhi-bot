import { Schema, model, Document } from 'mongoose';

export interface IModeratorAction extends Document {
  guildId: string;
  moderatorId: string;
  userId: string;
  action: 'warn' | 'mute' | 'kick' | 'ban' | 'unban';
  reason?: string;
  timestamp: Date;
}

const moderatorActionSchema = new Schema<IModeratorAction>({
  guildId: { type: String, required: true, index: true },
  moderatorId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  action: { type: String, enum: ['warn', 'mute', 'kick', 'ban', 'unban'], required: true },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export const ModeratorAction = model<IModeratorAction>('ModeratorAction', moderatorActionSchema);
