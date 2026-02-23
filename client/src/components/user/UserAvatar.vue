<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '../../stores/user.store';

const props = withDefaults(
  defineProps<{
    username: string;
    avatarUrl?: string | null;
    userId?: string;
    size?: number;
    showStatus?: boolean;
  }>(),
  {
    avatarUrl: null,
    userId: undefined,
    size: 32,
    showStatus: false,
  }
);

const userStore = useUserStore();

const initials = computed(() =>
  props.username.charAt(0).toUpperCase()
);

const isOnline = computed(() =>
  props.userId ? userStore.isOnline(props.userId) : false
);

const sizeClass = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(props.size * 0.4, 10)}px`,
}));

const statusSize = computed(() =>
  Math.max(props.size * 0.3, 8)
);
</script>

<template>
  <div class="relative inline-flex shrink-0">
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="username"
      class="rounded-full object-cover"
      :style="sizeClass"
    />
    <div
      v-else
      class="rounded-full bg-primary-600 flex items-center justify-center text-white font-medium"
      :style="sizeClass"
    >
      {{ initials }}
    </div>

    <span
      v-if="showStatus"
      class="absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-surface-800"
      :class="isOnline ? 'bg-green-500' : 'bg-surface-400'"
      :style="{ width: `${statusSize}px`, height: `${statusSize}px` }"
    />
  </div>
</template>
