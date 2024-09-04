import express, { Express } from "express";
import path from "path";

export const setupSwagger = (app: Express): void => {
    app.use(express.static(path.join(__dirname, "../../../docs")));

    app.get("/docs", (_, res) => {
        res.sendFile(path.join(__dirname, "../../../docs", "swagger-ui.html"));
    });
};