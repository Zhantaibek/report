import {
  Form6AReport,
  type ReportForm6AData,
} from './Form6AReport';

export type ReportForm6BData = ReportForm6AData;
export type { ClassData, SecurityData, TradeData } from './Form6AReport';

interface Props {
  data: ReportForm6BData;
}

/** Форма 6Б — тот же сводный отчёт по сделкам, что и 6А. */
export function Form6BReport({ data }: Props) {
  return (
    <Form6AReport
      data={data}
      formNumber="Ф-6Б"
      title="Сводный отчет по сделкам"
    />
  );
}
