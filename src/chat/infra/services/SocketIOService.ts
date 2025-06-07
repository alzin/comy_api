// src/chat/infra/services/SocketIOService.ts
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ISocketService } from '../../domain/services/ISocketService';
import { Message } from '../../domain/entities/Message';
import { BotMessage } from '../../domain/repo/IBotMessageRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { CONFIG } from '../../../main/config/config';

interface UserSocket {
  userId: string;
  socketId: string;
}

interface SendMessageData {
  chatId: string;
  content: string;
  senderId: string;
  images?: Array<{ imageUrl: string; zoomLink: string }>;
}

export class SocketIOService implements ISocketService {
  private io: Server;
  private onlineUsers: UserSocket[] = [];
  private userRepository: IUserRepository;
  private messageRepository: IMessageRepository;
  private chatRepository: IChatRepository;

  constructor(
    server: any,
    userRepository: IUserRepository,
    messageRepository: IMessageRepository,
    chatRepository: IChatRepository
  ) {
    this.userRepository = userRepository;
    this.messageRepository = messageRepository;
    this.chatRepository = chatRepository;
    this.io = new Server(server, {
      cors: {
        origin: CONFIG.FRONT_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    console.log('WebSocket server initialized');
  }

  initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('New client connected:', socket.id);

      socket.on('joinChat', async (chatId: string) => {
        try {
          if (!mongoose.Types.ObjectId.isValid(chatId)) {
            socket.emit('error', { message: 'Invalid chat ID' });
            return;
          }
          const chat = await this.chatRepository.findById(chatId);
          if (!chat) {
            console.error(`Chat ${chatId} not found`);
            socket.emit('error', { message: 'Chat not found' });
            return;
          }
          socket.join(chatId);
          console.log(`User ${socket.id} joined chat ${chatId}`);
        } catch (error) {
          console.error('Error joining chat:', error);
          socket.emit('error', { message: 'Error joining chat' });
        }
      });

      socket.on('authenticate', async (token) => {
        try {
          const decoded = jwt.verify(token, CONFIG.JWT_SECRET!) as {
            id: string;
          };
          const userId = decoded.id;

          this.onlineUsers.push({ userId, socketId: socket.id });
          await this.userRepository.updateUserStatus(userId, true);
          this.emitUserStatus(userId, true);
          socket.emit('onlineUsers', this.onlineUsers.map((u) => u.userId));
          console.log(`User ${userId} authenticated`);

          const userChats = await this.chatRepository.findByUserId(userId);
          userChats.forEach((chat) => {
            socket.join(chat.id);
            console.log(`User ${userId} auto-joined chat ${chat.id}`);
          });
        } catch (error) {
          console.error('Authentication error:', error);
          socket.disconnect();
        }
      });

      socket.on('sendMessage', async (data: SendMessageData) => {
        const { chatId, content, senderId, images } = data;
        try {
          if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(chatId)) {
            socket.emit('error', { message: 'Invalid sender or chat ID' });
            return;
          }
          const sender = await this.userRepository.findById(senderId);
          if (!sender) {
            socket.emit('error', { message: 'Sender not found' });
            return;
          }
          const message: Message = await this.messageRepository.create({
            id: '', // Let repository generate ID
            senderId,
            senderName: sender.name,
            content,
            chatId,
            readBy: [senderId],
            createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
            isMatchCard: false,
            isSuggested: false,
            senderProfileImageUrl: sender.profileImageUrl || '',
            images: images || [],
          });
          this.emitMessage(chatId, message);
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Error sending message' });
        }
      });

      socket.on('typing', (data) => {
        const { chatId, userId } = data;
        this.emitTyping(chatId, userId);
      });

      socket.on('stopTyping', (data) => {
        const { chatId, userId } = data;
        this.emitStopTyping(chatId, userId);
      });

      socket.on('messageRead', async (data) => {
        const { messageId, userId } = data;
        await this.messageRepository.updateReadBy(messageId, userId);
        this.emitMessageRead(messageId, userId);
      });

      socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);
        const userIndex = this.onlineUsers.findIndex((user) => user.socketId === socket.id);
        if (userIndex !== -1) {
          const userId = this.onlineUsers[userIndex].userId;
          this.onlineUsers.splice(userIndex, 1);
          await this.userRepository.updateUserStatus(userId, false);
          this.emitUserStatus(userId, false);
        }
      });
    });
  }

  emitMessage(chatId: string, message: Message | BotMessage): void {
    const messageToEmit = this.transformToMessage(message);
    console.log(`Emitting message for chat ${chatId}, relatedUserId: ${messageToEmit.relatedUserId}, isSuggested: ${messageToEmit.isSuggested}, isMatchCard: ${messageToEmit.isMatchCard}`);
    this.io.to(chatId).emit('newMessage', {
      id: messageToEmit.id,
      senderId: messageToEmit.senderId,
      senderName: messageToEmit.senderName,
      content: messageToEmit.content,
      chatId: messageToEmit.chatId,
      readBy: messageToEmit.readBy,
      createdAt: messageToEmit.createdAt,
      isMatchCard: messageToEmit.isMatchCard,
      isSuggested: messageToEmit.isSuggested,
      suggestedUserProfileImageUrl: messageToEmit.suggestedUserProfileImageUrl,
      suggestedUserName: messageToEmit.suggestedUserName,
      suggestedUserCategory: messageToEmit.suggestedUserCategory,
      status: messageToEmit.status,
      senderProfileImageUrl: messageToEmit.senderProfileImageUrl,
      relatedUserId: messageToEmit.isSuggested || messageToEmit.isMatchCard ? messageToEmit.relatedUserId : undefined,
      images: messageToEmit.images || [],
    });
  }

  private transformToMessage(message: Message | BotMessage): Message {
    if ('senderName' in message) {
      return message as Message;
    }
    const botMessage = message as BotMessage;
    return {
      id: botMessage.id || '',
      senderId: botMessage.senderId,
      senderName: 'COMY オフィシャル AI',
      content: botMessage.content || '',
      chatId: botMessage.chatId,
      readBy: botMessage.readBy || [],
      createdAt: botMessage.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      isMatchCard: botMessage.isMatchCard || false,
      isSuggested: botMessage.isSuggested || false,
      suggestedUserProfileImageUrl: botMessage.suggestedUserProfileImageUrl,
      suggestedUserName: botMessage.suggestedUserName,
      suggestedUserCategory: botMessage.suggestedUserCategory,
      status: botMessage.status,
      senderProfileImageUrl: botMessage.senderProfileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
      relatedUserId: botMessage.relatedUserId,
      images: botMessage.images || [],
    };
  }

  emitUserStatus(userId: string, isOnline: boolean): void {
    this.io.emit('userStatusChanged', { userId, isOnline });
  }

  emitTyping(chatId: string, userId: string): void {
    this.io.to(chatId).emit('userTyping', { chatId, userId });
  }

  emitStopTyping(chatId: string, userId: string): void {
    this.io.to(chatId).emit('userStoppedTyping', { chatId, userId });
  }

  emitMessageRead(messageId: string, userId: string): void {
    this.io.emit('messageReadUpdate', { messageId, userId });
  }
}