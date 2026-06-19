import { Router } from 'express';
import { authMiddleware, requireRole } from '../auth/middleware.js';
import {
  listEmailReports,
  getEmailReportById,
} from '../db/repositories/emailReports.js';
import { sendDailyReportsToBrokers, resendEmailReport } from '../email-reports/send-service.js';
import {
  EMAIL_REPORT_DEFINITIONS,
  generateEmailReportBuffer,
  getEmailReportDefinition,
} from '../email-reports/registry.js';
import { WORD_CONTENT_TYPE } from '../email-reports/docx.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/types', (_req, res) => {
  res.json(EMAIL_REPORT_DEFINITIONS.map((d) => ({
    code: d.code,
    name: d.reportTitle,
    reportTitle: d.reportTitle,
  })));
});

router.get('/', async (req, res) => {
  const q = req.query;
  const list = await listEmailReports({
    reportDateFrom: typeof q.dateFrom === 'string' ? q.dateFrom : undefined,
    reportDateTo: typeof q.dateTo === 'string' ? q.dateTo : undefined,
    brokerId: q.brokerId ? parseInt(String(q.brokerId), 10) : undefined,
    reportCode: typeof q.reportCode === 'string' ? q.reportCode : undefined,
    sendStatus: typeof q.status === 'string'
      ? (q.status as 'pending' | 'sent' | 'failed' | 'partial')
      : undefined,
    limit: q.limit ? parseInt(String(q.limit), 10) : 200,
    offset: q.offset ? parseInt(String(q.offset), 10) : 0,
  });
  res.json(list);
});

router.get('/:id/download', async (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  if (Number.isNaN(reportId)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const row = await getEmailReportById(reportId);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const definition = getEmailReportDefinition(row.report_code);
  if (!definition) {
    res.status(404).json({ error: 'Report type not found' });
    return;
  }
  const reportDate = row.report_date.slice(0, 10);
  const { buffer, filename } = await generateEmailReportBuffer(definition, reportDate);
  res.setHeader('Content-Type', WORD_CONTENT_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
});

router.post('/send-now', async (req, res) => {
  const body = req.body ?? {};
  const reportDate = typeof body.reportDate === 'string' ? body.reportDate : undefined;
  const force = Boolean(body.force);

  try {
    const result = await sendDailyReportsToBrokers({ reportDate, force });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Send failed' });
  }
});

router.post('/:id/resend', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  try {
    await resendEmailReport(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Resend failed' });
  }
});

export default router;
