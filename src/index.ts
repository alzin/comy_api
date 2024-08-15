import { log } from "console";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import swaggerUI from "swagger-ui-express";
import swaggerDocument from "./swagger.json";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Vercel can't properly serve the Swagger UI CSS from its npm package, here we load it from a public location
const options = {
  customCssUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.3.0/swagger-ui.css",
};
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument, options));

app.use("/auth", authRouter);

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  log(`Server is running on http://localhost:${PORT}`);
});
