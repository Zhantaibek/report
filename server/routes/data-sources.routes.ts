import { Router } from 'express';
import {
  getDataSources,
  getDataSourceById,
  getFieldMappingByDataSourceId,
} from '../config/data-sources.js';
import { testConnection } from '../data-sources/index.js';
import { authMiddleware, requireRole } from '../auth/middleware.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', async (_req, res) => {
  const list = getDataSources(false);
  res.json(list.map((ds) => ({ ...ds, connection_config: undefined })));
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const ds = getDataSourceById(id);
  if (!ds) {
    res.status(404).json({ error: 'Data source not found' });
    return;
  }
  res.json({ ...ds, connection_config: undefined });
});

router.post('/:id/test', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const ds = getDataSourceById(id);
  if (!ds) {
    res.status(404).json({ error: 'Data source not found' });
    return;
  }
  const connConfig = JSON.parse(ds.connection_config);
  const ok = await testConnection(ds.type, connConfig);
  res.json({ ok });
});

router.get('/:id/mapping', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const mapping = getFieldMappingByDataSourceId(id);
  if (!mapping) {
    res.status(404).json({ error: 'Mapping not found' });
    return;
  }
  res.json(mapping);
});

export default router;
