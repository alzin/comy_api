// src/presentation/controllers/GetAllUsersInfoController.ts

import { Request, Response } from "express";
import { GetAllUsersInfoUseCase } from "../../application/use-cases/users/GetAllUsersInfoUseCase";

export class GetAllUsersInfoController {
  constructor(private getAllUsersInfoUseCase: GetAllUsersInfoUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const usersInfo = await this.getAllUsersInfoUseCase.execute();
      res.json(usersInfo);
    } catch (error) {
      console.error("Error fetching users info:", error);
      res.status(500).json({ message: "Error fetching users info" });
    }
  }
}
