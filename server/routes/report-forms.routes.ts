import { Router } from 'express';
import { authMiddleware } from '../auth/middleware.js';
import { getReportForms, getReportFormById } from '../db/repositories/reportForms.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (_req, res) => {
  const forms = await getReportForms();
  res.json(forms);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const form = await getReportFormById(id);
  if (!form) {
    res.status(404).json({ error: 'Report form not found' });
    return;
  }
  res.json(form);
});

export default router;
