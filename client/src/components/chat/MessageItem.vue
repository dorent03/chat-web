<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth.store';
import { useSocket } from '../../composables/useSocket';
import { useMessageStore } from '../../stores/message.store';
import * as messageApi from '../../services/message.api';
import UserAvatar from '../user/UserAvatar.vue';
import type { MessageWithSender } from '../../types';

const props = defineProps<{
  message: MessageWithSender;
}>();

const emit = defineEmits<{
  (e: 'openThread', message: MessageWithSender): void;
  (e: 'edit', message: MessageWithSender): void;
}>();

const authStore = useAuthStore();
const messageStore = useMessageStore();
const { deleteMessage, addReaction, removeReaction } = useSocket();

const showActions = ref(false);
const showReactionPicker = ref(false);
const isVoting = ref(false);
const isPinning = ref(false);

const isOwnMessage = computed(() =>
  props.message.sender_id === authStore.user?.id
);

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

const isMentionedMessage = computed(() => {
  if (!authStore.user?.username) return false;
  return (props.message.mentions || []).includes(authStore.user.username);
});

const isPinned = computed(() => !!props.message.pinned);
const canPin = computed(() => !props.message.parent_id);

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function handleReaction(emoji: string) {
  const existingReaction = props.message.reactions?.find(
    (r) => r.emoji === emoji && r.user_id === authStore.user?.id
  );

  if (existingReaction) {
    removeReaction(props.message.id, emoji);
  } else {
    addReaction(props.message.id, emoji);
  }
  showReactionPicker.value = false;
}

function handleDelete() {
  if (confirm('Are you sure you want to delete this message?')) {
    deleteMessage(props.message.id);
  }
}

/** Group reactions by emoji with counts */
const groupedReactions = computed(() => {
  if (!props.message.reactions || props.message.reactions.length === 0) return [];

  const groups = new Map<string, { emoji: string; count: number; hasOwn: boolean }>();

  for (const reaction of props.message.reactions) {
    const existing = groups.get(reaction.emoji) || {
      emoji: reaction.emoji,
      count: 0,
      hasOwn: false,
    };
    existing.count++;
    if (reaction.user_id === authStore.user?.id) {
      existing.hasOwn = true;
    }
    groups.set(reaction.emoji, existing);
  }

  return Array.from(groups.values());
});

function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

const mentionParts = computed(() => {
  const content = props.message.content;
  const regex = /(@[a-zA-Z0-9_-]{3,50})/g;
  const parts: Array<{ text: string; mention: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index), mention: false });
    }
    parts.push({ text: match[0], mention: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), mention: false });
  }
  return parts.length ? parts : [{ text: content, mention: false }];
});

async function togglePin() {
  if (!canPin.value || isPinning.value) return;
  isPinning.value = true;
  try {
    const updated = isPinned.value
      ? await messageApi.unpinMessage(props.message.id)
      : await messageApi.pinMessage(props.message.id);
    messageStore.updateMessage(updated);
  } catch (err) {
    console.error('Failed to toggle pin:', err);
  } finally {
    isPinning.value = false;
  }
}

function pollTotalVotes(): number {
  if (!props.message.poll_data) return 0;
  return props.message.poll_data.options.reduce((sum, option) => sum + option.votes.length, 0);
}

function hasVoted(optionId: string): boolean {
  const userId = authStore.user?.id;
  if (!userId || !props.message.poll_data) return false;
  const option = props.message.poll_data.options.find((o) => o.id === optionId);
  return !!option?.votes.includes(userId);
}

async function votePoll(optionId: string) {
  if (isVoting.value) return;
  isVoting.value = true;
  try {
    const updated = await messageApi.votePoll(props.message.id, optionId);
    messageStore.updateMessage(updated);
  } catch (err) {
    console.error('Failed to vote in poll:', err);
  } finally {
    isVoting.value = false;
  }
}
</script>

<template>
  <div
    class="group flex gap-3 px-4 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800/50"
    :class="{ 'bg-primary-50/60 dark:bg-primary-900/20': isMentionedMessage }"
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
        <span
          v-if="message.pinned"
          class="text-xs text-amber-600 dark:text-amber-400"
          title="Pinned message"
        >
          📌 pinned
        </span>
      </div>

      <!-- Text content -->
      <p class="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap break-words">
        <span
          v-for="(part, idx) in mentionParts"
          :key="idx"
          :class="part.mention ? 'text-primary-700 dark:text-primary-300 font-medium' : ''"
        >
          {{ part.text }}
        </span>
      </p>

      <div
        v-if="message.message_type === 'poll' && message.poll_data"
        class="mt-2 p-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/40"
      >
        <div class="text-sm font-medium mb-2">📊 {{ message.poll_data.question }}</div>
        <div class="space-y-1">
          <button
            v-for="option in message.poll_data.options"
            :key="option.id"
            class="w-full text-left px-2 py-1 rounded border text-sm transition-colors"
            :class="hasVoted(option.id)
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-surface-200 dark:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700'"
            :disabled="isVoting"
            @click="votePoll(option.id)"
          >
            <span>{{ option.text }}</span>
            <span class="ml-2 text-xs text-surface-500">({{ option.votes.length }} votes)</span>
          </button>
        </div>
        <div class="text-xs text-surface-500 mt-1">
          {{ pollTotalVotes() }} total votes
        </div>
      </div>

      <!-- Attachments -->
      <div v-if="message.attachments && message.attachments.length > 0" class="mt-2 space-y-2">
        <div v-for="attachment in message.attachments" :key="attachment.id">
          <img
            v-if="isImageAttachment(attachment.mime_type)"
            :src="`/uploads/${attachment.filename}`"
            :alt="attachment.original_name"
            class="max-w-sm max-h-64 rounded-lg border border-surface-200 dark:border-surface-700"
            loading="lazy"
          />
          <a
            v-else
            :href="`/uploads/${attachment.filename}`"
            target="_blank"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-sm"
          >
            <svg class="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="text-surface-700 dark:text-surface-300">{{ attachment.original_name }}</span>
            <span class="text-xs text-surface-400">({{ Math.round(attachment.file_size / 1024) }}KB)</span>
          </a>
        </div>
      </div>

      <!-- Reactions -->
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

      <!-- Thread indicator -->
      <button
        v-if="!message.parent_id && (message.reply_count || 0) > 0"
        class="mt-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
        @click="emit('openThread', message)"
      >
        {{ message.reply_count }} {{ message.reply_count === 1 ? 'reply' : 'replies' }}
      </button>
    </div>

    <!-- Action buttons (appear on hover) -->
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
        v-if="!message.parent_id"
        class="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-400"
        title="Reply in thread"
        @click="emit('openThread', message)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>

      <button
        v-if="canPin"
        class="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-400"
        :title="isPinned ? 'Unpin message' : 'Pin message'"
        @click="togglePin"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7V4a1 1 0 00-1-1H9a1 1 0 00-1 1v3L6 9v2h12V9l-2-2zM9 11v9l3-2 3 2v-9" />
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
