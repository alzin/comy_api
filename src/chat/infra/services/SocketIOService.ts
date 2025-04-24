import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ISocketService } from '../../domain/services/ISocketService';
import { Message } from '../../domain/entities/Message';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';

interface UserSocket {
  userId: string;
  socketId: string;
}

export class SocketIOService implements ISocketService {
  private io: Server;
  private onlineUsers: UserSocket[] = [];
  private userRepository: IUserRepository;
  private messageRepository: IMessageRepository;

  constructor(server: any, userRepository: IUserRepository, messageRepository: IMessageRepository) {
    this.userRepository = userRepository;
    this.messageRepository = messageRepository;
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONT_URL,
        methods: ['GET', 'POST'],
      },
    });
  }

  initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('New client connected:', socket.id);

      socket.on('authenticate', async (token) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            id: string;
          };
          const userId = decoded.id;

          this.onlineUsers.push({ userId, socketId: socket.id });
          await this.userRepository.updateUserStatus(userId, true);
          this.io.emit('userStatusChanged', { userId, isOnline: true });
          socket.emit('onlineUsers', this.onlineUsers.map((u) => u.userId));
          console.log(`User ${userId} authenticated`);
        } catch (error) {
          console.error('Authentication error:', error);
          socket.disconnect();
        }
      });

      socket.on('sendMessage', async (data) => {
        const { chatId, content, senderId } = data;
        const message: Message = {
          chat: chatId,
          content,
          sender: senderId,
          readBy: [senderId],
        };
        this.emitNewMessage(message);
      });

      socket.on('typing', (data) => {
        const { chatId, userId } = data;
        socket.broadcast.emit('userTyping', { chatId, userId });
      });

      socket.on('stopTyping', (data) => {
        const { chatId, userId } = data;
        socket.broadcast.emit('userStoppedTyping', { chatId, userId });
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
          this.io.emit('userStatusChanged', { userId, isOnline: false });
        }
      });
    });
  }

  emitNewMessage(message: Message): void {
    this.io.emit('newMessage', message);
  }

  emitUserStatus(userId: string, isOnline: boolean): void {
    this.io.emit('userStatusChanged', { userId, isOnline });
  }

  emitTyping(chatId: string, userId: string): void {
    this.io.emit('userTyping', { chatId, userId });
  }

  emitStopTyping(chatId: string, userId: string): void {
    this.io.emit('userStoppedTyping', { chatId, userId });
  }

  emitMessageRead(messageId: string, userId: string): void {
    this.io.emit('messageReadUpdate', { messageId, userId });
  }
}