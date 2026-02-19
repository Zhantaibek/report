import bcrypt from 'bcryptjs';
import { initDb, setDb, closeDb } from './index.js';
import { config } from '../config/index.js';
import * as usersRepo from './repositories/users.js';
import * as brokersRepo from './repositories/brokers.js';
import * as currencyRatesRepo from './repositories/currencyRates.js';
import * as dataSourcesRepo from './repositories/dataSources.js';
import * as fieldMappingsRepo from './repositories/fieldMappings.js';
import * as reportFormsRepo from './repositories/reportForms.js';
import { getAllReportDefinitions } from '../reports/report-definitions.js';

async function main(): Promise<void> {
  setDb(await initDb(config.database));

  const existingBrokers = await brokersRepo.getBrokers();
  if (existingBrokers.length === 0) {
    await brokersRepo.createBroker('Broker A', 'BRK_A');
    await brokersRepo.createBroker('Broker B', 'BRK_B');
    console.log('Created sample brokers.');
  }

  const existingAdmin = await usersRepo.findUserByLogin('admin');
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin', 10);
    await usersRepo.createUser('admin', hash, 'admin', null, 'Administrator');
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

  const quikHost = process.env.POSTGRES_QUIK_HOST;
  const quikPort = process.env.POSTGRES_QUIK_PORT;
  const quikDatabase = process.env.POSTGRES_QUIK_DATABASE;
  const quikUser = process.env.POSTGRES_QUIK_USER;
  const quikPassword = process.env.POSTGRES_QUIK_PASSWORD ?? '';
  const existingSources = await dataSourcesRepo.getDataSources();
  const hasQuikSource = existingSources.some((s) => s.name === 'QUIK Export');
  if (quikHost && quikDatabase && quikUser && String(quikPassword).length > 0 && !hasQuikSource) {
    const port = quikPort ? parseInt(quikPort, 10) : 5432;
    const id = await dataSourcesRepo.createDataSource(
      'QUIK Export',
      'postgres',
      {
        host: quikHost,
        port: Number.isNaN(port) ? 5432 : port,
        database: quikDatabase,
        user: quikUser,
        password: quikPassword,
      },
      true
    );
    await fieldMappingsRepo.upsertFieldMapping(id, 'Trades', {
      id: 'TradeNum',
      operation: 'Operation',
      brokerCode: 'FirmId',
      brokerName: 'FirmName',
      counterparty: 'CPFirmId',
      counterpartyName: 'CPFirmName',
      classCode: 'ClassCode',
      secCode: 'SecCode',
      tradeDate: 'TradeDate',
      settleDate: 'SettleDate',
      price: 'Price',
      quantity: 'Qty',
      value: 'Value',
    });
    console.log('Created data source QUIK Export (PostgreSQL).');
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
