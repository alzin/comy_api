import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../../main/config/config";

export const apiKeyMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const apiKey = req.headers["x-api-key"];

    if (apiKey === CONFIG.API_KEY) {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: "Invalid API Key"
    });
};