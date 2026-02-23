import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as authApi from '../services/auth.api';
import type { User } from '../types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const isInitialized = ref(false);

  const isAuthenticated = computed(() => !!user.value);

  /** Register a new user */
  async function register(data: { username: string; password: string }) {
    isLoading.value = true;
    try {
      const response = await authApi.register(data);
      user.value = response.user;
    } finally {
      isLoading.value = false;
    }
  }

  /** Login an existing user */
  async function login(data: { username: string; password: string }) {
    isLoading.value = true;
    try {
      const response = await authApi.login(data);
      user.value = response.user;
    } finally {
      isLoading.value = false;
    }
  }

  /** Logout the current user */
  async function logout() {
    try {
      await authApi.logout();
    } finally {
      user.value = null;
    }
  }

  /** Initialize session from Firebase auth state */
  async function initSession() {
    isLoading.value = true;
    try {
      user.value = await authApi.getMe();
    } catch {
      user.value = null;
    } finally {
      isInitialized.value = true;
      isLoading.value = false;
    }
  }

  /** Update the local user object (e.g., after profile edit) */
  function setUser(updatedUser: User) {
    user.value = updatedUser;
  }

  return {
    user,
    isLoading,
    isInitialized,
    isAuthenticated,
    register,
    login,
    logout,
    initSession,
    setUser,
  };
});
