<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AppLayout from '../components/layout/AppLayout.vue';
import MessageList from '../components/chat/MessageList.vue';
import MessageInput from '../components/chat/MessageInput.vue';
import TypingIndicator from '../components/chat/TypingIndicator.vue';
import ThreadPanel from '../components/chat/ThreadPanel.vue';
import { useSocket } from '../composables/useSocket';
import { useNotification } from '../composables/useNotification';
import { useMessageStore } from '../stores/message.store';
import type { MessageWithSender } from '../types';

const { connectAndJoinChannels, disconnectSocket } = useSocket();
const { init: initNotifications, requestPermission } = useNotification();
const messageStore = useMessageStore();

const editingMessage = ref<MessageWithSender | null>(null);
const replyToMessage = ref<MessageWithSender | null>(null);

onMounted(async () => {
  connectAndJoinChannels();
  initNotifications();
  await requestPermission();
});

onUnmounted(() => {
  disconnectSocket();
});

function handleOpenThread(message: MessageWithSender) {
  messageStore.fetchThread(message);
}

function handleEditMessage(message: MessageWithSender) {
  editingMessage.value = message;
}

function cancelEdit() {
  editingMessage.value = null;
}

function cancelReply() {
  replyToMessage.value = null;
}
</script>

<template>
  <AppLayout>
    <div class="flex h-full">
      <!-- Main chat area -->
      <div class="flex-1 flex flex-col min-w-0">
        <MessageList
          @open-thread="handleOpenThread"
          @edit-message="handleEditMessage"
        />
        <TypingIndicator />
        <MessageInput
          :editing-message="editingMessage"
          :reply-to="replyToMessage"
          @cancel-edit="cancelEdit"
          @cancel-reply="cancelReply"
          @message-sent="editingMessage = null; replyToMessage = null"
        />
      </div>

      <!-- Thread panel -->
      <ThreadPanel />
    </div>
  </AppLayout>
</template>
