import { log } from "console";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "swagger-ui.html"));
});

app.use("/auth", authRouter);

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  log(`Server is running on http://localhost:${PORT}`);
});
