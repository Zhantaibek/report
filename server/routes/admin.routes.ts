import { Router } from 'express';
import { authMiddleware, requireRole } from '../auth/middleware.js';
import { syncAllReferenceToQuik } from '../db/sync-reference-to-quik.js';

const router = Router();
router.use(authMiddleware, requireRole('admin'));

/** Полная синхронизация справочников APP_DB → QUIK Export */
router.post('/sync-reference-to-quik', async (_req, res) => {
  const result = await syncAllReferenceToQuik();
  if (!result.ok) {
    res.status(500).json(result);
    return;
  }
  res.json(result);
});

export default router;
