import { Router } from 'express';
import { authMiddleware, applyBrokerFilter } from '../auth/middleware.js';
import { runReport } from '../reports/report-engine.js';
import { reportToXlsxBuffer } from '../reports/export/xlsx.js';
import { reportToCsv } from '../reports/export/csv.js';
import { getDataSources } from '../config/data-sources.js';
import { getSecurities, getClasses, getFirms } from '../data-sources/index.js';
import { queryOracleUsd, queryOracleInstruments } from '../data-sources/oracle.js';
import { getCurrencyRateForDate } from '../db/repositories/currencyRates.js';

const router = Router();

router.use(authMiddleware);

router.get('/securities', async (_req, res) => {
  try {
    const sources = getDataSources(true);
    const results = await Promise.all(sources.map((ds) => getSecurities(ds.id)));
    const merged = new Map<string, { secCode: string; classCode: string; secFullName: string }>();
    for (const list of results) {
      for (const item of list) {
        if (!merged.has(item.secCode)) merged.set(item.secCode, item);
      }
    }
    const securities = Array.from(merged.values()).sort((a, b) => a.secCode.localeCompare(b.secCode));
    console.log('[/api/reports/securities] returning', securities.length, 'securities');
    res.json(securities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load securities' });
  }
});

router.get('/classes', async (_req, res) => {
  try {
    const sources = getDataSources(true);
    const results = await Promise.all(sources.map((ds) => getClasses(ds.id)));
    const merged = new Map<string, { code: string; name: string }>();
    for (const list of results) {
      for (const item of list) {
        if (!merged.has(item.code)) merged.set(item.code, item);
      }
    }
    const classes = Array.from(merged.values()).sort((a, b) => a.code.localeCompare(b.code));
    console.log('[/api/reports/classes] returning', classes.length, 'classes:', classes.map((c) => c.code).join(', '));
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load classes' });
  }
});

router.get('/firms', async (_req, res) => {
  try {
    const sources = getDataSources(true);
    const results = await Promise.all(sources.map((ds) => getFirms(ds.id)));
    const merged = new Map<string, { firmId: string; firmName: string }>();
    for (const list of results) {
      for (const item of list) {
        if (!merged.has(item.firmId)) merged.set(item.firmId, item);
      }
    }
    const firms = Array.from(merged.values()).sort((a, b) => a.firmId.localeCompare(b.firmId));
    res.json(firms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load firms' });
  }
});

router.post('/run', async (req, res) => {
  try {
    const { reportFormId, dataSourceIds, filters = {}, page, limit } = req.body ?? {};
    if (!reportFormId) {
      res.status(400).json({ error: 'reportFormId required' });
      return;
    }
    const f = { ...filters };
    applyBrokerFilter(req, f);
    const result = await runReport({
      reportFormId: Number(reportFormId),
      dataSourceIds: Array.isArray(dataSourceIds) ? dataSourceIds.map(Number) : undefined,
      filters: f,
      page: page != null ? Number(page) : 1,
      limit: limit != null ? Number(limit) : 50,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Report failed' });
  }
});

/** Список инструментов из Oracle CURRINSTRUMENT */
router.get('/usd/instruments', async (_req, res) => {
  try {
    const instruments = await queryOracleInstruments();
    res.json(instruments);
  } catch (err) {
    console.error('[/api/reports/usd/instruments]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Oracle query failed' });
  }
});

/**
 * USD-отчёт: данные из Oracle (ARCTS.DEAL) + курс USD из PostgreSQL.
 */
router.post('/usd', async (req, res) => {
  try {
    const { dateFrom, dateTo, ownId } = req.body ?? {};
    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: 'dateFrom and dateTo required' });
      return;
    }

    const oracleRows = await queryOracleUsd(dateFrom, dateTo, ownId ? Number(ownId) : undefined);

    // Добавляем курс USD из нашей PostgreSQL таблицы currency_rates
    const rows = await Promise.all(
      oracleRows.map(async (row) => {
        const rateRow = await getCurrencyRateForDate('USD', row.trade_date);
        const usd_rate = rateRow?.rate ?? null;
        const volume_som = usd_rate != null ? Math.round(row.volume_usd * usd_rate * 100) / 100 : null;
        return {
          trade_date: row.trade_date,
          deal_count: row.deal_count,
          sec_count:  row.sec_count,
          price_usd:  100,
          volume_usd: row.volume_usd,
          usd_rate,
          volume_som,
        };
      })
    );

    res.json({ rows });
  } catch (err) {
    console.error('[/api/reports/usd]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Oracle query failed' });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { reportFormId, dataSourceIds, filters = {}, format } = req.body ?? {};
    if (!reportFormId) {
      res.status(400).json({ error: 'reportFormId required' });
      return;
    }
    const f = { ...filters };
    applyBrokerFilter(req, f);
    const result = await runReport({
      reportFormId: Number(reportFormId),
      dataSourceIds: Array.isArray(dataSourceIds) ? dataSourceIds.map(Number) : undefined,
      filters: f,
      page: 1,
      limit: 100000,
    });
    const fmt = (format ?? 'xlsx').toLowerCase();
    if (fmt === 'csv') {
      const csv = reportToCsv(result);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
      res.send(csv);
    } else {
      const buf = reportToXlsxBuffer(result);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
      res.send(buf);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
  }
});

export default router;
