// src/modules/active-users-email/presentation/ActiveUsersEmailController.ts
// src/modules/active-users-email/presentation/ActiveUsersEmailController.ts
import { Request, Response } from "express";
import { SendActiveUsersEmailUseCase } from "../application/SendActiveUsersEmailUseCase";

export class ActiveUsersEmailController {
  constructor(private sendEmailUseCase: SendActiveUsersEmailUseCase) {}

  async handle(req: Request, res: Response): Promise<Response> {
    const { subject, htmlContent } = req.body;

    // التحقق الصحيح من الحقول المطلوبة
    if (!subject || typeof subject !== "string") {
      return res.status(400).json({ 
        success: false,
        error: "Subject is required and must be a string" 
      });
    }

    if (!htmlContent || typeof htmlContent !== "string") {
      return res.status(400).json({ 
        success: false,
        error: "HTML content is required and must be a string" 
      });
    }

    try {
      const result = await this.sendEmailUseCase.execute(subject, htmlContent);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
}