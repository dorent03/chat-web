import { User, IUser } from '../db/schemas/user.schema';

const SAFE_USER_PROJECTION = '-password_hash -__v';

function normalizeSafeUser<T extends Record<string, unknown>>(user: T | null): T | null {
  if (!user) return null;
  const rawId = user._id as { toString(): string } | undefined;
  if (!rawId) return user;
  const normalized = { ...user, id: rawId.toString() } as T & { _id?: unknown };
  delete normalized._id;
  return normalized as T;
}

/** Find a user by their ID (includes password_hash) */
export async function findById(id: string): Promise<IUser | null> {
  return User.findById(id);
}

/** Find a user by their ID, excluding the password hash */
export async function findByIdSafe(id: string) {
  const user = await User.findById(id).select(SAFE_USER_PROJECTION).lean();
  return normalizeSafeUser(user as Record<string, unknown> | null);
}

/** Find a user by email address */
export async function findByEmail(email: string): Promise<IUser | null> {
  return User.findOne({ email });
}

/** Find a user by username */
export async function findByUsername(username: string): Promise<IUser | null> {
  return User.findOne({ username });
}

/** Create a new user and return the safe representation */
export async function create(data: {
  username: string;
  email: string;
  password_hash: string;
}) {
  const user = await User.create(data);
  const safeUser = await User.findById(user._id).select(SAFE_USER_PROJECTION).lean();
  return normalizeSafeUser(safeUser as Record<string, unknown> | null);
}

/** Update user fields by ID and return the updated safe representation */
export async function updateById(
  id: string,
  data: Partial<Pick<IUser, 'username' | 'email' | 'avatar_url' | 'status' | 'password_hash' | 'last_seen_at'>>
) {
  const user = await User.findByIdAndUpdate(id, { $set: data }, { new: true })
    .select(SAFE_USER_PROJECTION)
    .lean();
  return normalizeSafeUser(user as Record<string, unknown> | null);
}

/** Search users by username prefix (case-insensitive) */
export async function searchByUsername(query: string, limit: number = 20) {
  const users = await User.find({ username: { $regex: query, $options: 'i' } })
    .select(SAFE_USER_PROJECTION)
    .limit(limit)
    .lean();
  return users
    .map((user) => normalizeSafeUser(user as Record<string, unknown>))
    .filter(Boolean);
}

/** Update user online status */
export async function updateStatus(
  id: string,
  status: 'online' | 'offline' | 'away'
): Promise<void> {
  await User.findByIdAndUpdate(id, {
    $set: {
      status,
      ...(status === 'offline' ? { last_seen_at: new Date() } : {}),
    },
  });
}
