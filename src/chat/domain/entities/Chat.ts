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
  botProfileImageUrl?: string;
  createdAt: string; 
  updatedAt: string; 
  latestMessage?: LatestMessage | null;
}