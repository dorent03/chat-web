<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import { useChannelStore } from '../../stores/channel.store';
import { useMessageStore } from '../../stores/message.store';
import MessageItem from './MessageItem.vue';
import type { MessageWithSender } from '../../types';

const emit = defineEmits<{
  (e: 'editMessage', message: MessageWithSender): void;
}>();

const channelStore = useChannelStore();
const messageStore = useMessageStore();

const listRef = ref<HTMLElement | null>(null);
const isLoadingMore = ref(false);

const messages = computed(() => {
  if (!channelStore.activeChannelId) return [];
  return messageStore.messagesByChannel[channelStore.activeChannelId] || [];
});

const hasMore = computed(() => {
  if (!channelStore.activeChannelId) return false;
  return messageStore.hasMoreByChannel[channelStore.activeChannelId] || false;
});

/** Scroll to bottom of the message list */
function scrollToBottom() {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight;
    }
  });
}

/** Load older messages when scrolling to top */
async function handleScroll() {
  if (!listRef.value || isLoadingMore.value || !hasMore.value) return;

  if (listRef.value.scrollTop < 100) {
    const channelId = channelStore.activeChannelId;
    if (!channelId) return;

    isLoadingMore.value = true;
    const prevHeight = listRef.value.scrollHeight;

    try {
      await messageStore.loadOlderMessages(channelId);

      /* Maintain scroll position after prepending messages */
      nextTick(() => {
        if (listRef.value) {
          listRef.value.scrollTop = listRef.value.scrollHeight - prevHeight;
        }
      });
    } finally {
      isLoadingMore.value = false;
    }
  }
}

/* Scroll to bottom when active channel changes */
watch(() => channelStore.activeChannelId, () => {
  scrollToBottom();
});

/* Scroll to bottom when new messages arrive (if already near bottom) */
watch(() => messages.value.length, () => {
  if (!listRef.value) {
    scrollToBottom();
    return;
  }

  const { scrollTop, scrollHeight, clientHeight } = listRef.value;
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

  if (isNearBottom) {
    scrollToBottom();
  }
});

onMounted(() => {
  scrollToBottom();
});

/** Group messages by date for date separators */
function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function shouldShowDateSeparator(index: number): boolean {
  if (index === 0) return true;
  const currentDate = new Date(messages.value[index].created_at).toDateString();
  const prevDate = new Date(messages.value[index - 1].created_at).toDateString();
  return currentDate !== prevDate;
}
</script>

<template>
  <div
    ref="listRef"
    class="flex-1 overflow-y-auto"
    @scroll="handleScroll"
  >
    <!-- Loading more indicator -->
    <div v-if="isLoadingMore" class="py-3 text-center">
      <span class="text-sm text-surface-500">Loading older messages...</span>
    </div>

    <div v-if="!channelStore.activeChannelId" class="flex items-center justify-center h-full text-surface-500">
      Select a channel to start chatting
    </div>

    <div v-else-if="messageStore.isLoading && messages.length === 0" class="flex items-center justify-center h-full text-surface-500">
      Loading messages...
    </div>

    <div v-else-if="messages.length === 0" class="flex items-center justify-center h-full text-surface-500">
      <div class="text-center">
        <p class="text-lg font-medium">No messages yet</p>
        <p class="text-sm mt-1">Be the first to send a message!</p>
      </div>
    </div>

    <template v-else>
      <div v-for="(message, index) in messages" :key="message.id">
        <!-- Date separator -->
        <div
          v-if="shouldShowDateSeparator(index)"
          class="flex items-center gap-4 px-4 py-2"
        >
          <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
          <span class="text-xs font-medium text-surface-500">
            {{ getDateLabel(message.created_at) }}
          </span>
          <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
        </div>

        <MessageItem
          :message="message"
          @edit="emit('editMessage', $event)"
        />
      </div>
    </template>
  </div>
</template>
