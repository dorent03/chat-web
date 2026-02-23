import mongoose, { Schema, Document } from 'mongoose';

export interface IAttachment extends Document {
  _id: mongoose.Types.ObjectId;
  message_id: mongoose.Types.ObjectId;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    message_id: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    original_name: {
      type: String,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    storage_path: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

attachmentSchema.index({ message_id: 1 });

attachmentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    ret.id = (ret._id as mongoose.Types.ObjectId).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Attachment = mongoose.model<IAttachment>('Attachment', attachmentSchema);
