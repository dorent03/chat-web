<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useChannelStore } from '../../stores/channel.store';
import { useSocketStore } from '../../stores/socket.store';
import { useMessageStore } from '../../stores/message.store';

const channelStore = useChannelStore();
const socketStore = useSocketStore();
const messageStore = useMessageStore();

onMounted(async () => {
  await Promise.all([
    channelStore.fetchMyChannels(),
    channelStore.fetchPublicChannels(),
  ]);
});

const privateAndDirectChannels = computed(() =>
  channelStore.channels.filter((channel) => channel.type !== 'public')
);

async function selectChannel(channelId: string) {
  /* Leave previous channel room */
  if (channelStore.activeChannelId) {
    socketStore.leaveChannel(channelStore.activeChannelId);
  }

  channelStore.setActiveChannel(channelId);

  /* Join new channel room */
  socketStore.joinChannel(channelId);

  /* Fetch messages */
  await messageStore.fetchMessages(channelId);
  await messageStore.fetchPinnedMessages(channelId);

  /* Clear unread */
  channelStore.clearUnread(channelId);

  /* Close thread panel */
  messageStore.closeThread();
}

function getChannelIcon(type: string): string {
  switch (type) {
    case 'private': return '🔒';
    case 'direct': return '💬';
    default: return '#';
  }
}

async function joinPublicChannel(channelId: string) {
  await channelStore.joinChannel(channelId);
  await selectChannel(channelId);
}

function isJoinedPublicChannel(channelId: string): boolean {
  return channelStore.channels.some((c) => c.id === channelId);
}
</script>

<template>
  <div class="py-2">
    <div class="px-3 mb-2">
      <h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wider">
        Channels
      </h3>
    </div>

    <div v-if="channelStore.isLoading" class="px-3 py-4 text-center text-sm text-surface-500">
      Loading channels...
    </div>

    <div v-else-if="privateAndDirectChannels.length === 0" class="px-3 py-4 text-center text-sm text-surface-500">
      No private channels yet.
    </div>

    <button
      v-for="channel in privateAndDirectChannels"
      :key="channel.id"
      class="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-200 dark:hover:bg-surface-700/50 transition-colors"
      :class="{
        'bg-surface-200 dark:bg-surface-700': channelStore.activeChannelId === channel.id,
      }"
      @click="selectChannel(channel.id)"
    >
      <span class="text-surface-400 text-sm shrink-0">
        {{ getChannelIcon(channel.type) }}
      </span>

      <span class="text-sm font-medium text-surface-700 dark:text-surface-300 truncate flex-1">
        {{ channel.name }}
      </span>

      <span
        v-if="channel.unread_count && channel.unread_count > 0"
        class="bg-primary-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
      >
        {{ channel.unread_count > 99 ? '99+' : channel.unread_count }}
      </span>
    </button>

    <div class="px-3 mt-4 mb-2">
      <h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wider">
        Public Channels
      </h3>
    </div>

    <div v-if="channelStore.publicChannels.length === 0" class="px-3 py-2 text-xs text-surface-500">
      No public channels yet.
    </div>

    <button
      v-for="channel in channelStore.publicChannels"
      :key="`public-${channel.id}`"
      class="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-200 dark:hover:bg-surface-700/50 transition-colors"
      :class="{
        'bg-surface-200 dark:bg-surface-700': channelStore.activeChannelId === channel.id,
      }"
      @click="isJoinedPublicChannel(channel.id) ? selectChannel(channel.id) : joinPublicChannel(channel.id)"
    >
      <span class="text-surface-400 text-sm shrink-0">#</span>
      <span class="text-sm font-medium text-surface-700 dark:text-surface-300 truncate flex-1">
        {{ channel.name }}
      </span>
      <span
        class="text-xs"
        :class="isJoinedPublicChannel(channel.id) ? 'text-surface-500' : 'text-primary-600 dark:text-primary-400'"
      >
        {{ isJoinedPublicChannel(channel.id) ? 'Joined' : 'Join' }}
      </span>
    </button>
  </div>
</template>
