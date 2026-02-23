import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuthStore } from './auth.store';
import { useMessageStore } from './message.store';
import { useUserStore } from './user.store';
import type { MessageWithSender } from '../types';

type FirestoreMessage = {
  channel_id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar_url: string | null;
  content: string;
  message_type: 'text';
  is_edited: boolean;
  reactions?: Array<{
    id: string;
    message_id: string;
    user_id: string;
    emoji: string;
    username?: string;
  }>;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

type FirestorePresence = {
  status?: 'online' | 'offline';
};

type FirestoreTyping = {
  username: string;
  timestamp?: Timestamp;
};

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function mapMessage(id: string, data: FirestoreMessage): MessageWithSender {
  return {
    id,
    channel_id: data.channel_id,
    sender_id: data.sender_id,
    sender_username: data.sender_username,
    sender_avatar_url: data.sender_avatar_url,
    content: data.content,
    message_type: 'text',
    is_edited: data.is_edited,
    reactions: data.reactions ?? [],
    created_at: toIsoDate(data.created_at),
    updated_at: toIsoDate(data.updated_at),
  };
}

const TYPING_STALE_THRESHOLD_MS = 5000;

export const useRealtimeStore = defineStore('realtime', () => {
  const authStore = useAuthStore();
  const messageStore = useMessageStore();
  const userStore = useUserStore();

  const isConnected = ref(false);
  const activeChannelId = ref<string | null>(null);
  const unsubscribeMessages = ref<(() => void) | null>(null);
  const unsubscribeTyping = ref<(() => void) | null>(null);
  const unsubscribePresence = ref<(() => void) | null>(null);

  const currentUserId = computed(() => auth.currentUser?.uid ?? null);

  function cleanupChannelListeners() {
    if (unsubscribeMessages.value) {
      unsubscribeMessages.value();
      unsubscribeMessages.value = null;
    }
    if (unsubscribeTyping.value) {
      unsubscribeTyping.value();
      unsubscribeTyping.value = null;
    }
    if (activeChannelId.value) {
      userStore.setTypingUsers(activeChannelId.value, []);
    }
    activeChannelId.value = null;
  }

  function subscribePresence() {
    if (unsubscribePresence.value) {
      unsubscribePresence.value();
      unsubscribePresence.value = null;
    }

    unsubscribePresence.value = onSnapshot(collection(db, 'users'), (snapshot) => {
      for (const userDoc of snapshot.docs) {
        const data = userDoc.data() as FirestorePresence;
        userStore.setOnlineStatus(userDoc.id, data.status ?? 'offline');
      }
    });
  }

  async function setSelfPresence(status: 'online' | 'offline') {
    if (!currentUserId.value) {
      return;
    }
    await updateDoc(doc(db, 'users', currentUserId.value), {
      status,
      last_seen_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }

  function connect() {
    isConnected.value = true;
    subscribePresence();

    setSelfPresence('online').catch((error: unknown) => {
      console.error('Failed to set online presence:', error);
    });
  }

  function disconnect() {
    cleanupChannelListeners();
    if (unsubscribePresence.value) {
      unsubscribePresence.value();
      unsubscribePresence.value = null;
    }
    setSelfPresence('offline').catch((error: unknown) => {
      console.error('Failed to set offline presence:', error);
    });
    isConnected.value = false;
  }

  function subscribeToChannel(channelId: string) {
    cleanupChannelListeners();
    activeChannelId.value = channelId;

    const messagesQuery = query(
      collection(db, 'channels', channelId, 'messages'),
      orderBy('created_at', 'asc')
    );

    unsubscribeMessages.value = onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map((messageDoc) =>
        mapMessage(messageDoc.id, messageDoc.data() as FirestoreMessage)
      );
      messageStore.setChannelMessages(channelId, messages);
      messageStore.hasMoreByChannel[channelId] = false;
    });

    const typingCollection = collection(db, 'channels', channelId, 'typing');
    unsubscribeTyping.value = onSnapshot(typingCollection, (snapshot) => {
      const now = Date.now();
      const typingUsers = snapshot.docs
        .map((typingDoc) => ({
          userId: typingDoc.id,
          ...(typingDoc.data() as FirestoreTyping),
        }))
        .filter((typing) => {
          if (typing.userId === currentUserId.value) {
            return false;
          }
          if (!typing.timestamp) {
            return false;
          }
          return now - typing.timestamp.toDate().getTime() <= TYPING_STALE_THRESHOLD_MS;
        })
        .map((typing) => ({
          userId: typing.userId,
          username: typing.username,
        }));

      userStore.setTypingUsers(channelId, typingUsers);
    });
  }

  async function startTyping(channelId: string) {
    if (!authStore.user || !currentUserId.value) {
      return;
    }
    await setDoc(doc(db, 'channels', channelId, 'typing', currentUserId.value), {
      username: authStore.user.username,
      timestamp: serverTimestamp(),
    });
  }

  async function stopTyping(channelId: string) {
    if (!currentUserId.value) {
      return;
    }
    await deleteDoc(doc(db, 'channels', channelId, 'typing', currentUserId.value));
  }

  return {
    isConnected,
    activeChannelId,
    connect,
    disconnect,
    subscribeToChannel,
    startTyping,
    stopTyping,
  };
});
