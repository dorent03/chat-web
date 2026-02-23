/** Possible user online statuses */
export type UserStatus = 'online' | 'offline' | 'away';

/** Possible channel types */
export type ChannelType = 'public' | 'private' | 'direct';

/** Possible message content types */
export type MessageType = 'text' | 'image' | 'file' | 'poll';

/** Possible membership roles within a channel */
export type MemberRole = 'owner' | 'admin' | 'member';

/** User representation (no password hash) */
export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  status: UserStatus;
  last_seen_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Channel entity */
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description: string | null;
  creator_id: string;
  created_at: string;
}

/** Channel with metadata for display */
export interface ChannelWithMeta extends Channel {
  member_count: number;
  unread_count?: number;
  last_message?: Message | null;
}

/** Message entity */
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
  created_at: string;
  updated_at: string;
}

/** Message with sender details for rendering */
export interface MessageWithSender extends Message {
  sender_username: string;
  sender_avatar_url: string | null;
  reactions?: Reaction[];
  attachments?: Attachment[];
  reply_count?: number;
}

/** Membership entry */
export interface Membership {
  user_id: string;
  channel_id: string;
  role: MemberRole;
  joined_at: string;
  last_read_at: string | null;
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

/** Auth response from login/register */
export interface AuthResponse {
  user: User;
  accessToken: string;
}

/** Paginated response from API */
export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
}

/** Socket typing event payload */
export interface TypingEvent {
  channelId: string;
  userId: string;
  username: string;
}

/** Socket presence event payload */
export interface PresenceEvent {
  userId: string;
  status: UserStatus;
}

/** Socket read receipt event payload */
export interface ReadReceiptEvent {
  channelId: string;
  userId: string;
  messageId: string;
}
