import { log } from "console";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { serve, setup } from "swagger-ui-express";
import dotenv from "dotenv";
dotenv.config();

const CSS_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use(
  "/docs",
  serve,
  setup(undefined, {
    customCssUrl: CSS_URL,
    swaggerOptions: {
      url: "/swagger.json",
    },
  }),
);

app.use("/auth", authRouter);

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  log(`Server is running on http://localhost:${PORT}`);
});
