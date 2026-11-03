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
  HeightRule,
  ImageRun,
  LineRuleType,
  PageBreak,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableBorders,
  TableCell,
  TableLayoutType,
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

/** Прямоугольник элемента относительно листа, px. */
interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Элемент листа контракта / свидетельства с его положением на растянутом листе. */
type SheetItem = Box &
  (
    | ({ kind: 'text'; text: string; lineHeight: number; alignRight: boolean } & TextStyle)
    | { kind: 'image'; src: string }
    | { kind: 'line'; borderTop: boolean; borderBottom: boolean; dashed: boolean }
  );

type Block =
  | ({ kind: 'text'; text: string } & TextStyle)
  | { kind: 'pair'; cells: string[] }
  | { kind: 'table'; rows: TableCellData[][] }
  | { kind: 'image'; src: string }
  /** pageWidth — ширина контейнера отчёта, px: она соответствует ширине рабочей области страницы. */
  | { kind: 'sheet'; width: number; height: number; pageWidth: number; items: SheetItem[] }
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

/** Лист контракта / свидетельства (2 копии) — в Word собирается по координатам, а не потоком. */
const DUPLEX_SHEET_CLASS = 'print-duplex-sheet';

/** Снимает элементы листа с их координатами (лист уже растянут на страницу — см. stretchDuplexSheets). */
function readSheet(sheet: HTMLElement, pageWidth: number): Block {
  const base = sheet.getBoundingClientRect();
  const items: SheetItem[] = [];
  const boxOf = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return { left: r.left - base.left, right: r.right - base.left, top: r.top - base.top, bottom: r.bottom - base.top };
  };

  const walk = (el: Element) => {
    if (isHidden(el)) return;
    if (el.tagName === 'IMG') {
      const src = (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src;
      if (src) items.push({ kind: 'image', src, ...boxOf(el) });
      return;
    }
    if (el.tagName.toLowerCase() === 'svg' || el.tagName === 'CANVAS') return;
    if (!isLeaf(el)) {
      for (const child of Array.from(el.children)) walk(child);
      return;
    }
    const box = boxOf(el);
    const text = textOf(el);
    const style = getComputedStyle(el);
    if (text) {
      const size = parseFloat(style.fontSize) || 14;
      items.push({
        kind: 'text',
        text,
        ...styleOf(el),
        alignRight: style.textAlign === 'right',
        lineHeight: parseFloat(style.lineHeight) || size * 1.2,
        ...box,
      });
      return;
    }
    const borderTop = parseFloat(style.borderTopWidth) > 0;
    const borderBottom = parseFloat(style.borderBottomWidth) > 0;
    if (borderTop || borderBottom) {
      const dashed = (borderTop ? style.borderTopStyle : style.borderBottomStyle) === 'dashed';
      items.push({ kind: 'line', borderTop, borderBottom, dashed, ...box });
    }
  };

  for (const child of Array.from(sheet.children)) walk(child);
  return { kind: 'sheet', width: base.width, height: base.height, pageWidth, items };
}

