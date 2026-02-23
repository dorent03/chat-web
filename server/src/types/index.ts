/** Possible user online statuses */
export type UserStatus = 'online' | 'offline' | 'away';

/** Possible channel types */
export type ChannelType = 'public' | 'private' | 'direct';

/** Possible message content types */
export type MessageType = 'text' | 'image' | 'file' | 'poll';

/** Possible membership roles within a channel */
export type MemberRole = 'owner' | 'admin' | 'member';

/** User entity from the database */
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

/** Safe user representation without sensitive fields */
export interface SafeUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  status: UserStatus;
  last_seen_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Channel entity from the database */
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description: string | null;
  creator_id: string;
  created_at: Date;
}

/** Message entity from the database */
export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  parent_id: string | null;
  is_edited: boolean;
  pinned?: boolean;
  mentions?: string[];
  poll_data?: {
    question: string;
    options: Array<{ id: string; text: string; votes: string[] }>;
    multiple: boolean;
  } | null;
  created_at: Date;
  updated_at: Date;
}

/** Membership join table between users and channels */
export interface Membership {
  user_id: string;
  channel_id: string;
  role: MemberRole;
  joined_at: Date;
  last_read_at: Date | null;
}

/** Reaction on a message */
export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

/** File attachment on a message */
export interface Attachment {
  id: string;
  message_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
}

/** JWT token payload */
export interface TokenPayload {
  userId: string;
  username: string;
}

/** Auth tokens returned to client */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Message with sender info for API responses */
export interface MessageWithSender extends Message {
  sender_username: string;
  sender_avatar_url: string | null;
  reactions?: Reaction[];
  attachments?: Attachment[];
  reply_count?: number;
}

/** Channel with member count for API responses */
export interface ChannelWithMeta extends Channel {
  member_count: number;
  unread_count?: number;
  last_message?: Message | null;
}

/** Express request augmented with authenticated user */
export interface AuthenticatedUser {
  userId: string;
  username: string;
}

/** Pagination parameters */
export interface PaginationParams {
  limit: number;
  before?: string;
  after?: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
}
