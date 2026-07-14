import {
  AlignmentType,
  BorderStyle,
  Document,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

const ORG_HEADER_LINES = [
  'Кыргызская Фондовая Биржа',
  'Кыргыз Фондулук Биржасы',
  'Kyrgyz Stock Exchange',
] as const;

const REPORT_FONT = 'Times New Roman';
const REPORT_FONT_SIZE = 24; // 12 pt
const REPORT_FONT_SIZE_ORG = 28; // 14 pt

const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
};

const mmToTwips = (mm: number) => Math.round((1440 / 25.4) * mm);

const CELL_MARGINS = {
  top: mmToTwips(0.5),
  bottom: mmToTwips(0.5),
  left: mmToTwips(1),
  right: mmToTwips(1),
};

export interface DocxReportMeta {
  title: string;
  reportDate: string;
  generatedAt?: Date;
  utcOffsetHours?: number;
  tableHeaderRows?: string[][];
}

function formatReportDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
}

function formatGeneratedAt(date: Date, utcOffsetHours: number): string {
  const local = new Date(date.getTime() + utcOffsetHours * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local.getUTCDate()}/${local.getUTCMonth() + 1}/${local.getUTCFullYear()} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

function formatCellValue(value: unknown, key: string): string {
  if (value == null || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (key === 'deal_count' || key === 'qty' || key === 'order_num' || key === 'buy_qty' || key === 'sell_qty') {
    return String(Math.round(n));
  }
  if (
    ['max_price', 'min_price', 'avg_price', 'volume', 'price', 'value', 'balance', 'buy_price', 'sell_price'].includes(
      key,
    )
  ) {
    return String(Math.round(n * 100) / 100);
  }
  return String(value);
}

function textRun(text: string, opts?: { bold?: boolean; size?: number }): TextRun {
  return new TextRun({
    text,
    bold: opts?.bold,
    font: REPORT_FONT,
    size: opts?.size ?? REPORT_FONT_SIZE,
  });
}

const TEXT_ALIGN_KEYS = new Set(['sec_name', 'sec_type']);

function cellAlign(key: string): { center?: boolean; right?: boolean } {
  if (TEXT_ALIGN_KEYS.has(key)) return {};
  if (key === 'order_datetime') return { center: true };
  return { right: true };
}

function paragraph(text: string, opts?: { bold?: boolean; center?: boolean; right?: boolean; size?: number }): Paragraph {
  const alignment = opts?.center
    ? AlignmentType.CENTER
    : opts?.right
      ? AlignmentType.RIGHT
      : AlignmentType.LEFT;

  return new Paragraph({
    alignment,
    children: [textRun(text, { bold: opts?.bold, size: opts?.size })],
  });
}

function tableCell(
  text: string,
  opts?: { bold?: boolean; center?: boolean; right?: boolean; columnSpan?: number; rowSpan?: number },
): TableCell {
  return new TableCell({
    borders: CELL_BORDER,
    margins: CELL_MARGINS,
    columnSpan: opts?.columnSpan,
    rowSpan: opts?.rowSpan,
    verticalAlign: VerticalAlign.CENTER,
    children: [paragraph(text, { bold: opts?.bold, center: opts?.center, right: opts?.right })],
  });
}

function numericValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function getSumKeys(keys: string[]): Set<string> {
  if (keys.includes('buy_qty')) return new Set(['buy_qty', 'sell_qty']);
  if (keys.includes('deal_count')) return new Set(['deal_count', 'qty', 'volume']);
  return new Set();
}

function computeTotals(rows: Record<string, unknown>[], sumKeys: Set<string>): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const key of sumKeys) {
    totals[key] = rows.reduce((acc, row) => {
      const n = numericValue(row[key]);
      return n != null ? acc + n : acc;
    }, 0);
  }
  return totals;
}

function buildTotalsRow(keys: string[], totals: Record<string, number>, sumKeys: Set<string>): TableRow {
  return new TableRow({
    children: keys.map((k, i) => {
      if (i === 0) return tableCell('Итого', { bold: true });
      if (sumKeys.has(k)) return tableCell(formatCellValue(totals[k], k), { bold: true, ...cellAlign(k) });
      return tableCell('', { bold: true });
    }),
  });
}

