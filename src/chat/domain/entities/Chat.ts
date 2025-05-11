////src/chat/domain/entities/Chat.ts
export interface Chat {
  id: string;
  name: string;
  isGroupChat: boolean;
  users: string[];
  profileImageUrl: string;
  botProfileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  latestMessage?: string | null;
}