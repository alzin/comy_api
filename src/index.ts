import { log } from "console";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('⋆༺𓆩☠︎︎𓆪༻⋆<br>Hey, Maher!<br>It is from Ghaith and he has created his first API end point<br>⋆༺𓆩☠︎︎𓆪༻⋆');
});

app.listen(PORT, () => {
    log(`Server is running on http://localhost:${PORT}`);
});