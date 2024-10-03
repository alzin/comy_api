// src/interfaces/controllers/BusinessSheetController.ts

import { Request, Response } from "express";
import { CreateBusinessSheetUseCase } from "../../application/use-cases/business-sheet/CreateBusinessSheetUseCase";
import { EditBusinessSheetUseCase } from "../../application/use-cases/business-sheet/EditBusinessSheetUseCase";
import { GetBusinessSheetUseCase } from "../../application/use-cases/business-sheet/GetBusinessSheetUseCase";
import { ShareBusinessSheetUseCase } from "../../application/use-cases/business-sheet/ShareBusinessSheetUseCase";

export class BusinessSheetController {
  constructor(
    private createBusinessSheetUseCase: CreateBusinessSheetUseCase,
    private editBusinessSheetUseCase: EditBusinessSheetUseCase,
    private getBusinessSheetUseCase: GetBusinessSheetUseCase,
    private shareBusinessSheetUseCase: ShareBusinessSheetUseCase,
  ) {}

  async createBusinessSheet(req: Request, res: Response): Promise<void> {
    try {
      const businessSheetData = req.body;
      businessSheetData.userId = req.user.id;

      const files = req.files as {
        headerBackgroundImage?: Express.Multer.File[];
        profileImage?: Express.Multer.File[];
        referralSheetBackgroundImage?: Express.Multer.File[];
      };

      const images = {
        headerBackgroundImage: files?.headerBackgroundImage?.[0]?.buffer,
        profileImage: files?.profileImage?.[0]?.buffer,
        referralSheetBackgroundImage:
          files?.referralSheetBackgroundImage?.[0]?.buffer,
      };

      const businessSheet = await this.createBusinessSheetUseCase.execute(
        businessSheetData,
        images,
      );
      res.status(201).json(businessSheet);
    } catch (error) {
      res.status(400).json({ error: error });
    }
  }

  async editBusinessSheet(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const updates = req.body;

      const files = req.files as {
        headerBackgroundImage?: Express.Multer.File[];
        profileImage?: Express.Multer.File[];
        referralSheetBackgroundImage?: Express.Multer.File[];
      };

      const images = {
        headerBackgroundImage: files?.headerBackgroundImage?.[0]?.buffer,
        profileImage: files?.profileImage?.[0]?.buffer,
        referralSheetBackgroundImage:
          files?.referralSheetBackgroundImage?.[0]?.buffer,
      };

      await this.editBusinessSheetUseCase.execute(userId, updates, images);
      res.status(200).json({ message: "BusinessSheet updated successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "An error occurred" });
    }
  }

  async getBusinessSheet(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;

      if (!userId) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      const businessSheet = await this.getBusinessSheetUseCase.execute(userId);

      if (!businessSheet) {
        res.status(404).json({ error: "BusinessSheet not found" });
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
      const sharingInfo =
        await this.shareBusinessSheetUseCase.execute(businessSheetId);
      res.status(200).json(sharingInfo);
    } catch (error) {
      res.status(400).json({ error: error });
    }
  }
}
