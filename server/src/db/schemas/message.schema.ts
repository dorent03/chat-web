import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  channel_id: mongoose.Types.ObjectId;
  sender_id: mongoose.Types.ObjectId;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'poll';
  parent_id: mongoose.Types.ObjectId | null;
  is_edited: boolean;
  pinned: boolean;
  mentions: string[];
  poll_data: {
    question: string;
    options: Array<{ id: string; text: string; votes: string[] }>;
    multiple: boolean;
  } | null;
  created_at: Date;
  updated_at: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    channel_id: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 4000,
    },
    message_type: {
      type: String,
      enum: ['text', 'image', 'file', 'poll'],
      default: 'text',
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    is_edited: {
      type: Boolean,
      default: false,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    mentions: {
      type: [String],
      default: [],
    },
    poll_data: {
      type: {
        question: { type: String, required: true },
        options: {
          type: [
            {
              id: { type: String, required: true },
              text: { type: String, required: true },
              votes: { type: [String], default: [] },
            },
          ],
          default: [],
        },
        multiple: { type: Boolean, default: false },
      },
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

messageSchema.index({ channel_id: 1, created_at: -1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ parent_id: 1 });
messageSchema.index({ created_at: -1 });

messageSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = (ret._id as mongoose.Types.ObjectId).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

messageSchema.set('toObject', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = (ret._id as mongoose.Types.ObjectId).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Message = mongoose.model<IMessage>('Message', messageSchema);
