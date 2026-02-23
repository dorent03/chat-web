<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '../../stores/user.store';
import { useChannelStore } from '../../stores/channel.store';

const userStore = useUserStore();
const channelStore = useChannelStore();

const typingUsernames = computed(() => {
  if (!channelStore.activeChannelId) return [];
  return userStore.getTypingUsers(channelStore.activeChannelId);
});

const typingText = computed(() => {
  const names = typingUsernames.value;
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is typing...`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
  return `${names[0]} and ${names.length - 1} others are typing...`;
});
</script>

<template>
  <div
    v-if="typingUsernames.length > 0"
    class="px-4 py-1 text-xs text-surface-500 dark:text-surface-400 flex items-center gap-1"
  >
    <span class="inline-flex gap-0.5">
      <span class="w-1 h-1 rounded-full bg-surface-400 animate-bounce" style="animation-delay: 0ms" />
      <span class="w-1 h-1 rounded-full bg-surface-400 animate-bounce" style="animation-delay: 150ms" />
      <span class="w-1 h-1 rounded-full bg-surface-400 animate-bounce" style="animation-delay: 300ms" />
    </span>
    <span>{{ typingText }}</span>
  </div>
</template>
