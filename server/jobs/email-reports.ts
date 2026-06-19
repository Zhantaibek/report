/**
 * Ежедневная email-рассылка отчётов брокерам (заявки + сделки за текущий день).
 */
import { config } from '../config/index.js';
import { isSmtpConfigured } from '../email/smtp.js';
import { isQuikConfigured } from '../config/quik-db.js';
import { sendDailyReportsToBrokers } from '../email-reports/send-service.js';

function msUntilNextRun(targetHour: number, targetMinute: number, utcOffsetHours: number): number {
  const now = new Date();
  const localNow = new Date(now.getTime() + utcOffsetHours * 60 * 60 * 1000);
  const next = new Date(localNow);
  next.setUTCHours(targetHour - utcOffsetHours, targetMinute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function runJob(): Promise<void> {
  if (!isQuikConfigured() || !isSmtpConfigured()) {
    console.warn('[email-reports-job] Skipped: QUIK or SMTP not configured');
    return;
  }
  try {
    const result = await sendDailyReportsToBrokers();
    console.log(
      `[email-reports-job] Done for ${result.reportDate}: ` +
        `${result.emailsSent}/${result.brokersProcessed} emails, errors=${result.errors.length}`,
    );
    if (result.errors.length > 0) {
      result.errors.forEach((e) => console.error(`[email-reports-job] ${e}`));
    }
  } catch (err) {
    console.error('[email-reports-job] Fatal error:', err);
  }
}

export function startEmailReportsJob(): void {
  const { dailyHour, dailyMinute, utcOffsetHours } = config.emailReports;

  function scheduleNext() {
    const delay = msUntilNextRun(dailyHour, dailyMinute, utcOffsetHours);
    const nextAt = new Date(Date.now() + delay).toISOString();
    console.log(
      `[email-reports-job] Next run at ${nextAt} (in ${Math.round(delay / 60000)} min)`,
    );
    return setTimeout(async () => {
      await runJob();
      scheduleNext();
    }, delay);
  }

  scheduleNext();
  console.log(
    `[email-reports-job] Started. Daily at ${String(dailyHour).padStart(2, '0')}:${String(dailyMinute).padStart(2, '0')} UTC+${utcOffsetHours}`,
  );
}
