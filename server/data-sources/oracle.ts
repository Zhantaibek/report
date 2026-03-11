import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Если JAVA_BIN не задан, используем:
// - 'java' на Windows (берётся из PATH / App Execution Aliases)
// - '/usr/bin/java' в Linux (как в Docker-образе)
const JAVA_BIN = process.env.JAVA_BIN || (process.platform === 'win32' ? 'java' : '/usr/bin/java');
// Из dist (`server/dist/data-sources`) поднимаемся на уровень `server` и идём в `oracle-bridge`
const BRIDGE_DIR = path.join(__dirname, '..', '..', 'oracle-bridge');
const defaultJdbc =
  process.platform === 'win32'
    ? 'C:\\oracle\\ora81\\jdbc\\lib\\classes12.zip;C:\\oracle\\ora81\\jdbc\\lib\\nls_charset12.zip'
    : [path.join(BRIDGE_DIR, 'jdbc', 'classes12.zip'), path.join(BRIDGE_DIR, 'jdbc', 'nls_charset12.zip')].join(path.delimiter);
const OJDBC_JAR = process.env.ORACLE_JDBC_JAR ?? defaultJdbc;

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
    console.log('[oracle-jdbc]', {
      javaBin: JAVA_BIN,
      bridgeDir: BRIDGE_DIR,
      className,
    });
    execFile(
      JAVA_BIN,
      ['-cp', [BRIDGE_DIR, OJDBC_JAR].join(path.delimiter), className, host, String(port), sid, user, password, ...args],
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
