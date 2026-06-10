import { getDb } from '../index.js';

export type MarketType = 'primary' | 'secondary';

export interface TradeClassRule {
  id: number;
  class_code: string;
  class_name: string | null;
  market_type: MarketType;
}

export interface CreateTradeClassRuleDto {
  class_code: string;
  class_name?: string | null;
  market_type: MarketType;
}

export interface UpdateTradeClassRuleDto {
  class_code?: string;
  class_name?: string | null;
  market_type?: MarketType;
}

export async function getAllTradeClassRules(): Promise<TradeClassRule[]> {
  const db = getDb();
  const result = await db.query<TradeClassRule>(
    'SELECT id, class_code, class_name, market_type FROM trade_class_rules ORDER BY class_code ASC',
  );
  return result.rows;
}

export async function createTradeClassRule(data: CreateTradeClassRuleDto): Promise<TradeClassRule> {
  const db = getDb();
  const classCode = data.class_code.trim();
  const result = await db.query<TradeClassRule>(
    `INSERT INTO trade_class_rules (class_code, class_name, market_type)
     VALUES ($1, $2, $3)
     RETURNING id, class_code, class_name, market_type`,
    [classCode, data.class_name?.trim() || null, data.market_type],
  );
  return result.rows[0];
}

export async function updateTradeClassRule(
  id: number,
  data: UpdateTradeClassRuleDto,
): Promise<TradeClassRule | null> {
  const db = getDb();

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === 'class_code') {
      fields.push(`${key} = $${idx}`);
      values.push(String(value).trim());
    } else if (key === 'class_name') {
      fields.push(`${key} = $${idx}`);
      values.push(value == null || String(value).trim() === '' ? null : String(value).trim());
    } else {
      fields.push(`${key} = $${idx}`);
      values.push(value);
    }
    idx += 1;
  }

  if (fields.length === 0) {
    const existing = await db.query<TradeClassRule>(
      'SELECT id, class_code, class_name, market_type FROM trade_class_rules WHERE id = $1',
      [id],
    );
    return existing.rows[0] ?? null;
  }

  values.push(id);
  const sql = `UPDATE trade_class_rules SET ${fields.join(', ')} WHERE id = $${idx}
    RETURNING id, class_code, class_name, market_type`;
  const result = await db.query<TradeClassRule>(sql, values);
  return result.rows[0] ?? null;
}

export async function deleteTradeClassRule(id: number): Promise<void> {
  const db = getDb();
  await db.query('DELETE FROM trade_class_rules WHERE id = $1', [id]);
}
