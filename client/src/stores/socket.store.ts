import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';
import { useMessageStore } from './message.store';
import { useChannelStore } from './channel.store';
import { useUserStore } from './user.store';
import type {
  MessageWithSender,
  TypingEvent,
  PresenceEvent,
  ReadReceiptEvent,
  ChannelWithMeta,
} from '../types';

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);

  /** Connect to the Socket.io server */
  function connect() {
    const authStore = useAuthStore();

    if (socket.value?.connected) return;

    /** In dev with VITE_API_BASE_URL, connect socket directly to backend */
    const socketUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    socket.value = io(socketUrl, {
      auth: {
        token: authStore.accessToken,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.value.on('connect', () => {
      isConnected.value = true;

      /* Re-join all channel rooms on reconnect */
      const channelStore = useChannelStore();
      for (const channel of channelStore.channels) {
        socket.value?.emit('join_channel', channel.id);
      }
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
    });

    /* Message events */
    socket.value.on('new_message', (message: MessageWithSender) => {
      const messageStore = useMessageStore();
      const channelStore = useChannelStore();
      const authStore = useAuthStore();

      messageStore.addMessage(message.channel_id, message);

      /* Increment unread if not the active channel and not sent by self */
      if (
        message.channel_id !== channelStore.activeChannelId &&
        message.sender_id !== authStore.user?.id
      ) {
        channelStore.incrementUnread(message.channel_id);
      }

      /* If it's a thread reply and the thread panel is open */
      if (message.parent_id && messageStore.threadParent?.id === message.parent_id) {
        messageStore.addThreadMessage(message);
      }
    });

    socket.value.on('message_edited', (message: MessageWithSender) => {
      const messageStore = useMessageStore();
      messageStore.updateMessage(message);
    });

    socket.value.on(
      'message_deleted',
      (data: { messageId: string; channelId: string }) => {
        const messageStore = useMessageStore();
        messageStore.removeMessage(data.channelId, data.messageId);
      }
    );

    /* Reaction events */
    socket.value.on('reaction_added', (reaction: { message_id: string; user_id: string; emoji: string; username: string }) => {
      const messageStore = useMessageStore();
      const channelStore = useChannelStore();
      if (channelStore.activeChannelId) {
        messageStore.addReactionLocal(
          channelStore.activeChannelId,
          reaction.message_id,
          { id: '', ...reaction }
        );
      }
    });

    socket.value.on('reaction_removed', (data: { messageId: string; userId: string; emoji: string }) => {
      const messageStore = useMessageStore();
      const channelStore = useChannelStore();
      if (channelStore.activeChannelId) {
        messageStore.removeReactionLocal(
          channelStore.activeChannelId,
          data.messageId,
          data.userId,
          data.emoji
        );
      }
    });

    /* Typing events */
    socket.value.on('typing_start', (data: TypingEvent) => {
      const userStore = useUserStore();
      userStore.addTypingUser(data.channelId, data.userId, data.username);
    });

    socket.value.on('typing_stop', (data: TypingEvent) => {
      const userStore = useUserStore();
      userStore.removeTypingUser(data.channelId, data.userId);
    });

    /* Presence events */
    socket.value.on('user_online', (data: PresenceEvent) => {
      const userStore = useUserStore();
      userStore.setOnlineStatus(data.userId, 'online');
    });

    socket.value.on('user_offline', (data: PresenceEvent) => {
      const userStore = useUserStore();
      userStore.setOnlineStatus(data.userId, 'offline');
    });

    socket.value.on('online_users', (userIds: string[]) => {
      const userStore = useUserStore();
      userStore.setOnlineUsers(userIds);
    });

    socket.value.on('channel_created', (channel: ChannelWithMeta) => {
      const channelStore = useChannelStore();
      channelStore.upsertPublicChannel(channel);
    });

    socket.value.on('channel_invited', async () => {
      const channelStore = useChannelStore();
      await channelStore.fetchMyChannels();
      await channelStore.fetchPublicChannels();
    });

    /* Read receipt events */
    socket.value.on('read_receipt', (_data: ReadReceiptEvent) => {
      /* Can be extended to show read indicators in the UI */
    });

    socket.value.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message);
    });
  }

  /** Disconnect from the Socket.io server */
  function disconnect() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
      isConnected.value = false;
    }
  }

  /** Emit a socket event */
  function emit(event: string, data?: unknown) {
    if (socket.value?.connected) {
      socket.value.emit(event, data);
    }
  }

  /** Join a channel room */
  function joinChannel(channelId: string) {
    emit('join_channel', channelId);
  }

  /** Leave a channel room */
  function leaveChannel(channelId: string) {
    emit('leave_channel', channelId);
  }

  /** Start typing indicator */
  function startTyping(channelId: string) {
    emit('typing_start', { channelId });
  }

  /** Stop typing indicator */
  function stopTyping(channelId: string) {
    emit('typing_stop', { channelId });
  }

  /** Send a read receipt */
  function sendReadReceipt(channelId: string, messageId: string) {
    emit('read_receipt', { channelId, messageId });
  }

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping,
    sendReadReceipt,
  };
});
