import { config } from './config/index.js';
import { initDb, setDb, closeDb } from './db/index.js';
import app from './app.js';
import { startCurrencyRatesJob } from './jobs/currency-rates.js';

const server = await (async () => {
  setDb(await initDb(config.database));
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
