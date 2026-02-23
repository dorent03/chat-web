import { Channel, IChannel } from '../db/schemas/channel.schema';
import { Membership } from '../db/schemas/membership.schema';

/** Find a channel by ID */
export async function findById(id: string): Promise<IChannel | null> {
  return Channel.findById(id);
}

/** Create a new channel */
export async function create(data: {
  name: string;
  type: 'public' | 'private' | 'direct';
  description?: string;
  creator_id: string;
}) {
  const channel = await Channel.create(data);
  return channel.toJSON();
}

/** Update a channel by ID */
export async function updateById(
  id: string,
  data: Partial<Pick<IChannel, 'name' | 'description' | 'type'>>
) {
  return Channel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
}

/** Delete a channel by ID */
export async function deleteById(id: string): Promise<boolean> {
  const result = await Channel.findByIdAndDelete(id);
  return !!result;
}

/**
 * List all channels a user is a member of, including member count.
 */
export async function findByUserId(userId: string) {
  const memberships = await Membership.find({ user_id: userId }).lean();
  const channelIds = memberships.map((m) => m.channel_id);

  if (channelIds.length === 0) return [];

  const channels = await Channel.find({ _id: { $in: channelIds } })
    .sort({ created_at: -1 })
    .lean();

  /* Get member counts for all channels in one query */
  const counts = await Membership.aggregate([
    { $match: { channel_id: { $in: channelIds } } },
    { $group: { _id: '$channel_id', member_count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((c) => [c._id.toString(), c.member_count]));

  return channels.map((ch) => ({
    ...ch,
    id: ch._id.toString(),
    member_count: countMap.get(ch._id.toString()) || 0,
  }));
}

/** List all public channels (for discovery) */
export async function findPublic() {
  const channels = await Channel.find({ type: 'public' })
    .sort({ created_at: -1 })
    .lean();

  const channelIds = channels.map((c) => c._id);

  const counts = await Membership.aggregate([
    { $match: { channel_id: { $in: channelIds } } },
    { $group: { _id: '$channel_id', member_count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((c) => [c._id.toString(), c.member_count]));

  return channels.map((ch) => ({
    ...ch,
    id: ch._id.toString(),
    member_count: countMap.get(ch._id.toString()) || 0,
  }));
}
