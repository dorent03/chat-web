<script setup lang="ts">
import { useRouter } from 'vue-router';
import AppLayout from '../components/layout/AppLayout.vue';
import UserProfile from '../components/user/UserProfile.vue';

const router = useRouter();
</script>

<template>
  <AppLayout>
    <div class="p-6 overflow-y-auto h-full">
      <div class="flex items-center gap-4 mb-6">
        <button
          class="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
          @click="router.push('/')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-white">Profile Settings</h1>
      </div>
      <UserProfile />
    </div>
  </AppLayout>
</template>
