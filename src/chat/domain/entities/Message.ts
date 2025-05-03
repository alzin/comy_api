export interface Message {
  id: string;
  sender: string; // معرف المستخدم
  senderDetails?: { name: string; email: string }; // تفاصيل المستخدم (اختياري)
  content: string;
  chatId: string;
  createdAt: Date;
  readBy?: string[];
}