function collectBlocks(root: Element, { sheets = false }: { sheets?: boolean } = {}): Block[] {
  const blocks: Block[] = [];

  const walk = (el: Element) => {
    if (isHidden(el)) return;
    if (el.classList.contains(PAGE_BREAK_CLASS) && blocks.length > 0) {
      blocks.push({ kind: 'pagebreak' });
    }
    if (sheets && el.classList.contains(DUPLEX_SHEET_CLASS)) {
      blocks.push(readSheet(el as HTMLElement, root.scrollWidth));
      return;
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

/** Лист A4 и поля документа Word, twips. */
const WORD_PAGE = { width: 11906, height: 16838 };
// Слева 18 мм, справа 8 мм — как в PDF и @page для печати
const WORD_MARGIN = { top: 720, bottom: 720, left: 1020, right: 454 };
/** Запас по высоте под служебный абзац после таблицы листа — иначе Word выталкивает его на пустую страницу. */
const WORD_SHEET_SLACK = 300;

/** Рабочая область страницы Word, twips. */
function wordContentSize(landscape: boolean): { width: number; height: number } {
  const w = landscape ? WORD_PAGE.height : WORD_PAGE.width;
  const h = landscape ? WORD_PAGE.width : WORD_PAGE.height;
  return { width: w - WORD_MARGIN.left - WORD_MARGIN.right, height: h - WORD_MARGIN.top - WORD_MARGIN.bottom };
}

/** Абзац высотой 1 pt: несёт разрыв страницы после листа или закрывает документ, не занимая места. */
function tinyParagraph(pageBreak: boolean): Paragraph {
  return new Paragraph({
    children: pageBreak ? [new PageBreak()] : [],
    spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT },
    run: { size: 2 },
  });
}

/**
 * Лист контракта / свидетельства: таблица без рамок, где каждая строка листа — строка таблицы
 * точной высоты, а колонки — по горизонтальным границам элементов. Повторяет растянутый PDF-лист.
 */
async function buildSheetTable(
  sheet: Extract<Block, { kind: 'sheet' }>,
  contentWidth: number,
  loadCached: (src: string) => Promise<Awaited<ReturnType<typeof loadImage>>>,
): Promise<Table> {
  const scale = contentWidth / Math.max(sheet.pageWidth, sheet.width); // twips на px
  const tw = (px: number) => Math.round(px * scale);

  // Строки: элементы, перекрывающиеся по вертикали
  const sorted = [...sheet.items].sort((a, b) => a.top - b.top);
  const lines: { top: number; bottom: number; items: SheetItem[] }[] = [];
  for (const item of sorted) {
    const line = lines[lines.length - 1];
    if (line && item.top < line.bottom - 1) {
      line.items.push(item);
      line.bottom = Math.max(line.bottom, item.bottom);
    } else {
      lines.push({ top: item.top, bottom: item.bottom, items: [item] });
    }
  }

  // Ячейки строки: элементы, перекрывающиеся по горизонтали
  const clamp = (x: number) => Math.min(Math.max(x, 0), sheet.width);
  const cellsOf = (items: SheetItem[]) => {
    const cells: { left: number; right: number; items: SheetItem[] }[] = [];
    for (const item of [...items].sort((a, b) => a.left - b.left)) {
      const cell = cells[cells.length - 1];
      if (cell && item.left < cell.right - 1) {
        cell.items.push(item);
        cell.right = Math.max(cell.right, item.right);
      } else {
        cells.push({ left: item.left, right: item.right, items: [item] });
      }
    }
    // Ячейка тянется до соседа справа: шрифт Word шире/уже экранного, впритык текст переносится
    return cells.map((c, i) => ({ ...c, left: clamp(c.left), right: clamp(cells[i + 1]?.left ?? sheet.width) }));
  };
  const lineCells = lines.map((line) => cellsOf(line.items));

  // Сетка колонок: все границы ячеек (близкие, < 3 px, сливаются)
  const edges = [0, sheet.width, ...lineCells.flat().flatMap((c) => [c.left, c.right])].sort((a, b) => a - b);
  const grid: number[] = [];
  for (const x of edges) if (grid.length === 0 || x - grid[grid.length - 1]! >= 3) grid.push(x);
  grid[grid.length - 1] = sheet.width;
  const gridIndex = (x: number) =>
    grid.reduce((best, g, i) => (Math.abs(g - x) < Math.abs(grid[best]! - x) ? i : best), 0);
  const columnWidths = grid.slice(1).map((g, i) => tw(g) - tw(grid[i]!));

  const spacer = (span: number) =>
    new TableCell({ columnSpan: span, children: [new Paragraph({ spacing: { before: 0, after: 0 } })] });

  const paragraphsOf = async (items: SheetItem[], rowTop: number): Promise<Paragraph[]> => {
    const out: Paragraph[] = [];
    let cursor = rowTop;
    for (const item of [...items].sort((a, b) => a.top - b.top)) {
      const before = Math.max(0, tw(item.top) - tw(cursor));
      if (item.kind === 'text') {
        out.push(
          new Paragraph({
            children: item.text.split('\n').map(
              (line, i) =>
                new TextRun({ text: line, bold: item.bold, font: WORD_FONT, size: Math.max(2, Math.round(tw(item.size) / 10)), break: i > 0 ? 1 : 0 }),
            ),
            alignment: item.center ? AlignmentType.CENTER : item.alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
            spacing: { before, after: 0, line: Math.max(20, tw(item.lineHeight)), lineRule: LineRuleType.EXACT },
          }),
        );
      } else if (item.kind === 'image') {
        const img = await loadCached(item.src);
        // twips → px Word (1 px = 15 twips)
        const w = Math.round(tw(item.right - item.left) / 15);
        const h = Math.round(tw(item.bottom - item.top) / 15);
        out.push(
          new Paragraph({
            children: img ? [new ImageRun({ type: img.type, data: img.data, transformation: { width: w, height: h } })] : [],
            spacing: { before, after: 0 },
          }),
        );
      } else {
        const border = { style: item.dashed ? BorderStyle.DASHED : BorderStyle.SINGLE, size: 6, color: '000000', space: 0 };
        out.push(
          new Paragraph({
            spacing: { before, after: 0, line: Math.max(20, tw(item.bottom - item.top)), lineRule: LineRuleType.EXACT },
            border: { ...(item.borderTop ? { top: border } : {}), ...(item.borderBottom ? { bottom: border } : {}) },
            run: { size: 2 },
          }),
        );
      }
      cursor = item.bottom;
    }
    return out;
  };

  const rows: TableRow[] = [];
  const pushRow = (top: number, bottom: number, children: TableCell[]) => {
    const height = tw(bottom) - tw(top);
    if (height <= 0) return;
    rows.push(new TableRow({ height: { value: height, rule: HeightRule.EXACT }, cantSplit: true, children }));
  };

  if (lines.length > 0 && lines[0]!.top > 0) pushRow(0, lines[0]!.top, [spacer(columnWidths.length)]);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const next = i + 1 < lines.length ? lines[i + 1]!.top : sheet.height;
    const children: TableCell[] = [];
    let col = 0;
    for (const cell of lineCells[i]!) {
      const start = Math.max(col, gridIndex(cell.left));
      const end = Math.max(start + 1, gridIndex(cell.right));
      if (start > col) children.push(spacer(start - col));
      children.push(new TableCell({ columnSpan: end - start, children: await paragraphsOf(cell.items, line.top) }));
      col = end;
    }
    if (col < columnWidths.length) children.push(spacer(columnWidths.length - col));
    pushRow(line.top, Math.min(next, sheet.height), children);
  }

  return new Table({
    width: { size: tw(sheet.width), type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    borders: TableBorders.NONE,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    rows,
  });
}

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
  const loadCached = async (src: string) => {
    if (!images.has(src)) images.set(src, await loadImage(src));
    return images.get(src) ?? null;
  };
  const contentWidth = wordContentSize(landscape).width;

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b]!;
    if (block.kind === 'sheet') {
      children.push(await buildSheetTable(block, contentWidth, loadCached));
    } else if (block.kind === 'pagebreak' && blocks[b - 1]?.kind === 'sheet') {
      children.push(tinyParagraph(true));
    } else if (block.kind === 'text') {
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
      const img = await loadCached(block.src);
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
  // После таблицы листа Word всё равно ставит абзац — делаем его крошечным, чтобы не было пустой страницы
  if (blocks[blocks.length - 1]?.kind === 'sheet') children.push(tinyParagraph(false));

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
            margin: WORD_MARGIN,
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
  // Слева поле шире (под подшивку), как в @page для печати
  const margin = { top: 10, left: 18, right: 8 };
  const contentW = pdf.internal.pageSize.getWidth() - margin.left - margin.right;
  const contentH = pdf.internal.pageSize.getHeight() - margin.top * 2;
  const widthPx = root.scrollWidth;
  const pageHeightPx = Math.floor((widthPx * contentH) / contentW);

  const restoreSheets = stretchDuplexSheets(root, pageHeightPx);
  try {
    return await renderPdfPages(pdf, root, pageHeightPx, margin, contentW);
  } finally {
    restoreSheets();
  }
}

/**
 * Контракт / свидетельство: растягивает каждый лист (2 копии) на всю высоту страницы PDF,
 * как это делают стили печати. Возвращает функцию отката.
 */
function stretchDuplexSheets(root: HTMLElement, pageHeightPx: number): () => void {
  const sheets = Array.from(root.querySelectorAll<HTMLElement>('.print-duplex-sheet'));
  if (sheets.length === 0) return () => {};
  root.classList.add('report-pdf');
  // Первый лист может стоять не с самого верха — вычитаем отступ до него в пределах страницы
  const firstOffset =
    Math.round(sheets[0]!.getBoundingClientRect().top - root.getBoundingClientRect().top) % pageHeightPx;
  sheets.forEach((sheet, i) => {
    sheet.style.height = `${pageHeightPx - (i === 0 ? firstOffset : 0) - 2}px`;
  });
  return () => {
    for (const sheet of sheets) sheet.style.height = '';
    root.classList.remove('report-pdf');
  };
}

async function renderPdfPages(
  pdf: jsPDF,
  root: HTMLElement,
  pageHeightPx: number,
  margin: { top: number; left: number },
  contentW: number,
): Promise<Blob> {
  const widthPx = root.scrollWidth;
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
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin.left, margin.top, contentW, h);
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
    if (format === 'xlsx') {
      const data = XLSX.write(buildWorkbook(collectBlocks(root)), { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      download(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name}.xlsx`);
      return;
    }
    // Word: лист контракта растягиваем на высоту страницы Word и снимаем с координатами
    const content = wordContentSize(landscape);
    const sheetHeightPx = Math.floor((root.scrollWidth * (content.height - WORD_SHEET_SLACK)) / content.width);
    const restoreSheets = stretchDuplexSheets(root, sheetHeightPx);
    let blocks: Block[];
    try {
      blocks = collectBlocks(root, { sheets: true });
    } finally {
      restoreSheets();
    }
    download(await buildDocx(blocks, landscape), `${name}.docx`);
  } finally {
    root.classList.remove('report-exporting');
    if (wasDark) html.classList.add('dark');
  }
}
