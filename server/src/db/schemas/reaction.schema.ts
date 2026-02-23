import mongoose, { Schema, Document } from 'mongoose';

export interface IReaction extends Document {
  _id: mongoose.Types.ObjectId;
  message_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  emoji: string;
}

const reactionSchema = new Schema<IReaction>(
  {
    message_id: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      maxlength: 50,
    },
  },
  {
    timestamps: false,
  }
);

reactionSchema.index({ message_id: 1 });
reactionSchema.index({ user_id: 1 });
reactionSchema.index({ message_id: 1, user_id: 1, emoji: 1 }, { unique: true });

reactionSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = (ret._id as mongoose.Types.ObjectId).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Reaction = mongoose.model<IReaction>('Reaction', reactionSchema);
