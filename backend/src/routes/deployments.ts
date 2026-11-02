import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /:id: get single deployment with incidents and diagnoses
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: req.params.id,
        repository: {
          userId: req.userId,
        },
      },
      include: {
        repository: true,
        incidents: {
          include: {
            diagnoses: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    res.status(200).json({
      ...deployment,
      incident: deployment.incidents?.[0] || null,
    });
  } catch (err) {
    console.error(`[Deployments] Error fetching deployment ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch deployment' });
  }
});

// PATCH /:id/logs: append logs to a deployment
router.patch('/:id/logs', async (req: Request, res: Response): Promise<void> => {
  const { logs } = req.body;

  if (typeof logs !== 'string') {
    res.status(400).json({ error: 'Field "logs" must be a string' });
    return;
  }

  try {
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: req.params.id,
        repository: {
          userId: req.userId,
        },
      },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    const updated = await prisma.deployment.update({
      where: { id: req.params.id },
      data: {
        logs: (deployment.logs || '') + logs,
      },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error(`[Deployments] Error appending logs to deployment ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to update deployment logs' });
  }
});

// PATCH /:id/status: update deployment status
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;

  if (!status || typeof status !== 'string') {
    res.status(400).json({ error: 'Field "status" must be a non-empty string' });
    return;
  }

  try {
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: req.params.id,
        repository: {
          userId: req.userId,
        },
      },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    const updated = await prisma.deployment.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error(`[Deployments] Error updating status of deployment ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to update deployment status' });
  }
});

export default router;
