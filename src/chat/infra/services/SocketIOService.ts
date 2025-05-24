import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ISocketService } from '../../domain/services/ISocketService';
import { Message } from '../../domain/entities/Message';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { MongoChatRepository } from '../../infra/repo/MongoChatRepository';

interface UserSocket {
  userId: string;
  socketId: string;
}

interface SendMessageData {
  chatId: string;
  content: string;
  senderId: string;
}

export class SocketIOService implements ISocketService {
  private io: Server;
  private onlineUsers: UserSocket[] = [];
  private userRepository: IUserRepository;
  private messageRepository: IMessageRepository;
  private chatRepository: MongoChatRepository;

  constructor(server: any, userRepository: IUserRepository, messageRepository: IMessageRepository) {
    this.userRepository = userRepository;
    this.messageRepository = messageRepository;
    this.chatRepository = new MongoChatRepository();
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONT_URL,
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
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
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
        const { chatId, content, senderId } = data;
        try {
          const message: Message = await this.messageRepository.create({
            id: new mongoose.Types.ObjectId().toString(),
            chatId,
            sender: senderId,
            content,
            readBy: [senderId],
            createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }), 
            isMatchCard: false,
            isSuggested: false
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

  emitMessage(chatId: string, message: Message): void {
    this.io.to(chatId).emit('newMessage', message);
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