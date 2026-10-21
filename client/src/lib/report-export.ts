/**
 * Выгрузка любого отчёта в Excel / Word / PDF по тому, что отрисовано на странице.
 *
 * Отчёты — собственные React-шаблоны, поэтому выгрузка идёт от DOM:
 *  - Excel и Word: DOM разбирается в блоки (текст, пара «метка — значение», таблица, картинка, разрыв страницы);
 *  - PDF: контейнер отчёта постранично снимается в картинку (html2canvas) и кладётся на листы A4 (jsPDF).
 * Элементы с классом `print:hidden` в выгрузку не попадают, `print:break-before-page` начинает новую страницу.
 */
import * as XLSX from 'xlsx';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  PageBreak,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableBorders,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export type ExportFormat = 'xlsx' | 'docx' | 'pdf';

export interface ExportOptions {
  /** Имя файла без расширения. */
  fileName: string;
  landscape?: boolean;
}

// ── Разбор DOM ──────────────────────────────────────────────────────────────

interface TextStyle {
  bold: boolean;
  center: boolean;
  /** Размер шрифта, px. */
  size: number;
}

interface TableCellData extends TextStyle {
  text: string;
  colSpan: number;
  rowSpan: number;
}

type Block =
  | ({ kind: 'text'; text: string } & TextStyle)
  | { kind: 'pair'; cells: string[] }
  | { kind: 'table'; rows: TableCellData[][] }
  | { kind: 'image'; src: string }
  | { kind: 'pagebreak' };

const HIDDEN_CLASS = 'print:hidden';
const PAGE_BREAK_CLASS = 'print:break-before-page';
/** Пустой span с нижней границей — линия для подписи. */
const SIGNATURE_LINE = '____________________';

function isHidden(el: Element): boolean {
  if (el.classList.contains(HIDDEN_CLASS)) return true;
  const style = getComputedStyle(el);
  return style.display === 'none' || style.visibility === 'hidden';
}

function isInline(el: Element): boolean {
  if (el.tagName === 'BR') return true;
  if (el.tagName === 'IMG' || el.tagName === 'TABLE') return false;
  return getComputedStyle(el).display.startsWith('inline') && !el.querySelector('table, img, div, p');
}

/** Элемент без блочных потомков — его текст идёт одним куском. */
function isLeaf(el: Element): boolean {
  if (el.tagName === 'IMG' || el.tagName === 'TABLE') return false;
  return Array.from(el.children).every(isInline);
}

function textOf(el: Element): string {
  const raw = (el as HTMLElement).innerText ?? el.textContent ?? '';
  return raw
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function styleOf(el: Element): TextStyle {
  const style = getComputedStyle(el);
  return {
    bold: Number(style.fontWeight) >= 600,
    center: style.textAlign === 'center',
    size: parseFloat(style.fontSize) || 14,
  };
}

function cellText(el: Element): string {
  const text = textOf(el);
  if (text) return text;
  return parseFloat(getComputedStyle(el).borderBottomWidth) > 0 ? SIGNATURE_LINE : '';
}

/** Строка-flex из нескольких листовых колонок: «метка — значение», подпись и т. п. */
function isPairRow(el: Element): boolean {
  const style = getComputedStyle(el);
  if (style.display !== 'flex' || style.flexDirection.startsWith('column')) return false;
  const children = Array.from(el.children).filter((c) => !isHidden(c));
  return children.length >= 2 && children.every(isLeaf);
}

function readTable(table: HTMLTableElement): TableCellData[][] {
  return Array.from(table.rows)
    .filter((tr) => !isHidden(tr))
    .map((tr) =>
      Array.from(tr.cells).map((cell) => {
        const style = styleOf(cell);
        return {
          ...style,
          bold: style.bold || cell.tagName === 'TH',
          text: textOf(cell),
          colSpan: cell.colSpan || 1,
          rowSpan: cell.rowSpan || 1,
        };
      }),
    )
    .filter((row) => row.length > 0);
}

function collectBlocks(root: Element): Block[] {
  const blocks: Block[] = [];

  const walk = (el: Element) => {
    if (isHidden(el)) return;
    if (el.classList.contains(PAGE_BREAK_CLASS) && blocks.length > 0) {
      blocks.push({ kind: 'pagebreak' });
    }
    if (el.tagName === 'TABLE') {
      const rows = readTable(el as HTMLTableElement);
      if (rows.length) blocks.push({ kind: 'table', rows });
      return;
    }
    if (el.tagName === 'IMG') {
      const src = (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src;
      if (src) blocks.push({ kind: 'image', src });
      return;
    }
    if (el.tagName.toLowerCase() === 'svg' || el.tagName === 'CANVAS') return;

    if (isLeaf(el)) {
      const text = textOf(el);
      if (text) blocks.push({ kind: 'text', text, ...styleOf(el) });
      return;
    }
    if (isPairRow(el)) {
      const cells = Array.from(el.children).filter((c) => !isHidden(c)).map(cellText);
      if (cells.some(Boolean)) blocks.push({ kind: 'pair', cells });
      return;
    }
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text) blocks.push({ kind: 'text', text, ...styleOf(el) });
      } else if (node instanceof Element) {
        walk(node);
      }
    }
  };

  for (const child of Array.from(root.children)) walk(child);
  return blocks;
}

