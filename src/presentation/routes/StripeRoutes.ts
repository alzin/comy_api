// src/presentation/routes/stripeRoutes.ts

import { Router } from "express";
import { StripeController } from "../controllers/StripeController";

export function setupStripeRoutes(stripeController: StripeController): Router {
    const router = Router();

    router.post(
        "/", (req, res) => stripeController.createCheckoutSession(req, res)
    );

    return router;
}