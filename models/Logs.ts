import { Schema, model, Document } from 'mongoose';

export interface ILogs extends Document {
  userId: string;
  guildId: string;
  prompt: string;
  response: string;
  tokensUsed: number;
  latency: number;
  securityFlags: string[];
  timestamp: Date;
}

const logsSchema = new Schema<ILogs>({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  prompt: { type: String, required: true },
  response: { type: String, required: true },
  tokensUsed: { type: Number },
  latency: { type: Number },
  securityFlags: [{ type: String }],
  timestamp: { type: Date, default: Date.now, index: true },
});

// Compound index for frequent queries
logsSchema.index({ userId: 1, timestamp: -1 });
logsSchema.index({ guildId: 1, timestamp: -1 });

// TTL index to automatically expire logs after 30 days
logsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export const Logs = model<ILogs>('Logs', logsSchema);
