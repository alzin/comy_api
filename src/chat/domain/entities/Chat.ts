export interface Chat {
    id?: string;
    name: string | null;
    isGroupChat: boolean;
    users: string[];
    admin?: string | null;
    latestMessage?: string | null;
    createdAt?: Date;
  }