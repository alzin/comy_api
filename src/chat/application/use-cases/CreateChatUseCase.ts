import mongoose from 'mongoose';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { Chat } from '../../domain/entities/Chat';

export class CreateChatUseCase {
  constructor(
    private chatRepository: IChatRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(
    userIds: string[],
    name: string,
    isGroup: boolean
  ): Promise<Chat> {
    if (!userIds || userIds.length < 2) {
      throw new Error('At least two users are required to create a chat');
    }

    const botId = process.env.BOT_ID || '681c757539ec003942b3f97e';
    if (isGroup && !userIds.includes(botId)) {
      userIds.push(botId);
    }

    const existingChat = await this.chatRepository.findByUsers(userIds);
    if (existingChat) {
      throw new Error('Chat already exists for these users');
    }

    const usersDetails = await Promise.all(
      userIds.map(async (id) => {
        const user = await this.userRepository.findById(id);
        return {
          id,
          name: user ? user.name : id === botId ? 'COMY オフィシャル AI' : 'Unknown User',
          profileImageUrl: user && user.profileImageUrl != null ? user.profileImageUrl : '',
        };
      })
    );

    let chatName = name;
    let profileImageUrl = '';
    let profileImageUrls: string[] | undefined = undefined;
    let botProfileImageUrl: string | undefined = undefined;

    if (!name) {
      const filteredUsers = usersDetails.filter((u) => u.id !== botId);
      if (isGroup) {
        chatName = filteredUsers.map(u => u.name).join(', ') || 'Group Chat';
      } else {
        const otherUser = filteredUsers[0];
        chatName = otherUser ? otherUser.name : 'Private Chat';
      }
    }

    if (isGroup) {
      const nonBotUsers = usersDetails.filter((u) => u.id !== botId);
      profileImageUrls = nonBotUsers
        .map(u => u.profileImageUrl)
        .filter(url => url);
      profileImageUrl = nonBotUsers[0]?.profileImageUrl || '';
      const botIndex = usersDetails.findIndex((u) => u.id === botId);
      botProfileImageUrl = botIndex !== -1 ? usersDetails[botIndex].profileImageUrl : '';
    } else {
      const otherUser = usersDetails.find(u => u.id !== botId);
      profileImageUrl = otherUser ? otherUser.profileImageUrl : '';
      const botIndex = usersDetails.findIndex((u) => u.id === botId);
      botProfileImageUrl = botIndex !== -1 ? usersDetails[botIndex].profileImageUrl : '';
    }

    const chat: Chat = {
      id: new mongoose.Types.ObjectId().toString(),
      name: chatName,
      isGroup,
      users: userIds,
      profileImageUrl,
      profileImageUrls,
      botProfileImageUrl,
      createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      updatedAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      latestMessage: null,
    };

    return await this.chatRepository.create(chat);
  }
}