function download(blob: Blob, fileName: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── Excel ───────────────────────────────────────────────────────────────────

const NUMBER_RE = /^-?\d{1,3}(?:[\s  ]\d{3})*(?:,\d+)?$|^-?\d+(?:,\d+)?$/;

/** «1 234,56» → 1234.56; коды с ведущим нулём и длинные номера остаются текстом. */
function toSheetValue(text: string): string | number {
  const t = text.trim();
  if (!NUMBER_RE.test(t)) return text;
  const digits = t.replace(/[\s  ]/g, '');
  if (/^-?0\d/.test(digits) || digits.replace(/\D/g, '').length > 15) return text;
  const n = Number(digits.replace(',', '.'));
  return Number.isFinite(n) ? n : text;
}

function buildWorkbook(blocks: Block[]): XLSX.WorkBook {
  const tableWidth = (rows: TableCellData[][]) =>
    Math.max(0, ...rows.map((r) => r.reduce((s, c) => s + c.colSpan, 0)));
  const width = Math.max(
    2,
    ...blocks.map((b) => (b.kind === 'table' ? tableWidth(b.rows) : b.kind === 'pair' ? b.cells.length : 1)),
  );

  const aoa: (string | number | null)[][] = [];
  const merges: XLSX.Range[] = [];
  /** Исходный текст ячейки «r:c» — по нему выбирается числовой формат. */
  const sourceText = new Map<string, string>();
  const colWidths: number[] = new Array(width).fill(8);
  const fit = (c: number, value: string | number | null) => {
    const len = String(value ?? '').split('\n').reduce((m, l) => Math.max(m, l.length), 0);
    colWidths[c] = Math.min(60, Math.max(colWidths[c] ?? 8, len + 2));
  };

  for (const block of blocks) {
    if (block.kind === 'text') {
      const r = aoa.length;
      aoa.push([block.text]);
      if (width > 1) merges.push({ s: { r, c: 0 }, e: { r, c: width - 1 } });
    } else if (block.kind === 'pair') {
      const row = block.cells.map(toSheetValue);
      block.cells.forEach((text, c) => {
        sourceText.set(`${aoa.length}:${c}`, text);
        fit(c, text);
      });
      aoa.push(row);
    } else if (block.kind === 'table') {
      const start = aoa.length;
      const taken = new Set<string>();
      block.rows.forEach((cells, i) => {
        const r = start + i;
        aoa[r] = aoa[r] ?? [];
        let c = 0;
        for (const cell of cells) {
          while (taken.has(`${r}:${c}`)) c++;
          aoa[r][c] = toSheetValue(cell.text);
          sourceText.set(`${r}:${c}`, cell.text);
          fit(c, cell.colSpan === 1 ? cell.text : null);
          if (cell.colSpan > 1 || cell.rowSpan > 1) {
            merges.push({ s: { r, c }, e: { r: r + cell.rowSpan - 1, c: c + cell.colSpan - 1 } });
          }
          for (let dr = 0; dr < cell.rowSpan; dr++) {
            for (let dc = 0; dc < cell.colSpan; dc++) taken.add(`${r + dr}:${c + dc}`);
          }
          c += cell.colSpan;
        }
      });
      for (let r = start; r < aoa.length; r++) aoa[r] = Array.from(aoa[r] ?? [], (v) => v ?? null);
    } else if (block.kind === 'pagebreak') {
      aoa.push([]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Суммы с копейками или разрядами — в том же виде, что на экране; номера и счета без разделителей
  aoa.forEach((row, r) =>
    row.forEach((value, c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      if (cell && typeof value === 'number') {
        const source = String(sourceText.get(`${r}:${c}`) ?? '');
        if (source.includes(',')) cell.z = '#,##0.00';
        else if (/[\s  ]/.test(source)) cell.z = '#,##0';
      }
    }),
  );
  ws['!merges'] = merges;
  ws['!cols'] = colWidths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Отчёт');
  return wb;
}

// ── Word ────────────────────────────────────────────────────────────────────

const WORD_FONT = 'Times New Roman';
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' };

/** px шрифта на экране → половины пунктов Word (14px ≈ 11pt). */
function halfPoints(px: number): number {
  return Math.round(Math.min(Math.max(px * 0.75, 9), 16) * 2);
}

function textRuns(text: string, bold: boolean, sizePx: number): TextRun[] {
  return text.split('\n').map(
    (line, i) => new TextRun({ text: line, bold, font: WORD_FONT, size: halfPoints(sizePx), break: i > 0 ? 1 : 0 }),
  );
}

function wordParagraph(text: string, style: TextStyle, alignRight = false): Paragraph {
  return new Paragraph({
    children: textRuns(text, style.bold, style.size),
    alignment: style.center ? AlignmentType.CENTER : alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
    spacing: { after: 60 },
  });
}

async function loadImage(src: string): Promise<{ data: ArrayBuffer; type: 'png' | 'jpg' } | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const mime = res.headers.get('content-type') ?? '';
    const type = mime.includes('png') || /\.png($|\?)/i.test(src) ? 'png' : mime.includes('jpeg') || /\.jpe?g($|\?)/i.test(src) ? 'jpg' : null;
    return type ? { data: await res.arrayBuffer(), type } : null;
  } catch {
    return null;
  }
}

async function buildDocx(blocks: Block[], landscape: boolean): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];
  const images = new Map<string, Awaited<ReturnType<typeof loadImage>>>();

  for (const block of blocks) {
    if (block.kind === 'text') {
      children.push(wordParagraph(block.text, block));
    } else if (block.kind === 'pair') {
      const style: TextStyle = { bold: false, center: false, size: 14 };
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: TableBorders.NONE,
          rows: [
            new TableRow({
              children: block.cells.map(
                (text, i) =>
                  new TableCell({
                    width: { size: Math.floor(100 / block.cells.length), type: WidthType.PERCENTAGE },
                    children: [wordParagraph(text, { ...style, bold: i % 2 === 1 })],
                  }),
              ),
            }),
          ],
        }),
      );
    } else if (block.kind === 'table') {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: block.rows.map(
            (cells, r) =>
              new TableRow({
                tableHeader: r === 0 && cells.some((c) => c.bold),
                children: cells.map(
                  (cell) =>
                    new TableCell({
                      columnSpan: cell.colSpan,
                      rowSpan: cell.rowSpan,
                      borders: { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER },
                      children: [wordParagraph(cell.text, { ...cell, size: Math.min(cell.size, 13) }, typeof toSheetValue(cell.text) === 'number')],
                    }),
                ),
              }),
          ),
        }),
      );
    } else if (block.kind === 'image') {
      if (!images.has(block.src)) images.set(block.src, await loadImage(block.src));
      const img = images.get(block.src);
      if (img) {
        children.push(
          new Paragraph({
            children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: 64, height: 64 } })],
          }),
        );
      }
    } else {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
            margin: { top: 720, bottom: 720, left: 1000, right: 720 },
          },
        },
        children: children.length ? children : [new Paragraph('')],
      },
    ],
  });
  return Packer.toBlob(doc);
}

