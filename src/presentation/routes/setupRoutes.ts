import express from 'express';
import { setupAuthRoutes } from './authRoutes';
import { authMiddleware } from '../middlewares/authMiddleware';

export function setupRoutes(app: express.Application, dependencies: any) {
  app.get('/', (_, res) => res.status(200).send('OK'));

  app.use(authMiddleware(dependencies.tokenService, dependencies.userRepository));
  app.use('/auth', setupAuthRoutes(dependencies.authController));

  app.get('/check-auth', (req, res) => {
    res.json({ isAuthenticated: !!(req as any).user });
  });
}