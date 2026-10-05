import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'shipyard-backend' });
});

app.listen(port, () => {
  console.log(`Shipyard backend API is running on http://localhost:${port}`);
});