// ── PDF ─────────────────────────────────────────────────────────────────────

/** Делит отчёт на страницы: принудительные разрывы + границы строк/блоков, чтобы не резать текст. */
function pageSegments(root: HTMLElement, pageHeightPx: number): [number, number][] {
  const top = root.getBoundingClientRect().top;
  const total = root.scrollHeight;
  const forced = new Set<number>();
  const candidates: number[] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    if (el.offsetParent === null && el !== root) continue;
    const rect = el.getBoundingClientRect();
    if (el.classList.contains(PAGE_BREAK_CLASS)) forced.add(Math.round(rect.top - top));
    if (el.tagName === 'TR' || el.tagName === 'P' || el.tagName === 'TABLE' || isLeaf(el) || isPairRow(el)) {
      candidates.push(Math.round(rect.bottom - top));
    }
  }
  candidates.sort((a, b) => a - b);
  const forcedSorted = [...forced].filter((y) => y > 0).sort((a, b) => a - b);

  const segments: [number, number][] = [];
  let start = 0;
  while (start < total - 1) {
    const limit = start + pageHeightPx;
    const forcedBreak = forcedSorted.find((y) => y > start + 1 && y <= limit);
    let end: number;
    if (forcedBreak !== undefined) {
      end = forcedBreak;
    } else if (limit >= total) {
      end = total;
    } else {
      const fits = candidates.filter((y) => y > start + pageHeightPx * 0.3 && y <= limit);
      end = fits.length ? fits[fits.length - 1]! : limit;
    }
    segments.push([start, end]);
    start = end;
  }
  return segments;
}

