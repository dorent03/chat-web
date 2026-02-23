import mongoose, { Schema, Document } from 'mongoose';

export interface IChannel extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: 'public' | 'private' | 'direct';
  description: string | null;
  creator_id: mongoose.Types.ObjectId;
  created_at: Date;
}

const channelSchema = new Schema<IChannel>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },
    type: {
      type: String,
      enum: ['public', 'private', 'direct'],
      default: 'public',
    },
    description: {
      type: String,
      maxlength: 500,
      default: null,
    },
    creator_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

channelSchema.index({ creator_id: 1 });
channelSchema.index({ type: 1 });

channelSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = (ret._id as mongoose.Types.ObjectId).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

channelSchema.set('toObject', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = (ret._id as mongoose.Types.ObjectId).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Channel = mongoose.model<IChannel>('Channel', channelSchema);
