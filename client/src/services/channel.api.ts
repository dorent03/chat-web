import { auth, db } from '../config/firebase';
import {
  Timestamp,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { Channel, ChannelWithMeta, MemberRole, User } from '../types';

type ChannelDoc = {
  name: string;
  type: 'public' | 'private' | 'direct';
  description: string | null;
  creator_id: string;
  member_ids: string[];
  member_roles: Record<string, MemberRole>;
  member_count: number;
  created_at?: Timestamp;
};

function requireAuthUserId(): string {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function mapChannel(id: string, data: ChannelDoc): ChannelWithMeta {
  return {
    id,
    name: data.name,
    type: data.type,
    description: data.description ?? null,
    creator_id: data.creator_id,
    created_at: toIsoDate(data.created_at),
    member_count: data.member_count ?? data.member_ids.length,
    unread_count: 0,
    last_message: null,
  };
}

/** Get all channels the current user belongs to */
export async function getMyChannels(): Promise<ChannelWithMeta[]> {
  const userId = requireAuthUserId();
  const channelsQuery = query(
    collection(db, 'channels'),
    where('member_ids', 'array-contains', userId)
  );
  const snapshot = await getDocs(channelsQuery);

  return snapshot.docs.map((channelDoc) =>
    mapChannel(channelDoc.id, channelDoc.data() as ChannelDoc)
  );
}

/** Get all public channels */
export async function getPublicChannels(): Promise<ChannelWithMeta[]> {
  const channelsQuery = query(collection(db, 'channels'), where('type', '==', 'public'));
  const snapshot = await getDocs(channelsQuery);
  return snapshot.docs.map((channelDoc) =>
    mapChannel(channelDoc.id, channelDoc.data() as ChannelDoc)
  );
}

/** Get a single channel by ID */
export async function getChannel(id: string): Promise<Channel> {
  const channelSnapshot = await getDoc(doc(db, 'channels', id));
  if (!channelSnapshot.exists()) {
    throw new Error('Channel not found');
  }
  const data = channelSnapshot.data() as ChannelDoc;
  const mapped = mapChannel(channelSnapshot.id, data);
  return {
    id: mapped.id,
    name: mapped.name,
    type: mapped.type,
    description: mapped.description,
    creator_id: mapped.creator_id,
    created_at: mapped.created_at,
  };
}

/** Create a new channel */
export async function createChannel(data: {
  name: string;
  type: 'public' | 'private' | 'direct';
  description?: string;
}): Promise<Channel> {
  const userId = requireAuthUserId();
  const channelsRef = collection(db, 'channels');
  const channelRef = doc(channelsRef);

  await setDoc(channelRef, {
    name: data.name.trim(),
    type: data.type,
    description: data.description ?? null,
    creator_id: userId,
    member_ids: [userId],
    member_roles: { [userId]: 'owner' satisfies MemberRole },
    member_count: 1,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return getChannel(channelRef.id);
}

/** Update a channel */
export async function updateChannel(
  id: string,
  data: { name?: string; description?: string; type?: 'public' | 'private' }
): Promise<Channel> {
  const payload: Record<string, unknown> = {
    updated_at: serverTimestamp(),
  };

  if (typeof data.name === 'string') payload.name = data.name.trim();
  if (typeof data.description === 'string') payload.description = data.description.trim();
  if (typeof data.type === 'string') payload.type = data.type;

  await updateDoc(doc(db, 'channels', id), payload);
  return getChannel(id);
}

/** Delete a channel */
export async function deleteChannel(id: string): Promise<void> {
  await deleteDoc(doc(db, 'channels', id));
}

/** Join a public channel */
export async function joinChannel(id: string): Promise<void> {
  const userId = requireAuthUserId();
  await runTransaction(db, async (transaction) => {
    const channelRef = doc(db, 'channels', id);
    const channelSnapshot = await transaction.get(channelRef);
    if (!channelSnapshot.exists()) {
      throw new Error('Channel not found');
    }
    const channelData = channelSnapshot.data() as ChannelDoc;
    if (channelData.member_ids.includes(userId)) {
      return;
    }

    transaction.update(channelRef, {
      member_ids: arrayUnion(userId),
      [`member_roles.${userId}`]: 'member' satisfies MemberRole,
      member_count: increment(1),
      updated_at: serverTimestamp(),
    });
  });
}

/** Leave a channel */
export async function leaveChannel(id: string): Promise<void> {
  const userId = requireAuthUserId();
  await runTransaction(db, async (transaction) => {
    const channelRef = doc(db, 'channels', id);
    const channelSnapshot = await transaction.get(channelRef);
    if (!channelSnapshot.exists()) {
      return;
    }
    const channelData = channelSnapshot.data() as ChannelDoc;
    if (channelData.creator_id === userId) {
      throw new Error('Channel owner cannot leave the channel');
    }
    if (!channelData.member_ids.includes(userId)) {
      return;
    }

    const nextRoles = { ...channelData.member_roles };
    delete nextRoles[userId];

    transaction.update(channelRef, {
      member_ids: arrayRemove(userId),
      member_roles: nextRoles,
      member_count: increment(-1),
      updated_at: serverTimestamp(),
    });
  });
}

/** Get all members of a channel */
export async function getMembers(
  channelId: string
): Promise<(User & { role: MemberRole })[]> {
  const channelSnapshot = await getDoc(doc(db, 'channels', channelId));
  if (!channelSnapshot.exists()) {
    return [];
  }

  const channelData = channelSnapshot.data() as ChannelDoc;
  const users = await Promise.all(
    channelData.member_ids.map(async (memberId) => {
      const userSnapshot = await getDoc(doc(db, 'users', memberId));
      if (!userSnapshot.exists()) {
        return null;
      }
      const userData = userSnapshot.data() as {
        username: string;
        status?: 'online' | 'offline';
        last_seen_at?: Timestamp;
        created_at?: Timestamp;
        updated_at?: Timestamp;
      };

      const role = channelData.member_roles[memberId] ?? 'member';
      return {
        id: memberId,
        username: userData.username,
        avatar_url: null,
        status: userData.status ?? 'offline',
        last_seen_at: toIsoDate(userData.last_seen_at),
        created_at: toIsoDate(userData.created_at),
        updated_at: toIsoDate(userData.updated_at),
        role,
      } satisfies User & { role: MemberRole };
    })
  );

  return users.filter((user): user is User & { role: MemberRole } => user !== null);
}

/** Kick a member from a channel */
export async function kickMember(channelId: string, userId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const channelRef = doc(db, 'channels', channelId);
    const channelSnapshot = await transaction.get(channelRef);
    if (!channelSnapshot.exists()) {
      throw new Error('Channel not found');
    }
    const channelData = channelSnapshot.data() as ChannelDoc;
    if (!channelData.member_ids.includes(userId)) {
      return;
    }

    const nextRoles = { ...channelData.member_roles };
    delete nextRoles[userId];

    transaction.update(channelRef, {
      member_ids: arrayRemove(userId),
      member_roles: nextRoles,
      member_count: increment(-1),
      updated_at: serverTimestamp(),
    });
  });
}

/** Add a user to a channel (invite) */
export async function addMember(channelId: string, userId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const channelRef = doc(db, 'channels', channelId);
    const channelSnapshot = await transaction.get(channelRef);
    if (!channelSnapshot.exists()) {
      throw new Error('Channel not found');
    }
    const channelData = channelSnapshot.data() as ChannelDoc;
    if (channelData.member_ids.includes(userId)) {
      return;
    }

    transaction.update(channelRef, {
      member_ids: arrayUnion(userId),
      [`member_roles.${userId}`]: 'member' satisfies MemberRole,
      member_count: increment(1),
      updated_at: serverTimestamp(),
    });
  });
}
