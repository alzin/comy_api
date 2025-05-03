import express, { Request, Response, NextFunction } from 'express';
import { setupBusinessSheetRoutes } from './BusinessSheetRoutes';
import { authMiddleware } from '../middlewares/authMiddleware';
import { setupAuthRoutes } from './authRoutes';
import { setupStripeRoutes } from './StripeRoutes';
import { setupUserInfoRoutes } from './userRoutes';
import { setupAdminRoutes } from './adminRoutes';
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

  app.use(authMiddleware(dependencies.tokenService, dependencies.userRepository));
  app.use('/create-checkout-session', setupStripeRoutes(dependencies.stripeController));
  app.use('/business-sheets', setupBusinessSheetRoutes(dependencies.businessSheetController));
  app.use('/auth', setupAuthRoutes(dependencies.authController));
  app.use('/api/chats', setupChatRoutes(
    new ChatController(dependencies.chatService.createChatUseCase, dependencies.chatService.getUserChatsUseCase),
    new MessageController(dependencies.messageService.sendMessageUseCase, dependencies.messageService.getMessagesUseCase),
    dependencies,
    dependencies.socketService
  ));
  app.get('/check-auth', (req, res) => {
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

  app.use('/admin', setupAdminRoutes());

  app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) =>
    dependencies.webhookController.handleWebhook(req, res)
  );

  app.use('/copilotkit', async (req, res) => {
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
    }
  });

  app.use('/admin/emails', createActiveUsersEmailRoutes(dependencies.activeUsersEmailController));

}