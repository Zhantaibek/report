import { initDb, setDb, closeDb } from './index.js';
import { config } from '../config/index.js';
import * as usersRepo from './repositories/users.js';
import * as currencyRatesRepo from './repositories/currencyRates.js';
import { syncReportForms } from './sync-report-forms.js';

async function main(): Promise<void> {
  setDb(await initDb(config.database));

  const bootstrapAdmin = config.ldap.bootstrapAdminLogin.trim();
  if (bootstrapAdmin) {
    const existing = await usersRepo.findUserByLogin(bootstrapAdmin);
    if (!existing) {
      await usersRepo.createUser(bootstrapAdmin, 'admin', null);
      console.log(`Created bootstrap admin (login: ${bootstrapAdmin}).`);
    }
  }

  await syncReportForms();

  const rates = await currencyRatesRepo.getCurrencyRates();
  if (rates.length === 0) {
    await currencyRatesRepo.upsertCurrencyRate('USD', 90);
    console.log('Created sample currency rate USD/KGS.');
  }

  await closeDb();
  console.log('Seed done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
