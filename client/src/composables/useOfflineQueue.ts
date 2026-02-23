import { ref, watch } from 'vue';
import { useSocketStore } from '../stores/socket.store';

interface QueuedMessage {
  channelId: string;
  content: string;
  messageType: string;
  parentId?: string | null;
  timestamp: number;
}

const QUEUE_KEY = 'chat-web-offline-queue';

/** Composable for queueing messages when offline and sending when reconnected */
export function useOfflineQueue() {
  const queue = ref<QueuedMessage[]>(loadQueue());
  const socketStore = useSocketStore();

  function loadQueue(): QueuedMessage[] {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.value));
  }

  /** Add a message to the offline queue */
  function enqueue(message: Omit<QueuedMessage, 'timestamp'>) {
    queue.value.push({
      ...message,
      timestamp: Date.now(),
    });
    saveQueue();
  }

  /** Flush all queued messages to the server */
  function flush() {
    if (!socketStore.isConnected || queue.value.length === 0) return;

    const messages = [...queue.value];
    queue.value = [];
    saveQueue();

    for (const msg of messages) {
      socketStore.emit('send_message', {
        channelId: msg.channelId,
        content: msg.content,
        messageType: msg.messageType,
        parentId: msg.parentId,
      });
    }
  }

  /** Watch for connection status changes to auto-flush */
  watch(
    () => socketStore.isConnected,
    (connected) => {
      if (connected) {
        flush();
      }
    }
  );

  return {
    queue,
    enqueue,
    flush,
    queueSize: () => queue.value.length,
  };
}
