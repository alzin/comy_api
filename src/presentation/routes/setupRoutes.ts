import express, { Request, Response, NextFunction } from 'express';
import { setupBusinessSheetRoutes } from './BusinessSheetRoutes';
import { authMiddleware } from '../middlewares/authMiddleware';
import { setupAuthRoutes } from './authRoutes';
import { setupStripeRoutes } from './StripeRoutes';
import { setupUserInfoRoutes } from './userRoutes';
import { createActiveUsersEmailRoutes } from './activeUsersEmailRoutes';
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNodeHttpEndpoint } from '@copilotkit/runtime';
import { LiteralClient } from '@literalai/client';
import { setupChatRoutes } from '../../chat/presentation/routes/chatRoutes';
import { ChatController } from '../../chat/presentation/controllers/ChatController';
import { MessageController } from '../../chat/presentation/controllers/MessageController';

const serviceAdapter = new OpenAIAdapter({
  model: 'gpt-4o-mini',
});

const literalAiClient = new LiteralClient({
  apiKey: process.env.LITERAL_API_KEY,
});

literalAiClient.instrumentation.openai({ client: serviceAdapter });

export function setupRoutes(app: express.Application, dependencies: any) {
  app.get('/', (_, res) => res.status(200).send('OK'));

  // Apply auth middleware globally, except for specific routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/auth') || req.path === '/webhook' || req.path === '/') {
      return next();
    }
    return authMiddleware(dependencies.tokenService, dependencies.userRepository)(req, res, next);
  });

  app.use('/create-checkout-session', setupStripeRoutes(dependencies.stripeController));
  app.use('/business-sheets', setupBusinessSheetRoutes(dependencies.businessSheetController));
  app.use('/auth', setupAuthRoutes(dependencies.authController));
  app.use('/api/chats', setupChatRoutes(
    new ChatController(
      dependencies.chatService.createChatUseCase,
      dependencies.chatService.getUserChatsUseCase
    ),
    new MessageController(
      dependencies.messageService.sendMessageUseCase,
      dependencies.messageService.getMessagesUseCase,
      dependencies.socketService
    ),
    dependencies,
    dependencies.socketService
  ));

  app.get('/check-auth', (req: Request, res: Response) => {
    res.json({ isAuthenticated: !!(req as any).user });
  });

  app.use(
    '/user',
    setupUserInfoRoutes(
      dependencies.getAllUsersInfoController,
      dependencies.updateUserInfoController,
      dependencies.searchUsersController,
      dependencies.checkSubscriptionStatusController
    )
  );

  // Webhook route with raw body parser
  app.post('/webhook', express.raw({ type: 'application/json' }), (req: Request, res: Response) =>
    dependencies.webhookController.handleWebhook(req, res)
  );

  // CopilotKit route
  app.use('/copilotkit', async (req: Request, res: Response) => {
    try {
      const runtime = new CopilotRuntime();
      const handler = copilotRuntimeNodeHttpEndpoint({
        endpoint: '/copilotkit',
        runtime,
        serviceAdapter,
      });
      await handler(req, res);
    } catch (err) {
      console.error('CopilotKit error:', err);
      res.status(500).json({ message: 'CopilotKit error', error: (err as Error).message });
    }
  });

  app.use('/admin/emails', createActiveUsersEmailRoutes(dependencies.activeUsersEmailController));
}