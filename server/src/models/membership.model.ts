import { Membership } from '../db/schemas/membership.schema';
import { User } from '../db/schemas/user.schema';
import { Message } from '../db/schemas/message.schema';
import type { MemberRole } from '../types';

/** Add a user to a channel with a given role */
export async function addMember(
  userId: string,
  channelId: string,
  role: MemberRole = 'member'
) {
  const membership = await Membership.create({
    user_id: userId,
    channel_id: channelId,
    role,
  });
  return membership.toJSON();
}

/** Remove a user from a channel */
export async function removeMember(
  userId: string,
  channelId: string
): Promise<boolean> {
  const result = await Membership.findOneAndDelete({
    user_id: userId,
    channel_id: channelId,
  });
  return !!result;
}

/** Check if a user is a member of a channel */
export async function isMember(
  userId: string,
  channelId: string
): Promise<boolean> {
  const membership = await Membership.findOne({
    user_id: userId,
    channel_id: channelId,
  }).lean();
  return !!membership;
}

/** Get a membership record for a user/channel pair */
export async function getMembership(userId: string, channelId: string) {
  return Membership.findOne({
    user_id: userId,
    channel_id: channelId,
  }).lean();
}

/** Get all members of a channel with their user info */
export async function getChannelMembers(channelId: string) {
  const memberships = await Membership.find({ channel_id: channelId })
    .sort({ joined_at: 1 })
    .lean();

  const userIds = memberships.map((m) => m.user_id);
  const users = await User.find({ _id: { $in: userIds } })
    .select('-password_hash -__v')
    .lean();

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return memberships.map((m) => {
    const user = userMap.get(m.user_id.toString());
    return {
      id: user?._id.toString() || m.user_id.toString(),
      username: (user as Record<string, unknown>)?.username || 'Unknown',
      email: (user as Record<string, unknown>)?.email || '',
      avatar_url: (user as Record<string, unknown>)?.avatar_url || null,
      status: (user as Record<string, unknown>)?.status || 'offline',
      last_seen_at: (user as Record<string, unknown>)?.last_seen_at || null,
      created_at: (user as Record<string, unknown>)?.created_at,
      updated_at: (user as Record<string, unknown>)?.updated_at,
      role: m.role as MemberRole,
    };
  });
}

/** Update member role in a channel */
export async function updateRole(
  userId: string,
  channelId: string,
  role: MemberRole
): Promise<void> {
  await Membership.findOneAndUpdate(
    { user_id: userId, channel_id: channelId },
    { $set: { role } }
  );
}

/** Update last_read_at timestamp for a membership */
export async function updateLastRead(
  userId: string,
  channelId: string,
  messageTimestamp: string
): Promise<void> {
  await Membership.findOneAndUpdate(
    { user_id: userId, channel_id: channelId },
    { $set: { last_read_at: new Date(messageTimestamp) } }
  );
}

/** Count unread messages for a user in a channel */
export async function getUnreadCount(
  userId: string,
  channelId: string
): Promise<number> {
  const membership = await Membership.findOne({
    user_id: userId,
    channel_id: channelId,
  }).lean();

  if (!membership || !membership.last_read_at) {
    return Message.countDocuments({ channel_id: channelId });
  }

  return Message.countDocuments({
    channel_id: channelId,
    created_at: { $gt: membership.last_read_at },
    sender_id: { $ne: userId },
  });
}
