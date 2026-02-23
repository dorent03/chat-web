import { Message } from '../db/schemas/message.schema';
import { User } from '../db/schemas/user.schema';

const DEFAULT_PAGE_SIZE = 50;

/** Create a new message */
export async function create(data: {
  channel_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  parent_id?: string | null;
  mentions?: string[];
  poll_data?: {
    question: string;
    options: Array<{ id: string; text: string; votes: string[] }>;
    multiple: boolean;
  } | null;
}) {
  const message = await Message.create({
    channel_id: data.channel_id,
    sender_id: data.sender_id,
    content: data.content,
    message_type: data.message_type || 'text',
    parent_id: data.parent_id || null,
    mentions: data.mentions || [],
    poll_data: data.poll_data || null,
  });
  return message.toJSON();
}

/** Find a message by ID */
export async function findById(id: string) {
  return Message.findById(id).lean();
}

/**
 * Fetch messages for a channel with sender info, paginated via cursor.
 * Messages are ordered newest-first. The `before` cursor fetches older messages.
 */
export async function findByChannelId(
  channelId: string,
  options: { limit?: number; before?: string } = {}
) {
  const limit = options.limit || DEFAULT_PAGE_SIZE;

  let query: Record<string, unknown> = {
    channel_id: channelId,
    parent_id: null,
  };

  if (options.before) {
    const beforeMsg = await Message.findById(options.before).lean();
    if (beforeMsg) {
      query = { ...query, created_at: { $lt: beforeMsg.created_at } };
    }
  }

  const messages = await Message.find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  /* Enrich with sender info */
  const senderIds = [...new Set(messages.map((m) => m.sender_id.toString()))];
  const users = await User.find({ _id: { $in: senderIds } })
    .select('username avatar_url')
    .lean();

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return messages.map((msg) => {
    const sender = userMap.get(msg.sender_id.toString());
    return {
      ...msg,
      id: msg._id.toString(),
      sender_username: sender?.username || 'Unknown',
      sender_avatar_url: sender?.avatar_url || null,
    };
  });
}

/** Fetch thread replies for a parent message */
export async function findByParentId(
  parentId: string,
  options: { limit?: number; before?: string } = {}
) {
  const limit = options.limit || DEFAULT_PAGE_SIZE;

  let query: Record<string, unknown> = { parent_id: parentId };

  if (options.before) {
    const beforeMsg = await Message.findById(options.before).lean();
    if (beforeMsg) {
      query = { ...query, created_at: { $lt: beforeMsg.created_at } };
    }
  }

  const messages = await Message.find(query)
    .sort({ created_at: 1 })
    .limit(limit)
    .lean();

  const senderIds = [...new Set(messages.map((m) => m.sender_id.toString()))];
  const users = await User.find({ _id: { $in: senderIds } })
    .select('username avatar_url')
    .lean();

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return messages.map((msg) => {
    const sender = userMap.get(msg.sender_id.toString());
    return {
      ...msg,
      id: msg._id.toString(),
      sender_username: sender?.username || 'Unknown',
      sender_avatar_url: sender?.avatar_url || null,
    };
  });
}

/** Get the reply count for a parent message */
export async function getReplyCount(parentId: string): Promise<number> {
  return Message.countDocuments({ parent_id: parentId });
}

/** Update a message's content */
export async function updateContent(id: string, content: string) {
  return Message.findByIdAndUpdate(
    id,
    { $set: { content, is_edited: true } },
    { new: true }
  ).lean();
}

/** Update a message with a partial patch and return updated document */
export async function updateById(
  id: string,
  patch: Record<string, unknown>
) {
  return Message.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
}

/** Get pinned messages for a channel */
export async function findPinnedByChannelId(channelId: string, limit: number = 50) {
  const messages = await Message.find({
    channel_id: channelId,
    pinned: true,
  })
    .sort({ updated_at: -1 })
    .limit(limit)
    .lean();

  const senderIds = [...new Set(messages.map((m) => m.sender_id.toString()))];
  const users = await User.find({ _id: { $in: senderIds } })
    .select('username avatar_url')
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return messages.map((msg) => {
    const sender = userMap.get(msg.sender_id.toString());
    return {
      ...msg,
      id: msg._id.toString(),
      sender_username: sender?.username || 'Unknown',
      sender_avatar_url: sender?.avatar_url || null,
    };
  });
}

/** Delete a message by ID */
export async function deleteById(id: string): Promise<boolean> {
  const result = await Message.findByIdAndDelete(id);
  return !!result;
}

/** Search messages by content within a channel */
export async function searchInChannel(
  channelId: string,
  query: string,
  limit: number = 20
) {
  const messages = await Message.find({
    channel_id: channelId,
    content: { $regex: query, $options: 'i' },
  })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  const senderIds = [...new Set(messages.map((m) => m.sender_id.toString()))];
  const users = await User.find({ _id: { $in: senderIds } })
    .select('username avatar_url')
    .lean();

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return messages.map((msg) => {
    const sender = userMap.get(msg.sender_id.toString());
    return {
      ...msg,
      id: msg._id.toString(),
      sender_username: sender?.username || 'Unknown',
      sender_avatar_url: sender?.avatar_url || null,
    };
  });
}
