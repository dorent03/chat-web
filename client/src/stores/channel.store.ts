import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as channelApi from '../services/channel.api';
import type { ChannelWithMeta, User, MemberRole } from '../types';

export const useChannelStore = defineStore('channel', () => {
  const channels = ref<ChannelWithMeta[]>([]);
  const publicChannels = ref<ChannelWithMeta[]>([]);
  const activeChannelId = ref<string | null>(null);
  const members = ref<(User & { role: MemberRole })[]>([]);
  const isLoading = ref(false);

  const activeChannel = computed(() =>
    channels.value.find((c) => c.id === activeChannelId.value) || null
  );

  /** Fetch channels the current user is a member of */
  async function fetchMyChannels() {
    isLoading.value = true;
    try {
      channels.value = await channelApi.getMyChannels();
    } finally {
      isLoading.value = false;
    }
  }

  /** Fetch public channels for discovery */
  async function fetchPublicChannels() {
    publicChannels.value = await channelApi.getPublicChannels();
  }

  /** Add or update a public channel in discovery list */
  function upsertPublicChannel(channel: ChannelWithMeta | { id: string; name: string; type: 'public' | 'private' | 'direct'; description: string | null; creator_id: string; created_at: string }) {
    if (channel.type !== 'public') return;
    const normalized: ChannelWithMeta = {
      ...channel,
      member_count: (channel as ChannelWithMeta).member_count ?? 0,
    };
    const index = publicChannels.value.findIndex((c) => c.id === channel.id);
    if (index === -1) {
      publicChannels.value.unshift(normalized);
    } else {
      publicChannels.value[index] = { ...publicChannels.value[index], ...normalized };
    }
  }

  /** Set the active channel */
  function setActiveChannel(channelId: string | null) {
    activeChannelId.value = channelId;
  }

  /** Create a new channel */
  async function createChannel(data: {
    name: string;
    type: 'public' | 'private' | 'direct';
    description?: string;
  }) {
    const channel = await channelApi.createChannel(data);
    channels.value.unshift({ ...channel, member_count: 1 });
    return channel;
  }

  /** Update a channel */
  async function updateChannel(
    id: string,
    data: { name?: string; description?: string; type?: 'public' | 'private' }
  ) {
    const updated = await channelApi.updateChannel(id, data);
    const index = channels.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      channels.value[index] = { ...channels.value[index], ...updated };
    }
    return updated;
  }

  /** Delete a channel */
  async function deleteChannel(id: string) {
    await channelApi.deleteChannel(id);
    channels.value = channels.value.filter((c) => c.id !== id);
    if (activeChannelId.value === id) {
      activeChannelId.value = channels.value[0]?.id || null;
    }
  }

  /** Join a public channel */
  async function joinChannel(id: string) {
    await channelApi.joinChannel(id);
    await fetchMyChannels();
    await fetchPublicChannels();
  }

  /** Leave a channel */
  async function leaveChannel(id: string) {
    await channelApi.leaveChannel(id);
    channels.value = channels.value.filter((c) => c.id !== id);
    if (activeChannelId.value === id) {
      activeChannelId.value = channels.value[0]?.id || null;
    }
  }

  /** Fetch members of the active channel */
  async function fetchMembers(channelId: string) {
    members.value = await channelApi.getMembers(channelId);
  }

  /** Kick a member from a channel */
  async function kickMember(channelId: string, userId: string) {
    await channelApi.kickMember(channelId, userId);
    members.value = members.value.filter((m) => m.id !== userId);
  }

  /** Invite a user to the active channel */
  async function addMember(channelId: string, userId: string) {
    await channelApi.addMember(channelId, userId);
    await fetchMembers(channelId);
  }

  /** Update unread count for a channel locally */
  function incrementUnread(channelId: string) {
    const channel = channels.value.find((c) => c.id === channelId);
    if (channel) {
      channel.unread_count = (channel.unread_count || 0) + 1;
    }
  }

  /** Clear unread count for a channel locally */
  function clearUnread(channelId: string) {
    const channel = channels.value.find((c) => c.id === channelId);
    if (channel) {
      channel.unread_count = 0;
    }
  }

  return {
    channels,
    publicChannels,
    activeChannelId,
    activeChannel,
    members,
    isLoading,
    fetchMyChannels,
    fetchPublicChannels,
    upsertPublicChannel,
    setActiveChannel,
    createChannel,
    updateChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
    fetchMembers,
    kickMember,
    addMember,
    incrementUnread,
    clearUnread,
  };
});
