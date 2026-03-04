import bcrypt from 'bcryptjs';
import { initDb, setDb, closeDb } from './index.js';
import { config } from '../config/index.js';
import * as usersRepo from './repositories/users.js';
import * as currencyRatesRepo from './repositories/currencyRates.js';
import * as reportFormsRepo from './repositories/reportForms.js';
import { getAllReportDefinitions } from '../reports/report-definitions.js';

async function main(): Promise<void> {
  setDb(await initDb(config.database));

  const existingAdmin = await usersRepo.findUserByLogin('admin');
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin', 10);
    await usersRepo.createUser('admin', hash, 'admin', 'Administrator');
    console.log('Created admin user (login: admin, password: admin).');
  }

  // Синхронизируем формы отчетов из кода в БД (только базовые данные)
  const reportDefinitions = getAllReportDefinitions();
  const existingForms = await reportFormsRepo.getReportForms();
  const existingCodes = existingForms.map(f => f.code);
  
  for (const def of reportDefinitions) {
    if (!existingCodes.includes(def.code)) {
      await reportFormsRepo.createReportForm({
        code: def.code,
        name: def.name,
        description: def.description,
        type: def.type,
        category: def.category,
        singleDate: def.singleDate,
      });
      console.log(`Created report form: ${def.code}`);
    } else {
      await reportFormsRepo.updateReportFormByCode(def.code, { singleDate: def.singleDate });
    }
  }

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
