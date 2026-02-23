<script setup lang="ts">
import { ref } from 'vue';
import * as userApi from '../../services/user.api';
import UserAvatar from './UserAvatar.vue';
import type { User } from '../../types';

const emit = defineEmits<{
  (e: 'select', user: User): void;
}>();

const query = ref('');
const results = ref<User[]>([]);
const isSearching = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function handleInput() {
  if (debounceTimer) clearTimeout(debounceTimer);

  if (query.value.length < 2) {
    results.value = [];
    return;
  }

  debounceTimer = setTimeout(async () => {
    if (query.value.length < 2) return;

    isSearching.value = true;
    try {
      results.value = await userApi.searchUsers(query.value);
    } finally {
      isSearching.value = false;
    }
  }, 300);
}

function selectUser(user: User) {
  emit('select', user);
  query.value = '';
  results.value = [];
}
</script>

<template>
  <div class="space-y-2">
    <input
      v-model="query"
      type="text"
      placeholder="Search users..."
      class="input-field"
      @input="handleInput"
    />

    <div v-if="isSearching" class="text-sm text-surface-500 text-center py-2">
      Searching...
    </div>

    <div
      v-for="user in results"
      :key="user.id"
      class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer"
      @click="selectUser(user)"
    >
      <UserAvatar :username="user.username" :avatar-url="user.avatar_url" :user-id="user.id" :size="32" show-status />
      <div>
        <div class="text-sm font-medium text-surface-900 dark:text-white">{{ user.username }}</div>
        <div class="text-xs text-surface-500">{{ user.status }}</div>
      </div>
    </div>
  </div>
</template>
