import mongoose, { Schema, Document } from 'mongoose';

export interface IMembership extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  channel_id: mongoose.Types.ObjectId;
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
  last_read_at: Date | null;
}

const membershipSchema = new Schema<IMembership>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel_id: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joined_at: {
      type: Date,
      default: Date.now,
    },
    last_read_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

membershipSchema.index({ user_id: 1, channel_id: 1 }, { unique: true });
membershipSchema.index({ user_id: 1 });
membershipSchema.index({ channel_id: 1 });

membershipSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = (ret._id as mongoose.Types.ObjectId).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

membershipSchema.set('toObject', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = (ret._id as mongoose.Types.ObjectId).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Membership = mongoose.model<IMembership>('Membership', membershipSchema);
