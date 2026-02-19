import { Router } from 'express';
import {
  getDataSources,
  getDataSourceById,
  createDataSource,
  updateDataSource,
  deleteDataSource,
} from '../db/repositories/dataSources.js';
import {
  getFieldMappingByDataSourceId,
  upsertFieldMapping,
} from '../db/repositories/fieldMappings.js';
import { testConnection } from '../data-sources/index.js';
import { authMiddleware, requireRole } from '../auth/middleware.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', async (_req, res) => {
  const list = await getDataSources(false);
  res.json(list.map((ds) => ({ ...ds, connection_config: undefined })));
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const ds = await getDataSourceById(id);
  if (!ds) {
    res.status(404).json({ error: 'Data source not found' });
    return;
  }
  res.json({ ...ds, connection_config: undefined });
});

router.post('/', async (req, res) => {
  const { name, type, connectionConfig, isActive } = req.body ?? {};
  if (!name || !type || !connectionConfig) {
    res.status(400).json({ error: 'name, type, connectionConfig required' });
    return;
  }
  const id = await createDataSource(name, type, connectionConfig, isActive !== false);
  res.status(201).json({ id });
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const { name, type, connection_config, is_active } = req.body ?? {};
  await updateDataSource(id, { name, type, connection_config, is_active });
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  await deleteDataSource(id);
  res.json({ ok: true });
});

router.post('/:id/test', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const ds = await getDataSourceById(id);
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
  const mapping = await getFieldMappingByDataSourceId(id);
  if (!mapping) {
    res.status(404).json({ error: 'Mapping not found' });
    return;
  }
  res.json(mapping);
});

router.put('/:id/mapping', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const { tableName, columnMappings } = req.body ?? {};
  if (!tableName || !columnMappings) {
    res.status(400).json({ error: 'tableName, columnMappings required' });
    return;
  }
  await upsertFieldMapping(id, tableName, columnMappings);
  res.json({ ok: true });
});

export default router;
