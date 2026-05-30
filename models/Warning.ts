import { Schema, model, Document } from 'mongoose';

export interface IWarning extends Document {
  userId: string;
  guildId: string;
  reason: string;
  moderatorId: string;
  timestamp: Date;
}

const warningSchema = new Schema<IWarning>({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  reason: { type: String, default: 'No reason provided' },
  moderatorId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const Warning = model<IWarning>('Warning', warningSchema);
