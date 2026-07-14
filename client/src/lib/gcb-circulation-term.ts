/**
 * Срок обращения ГЦБ из кода инструмента (SecCode).
 *
 * После 3-символьного префикса идут 2 цифры срока:
 * - GD0… → недели (GD052270215 → 52 недели)
 * - GBA/GBQ/KG0… → годы (GBA02270915 → 2 года, KG0106166315 → 1 год)
 */
function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function parseGcbCirculationTerm(secCode: string | null | undefined): string {
  const code = String(secCode ?? '').trim().toUpperCase();
  if (code.length < 5) return '';

  const termDigits = code.slice(3, 5);
  if (!/^\d{2}$/.test(termDigits)) return '';

  const value = Number(termDigits);
  if (!Number.isFinite(value) || value <= 0) return '';

  if (code.startsWith('GD0')) {
    return `${value} ${pluralRu(value, 'неделя', 'недели', 'недель')}`;
  }

  return `${value} ${pluralRu(value, 'год', 'года', 'лет')}`;
}
