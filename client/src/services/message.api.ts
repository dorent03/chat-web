import api from './api';
import type { MessageWithSender, PaginatedResponse, Reaction } from '../types';

/** Get messages for a channel with cursor-based pagination */
export async function getMessages(
  channelId: string,
  options: { limit?: number; before?: string } = {}
): Promise<PaginatedResponse<MessageWithSender>> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.before) params.set('before', options.before);

  const response = await api.get<PaginatedResponse<MessageWithSender>>(
    `/channels/${channelId}/messages?${params.toString()}`
  );
  return response.data;
}

/** Send a message to a channel (with optional file attachments) */
export async function sendMessage(
  channelId: string,
  data: {
    content: string;
    message_type?: string;
    parent_id?: string | null;
    files?: File[];
    poll_data?: {
      question: string;
      options: Array<{ id: string; text: string; votes: string[] }>;
      multiple: boolean;
    } | null;
  }
): Promise<MessageWithSender> {
  if (data.files && data.files.length > 0) {
    const formData = new FormData();
    formData.append('content', data.content);
    if (data.message_type) formData.append('message_type', data.message_type);
    if (data.parent_id) formData.append('parent_id', data.parent_id);
    for (const file of data.files) {
      formData.append('files', file);
    }

    const response = await api.post<MessageWithSender>(
      `/channels/${channelId}/messages`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }

  const response = await api.post<MessageWithSender>(
    `/channels/${channelId}/messages`,
    {
      content: data.content,
      message_type: data.message_type || 'text',
      parent_id: data.parent_id,
      poll_data: data.poll_data || null,
    }
  );
  return response.data;
}

/** Edit a message */
export async function editMessage(
  messageId: string,
  content: string
): Promise<MessageWithSender> {
  const response = await api.patch<MessageWithSender>(`/messages/${messageId}`, {
    content,
  });
  return response.data;
}

/** Delete a message */
export async function deleteMessage(messageId: string): Promise<void> {
  await api.delete(`/messages/${messageId}`);
}

/** Get thread replies for a message */
export async function getThread(
  messageId: string,
  options: { limit?: number; before?: string } = {}
): Promise<PaginatedResponse<MessageWithSender>> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.before) params.set('before', options.before);

  const response = await api.get<PaginatedResponse<MessageWithSender>>(
    `/messages/${messageId}/thread?${params.toString()}`
  );
  return response.data;
}

/** Add a reaction to a message */
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<Reaction> {
  const response = await api.post<Reaction>(`/messages/${messageId}/reactions`, {
    emoji,
  });
  return response.data;
}

/** Remove a reaction from a message */
export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  await api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
}

/** Search messages in a channel */
export async function searchMessages(
  channelId: string,
  query: string
): Promise<MessageWithSender[]> {
  const response = await api.get<MessageWithSender[]>(
    `/channels/${channelId}/messages/search?q=${encodeURIComponent(query)}`
  );
  return response.data;
}

/** Get pinned messages in a channel */
export async function getPinnedMessages(channelId: string): Promise<MessageWithSender[]> {
  const response = await api.get<MessageWithSender[]>(`/channels/${channelId}/messages/pinned`);
  return response.data;
}

/** Pin a message */
export async function pinMessage(messageId: string): Promise<MessageWithSender> {
  const response = await api.post<MessageWithSender>(`/messages/${messageId}/pin`);
  return response.data;
}

/** Unpin a message */
export async function unpinMessage(messageId: string): Promise<MessageWithSender> {
  const response = await api.post<MessageWithSender>(`/messages/${messageId}/unpin`);
  return response.data;
}

/** Vote on a poll message */
export async function votePoll(
  messageId: string,
  optionId: string
): Promise<MessageWithSender> {
  const response = await api.post<MessageWithSender>(`/messages/${messageId}/poll-vote`, {
    optionId,
  });
  return response.data;
}
