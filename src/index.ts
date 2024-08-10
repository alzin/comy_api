import { log } from "console";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { serve, setup } from "swagger-ui-express";
import swaggerJSDocs from "swagger-jsdoc";
import swaggerDocument from "./swagger.json";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;

const definition = swaggerDocument;

const options = {
  definition,
  apis: ["./index.ts"],
};

const swaggerSpec = swaggerJSDocs(options);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});
app.use("/docs", serve, setup(swaggerSpec));

app.use("/auth", authRouter);

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  log(`Server is running on http://localhost:${PORT}`);
});
