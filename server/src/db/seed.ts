import mongoose from 'mongoose';
import { env } from '../config/env';
import { hashPassword } from '../utils/hash';
import { logger } from '../utils/logger';
import { User } from './schemas/user.schema';
import { Channel } from './schemas/channel.schema';
import { Message } from './schemas/message.schema';
import { Membership } from './schemas/membership.schema';
import { Reaction } from './schemas/reaction.schema';
import { Attachment } from './schemas/attachment.schema';

/**
 * Seed script to populate MongoDB with sample data for development.
 * Run with: npm run db:seed (from server directory)
 */
async function seed(): Promise<void> {
  logger.info('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected');

  /* Clear existing data */
  await Reaction.deleteMany({});
  await Attachment.deleteMany({});
  await Message.deleteMany({});
  await Membership.deleteMany({});
  await Channel.deleteMany({});
  await User.deleteMany({});
  logger.info('Cleared existing data');

  /* Create users */
  const passwordHash = await hashPassword('password123');

  const alice = await User.create({
    username: 'alice',
    email: 'alice@example.com',
    password_hash: passwordHash,
    status: 'offline',
  });

  const bob = await User.create({
    username: 'bob',
    email: 'bob@example.com',
    password_hash: passwordHash,
    status: 'offline',
  });

  const charlie = await User.create({
    username: 'charlie',
    email: 'charlie@example.com',
    password_hash: passwordHash,
    status: 'offline',
  });

  logger.info('Created 3 users (password: password123)');

  /* Create channels */
  const general = await Channel.create({
    name: 'general',
    type: 'public',
    description: 'General discussion',
    creator_id: alice._id,
  });

  const random = await Channel.create({
    name: 'random',
    type: 'public',
    description: 'Off-topic conversations',
    creator_id: alice._id,
  });

  const devChannel = await Channel.create({
    name: 'development',
    type: 'private',
    description: 'Dev team only',
    creator_id: bob._id,
  });

  logger.info('Created 3 channels');

  /* Create memberships */
  await Membership.insertMany([
    { user_id: alice._id, channel_id: general._id, role: 'owner' },
    { user_id: bob._id, channel_id: general._id, role: 'member' },
    { user_id: charlie._id, channel_id: general._id, role: 'member' },
    { user_id: alice._id, channel_id: random._id, role: 'owner' },
    { user_id: bob._id, channel_id: random._id, role: 'member' },
    { user_id: bob._id, channel_id: devChannel._id, role: 'owner' },
    { user_id: alice._id, channel_id: devChannel._id, role: 'admin' },
  ]);

  logger.info('Created memberships');

  /* Create sample messages */
  const msg1 = await Message.create({
    channel_id: general._id,
    sender_id: alice._id,
    content: 'Welcome to ChatWeb! 🎉',
    message_type: 'text',
  });

  await Message.insertMany([
    { channel_id: general._id, sender_id: bob._id, content: 'Hey everyone! Glad to be here.', message_type: 'text' },
    { channel_id: general._id, sender_id: charlie._id, content: 'This chat app looks great!', message_type: 'text' },
    { channel_id: random._id, sender_id: alice._id, content: 'Anyone up for coffee? ☕', message_type: 'text' },
    { channel_id: random._id, sender_id: bob._id, content: 'Always! Count me in.', message_type: 'text' },
    { channel_id: devChannel._id, sender_id: bob._id, content: "Let's discuss the new API design.", message_type: 'text' },
    { channel_id: devChannel._id, sender_id: alice._id, content: 'I think we should use REST for CRUD and WebSockets for real-time.', message_type: 'text' },
  ]);

  logger.info('Created 7 messages');

  /* Create sample reactions */
  await Reaction.insertMany([
    { message_id: msg1._id, user_id: bob._id, emoji: '🎉' },
    { message_id: msg1._id, user_id: charlie._id, emoji: '👍' },
  ]);

  logger.info('Created sample reactions');

  logger.info('Seed complete!');
  logger.info('');
  logger.info('Test accounts:');
  logger.info('  alice@example.com / password123');
  logger.info('  bob@example.com / password123');
  logger.info('  charlie@example.com / password123');

  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
