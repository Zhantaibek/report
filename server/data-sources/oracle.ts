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
    const cp = [BRIDGE_DIR, OJDBC_JAR].join(path.delimiter);
    const baseArgs = [host, String(port), sid, user, password, ...args];
    // TODO(временно): убрать после отладки
    const logArgs = [...baseArgs];
    logArgs[3] = '***';
    logArgs[4] = '***';
    console.log('[oracle-jdbc DEBUG]', className, 'args:', logArgs);

    execFile(
      JAVA_BIN,
      ['-cp', cp, className, ...baseArgs],
      { cwd: BRIDGE_DIR, timeout: 30000 },
      (err, stdout, stderr) => {
        const errText = (stderr || '').trim();
        if (!err) {
          if (errText) console.warn(`[oracle-jdbc:${className}] stderr:`, errText);
          resolve(stdout.trim());
          return;
        }

        const classNotFound =
          errText.includes(`ClassNotFoundException: ${className}`) ||
          errText.includes(`Could not find or load main class ${className}`);
        if (!classNotFound) {
          reject(new Error(errText || err.message));
          return;
        }

        execFile(
          JAVA_BIN,
          ['-cp', cp, `${className}.java`, ...baseArgs],
          { cwd: BRIDGE_DIR, timeout: 30000 },
          (err2, stdout2, stderr2) => {
            const errText2 = (stderr2 || '').trim();
            if (err2) {
              reject(new Error(errText2 || err2.message));
              return;
            }
            if (errText2) console.warn(`[oracle-jdbc:${className}] stderr:`, errText2);
            resolve(stdout2.trim());
          }
        );
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

export interface GoldContractRow {
  serial: number;
  trade_date: string;
  quantity: number;
  price: number;
  value: number;
  /** CURRINSTRUMENT.NAMERUS (эмитент / наименование) */
  issuer_namerus?: string | null;
  /** CURRINSTRUMENT.EXTCODE */
  sec_extcode?: string | null;
  seller_name?: string | null;
  sell_account?: string | null;
  seller_trader?: string | null;
  buyer_name?: string | null;
  buy_account?: string | null;
  buyer_trader?: string | null;
}

export async function queryOracleGold(
  dateFrom: string,
  dateTo: string,
  ownId?: number,
): Promise<GoldContractRow[]> {
  const effectiveOwnId = ownId ?? config.oracle.ownId;
  const raw = await runJavaBridge('OracleGoldQuery', [dateFrom, dateTo, String(effectiveOwnId)]);
  const rows = JSON.parse(raw) as Record<string, unknown>[];
  return rows.map((r) => ({
    serial:     Number(r.serial     ?? 0),
    trade_date: String(r.trade_date ?? ''),
    quantity:   Number(r.quantity   ?? 0),
    price:      Number(r.price      ?? 0),
    value:      Number(r.value      ?? 0),
    issuer_namerus: r.issuer_namerus != null ? String(r.issuer_namerus) : null,
    sec_extcode:    r.sec_extcode != null ? String(r.sec_extcode) : null,
    seller_name:    r.seller_name != null ? String(r.seller_name) : null,
    sell_account:   r.sell_account != null ? String(r.sell_account) : null,
    seller_trader:  r.seller_trader != null ? String(r.seller_trader) : null,
    buyer_name:     r.buyer_name != null ? String(r.buyer_name) : null,
    buy_account:    r.buy_account != null ? String(r.buy_account) : null,
    buyer_trader:   r.buyer_trader != null ? String(r.buyer_trader) : null,
  }));
}
