import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as messageApi from '../services/message.api';
import type { MessageWithSender, Reaction } from '../types';

export const useMessageStore = defineStore('message', () => {
  /** Messages keyed by channel ID */
  const messagesByChannel = ref<Record<string, MessageWithSender[]>>({});
  const pinnedByChannel = ref<Record<string, MessageWithSender[]>>({});
  const hasMoreByChannel = ref<Record<string, boolean>>({});
  const threadMessages = ref<MessageWithSender[]>([]);
  const threadParent = ref<MessageWithSender | null>(null);
  const hasMoreThread = ref(false);
  const isLoading = ref(false);

  /** Fetch initial messages for a channel */
  async function fetchMessages(channelId: string) {
    isLoading.value = true;
    try {
      const result = await messageApi.getMessages(channelId, { limit: 50 });
      /* Messages come newest-first from API; reverse for display oldest-first */
      messagesByChannel.value[channelId] = result.data.reverse();
      hasMoreByChannel.value[channelId] = result.hasMore;
    } finally {
      isLoading.value = false;
    }
  }

  /** Fetch pinned messages for a channel */
  async function fetchPinnedMessages(channelId: string) {
    pinnedByChannel.value[channelId] = await messageApi.getPinnedMessages(channelId);
  }

  /** Load older messages (infinite scroll) */
  async function loadOlderMessages(channelId: string) {
    const existing = messagesByChannel.value[channelId];
    if (!existing || existing.length === 0) return;

    const oldestMessage = existing[0];
    const result = await messageApi.getMessages(channelId, {
      limit: 50,
      before: oldestMessage.id,
    });

    messagesByChannel.value[channelId] = [
      ...result.data.reverse(),
      ...existing,
    ];
    hasMoreByChannel.value[channelId] = result.hasMore;
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
      if (message.pinned) {
        if (!pinnedByChannel.value[channelId]) pinnedByChannel.value[channelId] = [];
        const pinnedExists = pinnedByChannel.value[channelId].some((m) => m.id === message.id);
        if (!pinnedExists) pinnedByChannel.value[channelId].unshift(message);
      }
    }
  }

  /** Update an existing message (edit) */
  function updateMessage(message: MessageWithSender) {
    const channelMessages = messagesByChannel.value[message.channel_id];
    if (!channelMessages) return;

    const index = channelMessages.findIndex((m) => m.id === message.id);
    if (index !== -1) {
      channelMessages[index] = { ...channelMessages[index], ...message };
      const channelId = message.channel_id;
      if (!pinnedByChannel.value[channelId]) pinnedByChannel.value[channelId] = [];
      const pinnedIndex = pinnedByChannel.value[channelId].findIndex((m) => m.id === message.id);
      const isPinnedNow = !!message.pinned;
      if (isPinnedNow && pinnedIndex === -1) {
        pinnedByChannel.value[channelId].unshift(channelMessages[index]);
      } else if (!isPinnedNow && pinnedIndex !== -1) {
        pinnedByChannel.value[channelId].splice(pinnedIndex, 1);
      } else if (isPinnedNow && pinnedIndex !== -1) {
        pinnedByChannel.value[channelId][pinnedIndex] = {
          ...pinnedByChannel.value[channelId][pinnedIndex],
          ...message,
        };
      }
    }
  }

  /** Remove a message from the local store */
  function removeMessage(channelId: string, messageId: string) {
    const channelMessages = messagesByChannel.value[channelId];
    if (!channelMessages) return;

    messagesByChannel.value[channelId] = channelMessages.filter(
      (m) => m.id !== messageId
    );
    if (pinnedByChannel.value[channelId]) {
      pinnedByChannel.value[channelId] = pinnedByChannel.value[channelId].filter(
        (m) => m.id !== messageId
      );
    }
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

  /** Fetch thread messages for a parent message */
  async function fetchThread(parentMessage: MessageWithSender) {
    threadParent.value = parentMessage;
    isLoading.value = true;
    try {
      const result = await messageApi.getThread(parentMessage.id, { limit: 50 });
      threadMessages.value = result.data;
      hasMoreThread.value = result.hasMore;
    } finally {
      isLoading.value = false;
    }
  }

  /** Close the thread panel */
  function closeThread() {
    threadParent.value = null;
    threadMessages.value = [];
    hasMoreThread.value = false;
  }

  /** Add a thread reply */
  function addThreadMessage(message: MessageWithSender) {
    const exists = threadMessages.value.some((m) => m.id === message.id);
    if (!exists) {
      threadMessages.value.push(message);
    }

    /* Update reply_count on the parent in the channel list */
    if (threadParent.value) {
      const channelMessages = messagesByChannel.value[message.channel_id];
      if (channelMessages) {
        const parent = channelMessages.find((m) => m.id === threadParent.value!.id);
        if (parent) {
          parent.reply_count = (parent.reply_count || 0) + 1;
        }
      }
    }
  }

  /** Clear messages for a channel */
  function clearChannel(channelId: string) {
    delete messagesByChannel.value[channelId];
    delete hasMoreByChannel.value[channelId];
    delete pinnedByChannel.value[channelId];
  }

  return {
    messagesByChannel,
    pinnedByChannel,
    hasMoreByChannel,
    threadMessages,
    threadParent,
    hasMoreThread,
    isLoading,
    fetchMessages,
    fetchPinnedMessages,
    loadOlderMessages,
    addMessage,
    updateMessage,
    removeMessage,
    addReactionLocal,
    removeReactionLocal,
    fetchThread,
    closeThread,
    addThreadMessage,
    clearChannel,
  };
});
