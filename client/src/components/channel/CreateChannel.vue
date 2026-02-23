<script setup lang="ts">
import { ref } from 'vue';
import { useChannelStore } from '../../stores/channel.store';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created'): void;
}>();

const channelStore = useChannelStore();

const name = ref('');
const type = ref<'public' | 'private'>('public');
const description = ref('');
const error = ref('');
const isCreating = ref(false);

async function handleCreate() {
  error.value = '';
  if (!name.value.trim()) {
    error.value = 'Channel name is required';
    return;
  }

  isCreating.value = true;
  try {
    await channelStore.createChannel({
      name: name.value.trim(),
      type: type.value,
      description: description.value.trim() || undefined,
    });

    emit('created');
  } catch (err: unknown) {
    const typedError = err as Error;
    error.value = typedError.message || 'Failed to create channel';
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" @click="emit('close')" />

    <div class="relative card w-full max-w-md mx-4 p-6">
      <h2 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">
        Create Channel
      </h2>

      <form @submit.prevent="handleCreate" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Channel Name
          </label>
          <input
            v-model="name"
            type="text"
            class="input-field"
            placeholder="e.g. general"
            maxlength="100"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Type
          </label>
          <select v-model="type" class="input-field">
            <option value="public">Public - anyone can join</option>
            <option value="private">Private - invite only</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Description (optional)
          </label>
          <textarea
            v-model="description"
            class="input-field"
            placeholder="What's this channel about?"
            rows="2"
            maxlength="500"
          />
        </div>

        <div v-if="error" class="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          {{ error }}
        </div>

        <div class="flex justify-end gap-3">
          <button type="button" class="btn-secondary" @click="emit('close')">
            Cancel
          </button>
          <button type="submit" :disabled="isCreating" class="btn-primary">
            {{ isCreating ? 'Creating...' : 'Create Channel' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
