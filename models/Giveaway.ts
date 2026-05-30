import { Schema, model, Document } from 'mongoose';

export interface IGiveaway extends Document {
  messageId: string;
  channelId: string;
  guildId: string;
  prize: string;
  winnerCount: number;
  endTime: Date;
  participants: string[];
  winners: string[];
  ended: boolean;
  hostId: string;
}

const giveawaySchema = new Schema<IGiveaway>({
  messageId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  guildId: { type: String, required: true },
  prize: { type: String, required: true },
  winnerCount: { type: Number, default: 1 },
  endTime: { type: Date, required: true },
  participants: [{ type: String }],
  winners: [{ type: String }],
  ended: { type: Boolean, default: false },
  hostId: { type: String, required: true }
});

export const Giveaway = model<IGiveaway>('Giveaway', giveawaySchema);
