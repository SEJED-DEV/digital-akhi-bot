import { Schema, model, Document } from 'mongoose';

export interface IInvites extends Document {
  inviterId: string;
  inviteeId: string;
  guildId: string;
  timestamp: Date;
}

const invitesSchema = new Schema<IInvites>({
  inviterId: { type: String, required: true, index: true },
  inviteeId: { type: String, required: true, unique: true, index: true },
  guildId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
});

invitesSchema.index({ inviterId: 1, guildId: 1 });

export const Invites = model<IInvites>('Invites', invitesSchema);
