<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import ChannelSettings from '../channel/ChannelSettings.vue';

const router = useRouter();
const showMobileSidebar = ref(false);
const showChannelSettings = ref(false);

function toggleSidebar() {
  showMobileSidebar.value = !showMobileSidebar.value;
}

function openProfile() {
  router.push('/profile');
}

function openChannelSettings() {
  showChannelSettings.value = true;
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-white dark:bg-surface-800">
    <!-- Desktop sidebar -->
    <div class="hidden lg:block">
      <AppSidebar />
    </div>

    <!-- Mobile sidebar overlay -->
    <div
      v-if="showMobileSidebar"
      class="fixed inset-0 z-40 lg:hidden"
    >
      <div
        class="fixed inset-0 bg-black/50"
        @click="showMobileSidebar = false"
      />
      <div class="fixed inset-y-0 left-0 z-50 w-64">
        <AppSidebar />
      </div>
    </div>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <AppHeader
        @toggle-sidebar="toggleSidebar"
        @open-profile="openProfile"
        @open-channel-settings="openChannelSettings"
      />
      <main class="flex-1 overflow-hidden">
        <slot />
      </main>
    </div>

    <ChannelSettings
      v-if="showChannelSettings"
      @close="showChannelSettings = false"
    />
  </div>
</template>
