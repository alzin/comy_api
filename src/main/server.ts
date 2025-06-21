// File: src/main/index.ts
import express from 'express';
import http from 'http';
import { setupMiddlewares } from '../presentation/middlewares/setupMiddlewares';
import { setupRoutes } from '../presentation/routes/setupRoutes';
import { setupDependencies } from '../main/config/setupDependencies';
import { setupSwagger } from '../main/config/swagger';
import { dbConnectMiddleware } from '../presentation/middlewares/dbConnectMiddleware';

export async function startServer() {
  const app = express();
  const server = http.createServer(app);
  console.log('HTTP server created:', server.listening);

  app.use(dbConnectMiddleware);

  setupMiddlewares(app);
  setupSwagger(app);

  const dependencies = setupDependencies(server);

  // // to be removed or fixed
  await dependencies.initializeVirtualUserUseCase.execute();

  setupRoutes(app, dependencies);

  return new Promise<void>((resolve) => {
    server.listen(8080, async () => {
      console.log(`Server is running on http://localhost:8080`);
      resolve();
    });
  });
}