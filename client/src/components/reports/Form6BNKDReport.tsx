import {
  Form6AReport,
  type ReportForm6AData,
} from './Form6AReport';

export type ReportForm6BNKDData = ReportForm6AData;

interface Props {
  data: ReportForm6BNKDData;
}

/** Форма 6Б НКД — сводный отчёт по сделкам вторичного рынка с колонкой НКД (Accruedint). */
export function Form6BNKDReport({ data }: Props) {
  return (
    <Form6AReport
      data={data}
      formNumber="Ф-6Б НКД"
      title="Сводный отчет по сделкам"
      showAccruedInt
    />
  );
}
