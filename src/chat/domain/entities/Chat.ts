export interface LatestMessage {
  id: string;
  content: string;
  createdAt: string;
  readBy: string[]; 
}

export interface ChatUser {
  role: string;
  id: string;
  image: string;
  name?: string; 
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  users: ChatUser[]; 
  createdAt: string;
  updatedAt: string;
  latestMessage?: LatestMessage | null;
}