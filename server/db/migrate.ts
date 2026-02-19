import { config } from '../config/index.js';
import { initDb, closeDb } from './index.js';

async function main(): Promise<void> {
  console.log('Applying schema to', config.database.host, config.database.database);
  await initDb(config.database);
  await closeDb();
  console.log('Schema applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
