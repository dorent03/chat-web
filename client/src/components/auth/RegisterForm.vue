<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');

async function handleSubmit() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters';
    return;
  }

  try {
    await authStore.register({
      username: username.value,
      password: password.value,
    });
    router.push('/');
  } catch (err: unknown) {
    const typedError = err as Error;
    error.value = typedError.message || 'Registration failed. Please try again.';
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
        placeholder="johndoe"
        minlength="3"
        maxlength="50"
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
        autocomplete="new-password"
        class="input-field"
        placeholder="At least 8 characters"
        minlength="8"
      />
    </div>

    <div>
      <label for="confirmPassword" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
        Confirm Password
      </label>
      <input
        id="confirmPassword"
        v-model="confirmPassword"
        type="password"
        required
        autocomplete="new-password"
        class="input-field"
        placeholder="Repeat your password"
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
      {{ authStore.isLoading ? 'Creating account...' : 'Create Account' }}
    </button>

    <p class="text-center text-sm text-surface-500">
      Already have an account?
      <router-link to="/login" class="text-primary-600 hover:text-primary-500 font-medium">
        Sign in
      </router-link>
    </p>
  </form>
</template>
