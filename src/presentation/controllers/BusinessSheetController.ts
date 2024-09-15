// src/interfaces/controllers/BusinessSheetController.ts

import { Request, Response } from 'express';
import { CreateBusinessSheetUseCase } from '../../application/use-cases/CreateBusinessSheetUseCase';
import { EditBusinessSheetUseCase } from '../../application/use-cases/EditBusinessSheetUseCase';
import { GetBusinessSheetUseCase } from '../../application/use-cases/GetBusinessSheetUseCase';
import { ShareBusinessSheetUseCase } from '../../application/use-cases/ShareBusinessSheetUseCase';

  export class BusinessSheetController {
    constructor(
      private createBusinessSheetUseCase: CreateBusinessSheetUseCase,
      private editBusinessSheetUseCase: EditBusinessSheetUseCase,
      private getBusinessSheetUseCase: GetBusinessSheetUseCase,
      private shareBusinessSheetUseCase: ShareBusinessSheetUseCase
    ) {}

  async createBusinessSheet(req: Request, res: Response): Promise<void> {
    try {
      const businessSheetData = req.body;
      businessSheetData.userId = req.user.id
      const businessSheet = await this.createBusinessSheetUseCase.execute(businessSheetData);
      res.status(201).json(businessSheet);
    } catch (error) {
      res.status(400).json({ error: error });
    }
  }

  async editBusinessSheet(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body;
      await this.editBusinessSheetUseCase.execute(req.user.id, updates);
      res.status(200).json({ message: 'BusinessSheet updated successfully' });
    } catch (error) {
      res.status(400).json({ error: error });
    }
  }

  async getBusinessSheet(req: Request, res: Response): Promise<void> {
    try {
      const businessSheet = await this.getBusinessSheetUseCase.execute(req.user.id);
      if (!businessSheet) {
        res.status(404).json({ error: 'BusinessSheet not found' });
        return;
      }
      res.status(200).json(businessSheet);
    } catch (error) {
      res.status(400).json({ error: error });
    }
  }

  async shareBusinessSheet(req: Request, res: Response): Promise<void> {
    try {
      const businessSheetId = req.params.id;
      const sharingInfo = await this.shareBusinessSheetUseCase.execute(businessSheetId);
      res.status(200).json(sharingInfo);
    } catch (error) {
      res.status(400).json({ error: error });
    }
  }
}
