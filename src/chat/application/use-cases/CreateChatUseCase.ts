import mongoose from 'mongoose';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { Chat } from '../../domain/entities/Chat';

export class CreateChatUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(
    userIds: string[],
    name: string,
    isGroupChat: boolean
  ): Promise<Chat> {
    // Validate inputs
    if (!userIds || userIds.length < 2) {
      throw new Error('At least two users are required to create a chat');
    }

    // Add the bot to the userIds for group chats
    const botId = process.env.BOT_ID;
    if (!botId) {
      throw new Error('BOT_ID is not defined in .env');
    }
    if (isGroupChat && !userIds.includes(botId)) {
      userIds.push(botId);
    }

    // Check if chat already exists for these users
    const existingChat = await this.chatRepository.findByUsers(userIds);
    if (existingChat) {
      throw new Error('Chat already exists for these users');
    }

    // Create new chat
    const chat: Chat = {
      id: new mongoose.Types.ObjectId().toString(),
      name: isGroupChat ? name : 'Group Chat with Virtual Assistant',
      isGroupChat,
      users: userIds,
      createdAt: new Date(),
      updatedAt: new Date(),
      latestMessage: null
    };

    return await this.chatRepository.create(chat);
  }
}