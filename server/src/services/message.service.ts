import * as MessageModel from '../models/message.model';
import * as MembershipModel from '../models/membership.model';
import { Message } from '../db/schemas/message.schema';
import { User } from '../db/schemas/user.schema';
import { Reaction } from '../db/schemas/reaction.schema';
import { Attachment } from '../db/schemas/attachment.schema';
import { AppError } from '../middleware/errorHandler';

const MENTION_REGEX = /@([a-zA-Z0-9_-]{3,50})/g;

function extractMentions(content: string): string[] {
  const mentions = new Set<string>();
  let match: RegExpExecArray | null = null;
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    mentions.add(match[1]);
  }
  return Array.from(mentions);
}

async function normalizeMessageWithSender(message: Record<string, unknown>) {
  const senderId = (message.sender_id as { toString(): string }).toString();
  const channelId = (message.channel_id as { toString(): string }).toString();
  const parentId = message.parent_id
    ? (message.parent_id as { toString(): string }).toString()
    : null;
  const sender = await User.findById(senderId).select('username avatar_url').lean();
  return {
    ...message,
    id: ((message._id || message.id) as { toString(): string }).toString(),
    channel_id: channelId,
    sender_id: senderId,
    parent_id: parentId,
    sender_username: sender?.username || 'Unknown',
    sender_avatar_url: sender?.avatar_url || null,
  };
}

/** Send a message to a channel, verifying membership */
export async function sendMessage(
  channelId: string,
  senderId: string,
  content: string,
  messageType: string = 'text',
  parentId?: string | null,
  pollData?: {
    question: string;
    options: Array<{ id: string; text: string; votes: string[] }>;
    multiple: boolean;
  } | null
) {
  const isMember = await MembershipModel.isMember(senderId, channelId);
  if (!isMember) {
    throw new AppError(403, 'Must be a channel member to send messages');
  }

  if (parentId) {
    const parent = await MessageModel.findById(parentId);
    if (!parent || parent.channel_id.toString() !== channelId) {
      throw new AppError(404, 'Parent message not found in this channel');
    }
  }

  if (messageType === 'poll') {
    if (!pollData) {
      throw new AppError(400, 'Poll payload is required for poll messages');
    }
    const options = pollData.options || [];
    if (!pollData.question?.trim()) {
      throw new AppError(400, 'Poll question is required');
    }
    if (options.length < 2 || options.length > 8) {
      throw new AppError(400, 'Poll must have between 2 and 8 options');
    }
    const hasInvalidOption = options.some((o) => !o.text?.trim());
    if (hasInvalidOption) {
      throw new AppError(400, 'Poll options must not be empty');
    }
  }

  const message = await MessageModel.create({
    channel_id: channelId,
    sender_id: senderId,
    content,
    message_type: messageType,
    parent_id: parentId,
    mentions: extractMentions(content),
    poll_data: messageType === 'poll' ? pollData || null : null,
  });

  /* Enrich with sender info */
  return normalizeMessageWithSender(message as Record<string, unknown>);
}

/** Get paginated messages for a channel */
export async function getMessages(
  channelId: string,
  userId: string,
  options: { limit?: number; before?: string } = {}
) {
  const isMember = await MembershipModel.isMember(userId, channelId);
  if (!isMember) {
    throw new AppError(403, 'Must be a channel member to view messages');
  }

  const limit = options.limit || 50;
  const messages = await MessageModel.findByChannelId(channelId, {
    limit: limit + 1,
    before: options.before,
  });

  const hasMore = messages.length > limit;
  const data = hasMore ? messages.slice(0, limit) : messages;

  const enrichedData = await enrichMessages(data);

  return { data: enrichedData, hasMore };
}

/** Get thread replies for a message */
export async function getThreadMessages(
  parentId: string,
  userId: string,
  options: { limit?: number; before?: string } = {}
) {
  const parent = await MessageModel.findById(parentId);
  if (!parent) {
    throw new AppError(404, 'Parent message not found');
  }

  const isMember = await MembershipModel.isMember(userId, parent.channel_id.toString());
  if (!isMember) {
    throw new AppError(403, 'Must be a channel member to view threads');
  }

  const limit = options.limit || 50;
  const messages = await MessageModel.findByParentId(parentId, {
    limit: limit + 1,
    before: options.before,
  });

  const hasMore = messages.length > limit;
  const data = hasMore ? messages.slice(0, limit) : messages;

  return { data, hasMore };
}

/** Edit a message (only the sender can edit) */
export async function editMessage(
  messageId: string,
  userId: string,
  content: string
) {
  const message = await MessageModel.findById(messageId);
  if (!message) {
    throw new AppError(404, 'Message not found');
  }

  if (message.sender_id.toString() !== userId) {
    throw new AppError(403, 'Can only edit your own messages');
  }

  const updated = await MessageModel.updateById(messageId, {
    content,
    is_edited: true,
    mentions: extractMentions(content),
  });
  if (!updated) {
    throw new AppError(500, 'Failed to update message');
  }

  return normalizeMessageWithSender(updated as Record<string, unknown>);
}

/** Delete a message (sender or channel admin) */
export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<void> {
  const message = await MessageModel.findById(messageId);
  if (!message) {
    throw new AppError(404, 'Message not found');
  }

  if (message.sender_id.toString() !== userId) {
    const membership = await MembershipModel.getMembership(userId, message.channel_id.toString());
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new AppError(403, 'Can only delete your own messages or as admin');
    }
  }

  /* Delete associated reactions and attachments */
  await Reaction.deleteMany({ message_id: messageId });
  await Attachment.deleteMany({ message_id: messageId });
  await MessageModel.deleteById(messageId);
}

