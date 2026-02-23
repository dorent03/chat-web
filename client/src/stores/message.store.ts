import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as messageApi from '../services/message.api';
import type { MessageWithSender, Reaction } from '../types';

export const useMessageStore = defineStore('message', () => {
  /** Messages keyed by channel ID */
  const messagesByChannel = ref<Record<string, MessageWithSender[]>>({});
  const hasMoreByChannel = ref<Record<string, boolean>>({});
  const isLoading = ref(false);

  /** Fetch initial messages for a channel */
  async function fetchMessages(channelId: string) {
    isLoading.value = true;
    try {
      const result = await messageApi.getMessages(channelId, { limit: 50 });
      messagesByChannel.value[channelId] = result.data;
      hasMoreByChannel.value[channelId] = result.hasMore;
    } finally {
      isLoading.value = false;
    }
  }

  /** Replace all messages for a channel */
  function setChannelMessages(channelId: string, messages: MessageWithSender[]) {
    messagesByChannel.value[channelId] = messages;
  }

  /** Load older messages (not used in Firebase mode) */
  async function loadOlderMessages(channelId: string) {
    hasMoreByChannel.value[channelId] = false;
  }

  /** Add a new message (from socket or optimistic send) */
  function addMessage(channelId: string, message: MessageWithSender) {
    if (!messagesByChannel.value[channelId]) {
      messagesByChannel.value[channelId] = [];
    }

    /* Avoid duplicates */
    const exists = messagesByChannel.value[channelId].some(
      (m) => m.id === message.id
    );
    if (!exists) {
      messagesByChannel.value[channelId].push(message);
    }
  }

  /** Update an existing message (edit) */
  function updateMessage(message: MessageWithSender) {
    const channelMessages = messagesByChannel.value[message.channel_id];
    if (!channelMessages) return;

    const index = channelMessages.findIndex((m) => m.id === message.id);
    if (index !== -1) {
      channelMessages[index] = { ...channelMessages[index], ...message };
    }
  }

  /** Remove a message from the local store */
  function removeMessage(channelId: string, messageId: string) {
    const channelMessages = messagesByChannel.value[channelId];
    if (!channelMessages) return;

    messagesByChannel.value[channelId] = channelMessages.filter(
      (m) => m.id !== messageId
    );
  }

  /** Add a reaction to a message locally */
  function addReactionLocal(
    channelId: string,
    messageId: string,
    reaction: Reaction & { username?: string }
  ) {
    const channelMessages = messagesByChannel.value[channelId];
    if (!channelMessages) return;

    const msg = channelMessages.find((m) => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      const exists = msg.reactions.some(
        (r) => r.user_id === reaction.user_id && r.emoji === reaction.emoji
      );
      if (!exists) {
        msg.reactions.push(reaction);
      }
    }
  }

  /** Remove a reaction from a message locally */
  function removeReactionLocal(
    channelId: string,
    messageId: string,
    userId: string,
    emoji: string
  ) {
    const channelMessages = messagesByChannel.value[channelId];
    if (!channelMessages) return;

    const msg = channelMessages.find((m) => m.id === messageId);
    if (msg && msg.reactions) {
      msg.reactions = msg.reactions.filter(
        (r) => !(r.user_id === userId && r.emoji === emoji)
      );
    }
  }

  /** Clear messages for a channel */
  function clearChannel(channelId: string) {
    delete messagesByChannel.value[channelId];
    delete hasMoreByChannel.value[channelId];
  }

  return {
    messagesByChannel,
    hasMoreByChannel,
    isLoading,
    fetchMessages,
    setChannelMessages,
    loadOlderMessages,
    addMessage,
    updateMessage,
    removeMessage,
    addReactionLocal,
    removeReactionLocal,
    clearChannel,
  };
});
