<script setup lang="ts">
import { ref, watch } from 'vue';
import { useChannelStore } from '../../stores/channel.store';
import { useSocketStore } from '../../stores/socket.store';
import { useMessageStore } from '../../stores/message.store';
import { useOfflineQueue } from '../../composables/useOfflineQueue';
import * as messageApi from '../../services/message.api';
import EmojiPicker from '../common/EmojiPicker.vue';
import FileUpload from '../common/FileUpload.vue';
import type { MessageWithSender } from '../../types';

const props = defineProps<{
  editingMessage?: MessageWithSender | null;
  replyTo?: MessageWithSender | null;
}>();

const emit = defineEmits<{
  (e: 'cancelEdit'): void;
  (e: 'cancelReply'): void;
  (e: 'messageSent'): void;
}>();

const channelStore = useChannelStore();
const socketStore = useSocketStore();
const messageStore = useMessageStore();
const { enqueue } = useOfflineQueue();

const content = ref('');
const selectedFiles = ref<File[]>([]);
const isSending = ref(false);
const fileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null);
const isPollMode = ref(false);
const pollQuestion = ref('');
const pollOptions = ref(['', '']);

let typingTimer: ReturnType<typeof setTimeout> | null = null;

/* Populate content when editing */
watch(() => props.editingMessage, (msg) => {
  if (msg) {
    content.value = msg.content;
  }
});

function handleInput() {
  /* Send typing indicator (debounced) */
  if (!channelStore.activeChannelId) return;

  socketStore.startTyping(channelStore.activeChannelId);

  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    if (channelStore.activeChannelId) {
      socketStore.stopTyping(channelStore.activeChannelId);
    }
  }, 2000);
}

async function handleSubmit() {
  if (!content.value.trim() && selectedFiles.value.length === 0 && !isPollMode.value) return;
  if (!channelStore.activeChannelId) return;

  /* Stop typing */
  if (typingTimer) {
    clearTimeout(typingTimer);
    socketStore.stopTyping(channelStore.activeChannelId);
  }

  isSending.value = true;

  try {
    if (props.editingMessage) {
      /* Edit existing message */
      await messageApi.editMessage(props.editingMessage.id, content.value.trim());
      emit('cancelEdit');
    } else {
      /* Send new message */
      if (!socketStore.isConnected && selectedFiles.value.length === 0) {
        /* Queue for offline sending */
        enqueue({
          channelId: channelStore.activeChannelId,
          content: content.value.trim(),
          messageType: 'text',
          parentId: props.replyTo?.id,
        });
      } else {
        const messageType = isPollMode.value
          ? 'poll'
          : selectedFiles.value.length > 0
            ? 'file'
            : 'text';
        const normalizedPollOptions = pollOptions.value
          .map((opt) => opt.trim())
          .filter((opt) => opt.length > 0)
          .map((text, idx) => ({
            id: `opt_${Date.now()}_${idx}`,
            text,
            votes: [] as string[],
          }));
        const pollData = isPollMode.value
          ? {
              question: pollQuestion.value.trim() || content.value.trim(),
              options: normalizedPollOptions,
              multiple: false,
            }
          : null;
        if (isPollMode.value && (pollData.options.length < 2 || !pollData.question)) {
          throw new Error('Poll requires a question and at least 2 options');
        }
        const message = await messageApi.sendMessage(channelStore.activeChannelId, {
          content: isPollMode.value ? pollData.question : content.value.trim(),
          message_type: messageType,
          parent_id: props.replyTo?.id,
          files: selectedFiles.value.length > 0 ? selectedFiles.value : undefined,
          poll_data: pollData,
        });
        messageStore.addMessage(channelStore.activeChannelId, message);
      }

      if (props.replyTo) {
        emit('cancelReply');
      }
    }

    content.value = '';
    selectedFiles.value = [];
    isPollMode.value = false;
    pollQuestion.value = '';
    pollOptions.value = ['', ''];
    emit('messageSent');
  } catch (err) {
    console.error('Failed to send message:', err);
  } finally {
    isSending.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  /* Submit on Enter, newline on Shift+Enter */
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
}

function handleEmojiSelect(emoji: string) {
  content.value += emoji;
}

function handleFileSelect(files: File[]) {
  selectedFiles.value = files;
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1);
}

function cancelEdit() {
  content.value = '';
  emit('cancelEdit');
}

function cancelReply() {
  emit('cancelReply');
}

function togglePollMode() {
  isPollMode.value = !isPollMode.value;
  if (!isPollMode.value) {
    pollQuestion.value = '';
    pollOptions.value = ['', ''];
  }
}

function addPollOption() {
  if (pollOptions.value.length >= 8) return;
  pollOptions.value.push('');
}

function removePollOption(index: number) {
  if (pollOptions.value.length <= 2) return;
  pollOptions.value.splice(index, 1);
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

    <div
      v-if="replyTo"
      class="flex items-center justify-between px-4 py-2 bg-surface-50 dark:bg-surface-700/50 text-sm"
    >
      <span class="text-surface-600 dark:text-surface-400">
        Replying to <strong>{{ replyTo.sender_username }}</strong>
      </span>
      <button class="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300" @click="cancelReply">
        Cancel
      </button>
    </div>

    <!-- File preview -->
    <div v-if="selectedFiles.length > 0" class="flex gap-2 px-4 pt-2">
      <div
        v-for="(file, index) in selectedFiles"
        :key="index"
        class="flex items-center gap-2 px-2 py-1 rounded bg-surface-100 dark:bg-surface-700 text-sm"
      >
        <span class="truncate max-w-[120px]">{{ file.name }}</span>
        <button class="text-surface-400 hover:text-red-500" @click="removeFile(index)">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="isPollMode" class="px-4 pb-2 space-y-2">
      <input
        v-model="pollQuestion"
        type="text"
        class="input-field"
        placeholder="Poll question"
      />
      <div
        v-for="(_option, index) in pollOptions"
        :key="index"
        class="flex gap-2"
      >
        <input
          v-model="pollOptions[index]"
          type="text"
          class="input-field"
          :placeholder="`Option ${index + 1}`"
        />
        <button
          class="px-2 text-xs rounded bg-surface-200 dark:bg-surface-700"
          :disabled="pollOptions.length <= 2"
          @click="removePollOption(index)"
        >
          Remove
        </button>
      </div>
      <button
        class="px-3 py-1 text-xs rounded bg-surface-100 dark:bg-surface-700"
        :disabled="pollOptions.length >= 8"
        @click="addPollOption"
      >
        Add Option
      </button>
    </div>

    <!-- Input area -->
    <div class="flex items-end gap-2 p-3">
      <FileUpload ref="fileUploadRef" @select="handleFileSelect" />

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
        class="p-2 rounded-lg border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
        :class="{ 'bg-primary-100 dark:bg-primary-900/30 border-primary-400': isPollMode }"
        :disabled="!!props.editingMessage"
        title="Create poll"
        @click="togglePollMode"
      >
        <span class="text-xs font-semibold">Poll</span>
      </button>

      <button
        class="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :disabled="((!content.trim() && selectedFiles.length === 0 && !isPollMode) || isSending || !channelStore.activeChannelId)"
        @click="handleSubmit"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
</template>
