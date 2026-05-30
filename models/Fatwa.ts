import { Schema, model, Document } from 'mongoose';

export interface IFatwaRequest extends Document {
    userId: string;
    guildId: string;
    categories: string[];
    urgency: 'low' | 'medium' | 'high';
    question: string;
    anonymous: boolean;
    status: 'pending' | 'assigned' | 'answered';
    answer?: string;
    scholarId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const fatwaSchema = new Schema<IFatwaRequest>({
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    categories: [{ type: String }],
    urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    question: { type: String, required: true },
    anonymous: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'assigned', 'answered'], default: 'pending', index: true },
    answer: String,
    scholarId: String,
}, { timestamps: true });

export const Fatwa = model<IFatwaRequest>('Fatwa', fatwaSchema);
