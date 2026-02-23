<script setup lang="ts">
import { ref, watch } from 'vue';
import { useChannelStore } from '../../stores/channel.store';
import { useRealtimeStore } from '../../stores/realtime.store';
import * as messageApi from '../../services/message.api';
import EmojiPicker from '../common/EmojiPicker.vue';
import type { MessageWithSender } from '../../types';

const props = defineProps<{
  editingMessage?: MessageWithSender | null;
}>();

const emit = defineEmits<{
  (e: 'cancelEdit'): void;
  (e: 'messageSent'): void;
}>();

const channelStore = useChannelStore();
const realtimeStore = useRealtimeStore();
const content = ref('');
const isSending = ref(false);
let typingTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.editingMessage,
  (message) => {
    content.value = message?.content ?? '';
  }
);

function handleInput() {
  if (!channelStore.activeChannelId) {
    return;
  }

  realtimeStore.startTyping(channelStore.activeChannelId).catch((error: unknown) => {
    console.error('Failed to set typing status:', error);
  });

  if (typingTimer) {
    clearTimeout(typingTimer);
  }

  typingTimer = setTimeout(() => {
    if (!channelStore.activeChannelId) {
      return;
    }
    realtimeStore.stopTyping(channelStore.activeChannelId).catch((error: unknown) => {
      console.error('Failed to clear typing status:', error);
    });
  }, 1500);
}

async function handleSubmit() {
  if (!channelStore.activeChannelId || !content.value.trim()) {
    return;
  }

  isSending.value = true;
  try {
    if (props.editingMessage) {
      await messageApi.editMessage(
        channelStore.activeChannelId,
        props.editingMessage.id,
        content.value
      );
      emit('cancelEdit');
    } else {
      await messageApi.sendMessage(channelStore.activeChannelId, {
        content: content.value,
      });
    }

    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
    await realtimeStore.stopTyping(channelStore.activeChannelId);
    content.value = '';
    emit('messageSent');
  } catch (error: unknown) {
    console.error('Failed to submit message:', error);
  } finally {
    isSending.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
}

function handleEmojiSelect(emoji: string) {
  content.value += emoji;
}

function cancelEdit() {
  content.value = '';
  emit('cancelEdit');
}
</script>

<template>
  <div class="border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
    <!-- Edit/Reply indicator -->
    <div
      v-if="editingMessage"
      class="flex items-center justify-between px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-sm"
    >
      <span class="text-primary-700 dark:text-primary-300">
        Editing message
      </span>
      <button class="text-primary-600 hover:text-primary-800 dark:hover:text-primary-200" @click="cancelEdit">
        Cancel
      </button>
    </div>

    <!-- Input area -->
    <div class="flex items-end gap-2 p-3">
      <div class="flex-1">
        <textarea
          v-model="content"
          :placeholder="editingMessage ? 'Edit message...' : `Message #${channelStore.activeChannel?.name || 'channel'}...`"
          class="w-full resize-none rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          rows="1"
          :disabled="!channelStore.activeChannelId"
          @input="handleInput"
          @keydown="handleKeydown"
        />
      </div>

      <EmojiPicker @select="handleEmojiSelect" />

      <button
        class="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :disabled="(!content.trim() || isSending || !channelStore.activeChannelId)"
        @click="handleSubmit"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
</template>
