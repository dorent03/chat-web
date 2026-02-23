<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useMessageStore } from '../../stores/message.store';
import { useChannelStore } from '../../stores/channel.store';
import * as messageApi from '../../services/message.api';
import MessageItem from './MessageItem.vue';
import UserAvatar from '../user/UserAvatar.vue';

const messageStore = useMessageStore();
const channelStore = useChannelStore();

const replyContent = ref('');
const isSending = ref(false);
const listRef = ref<HTMLElement | null>(null);

const isOpen = computed(() => !!messageStore.threadParent);

function close() {
  messageStore.closeThread();
}

async function sendReply() {
  if (!replyContent.value.trim()) return;
  if (!messageStore.threadParent || !channelStore.activeChannelId) return;

  isSending.value = true;
  try {
    await messageApi.sendMessage(channelStore.activeChannelId, {
      content: replyContent.value.trim(),
      parent_id: messageStore.threadParent.id,
    });
    replyContent.value = '';

    /* Scroll to bottom of thread */
    nextTick(() => {
      if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight;
      }
    });
  } finally {
    isSending.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendReply();
  }
}

/* Scroll to bottom when new messages arrive */
watch(
  () => messageStore.threadMessages.length,
  () => {
    nextTick(() => {
      if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight;
      }
    });
  }
);
</script>

<template>
  <div
    v-if="isOpen"
    class="w-80 flex flex-col border-l border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800"
  >
    <!-- Thread header -->
    <div class="h-14 flex items-center justify-between px-4 border-b border-surface-200 dark:border-surface-700">
      <h3 class="font-semibold text-surface-900 dark:text-white">Thread</h3>
      <button
        class="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
        @click="close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Parent message -->
    <div v-if="messageStore.threadParent" class="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
      <div class="flex gap-3 px-4 py-3">
        <UserAvatar
          :username="messageStore.threadParent.sender_username"
          :avatar-url="messageStore.threadParent.sender_avatar_url"
          :size="32"
        />
        <div class="min-w-0">
          <span class="font-semibold text-sm text-surface-900 dark:text-white">
            {{ messageStore.threadParent.sender_username }}
          </span>
          <p class="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap break-words">
            {{ messageStore.threadParent.content }}
          </p>
        </div>
      </div>
      <div class="px-4 pb-2 text-xs text-surface-500">
        {{ messageStore.threadMessages.length }} {{ messageStore.threadMessages.length === 1 ? 'reply' : 'replies' }}
      </div>
    </div>

    <!-- Thread replies -->
    <div ref="listRef" class="flex-1 overflow-y-auto">
      <div v-if="messageStore.isLoading" class="py-4 text-center text-sm text-surface-500">
        Loading thread...
      </div>

      <div v-else-if="messageStore.threadMessages.length === 0" class="py-4 text-center text-sm text-surface-500">
        No replies yet
      </div>

      <template v-else>
        <MessageItem
          v-for="msg in messageStore.threadMessages"
          :key="msg.id"
          :message="msg"
          @open-thread="() => {}"
          @edit="() => {}"
        />
      </template>
    </div>

    <!-- Reply input -->
    <div class="border-t border-surface-200 dark:border-surface-700 p-3">
      <div class="flex items-end gap-2">
        <textarea
          v-model="replyContent"
          placeholder="Reply..."
          class="flex-1 resize-none rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows="1"
          @keydown="handleKeydown"
        />
        <button
          class="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          :disabled="!replyContent.trim() || isSending"
          @click="sendReply"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
