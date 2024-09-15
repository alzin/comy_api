// src/presentation/routes/businessSheetRoutes.ts

import { Router } from 'express';
import { BusinessSheetController } from '../controllers/BusinessSheetController';

export function setupBusinessSheetRoutes(controller: BusinessSheetController): Router {
  const router = Router();

  router.post('/', (req, res) => controller.createBusinessSheet(req, res));
  router.put('/:id', (req, res) => controller.editBusinessSheet(req, res));
  router.get('/:id', (req, res) => controller.getBusinessSheet(req, res));
  router.post('/:id/share', (req, res) => controller.shareBusinessSheet(req, res));

  return router;
}
