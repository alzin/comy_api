// src/presentation/controllers/UpdateUserNameController.ts

import { Request, Response } from "express";
import { UpdateUserNameUseCase } from "../../application/use-cases/users/UpdateUserNameUseCase";

export class UpdateUserNameController {
  constructor(private updateUserNameUseCase: UpdateUserNameUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: "Name is required" });
      return;
    }

    try {
      await this.updateUserNameUseCase.execute(req.user.id, name);
      res.status(200).json({ message: "User name updated successfully" });
    } catch (error) {
      if (error instanceof Error && error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else {
        console.error("Error updating user name:", error);
        res.status(500).json({ message: "Error updating user name" });
      }
    }
  }
}
