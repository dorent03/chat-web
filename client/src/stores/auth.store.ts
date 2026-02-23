import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as authApi from '../services/auth.api';
import type { User } from '../types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const isLoading = ref(false);

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);

  /** Register a new user */
  async function register(data: { username: string; email: string; password: string }) {
    isLoading.value = true;
    try {
      const response = await authApi.register(data);
      user.value = response.user;
      accessToken.value = response.accessToken;
      localStorage.setItem('accessToken', response.accessToken);
    } finally {
      isLoading.value = false;
    }
  }

  /** Login an existing user */
  async function login(data: { email: string; password: string }) {
    isLoading.value = true;
    try {
      const response = await authApi.login(data);
      user.value = response.user;
      accessToken.value = response.accessToken;
      localStorage.setItem('accessToken', response.accessToken);
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
      accessToken.value = null;
      localStorage.removeItem('accessToken');
    }
  }

  /** Attempt to restore session from stored token */
  async function initSession() {
    if (!accessToken.value) return;

    isLoading.value = true;
    try {
      user.value = await authApi.getMe();
    } catch {
      user.value = null;
      accessToken.value = null;
      localStorage.removeItem('accessToken');
    } finally {
      isLoading.value = false;
    }
  }

  /** Update the local user object (e.g., after profile edit) */
  function setUser(updatedUser: User) {
    user.value = updatedUser;
  }

  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated,
    register,
    login,
    logout,
    initSession,
    setUser,
  };
});
