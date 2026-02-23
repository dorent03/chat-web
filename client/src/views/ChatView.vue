<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AppLayout from '../components/layout/AppLayout.vue';
import MessageList from '../components/chat/MessageList.vue';
import MessageInput from '../components/chat/MessageInput.vue';
import TypingIndicator from '../components/chat/TypingIndicator.vue';
import { useRealtimeStore } from '../stores/realtime.store';
import { useNotification } from '../composables/useNotification';
import type { MessageWithSender } from '../types';

const realtimeStore = useRealtimeStore();
const { init: initNotifications, requestPermission } = useNotification();
const editingMessage = ref<MessageWithSender | null>(null);

onMounted(async () => {
  realtimeStore.connect();
  initNotifications();
  await requestPermission();
});

onUnmounted(() => {
  realtimeStore.disconnect();
});

function handleEditMessage(message: MessageWithSender) {
  editingMessage.value = message;
}

function cancelEdit() {
  editingMessage.value = null;
}
</script>

<template>
  <AppLayout>
    <div class="flex h-full">
      <div class="flex-1 flex flex-col min-w-0">
        <MessageList @edit-message="handleEditMessage" />
        <TypingIndicator />
        <MessageInput
          :editing-message="editingMessage"
          @cancel-edit="cancelEdit"
          @message-sent="editingMessage = null"
        />
      </div>
    </div>
  </AppLayout>
</template>
