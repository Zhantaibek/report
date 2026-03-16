import { getDb } from '../index.js';

export type CommissionSide = 'seller' | 'buyer' | 'both';

export interface CommissionTariff {
  id: number;
  class_code: string | null;
  volume_from: number;
  volume_to: number | null;
  side: CommissionSide;
  rate_percent: number;
  discount_percent: number | null;
  max_commission: number | null;
  is_active: boolean;
}

export interface CreateCommissionTariffDto {
  class_code: string | null;
  volume_from: number;
  volume_to: number | null;
  side: CommissionSide;
  rate_percent: number;
  discount_percent?: number | null;
  max_commission?: number | null;
  is_active?: boolean;
}

export interface UpdateCommissionTariffDto {
  class_code?: string | null;
  volume_from?: number;
  volume_to?: number | null;
  side?: CommissionSide;
  rate_percent?: number;
  discount_percent?: number | null;
  max_commission?: number | null;
  is_active?: boolean;
}

export async function getAllCommissionTariffs(): Promise<CommissionTariff[]> {
  const db = getDb();
  const result = await db.query<CommissionTariff>(
    'SELECT id, class_code, volume_from, volume_to, side, rate_percent, discount_percent, max_commission, is_active FROM commission_tariffs ORDER BY id ASC',
  );
  return result.rows;
}

export async function createCommissionTariff(data: CreateCommissionTariffDto): Promise<CommissionTariff> {
  const db = getDb();
  const result = await db.query<CommissionTariff>(
    `INSERT INTO commission_tariffs
      (class_code, volume_from, volume_to, side, rate_percent, discount_percent, max_commission, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, TRUE))
     RETURNING id, class_code, volume_from, volume_to, side, rate_percent, discount_percent, max_commission, is_active`,
    [
      data.class_code,
      data.volume_from,
      data.volume_to,
      data.side,
      data.rate_percent,
      data.discount_percent ?? null,
      data.max_commission ?? null,
      data.is_active ?? true,
    ],
  );
  return result.rows[0];
}

export async function updateCommissionTariff(id: number, data: UpdateCommissionTariffDto): Promise<CommissionTariff | null> {
  const db = getDb();

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx += 1;
  }

  if (fields.length === 0) {
    const existing = await db.query<CommissionTariff>(
      'SELECT id, class_code, volume_from, volume_to, side, rate_percent, discount_percent, max_commission, is_active FROM commission_tariffs WHERE id = $1',
      [id],
    );
    return existing.rows[0] ?? null;
  }

  values.push(id);

  const sql = `UPDATE commission_tariffs SET ${fields.join(', ')} WHERE id = $${idx}
    RETURNING id, class_code, volume_from, volume_to, side, rate_percent, discount_percent, max_commission, is_active`;

  const result = await db.query<CommissionTariff>(sql, values);
  return result.rows[0] ?? null;
}

export async function deleteCommissionTariff(id: number): Promise<void> {
  const db = getDb();
  await db.query('DELETE FROM commission_tariffs WHERE id = $1', [id]);
}

