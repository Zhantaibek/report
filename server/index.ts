import { config } from './config/index.js';
import { initDb, setDb, closeDb } from './db/index.js';
import { syncReportForms } from './db/sync-report-forms.js';
import { syncAllReferenceToQuik } from './db/sync-reference-to-quik.js';
import { isQuikConfigured } from './config/quik-db.js';
import { canMutateQuikExport, getAppEnv } from './config/app-env.js';
import app from './app.js';
import { startCurrencyRatesJob } from './jobs/currency-rates.js';

const server = await (async () => {
  setDb(await initDb(config.database));
  await syncReportForms();
  console.log(`[app] APP_ENV=${getAppEnv()}, QUIK sync=${canMutateQuikExport() ? 'enabled' : 'disabled'}`);
  if (canMutateQuikExport() && isQuikConfigured()) {
    void syncAllReferenceToQuik();
  }
  return app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });
})();

startCurrencyRatesJob();

process.on('SIGTERM', async () => {
  server.close();
  await closeDb();
  process.exit(0);
});
