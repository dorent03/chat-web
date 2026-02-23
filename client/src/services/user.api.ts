import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types';

type UserDoc = {
  username: string;
  status?: 'online' | 'offline';
  last_seen_at?: Timestamp;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function requireAuthUser() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('Not authenticated');
  }
  return firebaseUser;
}

function mapUser(id: string, data: UserDoc): User {
  return {
    id,
    username: data.username,
    avatar_url: null,
    status: data.status ?? 'offline',
    last_seen_at: toIsoDate(data.last_seen_at),
    created_at: toIsoDate(data.created_at),
    updated_at: toIsoDate(data.updated_at),
  };
}

/** Get a user by ID */
export async function getUser(id: string): Promise<User> {
  const snapshot = await getDoc(doc(db, 'users', id));
  if (!snapshot.exists()) {
    throw new Error('User not found');
  }
  return mapUser(snapshot.id, snapshot.data() as UserDoc);
}

/** Update current user profile */
export async function updateProfile(data: {
  username?: string;
}): Promise<User> {
  const firebaseUser = requireAuthUser();
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const username = data.username?.trim();

  if (username) {
    await updateDoc(userDocRef, {
      username,
      updated_at: serverTimestamp(),
    });
    await firebaseUpdateProfile(firebaseUser, { displayName: username });
  } else {
    await updateDoc(userDocRef, {
      updated_at: serverTimestamp(),
    });
  }

  const snapshot = await getDoc(userDocRef);
  return mapUser(snapshot.id, snapshot.data() as UserDoc);
}

/** Change current user password */
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const firebaseUser = requireAuthUser();
  if (!firebaseUser.email) {
    throw new Error('Could not update password for this account');
  }
  const credential = EmailAuthProvider.credential(
    firebaseUser.email,
    data.currentPassword
  );
  await reauthenticateWithCredential(firebaseUser, credential);
  await firebaseUpdatePassword(firebaseUser, data.newPassword);
}

/** Search users by username */
export async function searchUsers(searchTerm: string): Promise<User[]> {
  const normalized = searchTerm.trim();
  if (normalized.length < 2) {
    return [];
  }

  const usersQuery = query(
    collection(db, 'users'),
    where('username', '>=', normalized),
    where('username', '<=', `${normalized}\uf8ff`),
    limit(20)
  );
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map((userDoc) => mapUser(userDoc.id, userDoc.data() as UserDoc));
}
