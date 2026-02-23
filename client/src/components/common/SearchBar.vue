<script setup lang="ts">
import { ref } from 'vue';
import { useChannelStore } from '../../stores/channel.store';
import * as messageApi from '../../services/message.api';
import type { MessageWithSender } from '../../types';

const channelStore = useChannelStore();
const query = ref('');
const results = ref<MessageWithSender[]>([]);
const isOpen = ref(false);
const isSearching = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function handleInput() {
  if (debounceTimer) clearTimeout(debounceTimer);

  if (query.value.length < 2) {
    results.value = [];
    isOpen.value = false;
    return;
  }

  debounceTimer = setTimeout(async () => {
    if (!channelStore.activeChannelId || query.value.length < 2) return;

    isSearching.value = true;
    try {
      results.value = await messageApi.searchMessages(
        channelStore.activeChannelId,
        query.value
      );
      isOpen.value = true;
    } finally {
      isSearching.value = false;
    }
  }, 300);
}

function close() {
  isOpen.value = false;
  query.value = '';
  results.value = [];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <div class="relative">
    <div class="relative">
      <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="query"
        type="text"
        placeholder="Search messages..."
        class="w-48 pl-9 pr-3 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        @input="handleInput"
        @blur="() => setTimeout(close, 200)"
      />
    </div>

    <!-- Search results dropdown -->
    <div
      v-if="isOpen && results.length > 0"
      class="absolute top-full mt-1 right-0 w-80 max-h-64 overflow-y-auto card shadow-lg z-50"
    >
      <div
        v-for="msg in results"
        :key="msg.id"
        class="p-3 border-b border-surface-100 dark:border-surface-700 last:border-0 hover:bg-surface-50 dark:hover:bg-surface-700/50 cursor-pointer"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium text-surface-900 dark:text-white">
            {{ msg.sender_username }}
          </span>
          <span class="text-xs text-surface-400">
            {{ formatDate(msg.created_at) }}
          </span>
        </div>
        <p class="text-sm text-surface-600 dark:text-surface-300 line-clamp-2">
          {{ msg.content }}
        </p>
      </div>
    </div>

    <div
      v-if="isOpen && results.length === 0 && !isSearching"
      class="absolute top-full mt-1 right-0 w-80 card shadow-lg z-50 p-4 text-center text-sm text-surface-500"
    >
      No messages found
    </div>
  </div>
</template>
