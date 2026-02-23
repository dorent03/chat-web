<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from '../../stores/auth.store';
import { useChannelStore } from '../../stores/channel.store';
import * as messageApi from '../../services/message.api';
import UserAvatar from '../user/UserAvatar.vue';
import type { MessageWithSender } from '../../types';

const props = defineProps<{
  message: MessageWithSender;
}>();

const emit = defineEmits<{
  (e: 'edit', message: MessageWithSender): void;
}>();

const authStore = useAuthStore();
const channelStore = useChannelStore();
const showActions = ref(false);
const showReactionPicker = ref(false);
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

const isOwnMessage = computed(() => props.message.sender_id === authStore.user?.id);

const groupedReactions = computed(() => {
  const grouped = new Map<string, { emoji: string; count: number; hasOwn: boolean }>();
  for (const reaction of props.message.reactions ?? []) {
    const current = grouped.get(reaction.emoji) ?? {
      emoji: reaction.emoji,
      count: 0,
      hasOwn: false,
    };
    current.count += 1;
    if (reaction.user_id === authStore.user?.id) {
      current.hasOwn = true;
    }
    grouped.set(reaction.emoji, current);
  }
  return Array.from(grouped.values());
});

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function handleReaction(emoji: string) {
  const channelId = channelStore.activeChannelId;
  if (!channelId) {
    return;
  }
  const hasOwnReaction = (props.message.reactions ?? []).some(
    (reaction) => reaction.user_id === authStore.user?.id && reaction.emoji === emoji
  );

  try {
    if (hasOwnReaction) {
      await messageApi.removeReaction(channelId, props.message.id, emoji);
    } else {
      await messageApi.addReaction(channelId, props.message.id, emoji);
    }
  } catch (error: unknown) {
    console.error('Failed to toggle reaction:', error);
  } finally {
    showReactionPicker.value = false;
  }
}

async function handleDelete() {
  const channelId = channelStore.activeChannelId;
  if (!channelId || !confirm('Delete this message?')) {
    return;
  }
  try {
    await messageApi.deleteMessage(channelId, props.message.id);
  } catch (error: unknown) {
    console.error('Failed to delete message:', error);
  }
}
</script>

<template>
  <div
    class="group flex gap-3 px-4 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800/50"
    @mouseenter="showActions = true"
    @mouseleave="showActions = false; showReactionPicker = false"
  >
    <UserAvatar
      :username="message.sender_username"
      :avatar-url="message.sender_avatar_url"
      :user-id="message.sender_id"
      :size="36"
      show-status
    />

    <div class="flex-1 min-w-0">
      <div class="flex items-baseline gap-2">
        <span class="font-semibold text-sm text-surface-900 dark:text-white">
          {{ message.sender_username }}
        </span>
        <span class="text-xs text-surface-400" :title="formatDate(message.created_at) + ' ' + formatTime(message.created_at)">
          {{ formatTime(message.created_at) }}
        </span>
        <span v-if="message.is_edited" class="text-xs text-surface-400 italic">
          (edited)
        </span>
      </div>

      <p class="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap break-words">
        {{ message.content }}
      </p>
      <div v-if="groupedReactions.length > 0" class="flex flex-wrap gap-1 mt-1.5">
        <button
          v-for="reaction in groupedReactions"
          :key="reaction.emoji"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors"
          :class="reaction.hasOwn
            ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
            : 'bg-surface-100 dark:bg-surface-700 border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400'"
          @click="handleReaction(reaction.emoji)"
        >
          <span>{{ reaction.emoji }}</span>
          <span>{{ reaction.count }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="showActions"
      class="flex items-center gap-0.5 shrink-0"
    >
      <button
        class="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-400"
        title="React"
        @click="showReactionPicker = !showReactionPicker"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <button
        v-if="isOwnMessage"
        class="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-400"
        title="Edit"
        @click="emit('edit', message)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      <button
        v-if="isOwnMessage"
        class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-surface-400 hover:text-red-500"
        title="Delete"
        @click="handleDelete"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Quick reaction picker -->
    <div
      v-if="showReactionPicker"
      class="absolute mt-8 right-4 bg-white dark:bg-surface-700 rounded-lg shadow-lg border border-surface-200 dark:border-surface-600 p-1 flex gap-0.5 z-50"
    >
      <button
        v-for="emoji in QUICK_REACTIONS"
        :key="emoji"
        class="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-100 dark:hover:bg-surface-600 text-lg"
        @click="handleReaction(emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>
