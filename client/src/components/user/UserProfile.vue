<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth.store';
import * as userApi from '../../services/user.api';
import UserAvatar from './UserAvatar.vue';

const authStore = useAuthStore();

const username = ref(authStore.user?.username || '');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const message = ref('');
const error = ref('');
const isSaving = ref(false);

async function handleUpdateProfile() {
  error.value = '';
  message.value = '';
  isSaving.value = true;

  try {
    const updatedUser = await userApi.updateProfile({
      username: username.value,
    });
    authStore.setUser(updatedUser);
    message.value = 'Profile updated successfully';
  } catch (err: unknown) {
    const typedError = err as Error;
    error.value = typedError.message || 'Failed to update profile';
  } finally {
    isSaving.value = false;
  }
}

async function handleChangePassword() {
  error.value = '';
  message.value = '';

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  isSaving.value = true;
  try {
    await userApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    message.value = 'Password changed successfully';
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err: unknown) {
    const typedError = err as Error;
    error.value = typedError.message || 'Failed to change password';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto space-y-6">
    <!-- Profile Info -->
    <div class="card p-6">
      <div class="flex items-center gap-4 mb-6">
        <UserAvatar
          :username="authStore.user?.username || ''"
          :avatar-url="authStore.user?.avatar_url"
          :size="64"
        />
        <div>
          <h3 class="font-semibold text-lg text-surface-900 dark:text-white">
            {{ authStore.user?.username }}
          </h3>
          <p class="text-sm text-surface-500">
            Account managed with username + password
          </p>
        </div>
      </div>

      <form @submit.prevent="handleUpdateProfile" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Username
          </label>
          <input v-model="username" type="text" class="input-field" required minlength="3" maxlength="50" />
        </div>

        <button type="submit" :disabled="isSaving" class="btn-primary">
          {{ isSaving ? 'Saving...' : 'Save Profile' }}
        </button>
      </form>
    </div>

    <!-- Change Password -->
    <div class="card p-6">
      <h3 class="font-semibold text-lg text-surface-900 dark:text-white mb-4">
        Change Password
      </h3>

      <form @submit.prevent="handleChangePassword" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Current Password
          </label>
          <input v-model="currentPassword" type="password" class="input-field" required />
        </div>

        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            New Password
          </label>
          <input v-model="newPassword" type="password" class="input-field" required minlength="8" />
        </div>

        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Confirm New Password
          </label>
          <input v-model="confirmPassword" type="password" class="input-field" required />
        </div>

        <button type="submit" :disabled="isSaving" class="btn-primary">
          {{ isSaving ? 'Changing...' : 'Change Password' }}
        </button>
      </form>
    </div>

    <!-- Feedback messages -->
    <div v-if="message" class="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
      {{ message }}
    </div>
    <div v-if="error" class="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
      {{ error }}
    </div>
  </div>
</template>