/** Add a reaction to a message */
export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string
) {
  const message = await MessageModel.findById(messageId);
  if (!message) {
    throw new AppError(404, 'Message not found');
  }

  const isMember = await MembershipModel.isMember(userId, message.channel_id.toString());
  if (!isMember) {
    throw new AppError(403, 'Must be a channel member to react');
  }

  /* Check for duplicate */
  const existing = await Reaction.findOne({
    message_id: messageId,
    user_id: userId,
    emoji,
  });

  if (existing) {
    throw new AppError(409, 'Already reacted with this emoji');
  }

  const reaction = await Reaction.create({
    message_id: messageId,
    user_id: userId,
    emoji,
  });

  return reaction.toJSON();
}

/** Remove a reaction from a message */
export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  const result = await Reaction.findOneAndDelete({
    message_id: messageId,
    user_id: userId,
    emoji,
  });

  if (!result) {
    throw new AppError(404, 'Reaction not found');
  }
}

/** Search messages in a channel */
export async function searchMessages(
  channelId: string,
  userId: string,
  query: string
) {
  const isMember = await MembershipModel.isMember(userId, channelId);
  if (!isMember) {
    throw new AppError(403, 'Must be a channel member to search');
  }

  return MessageModel.searchInChannel(channelId, query);
}

/** Pin a message in channel (owner/admin only) */
export async function pinMessage(messageId: string, actorId: string) {
  const message = await MessageModel.findById(messageId);
  if (!message) throw new AppError(404, 'Message not found');

  const membership = await MembershipModel.getMembership(actorId, message.channel_id.toString());
  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new AppError(403, 'Only owner/admin can pin messages');
  }

  const updated = await MessageModel.updateById(messageId, { pinned: true });
  if (!updated) throw new AppError(500, 'Failed to pin message');
  return normalizeMessageWithSender(updated as Record<string, unknown>);
}

/** Unpin a message in channel (owner/admin only) */
export async function unpinMessage(messageId: string, actorId: string) {
  const message = await MessageModel.findById(messageId);
  if (!message) throw new AppError(404, 'Message not found');

  const membership = await MembershipModel.getMembership(actorId, message.channel_id.toString());
  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new AppError(403, 'Only owner/admin can unpin messages');
  }

  const updated = await MessageModel.updateById(messageId, { pinned: false });
  if (!updated) throw new AppError(500, 'Failed to unpin message');
  return normalizeMessageWithSender(updated as Record<string, unknown>);
}

/** Get pinned messages for a channel */
export async function getPinnedMessages(channelId: string, userId: string) {
  const isMember = await MembershipModel.isMember(userId, channelId);
  if (!isMember) throw new AppError(403, 'Must be a channel member to view pinned messages');
  return MessageModel.findPinnedByChannelId(channelId, 100);
}

/** Cast a vote on a poll message */
export async function votePoll(messageId: string, userId: string, optionId: string) {
  const message = await Message.findById(messageId);
  if (!message) throw new AppError(404, 'Message not found');
  if (message.message_type !== 'poll' || !message.poll_data) {
    throw new AppError(400, 'Message is not a poll');
  }

  const isMember = await MembershipModel.isMember(userId, message.channel_id.toString());
  if (!isMember) throw new AppError(403, 'Must be a channel member to vote');

  let foundOption = false;
  for (const option of message.poll_data.options) {
    const voteIndex = option.votes.findIndex((v) => v === userId);
    if (voteIndex !== -1) option.votes.splice(voteIndex, 1);
    if (option.id === optionId) {
      option.votes.push(userId);
      foundOption = true;
    }
  }
  if (!foundOption) throw new AppError(404, 'Poll option not found');

  await message.save();
  return normalizeMessageWithSender(message.toObject() as Record<string, unknown>);
}

/** Enrich messages with reactions, attachments, and reply counts */
async function enrichMessages(messages: Array<Record<string, unknown>>) {
  if (messages.length === 0) return messages;

  const messageIds = messages.map((m) => m._id || m.id);

  const [reactions, attachments, replyCounts] = await Promise.all([
    Reaction.find({ message_id: { $in: messageIds } }).lean(),
    Attachment.find({ message_id: { $in: messageIds } }).lean(),
    Message.aggregate([
      { $match: { parent_id: { $in: messageIds } } },
      { $group: { _id: '$parent_id', count: { $sum: 1 } } },
    ]),
  ]);

  const reactionMap = new Map<string, Array<Record<string, unknown>>>();
  for (const r of reactions) {
    const key = r.message_id.toString();
    const list = reactionMap.get(key) || [];
    list.push({ id: r._id.toString(), message_id: key, user_id: r.user_id.toString(), emoji: r.emoji });
    reactionMap.set(key, list);
  }

  const attachmentMap = new Map<string, Array<Record<string, unknown>>>();
  for (const a of attachments) {
    const key = a.message_id.toString();
    const list = attachmentMap.get(key) || [];
    list.push({
      id: a._id.toString(),
      message_id: key,
      filename: a.filename,
      original_name: a.original_name,
      mime_type: a.mime_type,
      file_size: a.file_size,
      storage_path: a.storage_path,
    });
    attachmentMap.set(key, list);
  }

  const replyCountMap = new Map<string, number>();
  for (const rc of replyCounts) {
    replyCountMap.set(rc._id.toString(), rc.count);
  }

  return messages.map((msg) => {
    const msgId = ((msg._id || msg.id) as { toString(): string }).toString();
    return {
      ...msg,
      id: msgId,
      reactions: reactionMap.get(msgId) || [],
      attachments: attachmentMap.get(msgId) || [],
      reply_count: replyCountMap.get(msgId) || 0,
    };
  });
}
