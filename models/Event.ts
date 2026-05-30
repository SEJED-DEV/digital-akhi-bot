import { Schema, model, Document } from 'mongoose';

export interface IGuildEvent extends Document {
    guildId: string;
    name: string;
    description: string;
    timestamp: Date;
    location?: string;
    creatorId: string;
    going: string[];
    maybe: string[];
    notGoing: string[];
    recurring?: 'weekly' | 'monthly';
    createdAt: Date;
}

const eventSchema = new Schema<IGuildEvent>({
    guildId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    timestamp: { type: Date, required: true, index: true },
    location: String,
    creatorId: { type: String, required: true },
    going: [{ type: String }],
    maybe: [{ type: String }],
    notGoing: [{ type: String }],
    recurring: { type: String, enum: ['weekly', 'monthly'] },
}, { timestamps: true });

export const GuildEvent = model<IGuildEvent>('GuildEvent', eventSchema);
