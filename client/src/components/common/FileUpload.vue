<script setup lang="ts">
import { ref } from 'vue';

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const emit = defineEmits<{
  (e: 'select', files: File[]): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const error = ref('');

function openFilePicker() {
  fileInput.value?.click();
}

function handleFileChange(event: Event) {
  error.value = '';
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);

  if (files.length === 0) return;

  if (files.length > MAX_FILES) {
    error.value = `Maximum ${MAX_FILES} files allowed`;
    return;
  }

  const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
  if (oversized) {
    error.value = `File "${oversized.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`;
    return;
  }

  emit('select', files);

  /* Reset input so the same file can be selected again */
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

defineExpose({ openFilePicker });
</script>

<template>
  <div>
    <button
      class="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
      title="Attach file"
      @click="openFilePicker"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    </button>

    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      @change="handleFileChange"
    />

    <p v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</p>
  </div>
</template>
