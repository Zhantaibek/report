interface ReportHeaderProps {
  formNumber: string;
  title: string;
  periodFrom: string;
  periodTo: string;
}

function toDdMmYyyy(s: string): string {
  if (!s) return s;
  const match = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return s;
}

export function ReportHeader({ formNumber, title, periodFrom, periodTo }: ReportHeaderProps) {
  const from = toDdMmYyyy(periodFrom);
  const to = toDdMmYyyy(periodTo);
  return (
    <>
      {/* Шапка: логотип + заголовок отчёта + период */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/favicon.png"
            alt="KSE Logo"
            className="h-16 w-16 shrink-0 rounded object-contain"
          />
          <div>
            <p className="font-semibold text-foreground">Кыргызская Фондовая Биржа</p>
            <p className="text-muted-foreground">Кыргыз Фондулук Биржасы</p>
            <p className="text-muted-foreground">Kyrgyz Stock Exchange</p>
          </div>
        </div>
        <div className="flex-1 px-4 flex items-end justify-center text-center">
          {title && (
            <h1 className="text-base font-semibold leading-tight">
              {title}
            </h1>
          )}
        </div>
        <div className="flex flex-col items-end justify-center text-right">
          <p className="font-medium">{formNumber}</p>
          <p className="text-muted-foreground">
            Период с: {from} по: {to}
          </p>
        </div>
      </div>
    </>
  );
}
