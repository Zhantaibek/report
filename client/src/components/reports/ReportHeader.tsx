interface ReportHeaderProps {
  formNumber: string;
  title: string;
  periodFrom: string;
  periodTo: string;
}

export function ReportHeader({ formNumber, title, periodFrom, periodTo }: ReportHeaderProps) {
  return (
    <>
      {/* Шапка: логотип + название биржи */}
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
        <div className="text-right">
          <p className="font-medium">{formNumber}</p>
          <p className="text-muted-foreground">
            Период с: {periodFrom} по: {periodTo}
          </p>
        </div>
      </div>

      {/* Заголовок отчёта */}
      <h1 className="mb-6 text-center text-lg font-semibold">
        {title}
      </h1>
    </>
  );
}
