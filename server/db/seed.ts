import bcrypt from 'bcryptjs';
import { initDb, setDb, closeDb } from './index.js';
import { config } from '../config/index.js';
import * as usersRepo from './repositories/users.js';
import * as currencyRatesRepo from './repositories/currencyRates.js';
import { syncReportForms } from './sync-report-forms.js';

async function main(): Promise<void> {
  setDb(await initDb(config.database));

  const existingAdmin = await usersRepo.findUserByLogin('admin');
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin', 10);
    await usersRepo.createUser('admin', hash, 'admin', 'Administrator');
    console.log('Created admin user (login: admin, password: admin).');
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
