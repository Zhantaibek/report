import { getAllTradeClassRules, type MarketType } from '../db/repositories/tradeClassRules.js';

let cachedRules: Map<string, MarketType> | null = null;

export function clearTradeClassRulesCache(): void {
  cachedRules = null;
}

export async function loadTradeClassRulesMap(force = false): Promise<Map<string, MarketType>> {
  if (cachedRules && !force) return cachedRules;
  const rows = await getAllTradeClassRules();
  cachedRules = new Map(rows.map((r) => [r.class_code.toLowerCase(), r.market_type]));
  return cachedRules;
}

/** CTE для подстановки в SQL-отчёты QUIK (Form 5 и др.). */
export function buildMarketRulesSqlCte(rules: Map<string, MarketType>): string {
  if (rules.size === 0) {
    return `market_rules AS (
  SELECT NULL::text AS class_code, NULL::text AS market_type WHERE false
)`;
  }
  const values = [...rules.entries()]
    .map(([code, type]) => {
      const esc = code.replace(/'/g, "''");
      return `('${esc}', '${type}')`;
    })
    .join(',\n    ');
  return `market_rules AS (
  SELECT * FROM (VALUES
    ${values}
  ) AS t(class_code, market_type)
)`;
}

export function resolveMarketTypeSync(
  rules: Map<string, MarketType>,
  classCode?: string,
): MarketType {
  const code = (classCode ?? '').trim().toLowerCase();
  if (code && rules.has(code)) {
    return rules.get(code)!;
  }
  return 'secondary';
}

export async function resolveMarketType(classCode?: string): Promise<MarketType> {
  const rules = await loadTradeClassRulesMap();
  return resolveMarketTypeSync(rules, classCode);
}

export function isPrimaryMarketType(marketType?: string | null): boolean {
  return marketType === 'primary';
}
