export interface LatestMessage {
  id: string;
  content: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  users: string[];
  profileImageUrl: string;
  profileImageUrls?: string[]; // For group chats viewed by bot2
  botProfileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  latestMessage?: LatestMessage | null;
}