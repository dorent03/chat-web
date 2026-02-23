<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import { useChannelStore } from '../../stores/channel.store';
import { useSocketStore } from '../../stores/socket.store';
import ChannelList from '../chat/ChannelList.vue';
import CreateChannel from '../channel/CreateChannel.vue';

const router = useRouter();
const authStore = useAuthStore();
const channelStore = useChannelStore();
const socketStore = useSocketStore();

const showCreateChannel = ref(false);

async function handleLogout() {
  socketStore.disconnect();
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <aside class="w-64 flex flex-col h-full border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
    <!-- Workspace header -->
    <div class="h-14 flex items-center justify-between px-4 border-b border-surface-200 dark:border-surface-700">
      <h1 class="font-bold text-lg text-surface-900 dark:text-white">ChatWeb</h1>
      <button
        class="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500"
        title="Create channel"
        @click="showCreateChannel = true"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Channel list -->
    <div class="flex-1 overflow-y-auto">
      <ChannelList />
    </div>

    <!-- User section -->
    <div class="p-3 border-t border-surface-200 dark:border-surface-700">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
            {{ authStore.user?.username?.charAt(0).toUpperCase() }}
          </div>
          <span class="text-sm font-medium text-surface-900 dark:text-white truncate">
            {{ authStore.user?.username }}
          </span>
        </div>
        <button
          class="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500"
          title="Logout"
          @click="handleLogout"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Create channel modal -->
    <CreateChannel
      v-if="showCreateChannel"
      @close="showCreateChannel = false"
      @created="showCreateChannel = false; Promise.all([channelStore.fetchMyChannels(), channelStore.fetchPublicChannels()])"
    />
  </aside>
</template>