function buildPrefixParagraphs(meta: DocxReportMeta): Paragraph[] {
  const date = formatReportDate(meta.reportDate);
  const formedAt = formatGeneratedAt(meta.generatedAt ?? new Date(), meta.utcOffsetHours ?? 6);
  return [
    ...ORG_HEADER_LINES.map((line) => paragraph(line, { bold: true, center: true, size: REPORT_FONT_SIZE_ORG })),
    paragraph(''),
    paragraph(meta.title, { bold: true }),
    paragraph(`За период с: ${date} по: ${date}`, { bold: true }),
    paragraph(`Дата формирования: ${formedAt}`, { bold: true }),
    paragraph(''),
  ];
}

function buildOrdersHeaderRows(): TableRow[] {
  return [
    new TableRow({
      children: [
        tableCell('Наименование ЦБ', { bold: true, center: true, rowSpan: 2 }),
        tableCell('Заявка на покупку', { bold: true, center: true, columnSpan: 2 }),
        tableCell('Предложения на продажу', { bold: true, center: true, columnSpan: 2 }),
        tableCell('Дата время', { bold: true, center: true, rowSpan: 2 }),
      ],
    }),
    new TableRow({
      children: [
        tableCell('Кол-во', { bold: true, right: true }),
        tableCell('Цена (сом)', { bold: true, right: true }),
        tableCell('Кол-во', { bold: true, right: true }),
        tableCell('Цена (сом)', { bold: true, right: true }),
      ],
    }),
  ];
}

function buildSimpleHeaderRow(keys: string[], labels: string[]): TableRow {
  return new TableRow({
    children: labels.map((label, i) => tableCell(label, { bold: true, ...cellAlign(keys[i]) })),
  });
}

function buildDataRows(
  rows: Record<string, unknown>[],
  keys: string[],
): TableRow[] {
  return rows.map((row) =>
    new TableRow({
      children: keys.map((k) => tableCell(formatCellValue(row[k], k), cellAlign(k))),
    }),
  );
}

export async function rowsToDocxBuffer(
  rows: Record<string, unknown>[],
  columnLabels: Record<string, string>,
  meta?: DocxReportMeta,
): Promise<Buffer> {
  const keys = Object.keys(columnLabels);
  const headerRows =
    meta?.tableHeaderRows && meta.tableHeaderRows.length === 2 && keys.length === 6
      ? buildOrdersHeaderRows()
      : [buildSimpleHeaderRow(keys, keys.map((k) => columnLabels[k]))];

  const sumKeys = getSumKeys(keys);
  const dataRows = buildDataRows(rows, keys);
  const totalsRow = rows.length > 0 && sumKeys.size > 0
    ? [buildTotalsRow(keys, computeTotals(rows, sumKeys), sumKeys)]
    : [];

  const body: (Paragraph | Table)[] =
    rows.length === 0
      ? [paragraph('Нет данных за указанный период.', { bold: true })]
      : [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [...headerRows, ...dataRows, ...totalsRow],
          }),
        ];

  const children: (Paragraph | Table)[] = meta ? [...buildPrefixParagraphs(meta), ...body] : body;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: REPORT_FONT,
            size: REPORT_FONT_SIZE,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
          },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

export const DAILY_ORDERS_COLUMNS: Record<string, string> = {
  sec_name: 'Наименование ЦБ',
  buy_qty: 'Кол-во',
  buy_price: 'Цена (сом)',
  sell_qty: 'Кол-во',
  sell_price: 'Цена (сом)',
  order_datetime: 'Дата время',
};

export const DAILY_ORDERS_TABLE_HEADER: string[][] = [
  ['Наименование ЦБ', 'Заявка на покупку', '', 'Предложения на продажу', '', 'Дата время'],
  ['', 'Кол-во', 'Цена (сом)', 'Кол-во', 'Цена (сом)', ''],
];

export const DAILY_TRADES_COLUMNS: Record<string, string> = {
  sec_name: 'Наименование ЦБ',
  sec_type: 'Вид ЦБ',
  deal_count: 'Кол-во сделок',
  qty: 'Кол-во ЦБ',
  max_price: 'Макс цена',
  min_price: 'Мин цена',
  avg_price: 'Сред цена',
  volume: 'Объем',
};

export const WORD_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
