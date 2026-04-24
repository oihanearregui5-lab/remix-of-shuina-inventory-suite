export type ChatChannelKind = "channel" | "group" | "direct";
export type ChatChannelVisibility = "public" | "private";

export interface ChatChannelItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: ChatChannelKind;
  visibility: ChatChannelVisibility;
  direct_message_key?: string | null;
  created_at?: string;
}

export interface ChatMessageItem {
  id: string;
  channel_id: string;
  author_user_id: string;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface ChannelSummary {
  channelId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastAuthorName: string | null;
  unreadCount: number;
}

export interface ChatPersonOption {
  user_id: string;
  full_name: string;
}
