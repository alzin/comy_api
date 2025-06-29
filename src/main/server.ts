// src/main/server.ts

import { CONFIG } from "./config/config";
import express from "express";
import http from 'http';
import { setupMiddlewares } from "../presentation/middlewares/setupMiddlewares";
import { setupRoutes } from "../presentation/routes/setupRoutes";
import { setupDependencies } from "./config/setupDependencies";
import { setupSwagger } from "./config/swagger";
import { dbConnectMiddleware } from "../presentation/middlewares/dbConnectMiddleware";

export async function startServer() {
  const app = express();
  const server = http.createServer(app);
  console.log('HTTP server created:', server.listening);

  // Apply the database connection middleware
  app.use(dbConnectMiddleware);

  setupMiddlewares(app);
  setupSwagger(app);

   const dependencies = setupDependencies(server);

  setupRoutes(app, dependencies);

  return new Promise<void>((resolve) => {
    server.listen(CONFIG.PORT, () => {
      console.log(`Server is running on http://localhost:${CONFIG.PORT}`);
      resolve();
    });
  });
}
