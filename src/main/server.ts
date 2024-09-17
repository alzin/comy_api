import { CONFIG } from "./config/config";
import express from "express";
import { setupMiddlewares } from "../presentation/middlewares/setupMiddlewares";
import { setupRoutes } from "../presentation/routes/setupRoutes";
import { setupDependencies } from "./config/setupDependencies";
import { connectToDatabase } from "../infra/database/connection";
import { setupSwagger } from "./config/swagger";
import { setupStripe } from "../infra/services/setupStripe";

export async function startServer() {
  const app = express();

  setupMiddlewares(app);
  setupSwagger(app);
  const dependencies = setupDependencies();
  setupRoutes(app, dependencies);
  setupStripe(app);

  await connectToDatabase();

  return new Promise<void>((resolve) => {
    app.listen(CONFIG.PORT, () => {
      console.log(`Server is running on http://localhost:${CONFIG.PORT}`);
      resolve();
    });
  });
}
