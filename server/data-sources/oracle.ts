import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE_DIR = path.join(__dirname, '..', 'oracle-bridge');
const OJDBC_JAR = 'C:\\oracle\\ora81\\jdbc\\lib\\classes12.zip';

export interface UsdTradeRow {
  trade_date: string;   // YYYY-MM-DD
  deal_count: number;
  sec_count: number;
  volume_usd: number;
}

/**
 * Fetch USD bond trade data from Oracle via JDBC bridge.
 * Returns rows grouped by date: deal_count, sec_count, volume_usd.
 * Exchange rate (usd_rate) is added by the caller from PostgreSQL.
 */
export async function queryOracleUsd(
  dateFrom: string,
  dateTo: string
): Promise<UsdTradeRow[]> {
  const { host, port, sid, user, password, ownId } = config.oracle;

  return new Promise((resolve, reject) => {
    execFile(
      'java',
      [
        '-cp', `${BRIDGE_DIR};${OJDBC_JAR}`,
        'OracleQuery',
        host, String(port), sid, user, password,
        dateFrom, dateTo, String(ownId),
      ],
      { cwd: BRIDGE_DIR, timeout: 30000 },
      (err, stdout, stderr) => {
        if (stderr) console.warn('[oracle-jdbc] stderr:', stderr.trim());
        if (err) {
          reject(new Error(stderr.trim() || err.message));
          return;
        }
        try {
          const rows = JSON.parse(stdout.trim()) as Record<string, unknown>[];
          resolve(rows.map((r) => ({
            trade_date: String(r.trade_date ?? ''),
            deal_count: Number(r.deal_count ?? 0),
            sec_count:  Number(r.sec_count  ?? 0),
            volume_usd: Number(r.volume_usd ?? 0),
          })));
        } catch {
          reject(new Error('Failed to parse Oracle JDBC output: ' + stdout.slice(0, 300)));
        }
      }
    );
  });
}
