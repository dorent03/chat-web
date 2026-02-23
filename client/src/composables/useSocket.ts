import { useSocketStore } from '../stores/socket.store';
import { useChannelStore } from '../stores/channel.store';
import { useAuthStore } from '../stores/auth.store';

/** Composable for high-level socket operations in components */
export function useSocket() {
  const socketStore = useSocketStore();
  const channelStore = useChannelStore();
  const authStore = useAuthStore();

  /** Connect and join all user channels */
  function connectAndJoinChannels() {
    if (!authStore.isAuthenticated) return;

    socketStore.connect();

    /* Channels are joined on 'connect' event in socket store */
  }

  /** Send a message via socket (real-time) */
  function sendMessage(data: {
    channelId: string;
    content: string;
    messageType?: string;
    parentId?: string | null;
  }) {
    socketStore.emit('send_message', {
      channelId: data.channelId,
      content: data.content,
      messageType: data.messageType || 'text',
      parentId: data.parentId,
    });
  }

  /** Edit a message via socket */
  function editMessage(messageId: string, content: string) {
    socketStore.emit('edit_message', { messageId, content });
  }

  /** Delete a message via socket */
  function deleteMessage(messageId: string) {
    socketStore.emit('delete_message', { messageId });
  }

  /** Toggle a reaction via socket */
  function addReaction(messageId: string, emoji: string) {
    socketStore.emit('add_reaction', { messageId, emoji });
  }

  /** Remove a reaction via socket */
  function removeReaction(messageId: string, emoji: string) {
    socketStore.emit('remove_reaction', { messageId, emoji });
  }

  /** Mark a channel as read */
  function markAsRead(channelId: string, lastMessageId: string) {
    socketStore.sendReadReceipt(channelId, lastMessageId);
    channelStore.clearUnread(channelId);
  }

  /** Disconnect and cleanup */
  function disconnectSocket() {
    socketStore.disconnect();
  }

  return {
    isConnected: socketStore.isConnected,
    connectAndJoinChannels,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
    startTyping: socketStore.startTyping,
    stopTyping: socketStore.stopTyping,
    disconnectSocket,
  };
}
