import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

import { authenticate } from './middleware/auth';
import authRouter from './routes/auth';
import repositoriesRouter from './routes/repositories';
import deploymentsRouter from './routes/deployments';
import webhookRouter from './routes/webhook';
import incidentsRouter from './routes/incidents';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security & utility middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// Body parsing with rawBody capture for webhook signature verification
app.use(
  express.json({
    verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', service: 'shipyard-backend' });
});

// Mount application routers (supports both /api/* and /*)
app.use('/api/auth', authRouter);
app.use('/auth', authRouter);

app.use('/api/repositories', authenticate, repositoriesRouter);
app.use('/repositories', authenticate, repositoriesRouter);

app.use('/api/deployments', authenticate, deploymentsRouter);
app.use('/deployments', authenticate, deploymentsRouter);

app.use('/api/webhook', webhookRouter);
app.use('/webhook', webhookRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/webhooks', webhookRouter);

app.use('/api/incidents', authenticate, incidentsRouter);
app.use('/incidents', authenticate, incidentsRouter);

// 404 handler for undefined routes
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[Shipyard Backend Error]:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Shipyard backend API is running on http://localhost:${PORT}`);
});

export default app;
