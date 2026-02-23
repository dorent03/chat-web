import * as ChannelModel from '../models/channel.model';
import * as MembershipModel from '../models/membership.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/errorHandler';
import type { Channel, ChannelWithMeta, ChannelType, MemberRole, SafeUser } from '../types';

/** Create a new channel and make the creator the owner */
export async function createChannel(
  creatorId: string,
  data: { name: string; type: ChannelType; description?: string }
): Promise<Channel> {
  const channel = await ChannelModel.create({
    name: data.name,
    type: data.type,
    description: data.description,
    creator_id: creatorId,
  });

  await MembershipModel.addMember(creatorId, channel.id, 'owner');
  return channel;
}

/** Get a single channel by ID, verifying the user is a member */
export async function getChannel(
  channelId: string,
  userId: string
): Promise<Channel> {
  const channel = await ChannelModel.findById(channelId);
  if (!channel) {
    throw new AppError(404, 'Channel not found');
  }

  const member = await MembershipModel.isMember(userId, channelId);
  if (!member && channel.type === 'private') {
    throw new AppError(403, 'Access denied');
  }

  return channel;
}

/** Get all channels for a user */
export async function getUserChannels(userId: string): Promise<ChannelWithMeta[]> {
  return ChannelModel.findByUserId(userId);
}

/** Get all public channels */
export async function getPublicChannels(): Promise<ChannelWithMeta[]> {
  return ChannelModel.findPublic();
}

/** Update a channel (only owner or admin can) */
export async function updateChannel(
  channelId: string,
  userId: string,
  data: { name?: string; description?: string; type?: ChannelType }
): Promise<Channel> {
  await verifyChannelAdmin(userId, channelId);

  const channel = await ChannelModel.updateById(channelId, data);
  if (!channel) {
    throw new AppError(404, 'Channel not found');
  }
  return channel;
}

/** Delete a channel (only owner can) */
export async function deleteChannel(
  channelId: string,
  userId: string
): Promise<void> {
  const membership = await MembershipModel.getMembership(userId, channelId);
  if (!membership || membership.role !== 'owner') {
    throw new AppError(403, 'Only the channel owner can delete this channel');
  }

  const deleted = await ChannelModel.deleteById(channelId);
  if (!deleted) {
    throw new AppError(404, 'Channel not found');
  }
}

/** Join a public channel */
export async function joinChannel(
  channelId: string,
  userId: string
): Promise<void> {
  const channel = await ChannelModel.findById(channelId);
  if (!channel) {
    throw new AppError(404, 'Channel not found');
  }

  if (channel.type === 'private') {
    throw new AppError(403, 'Cannot join a private channel without invitation');
  }

  const alreadyMember = await MembershipModel.isMember(userId, channelId);
  if (alreadyMember) {
    throw new AppError(409, 'Already a member of this channel');
  }

  await MembershipModel.addMember(userId, channelId, 'member');
}

/** Leave a channel */
export async function leaveChannel(
  channelId: string,
  userId: string
): Promise<void> {
  const membership = await MembershipModel.getMembership(userId, channelId);
  if (!membership) {
    throw new AppError(404, 'Not a member of this channel');
  }

  if (membership.role === 'owner') {
    throw new AppError(400, 'Channel owner cannot leave. Transfer ownership or delete the channel.');
  }

  await MembershipModel.removeMember(userId, channelId);
}

/** Get all members of a channel */
export async function getMembers(
  channelId: string,
  userId: string
): Promise<(SafeUser & { role: MemberRole })[]> {
  const channel = await ChannelModel.findById(channelId);
  if (!channel) {
    throw new AppError(404, 'Channel not found');
  }

  const isMember = await MembershipModel.isMember(userId, channelId);
  if (!isMember && channel.type === 'private') {
    throw new AppError(403, 'Access denied');
  }

  return MembershipModel.getChannelMembers(channelId);
}

/** Kick a member from a channel (owner or admin only) */
export async function kickMember(
  channelId: string,
  actorId: string,
  targetUserId: string
): Promise<void> {
  await verifyChannelAdmin(actorId, channelId);

  if (actorId === targetUserId) {
    throw new AppError(400, 'Cannot kick yourself');
  }

  const targetMembership = await MembershipModel.getMembership(targetUserId, channelId);
  if (!targetMembership) {
    throw new AppError(404, 'User is not a member of this channel');
  }

  if (targetMembership.role === 'owner') {
    throw new AppError(403, 'Cannot kick the channel owner');
  }

  await MembershipModel.removeMember(targetUserId, channelId);
}

/** Add a user to a channel (invite flow, primarily for private channels) */
export async function addMember(
  channelId: string,
  actorId: string,
  targetUserId: string
): Promise<void> {
  await verifyChannelAdmin(actorId, channelId);

  const channel = await ChannelModel.findById(channelId);
  if (!channel) {
    throw new AppError(404, 'Channel not found');
  }

  const targetUser = await UserModel.findById(targetUserId);
  if (!targetUser) {
    throw new AppError(404, 'Target user not found');
  }

  const alreadyMember = await MembershipModel.isMember(targetUserId, channelId);
  if (alreadyMember) {
    throw new AppError(409, 'User is already a member of this channel');
  }

  await MembershipModel.addMember(targetUserId, channelId, 'member');
}

/** Verify the user is an admin or owner of the channel */
async function verifyChannelAdmin(
  userId: string,
  channelId: string
): Promise<void> {
  const membership = await MembershipModel.getMembership(userId, channelId);
  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new AppError(403, 'Admin privileges required');
  }
}
