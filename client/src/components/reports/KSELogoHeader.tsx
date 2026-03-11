/**
 * Блок логотипа КФБ как в отчёте Ф-1 — для Биржевого контракта и Биржевого свидетельства.
 */
export function KSELogoHeader() {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div className="flex items-center gap-4">
        <img
          src="/favicon.png"
          alt="KSE Logo"
          className="h-14 w-14 shrink-0 rounded object-contain"
        />
        <div>
          <p className="font-semibold text-foreground">Кыргызская Фондовая Биржа</p>
          <p className="text-muted-foreground">Кыргыз Фондулук Биржасы</p>
          <p className="text-muted-foreground">Kyrgyz Stock Exchange</p>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">г. Бишкек</p>
    </div>
  );
}
