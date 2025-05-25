import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { setupMiddlewares } from '../presentation/middlewares/setupMiddlewares';
import { setupRoutes } from '../presentation/routes/setupRoutes';
import { setupDependencies } from '../main/config/setupDependencies';
import { setupSwagger } from '../main/config/swagger';
import { dbConnectMiddleware } from '../presentation/middlewares/dbConnectMiddleware';
import { setupChatRoutes } from '../chat/presentation/routes/chatRoutes';
import { ChatController } from '../chat/presentation/controllers/ChatController';
import { MessageController } from '../chat/presentation/controllers/MessageController';
import { VirtualChatService } from '../chat/infra/services/VirtualChatService';

dotenv.config();
console.log('API_KEY:', process.env.API_KEY);

export async function startServer() {
  const app = express();
  const server = http.createServer(app);
  console.log('HTTP server created:', server.listening);

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

  app.use(cors({
    origin: process.env.FRONT_URL,
    credentials: true
  }));
  app.use(express.json());
  app.use(dbConnectMiddleware);

  setupMiddlewares(app);
  setupSwagger(app);

  const dependencies = setupDependencies(server);

  // Set up bot service
  const virtualChatService = new VirtualChatService(
    dependencies.socketService,
    dependencies.userRepository,
    dependencies.botMessageRepository,
    dependencies.chatRepository,
    dependencies.blacklistRepository,
    dependencies.chatService.createChatUseCase
  );
  await virtualChatService.initialize();

  app.locals.dependencies = {
    ...dependencies,
    virtualChatService
  };
  console.log('VirtualChatService initialized:', app.locals.dependencies.virtualChatService);

  app.use('/api/chats', setupChatRoutes(
    new ChatController(
      dependencies.chatService.createChatUseCase,
      dependencies.chatService.getUserChatsUseCase,
      dependencies.botMessageRepository,
      dependencies.blacklistRepository
    ),
    new MessageController(
      dependencies.messageService.sendMessageUseCase,
      dependencies.messageService.getMessagesUseCase,
      dependencies.socketService
    ),
    app.locals.dependencies,
    dependencies.socketService
  ));

  setupRoutes(app, dependencies);

  return new Promise<void>((resolve) => {
    server.listen(8080, async () => {
      console.log('Server listening on port 8080');
      await connectDB();
      console.log(`Server is running on http://localhost:8080`);
      resolve();
    });
  });
}