import { log } from "console";
import express from "express";
import authRouter from "./routes/auth";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    log(`Server is running on http://localhost:${PORT}`);
});