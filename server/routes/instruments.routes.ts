/**
 * ВРЕМЕННО — удалить вместе с:
 * - server/oracle-bridge/OracleCurrInstrumentsAll.java
 * - queryOracleCurrInstrumentsAll() в server/data-sources/oracle.ts
 * - регистрацию в server/routes/index.ts
 */
import { Router } from 'express';
import { queryOracleCurrInstrumentsAll } from '../data-sources/oracle.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const instruments = await queryOracleCurrInstrumentsAll();
    res.json(instruments);
  } catch (err) {
    console.error('[/api/instruments]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Oracle query failed' });
  }
});

export default router;
