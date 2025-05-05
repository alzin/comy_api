export interface Chat {
  id: string;
  name: string;
  isGroupChat: boolean;
  users: string[];
  createdAt: Date;
  updatedAt: Date;
  latestMessage?: string | null;
}