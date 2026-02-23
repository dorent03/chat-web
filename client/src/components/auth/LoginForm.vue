<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const error = ref('');

async function handleSubmit() {
  error.value = '';
  try {
    await authStore.login({ username: username.value, password: password.value });
    router.push('/');
  } catch (err: unknown) {
    const typedError = err as Error;
    error.value = typedError.message || 'Login failed. Please try again.';
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div>
      <label for="username" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
        Username
      </label>
      <input
        id="username"
        v-model="username"
        type="text"
        required
        autocomplete="username"
        class="input-field"
        placeholder="your username"
      />
    </div>

    <div>
      <label for="password" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
        Password
      </label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        autocomplete="current-password"
        class="input-field"
        placeholder="Enter your password"
      />
    </div>

    <div v-if="error" class="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
      {{ error }}
    </div>

    <button
      type="submit"
      :disabled="authStore.isLoading"
      class="btn-primary w-full"
    >
      {{ authStore.isLoading ? 'Signing in...' : 'Sign In' }}
    </button>

    <p class="text-center text-sm text-surface-500">
      Don't have an account?
      <router-link to="/register" class="text-primary-600 hover:text-primary-500 font-medium">
        Sign up
      </router-link>
    </p>
  </form>
</template>
