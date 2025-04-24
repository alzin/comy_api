export interface Message {
    id?: string; 
    sender: string;
    content: string;
    chat: string;
    readBy: string[];
    createdAt?: Date;
  }