async function buildPdf(root: HTMLElement, landscape: boolean): Promise<Blob> {
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const margin = 10;
  const contentW = pdf.internal.pageSize.getWidth() - margin * 2;
  const contentH = pdf.internal.pageSize.getHeight() - margin * 2;
  const widthPx = root.scrollWidth;
  const pageHeightPx = Math.floor((widthPx * contentH) / contentW);

  const segments = pageSegments(root, pageHeightPx);
  for (let i = 0; i < segments.length; i++) {
    const [start, end] = segments[i]!;
    const canvas = await html2canvas(root, {
      y: start,
      height: end - start,
      width: widthPx,
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    if (i > 0) pdf.addPage();
    const h = ((end - start) * contentW) / widthPx;
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentW, h);
  }
  return pdf.output('blob');
}

// ── Точка входа ─────────────────────────────────────────────────────────────

/** Имя файла без недопустимых символов. */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150) || 'report';
}

/**
 * Выгружает отрисованный отчёт. На время выгрузки отключает тёмную тему и скрывает `print:hidden`,
 * чтобы файл выглядел как печатная форма.
 */
export async function exportReportElement(root: HTMLElement, format: ExportFormat, options: ExportOptions): Promise<void> {
  const html = document.documentElement;
  const wasDark = html.classList.contains('dark');
  html.classList.remove('dark');
  root.classList.add('report-exporting');
  try {
    // Ждём перерисовку без тёмной темы (таймер, а не rAF: в фоновой вкладке rAF не срабатывает)
    await new Promise((r) => setTimeout(r, 50));
    const landscape = Boolean(options.landscape);
    const name = safeFileName(options.fileName);
    if (format === 'pdf') {
      download(await buildPdf(root, landscape), `${name}.pdf`);
      return;
    }
    const blocks = collectBlocks(root);
    if (format === 'xlsx') {
      const data = XLSX.write(buildWorkbook(blocks), { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      download(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name}.xlsx`);
    } else {
      download(await buildDocx(blocks, landscape), `${name}.docx`);
    }
  } finally {
    root.classList.remove('report-exporting');
    if (wasDark) html.classList.add('dark');
  }
}
