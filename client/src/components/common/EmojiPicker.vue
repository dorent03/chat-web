<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'select', emoji: string): void;
}>();

const isOpen = ref(false);

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😎', '🤓', '😤', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👻', '👽', '🤖'],
  },
  {
    name: 'Hands',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤏', '✍️', '💪'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  },
  {
    name: 'Objects',
    emojis: ['🔥', '⭐', '🌟', '✨', '💡', '📌', '📎', '🔗', '🎉', '🎊', '🎁', '🏆', '🥇', '🎯', '🚀', '💻', '📱', '⌨️', '🖥', '📷', '🎬', '🎵', '🎶', '☕', '🍕', '🍔', '🍟', '🍦', '🎂', '🍰'],
  },
];

function selectEmoji(emoji: string) {
  emit('select', emoji);
  isOpen.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      class="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
      title="Emoji"
      @click="isOpen = !isOpen"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute bottom-full mb-2 right-0 w-72 max-h-64 overflow-y-auto card shadow-lg z-50 p-2"
    >
      <div v-for="category in EMOJI_CATEGORIES" :key="category.name" class="mb-2">
        <div class="text-xs font-medium text-surface-500 mb-1 px-1">
          {{ category.name }}
        </div>
        <div class="flex flex-wrap gap-0.5">
          <button
            v-for="emoji in category.emojis"
            :key="emoji"
            class="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-lg cursor-pointer"
            @click="selectEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </div>

    <!-- Backdrop to close -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="isOpen = false"
    />
  </div>
</template>
