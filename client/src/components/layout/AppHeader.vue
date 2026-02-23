<script setup lang="ts">
import { useAuthStore } from '../../stores/auth.store';
import { useRealtimeStore } from '../../stores/realtime.store';
import { useChannelStore } from '../../stores/channel.store';
import ThemeToggle from '../common/ThemeToggle.vue';
import SearchBar from '../common/SearchBar.vue';
import UserAvatar from '../user/UserAvatar.vue';

const authStore = useAuthStore();
const realtimeStore = useRealtimeStore();
const channelStore = useChannelStore();

defineEmits<{
  (e: 'toggleSidebar'): void;
  (e: 'openProfile'): void;
  (e: 'openChannelSettings'): void;
}>();
</script>

<template>
  <header class="h-14 flex items-center justify-between px-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
    <div class="flex items-center gap-3">
      <button
        class="lg:hidden p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"
        @click="$emit('toggleSidebar')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div v-if="channelStore.activeChannel" class="flex items-center gap-2">
        <span class="text-surface-400">#</span>
        <h2 class="font-semibold text-surface-900 dark:text-white">
          {{ channelStore.activeChannel.name }}
        </h2>
        <span
          v-if="channelStore.activeChannel.description"
          class="text-sm text-surface-500 hidden sm:inline"
        >
          {{ channelStore.activeChannel.description }}
        </span>
        <button
          class="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
          title="Channel settings"
          @click="$emit('openChannelSettings')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-1.14 1.603-1.14 1.902 0a1 1 0 001.519.606c.998-.65 2.24.592 1.59 1.59a1 1 0 00.606 1.519c1.14.3 1.14 1.603 0 1.902a1 1 0 00-.606 1.519c.65.998-.592 2.24-1.59 1.59a1 1 0 00-1.519.606c-.3 1.14-1.603 1.14-1.902 0a1 1 0 00-1.519-.606c-.998.65-2.24-.592-1.59-1.59a1 1 0 00-.606-1.519c-1.14-.3-1.14-1.603 0-1.902a1 1 0 00.606-1.519c-.65-.998.592-2.24 1.59-1.59a1 1 0 001.519-.606z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <SearchBar class="hidden md:block" />

      <div
        class="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
        :class="realtimeStore.isConnected
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="realtimeStore.isConnected ? 'bg-green-500' : 'bg-red-500'" />
        {{ realtimeStore.isConnected ? 'Realtime On' : 'Realtime Off' }}
      </div>

      <ThemeToggle />

      <button
        v-if="authStore.user"
        class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"
        @click="$emit('openProfile')"
      >
        <UserAvatar
          :username="authStore.user.username"
          :avatar-url="authStore.user.avatar_url"
          :size="28"
        />
      </button>
    </div>
  </header>
</template>
