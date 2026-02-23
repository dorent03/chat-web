<script setup lang="ts">
import LoginForm from '../components/auth/LoginForm.vue';
import { useTheme } from '../composables/useTheme';

useTheme();
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-surface-900 dark:text-white">
          ChatWeb
        </h1>
        <p class="mt-2 text-surface-500 dark:text-surface-400">
          Sign in to your account
        </p>
      </div>

      <div class="card p-6">
        <LoginForm />
      </div>
    </div>
  </div>
</template>
