import api from './api';
import type { Channel, ChannelWithMeta, User, MemberRole } from '../types';

/** Get all channels the current user belongs to */
export async function getMyChannels(): Promise<ChannelWithMeta[]> {
  const response = await api.get<ChannelWithMeta[]>('/channels');
  return response.data;
}

/** Get all public channels */
export async function getPublicChannels(): Promise<ChannelWithMeta[]> {
  const response = await api.get<ChannelWithMeta[]>('/channels/public');
  return response.data;
}

/** Get a single channel by ID */
export async function getChannel(id: string): Promise<Channel> {
  const response = await api.get<Channel>(`/channels/${id}`);
  return response.data;
}

/** Create a new channel */
export async function createChannel(data: {
  name: string;
  type: 'public' | 'private' | 'direct';
  description?: string;
}): Promise<Channel> {
  const response = await api.post<Channel>('/channels', data);
  return response.data;
}

/** Update a channel */
export async function updateChannel(
  id: string,
  data: { name?: string; description?: string; type?: 'public' | 'private' }
): Promise<Channel> {
  const response = await api.patch<Channel>(`/channels/${id}`, data);
  return response.data;
}

/** Delete a channel */
export async function deleteChannel(id: string): Promise<void> {
  await api.delete(`/channels/${id}`);
}

/** Join a public channel */
export async function joinChannel(id: string): Promise<void> {
  await api.post(`/channels/${id}/join`);
}

/** Leave a channel */
export async function leaveChannel(id: string): Promise<void> {
  await api.post(`/channels/${id}/leave`);
}

/** Get all members of a channel */
export async function getMembers(
  channelId: string
): Promise<(User & { role: MemberRole })[]> {
  const response = await api.get<(User & { role: MemberRole })[]>(
    `/channels/${channelId}/members`
  );
  return response.data;
}

/** Kick a member from a channel */
export async function kickMember(
  channelId: string,
  userId: string
): Promise<void> {
  await api.post(`/channels/${channelId}/kick/${userId}`);
}

/** Add a user to a channel (invite) */
export async function addMember(
  channelId: string,
  userId: string
): Promise<void> {
  await api.post(`/channels/${channelId}/members`, { userId });
}
