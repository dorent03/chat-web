import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserStatus } from '../types';

export const useUserStore = defineStore('user', () => {
  /** Map of userId -> online status */
  const onlineStatus = ref<Record<string, UserStatus>>({});

  /** Map of channelId -> array of usernames currently typing */
  const typingUsers = ref<Record<string, { userId: string; username: string }[]>>({});

  /** Set a user's online status */
  function setOnlineStatus(userId: string, status: UserStatus) {
    onlineStatus.value[userId] = status;
  }

  /** Bulk set online users from initial connection */
  function setOnlineUsers(userIds: string[]) {
    for (const id of userIds) {
      onlineStatus.value[id] = 'online';
    }
  }

  /** Check if a user is online */
  function isOnline(userId: string): boolean {
    return onlineStatus.value[userId] === 'online';
  }

  /** Add a typing indicator */
  function addTypingUser(channelId: string, userId: string, username: string) {
    if (!typingUsers.value[channelId]) {
      typingUsers.value[channelId] = [];
    }
    const exists = typingUsers.value[channelId].some((u) => u.userId === userId);
    if (!exists) {
      typingUsers.value[channelId].push({ userId, username });
    }
  }

  /** Replace typing users for a channel */
  function setTypingUsers(
    channelId: string,
    users: Array<{ userId: string; username: string }>
  ) {
    typingUsers.value[channelId] = users;
  }

  /** Remove a typing indicator */
  function removeTypingUser(channelId: string, userId: string) {
    if (!typingUsers.value[channelId]) return;
    typingUsers.value[channelId] = typingUsers.value[channelId].filter(
      (u) => u.userId !== userId
    );
  }

  /** Get typing usernames for a channel */
  function getTypingUsers(channelId: string): string[] {
    return (typingUsers.value[channelId] || []).map((u) => u.username);
  }

  return {
    onlineStatus,
    typingUsers,
    setOnlineStatus,
    setOnlineUsers,
    isOnline,
    addTypingUser,
    setTypingUsers,
    removeTypingUser,
    getTypingUsers,
  };
});
