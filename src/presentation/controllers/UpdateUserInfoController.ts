// src/presentation/controllers/UpdateUserInfoController.ts

import { Request, Response } from "express";
import { UpdateUserInfoUseCase } from "../../application/use-cases/users/UpdateUserInfoUseCase";
import { User } from "../../domain/entities/User";

export class UpdateUserInfoController {
  constructor(private updateUserInfoUseCase: UpdateUserInfoUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    const { name, category } = req.body;

    if (!name && !category) {
      res.status(400).json({ message: "Name or category is required" });
      return;
    }

    const updateData: Partial<User> = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category;

    try {
      await this.updateUserInfoUseCase.execute(req.user.id, updateData);
      res.status(200).json({ message: "User information updated successfully" });
    } catch (error) {
      if (error instanceof Error && error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else {
        console.error("Error updating user information:", error);
        res.status(500).json({ message: "Error updating user information" });
      }
    }
  }
}