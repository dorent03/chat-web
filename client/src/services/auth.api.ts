import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { AuthResponse, User } from '../types';

function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@chatapp.local`;
}

function mapFirebaseUser(firebaseUser: FirebaseUser, username?: string): User {
  const now = new Date().toISOString();
  return {
    id: firebaseUser.uid,
    username: username ?? firebaseUser.displayName ?? firebaseUser.uid,
    avatar_url: firebaseUser.photoURL ?? null,
    status: 'online',
    last_seen_at: now,
    created_at: now,
    updated_at: now,
  };
}

/** Register a new user with username and password */
export async function register(data: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const email = usernameToEmail(data.username);
  const credentials = await createUserWithEmailAndPassword(auth, email, data.password);
  await updateProfile(credentials.user, { displayName: data.username });

  const userDocRef = doc(db, 'users', credentials.user.uid);
  await setDoc(userDocRef, {
    username: data.username,
    status: 'online',
    last_seen_at: serverTimestamp(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return {
    user: mapFirebaseUser(credentials.user, data.username),
    accessToken: await credentials.user.getIdToken(),
  };
}

/** Login with username and password */
export async function login(data: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const credentials = await signInWithEmailAndPassword(
    auth,
    usernameToEmail(data.username),
    data.password
  );

  const userDocRef = doc(db, 'users', credentials.user.uid);
  const userSnapshot = await getDoc(userDocRef);
  const username = userSnapshot.exists()
    ? (userSnapshot.data().username as string)
    : credentials.user.displayName ?? data.username;

  return {
    user: mapFirebaseUser(credentials.user, username),
    accessToken: await credentials.user.getIdToken(),
  };
}

/** Logout the current user */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/** Get the currently authenticated user */
export async function getMe(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        unsubscribe();
        if (!firebaseUser) {
          reject(new Error('Not authenticated'));
          return;
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userSnapshot = await getDoc(userDocRef);
        const username = userSnapshot.exists()
          ? (userSnapshot.data().username as string)
          : firebaseUser.displayName ?? firebaseUser.uid;
        resolve(mapFirebaseUser(firebaseUser, username));
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}
