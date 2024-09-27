import { Request, Response } from "express";
import { SearchUsersUseCase } from "../../application/use-cases/users/SearchUsersUseCase";

export class SearchUsersController {
  constructor(private searchUsersUseCase: SearchUsersUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      if (typeof q !== "string") {
        res.status(400).json({ message: "Search term is required" });
        return;
      }

      const searchResults = await this.searchUsersUseCase.execute(q);
      res.json(searchResults);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Error searching users" });
    }
  }
}
