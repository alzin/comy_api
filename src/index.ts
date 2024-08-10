import { log } from "console";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { serve, setup } from "swagger-ui-express";
import swaggerDocument from './swagger.json';
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api-docs', serve, setup(swaggerDocument));
app.use('/auth', authRouter);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    log(`Server is running on http://localhost:${PORT}`);
});