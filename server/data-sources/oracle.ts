import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE_DIR = path.join(__dirname, '..', 'oracle-bridge');
const OJDBC_JAR = 'C:\\oracle\\ora81\\jdbc\\lib\\classes12.zip;C:\\oracle\\ora81\\jdbc\\lib\\nls_charset12.zip';

export interface UsdTradeRow {
  trade_date: string;   // YYYY-MM-DD
  deal_count: number;
  sec_count: number;
  volume_usd: number;
}

export interface OracleInstrument {
  id: number;
  namerus: string;
  extcode: string;
}

function runJavaBridge(className: string, args: string[]): Promise<string> {
  const { host, port, sid, user, password } = config.oracle;
  return new Promise((resolve, reject) => {
    execFile(
      'java',
      ['-cp', `${BRIDGE_DIR};${OJDBC_JAR}`, className, host, String(port), sid, user, password, ...args],
      { cwd: BRIDGE_DIR, timeout: 30000 },
      (err, stdout, stderr) => {
        if (stderr) console.warn(`[oracle-jdbc:${className}] stderr:`, stderr.trim());
        if (err) { reject(new Error(stderr.trim() || err.message)); return; }
        resolve(stdout.trim());
      }
    );
  });
}

export async function queryOracleInstruments(): Promise<OracleInstrument[]> {
  const raw = await runJavaBridge('OracleInstruments', []);
  const rows = JSON.parse(raw) as Record<string, unknown>[];
  return rows.map((r) => ({
    id:      Number(r.id ?? 0),
    namerus: String(r.namerus ?? ''),
    extcode: String(r.extcode ?? ''),
  }));
}

export async function queryOracleUsd(
  dateFrom: string,
  dateTo: string,
  ownId?: number,
): Promise<UsdTradeRow[]> {
  const effectiveOwnId = ownId ?? config.oracle.ownId;
  const raw = await runJavaBridge('OracleQuery', [dateFrom, dateTo, String(effectiveOwnId)]);
  const rows = JSON.parse(raw) as Record<string, unknown>[];
  return rows.map((r) => ({
    trade_date: String(r.trade_date ?? ''),
    deal_count: Number(r.deal_count ?? 0),
    sec_count:  Number(r.sec_count  ?? 0),
    volume_usd: Number(r.volume_usd ?? 0),
  }));
}
