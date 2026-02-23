import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { MessageWithSender, PaginatedResponse, Reaction } from '../types';

type MessageDoc = {
  channel_id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar_url: string | null;
  content: string;
  message_type: 'text';
  is_edited: boolean;
  reactions?: Reaction[];
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function requireAuth(): { userId: string; username: string } {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('Not authenticated');
  }
  return {
    userId: firebaseUser.uid,
    username: firebaseUser.displayName ?? firebaseUser.uid,
  };
}

function mapMessage(id: string, data: MessageDoc): MessageWithSender {
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

/** Get messages for a channel */
export async function getMessages(
  channelId: string,
  options: { limit?: number } = {}
): Promise<PaginatedResponse<MessageWithSender>> {
  const messageLimit = options.limit ?? 50;
  const messagesQuery = query(
    collection(db, 'channels', channelId, 'messages'),
    orderBy('created_at', 'desc'),
    limit(messageLimit)
  );

  const snapshot = await getDocs(messagesQuery);
  const messages = snapshot.docs
    .map((messageDoc) => mapMessage(messageDoc.id, messageDoc.data() as MessageDoc))
    .reverse();

  return {
    data: messages,
    hasMore: snapshot.docs.length === messageLimit,
  };
}

/** Send a text message to a channel */
export async function sendMessage(
  channelId: string,
  data: {
    content: string;
  }
): Promise<MessageWithSender> {
  const { userId, username } = requireAuth();
  const messageRef = await addDoc(collection(db, 'channels', channelId, 'messages'), {
    channel_id: channelId,
    sender_id: userId,
    sender_username: username,
    sender_avatar_url: null,
    content: data.content.trim(),
    message_type: 'text',
    is_edited: false,
    reactions: [],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const messageSnapshot = await getDoc(messageRef);
  return mapMessage(messageSnapshot.id, messageSnapshot.data() as MessageDoc);
}

/** Edit a message */
export async function editMessage(
  channelId: string,
  messageId: string,
  content: string
): Promise<MessageWithSender> {
  const messageRef = doc(db, 'channels', channelId, 'messages', messageId);
  await updateDoc(messageRef, {
    content: content.trim(),
    is_edited: true,
    updated_at: serverTimestamp(),
  });
  const snapshot = await getDoc(messageRef);
  return mapMessage(snapshot.id, snapshot.data() as MessageDoc);
}

/** Delete a message */
export async function deleteMessage(channelId: string, messageId: string): Promise<void> {
  await deleteDoc(doc(db, 'channels', channelId, 'messages', messageId));
}

/** Add a reaction to a message */
export async function addReaction(
  channelId: string,
  messageId: string,
  emoji: string
): Promise<Reaction> {
  const { userId, username } = requireAuth();
  const messageRef = doc(db, 'channels', channelId, 'messages', messageId);
  const snapshot = await getDoc(messageRef);
  if (!snapshot.exists()) {
    throw new Error('Message not found');
  }
  const messageData = snapshot.data() as MessageDoc;
  const existing = messageData.reactions ?? [];
  const duplicate = existing.some(
    (reaction) => reaction.user_id === userId && reaction.emoji === emoji
  );
  if (duplicate) {
    return existing.find(
      (reaction) => reaction.user_id === userId && reaction.emoji === emoji
    ) as Reaction;
  }

  const reaction: Reaction = {
    id: `${userId}_${emoji}`,
    message_id: messageId,
    user_id: userId,
    username,
    emoji,
  };
  await updateDoc(messageRef, {
    reactions: [...existing, reaction],
    updated_at: serverTimestamp(),
  });
  return reaction;
}

/** Remove a reaction from a message */
export async function removeReaction(
  channelId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  const { userId } = requireAuth();
  const messageRef = doc(db, 'channels', channelId, 'messages', messageId);
  const snapshot = await getDoc(messageRef);
  if (!snapshot.exists()) {
    return;
  }
  const messageData = snapshot.data() as MessageDoc;
  const nextReactions = (messageData.reactions ?? []).filter(
    (reaction) => !(reaction.user_id === userId && reaction.emoji === emoji)
  );
  await updateDoc(messageRef, {
    reactions: nextReactions,
    updated_at: serverTimestamp(),
  });
}

/** Search messages in a channel using client-side filtering */
export async function searchMessages(
  channelId: string,
  searchQuery: string
): Promise<MessageWithSender[]> {
  const messagesQuery = query(
    collection(db, 'channels', channelId, 'messages'),
    orderBy('created_at', 'desc'),
    limit(200)
  );
  const snapshot = await getDocs(messagesQuery);
  const normalized = searchQuery.trim().toLowerCase();

  return snapshot.docs
    .map((messageDoc) => mapMessage(messageDoc.id, messageDoc.data() as MessageDoc))
    .filter((message) => message.content.toLowerCase().includes(normalized))
    .reverse();
}
