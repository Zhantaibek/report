import * as reportFormsRepo from './repositories/reportForms.js';
import { getAllReportDefinitions } from '../reports/report-definitions.js';

/** Синхронизирует справочник форм из кода в БД (идемпотентно). */
export async function syncReportForms(): Promise<void> {
  const reportDefinitions = getAllReportDefinitions();
  const existingForms = await reportFormsRepo.getReportForms();
  const existingCodes = new Set(existingForms.map((f) => f.code));

  for (const def of reportDefinitions) {
    if (!existingCodes.has(def.code)) {
      await reportFormsRepo.createReportForm({
        code: def.code,
        name: def.name,
        description: def.description,
        type: def.type,
        category: def.category,
        singleDate: def.singleDate,
      });
      console.log(`[sync] Created report form: ${def.code}`);
    } else {
      await reportFormsRepo.updateReportFormByCode(def.code, { singleDate: def.singleDate });
    }
  }
}
