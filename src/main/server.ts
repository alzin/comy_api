import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CONFIG } from './config/config';
import { setupMiddlewares } from '../presentation/middlewares/setupMiddlewares';
import { setupRoutes } from '../presentation/routes/setupRoutes';
import { setupDependencies } from './config/setupDependencies';
import { setupSwagger } from './config/swagger';
import { dbConnectMiddleware } from '../presentation/middlewares/dbConnectMiddleware';
import { setupChatRoutes } from '../chat/presentation/routes/chatRoutes';
import { setupSocketHandlers } from '../chat/presentation/socket/socketManager';
import { ChatController } from '../chat/presentation/controllers/ChatController';
import { MessageController } from '../chat/presentation/controllers/MessageController';

dotenv.config();

export async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONT_URL,
      methods: ['GET', 'POST'],
    },
  });

  app.use(cors({ origin: process.env.FRONT_URL }));
  app.use(express.json());
  app.use(dbConnectMiddleware);

  setupMiddlewares(app);
  setupSwagger(app);

  const dependencies = setupDependencies(server);

  app.use('/api/chats', setupChatRoutes(
    new ChatController(dependencies.chatService.createChatUseCase, dependencies.chatService.getUserChatsUseCase),
    new MessageController(dependencies.messageService.sendMessageUseCase, dependencies.messageService.getMessagesUseCase),
    dependencies
  ));

  setupRoutes(app, dependencies);

  setupSocketHandlers(io, dependencies.socketService);

  const connectDB = async () => {
    try {
      if (!process.env.DEV_MONGODB_URI) {
        throw new Error('DEV_MONGODB_URI is not defined in .env');
      }
      await mongoose.connect(process.env.DEV_MONGODB_URI);
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    }
  };

  return new Promise<void>((resolve) => {
    server.listen(CONFIG.PORT, async () => {
      await connectDB();
      console.log(`Server is running on ${process.env.SERVER_URL}`);
      resolve();
    });
  });
}