import { Router, Request, Response } from 'express';
import { runStore } from './runStore';
import { runAgent } from '../agent/agent';
import crypto from 'crypto';

export const routes = Router();

routes.post('/runs', (req: Request, res: Response) => {
  const { task, url } = req.body;
  
  if (!task) {
    return res.status(400).json({ error: 'task is required' });
  }

  const runId = crypto.randomUUID();
  runStore.createRun(runId);

  // Start agent asynchronously
  runAgent(runId, task, url, (event) => {
    runStore.addStep(runId, event);
  }).catch(err => {
    console.error('Agent loop crashed:', err);
    runStore.addStep(runId, {
      type: 'error',
      message: 'Agent loop crashed unexpectedly.',
      timestamp: new Date().toISOString()
    });
  });

  res.json({ runId });
});

routes.get('/runs/:runId', (req: Request, res: Response) => {
  const run = runStore.getRun(req.params.runId);
  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }

  res.json({
    status: run.status,
    steps: run.steps,
    finalMessage: run.finalMessage
  });
});

routes.get('/runs/:runId/events', (req: Request, res: Response) => {
  const runId = req.params.runId;
  const run = runStore.getRun(runId);

  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send historical steps
  for (const step of run.steps) {
    res.write(`data: ${JSON.stringify(step)}\n\n`);
  }

  if (run.status !== 'running') {
    res.end();
    return;
  }

  const onEvent = (event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const onClose = () => {
    res.end();
  };

  run.emitter.on('event', onEvent);
  run.emitter.on('close', onClose);

  req.on('close', () => {
    run.emitter.off('event', onEvent);
    run.emitter.off('close', onClose);
  });
});
