export interface LatestMessage {
  id: string;
  content: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  users: string[];
  profileImageUrl: string;
  botProfileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  latestMessage?: LatestMessage | null;
}